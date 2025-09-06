'use client';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Device } from 'mediasoup-client';
import { redirect } from "next/navigation";
const SocketContext = createContext(null);

export const SocketContextProvider = (props) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted,setIsMuted] = useState(false);
    const [isVideoOff,setIsVideoOff] = useState(false);
    const socket = useRef(null);
    const deviceRef = useRef(null);

    // --- PER-ROOM STATE MANAGEMENT ---
    // State for UI re-renders (e.g., streams)
    const [roomState, setRoomState] = useState({});
    // Ref for non-rendering data (transports, consumers, etc.) to avoid re-renders
    const roomsRef = useRef({});

    // --- SOCKET.IO & MEDIASOUP DEVICE LIFECYCLE ---
    useEffect(() => {
        const newSocket = io("https://localhost:3001");
        socket.current = newSocket;

        newSocket.on("connect", () => {
            console.log(`Client ${newSocket.id} connected`);
            setIsConnected(true);
            // On connect/reconnect, reload the device
            loadDevice();
        });

        newSocket.on("disconnect", () => {
            console.log(`Client ${newSocket.id} disconnected`);
            setIsConnected(false);
        });

        // --- LISTENERS ON SOCKET ---
        newSocket.on('existing-producers', ({ roomId, producers }) => {
            if (!roomsRef.current[roomId]) return;
            console.log(`Getting existing producers for room ${roomId}:`, producers);
            roomsRef.current[roomId].allProducers = producers;
            setTimeout(()=>{
                consumeFeed(roomId);
            },2000)
            
        });

        newSocket.on('new-producer', ({ roomId, producer }) => {
            if (!roomsRef.current[roomId]) return;
            console.log(`New producer in room ${roomId}:`, producer);
            roomsRef.current[roomId].allProducers.push(producer);
            consumeFeed(roomId);
        });
        
        newSocket.on('producer-closed', ({ roomId, producerId }) => {
             if (!roomsRef.current[roomId]) return;
             
             // Remove from allProducers list
             roomsRef.current[roomId].allProducers = roomsRef.current[roomId].allProducers.filter(p => p.producerId !== producerId);
             
             // Remove from remote streams to update UI
             setRoomState(prev => ({
                 ...prev,
                 [roomId]: {
                     ...prev[roomId],
                     remoteStreams: prev[roomId]?.remoteStreams.filter(s => s.id !== producerId) || []
                 }
             }));
             
             // Close the associated consumer
             const consumer = Object.values(roomsRef.current[roomId].consumers).find(c => c.producerId === producerId);
             if (consumer) {
                 consumer.close();
                 delete roomsRef.current[roomId].consumers[consumer.id];
             }
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const loadDevice = async () => {
        try {
            if (deviceRef.current && deviceRef.current.loaded) return;
            
            deviceRef.current = new Device();
            await socket.current.emit('getRtpCap', async (rtpCaps) => {
                await deviceRef.current.load({ routerRtpCapabilities: rtpCaps });
                console.log('Device loaded successfully');
            });
        } catch (err) {
            console.error("Error loading device:", err);
            if (err.name === 'UnsupportedError') {
                console.warn("Browser not supported");
            }
        }
    };

    // --- ROOM MANAGEMENT ---
    const joinRoom = async (roomId) => {
        if (!deviceRef.current || !deviceRef.current.loaded) {
            console.log("Device not loaded yet, waiting...");
            await loadDevice();
        }

        // Initialize state and refs for the room
        roomsRef.current[roomId] = {
            producerTransport: { video: null, audio: null },
            consumerTransport: { video: null, audio: null },
            producers: { video: null, audio: null },
            consumers: {},
            allProducers: [],
            consuming: new Set(),
        };

        setRoomState(prev => ({
            ...prev,
            [roomId]: {
                localStream: null,
                remoteStreams: [],
            }
        }));
        
        // This event tells the server to associate this socket with this room
        socket.current.emit('join-room', { roomId });

        try {
            await startProduction(roomId);
            await startConsumption(roomId);
            console.log(`WORKING: Successfully joined and initialized room ${roomId}!`);
        } catch (error) {
            console.error(`Something went wrong when joining room ${roomId}:`, error);
        }
    };
    
    const leaveRoom = (roomId) => {
        console.log(`Leaving room ${roomId}`);
        const room = roomsRef.current[roomId];
        if (!room) return;

        // Close all transports
        Object.values(room.producerTransport).forEach(t => t?.close());
        Object.values(room.consumerTransport).forEach(t => t?.close());

        // Stop local media tracks
        const localStream = roomState[roomId]?.localStream;
        localStream?.getTracks().forEach(track => track.stop());

        // Clean up state
        delete roomsRef.current[roomId];
        setRoomState(prev => {
            const newState = { ...prev };
            delete newState[roomId];
            return newState;
        });

        socket.current.emit('leave-room', { roomId });
    };

    // --- MEDIA PRODUCTION (SENDING) ---
    const startProduction = async (roomId) => {
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            setRoomState(prev => ({ ...prev, [roomId]: { ...prev[roomId], localStream: stream } }));
        } catch (error) {
            console.error("GUM error", error);
            return;
        }

        for (const kind of ['video', 'audio']) {
            socket.current.emit('create-producer-transport', { kind }, (transportData) => {
                const transport = deviceRef.current.createSendTransport(transportData);
                roomsRef.current[roomId].producerTransport[kind] = transport;

                transport.on('connect', ({ dtlsParameters }, callback, errback) => {
                    socket.current.emit('connect-producer-transport', { kind, dtlsParameters }, (res) => {
                        if (res === "success") callback();
                        else errback(new Error('Failed to connect producer transport'));
                    });
                });

                transport.on('produce', (parameters, callback, errback) => {
                    socket.current.emit('start-producing', { kind: parameters.kind, rtpParameters: parameters.rtpParameters }, (producerId) => {
                         if (producerId === "error") {
                            errback(new Error('Failed to start producing on server'));
                            return;
                        }
                        callback({ id: producerId });
                    });
                });
            });
        }
        // Wait for transports to be created before publishing
        setTimeout(() => publishFeed(roomId, stream), 500);
    };

    const publishFeed = async (roomId, stream) => {
        const room = roomsRef.current[roomId];
        if (!stream || !room.producerTransport.video || !room.producerTransport.audio) {
            console.warn(`Cannot publish feed for room ${roomId}, dependencies not ready.`);
            return;
        }
        
        console.log(`Publishing feed for room ${roomId}...`);
        
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        try {
            const videoProducer = await room.producerTransport.video.produce({ track: videoTrack , paused:isVideoOff});
            const audioProducer = await room.producerTransport.audio.produce({ track: audioTrack, paused:isMuted });

            roomsRef.current[roomId].producers = { video: videoProducer, audio: audioProducer };
            console.log("Producer feed published!!")
        } catch (error) {
            console.error('Error publishing feed:', error);
        }
    };
    
    // --- MEDIA CONSUMPTION (RECEIVING) ---
    const startConsumption = async (roomId) => {
        for (const kind of ['video', 'audio']) {
             socket.current.emit('create-consumer-transport', { kind }, (transportData) => {
                const transport = deviceRef.current.createRecvTransport(transportData);
                roomsRef.current[roomId].consumerTransport[kind] = transport;

                transport.on('connect', ({ dtlsParameters }, callback, errback) => {
                    socket.current.emit('connect-consumer-transport', { kind, dtlsParameters }, (res) => {
                        if (res === "success") callback();
                        else errback(new Error('Failed to connect consumer transport'));
                    });
                });
             });
        }
    };

    const consumeFeed = async (roomId) => {
        const room = roomsRef.current[roomId];
        if (!room || room.allProducers.length === 0) {
            console.log(`No producers to consume in room ${roomId}.`);
            return;
        }

        for (const producer of room.allProducers) {
            if (room.consuming.has(producer.producerId)) continue;
            room.consuming.add(producer.producerId);

            socket.current.emit('start-consuming', {
                producerId: producer.producerId,
                clientRtpCapabilities: deviceRef.current.rtpCapabilities,
                kind: producer.kind
            }, async (res) => {
                if (res === "error" || res.error) {
                    console.error(`Error consuming producer ${producer.producerId}:`, res);
                    room.consuming.delete(producer.producerId); // Allow retry
                    return;
                }

                const { id, producerId, kind, rtpParameters } = res;
                const transportToUse = kind === 'video'
                    ? room.consumerTransport.video
                    : room.consumerTransport.audio;

                if (!transportToUse) {
                    console.error(`Consumer transport for kind "${kind}" in room ${roomId} not found!`);
                    return;
                }

                const consumer = await transportToUse.consume({ id, producerId, kind, rtpParameters });
                room.consumers[consumer.id] = consumer;
                
                socket.current.emit('resume-consuming', { consumerId: consumer.id }, () => {
                     console.log(`Resumed consumer for kind: ${kind} in room ${roomId}`);
                });

                setRoomState(prev => {
                    const currentRoom = prev[roomId] || { remoteStreams: [] };
                    if (currentRoom.remoteStreams.find(s => s.id === producerId && s.kind === kind)) {
                        return prev;
                    }
                    return {
                        ...prev,
                        [roomId]: {
                            ...currentRoom,
                            remoteStreams: [
                                ...currentRoom.remoteStreams,
                                { id: producerId, stream: new MediaStream([consumer.track]), kind: kind }
                            ]
                        }
                    };
                });
            });
        }
    };

    // --- MEETING CONTROLS FUNCTIONS ---
    const onLeave = (roomId)=>{
        leaveRoom(roomId);
        redirect('/meet') // redirect to left page (where user can rejoin or go to home)
    }
    const onToggleMute = (roomId) => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        const { audio: audioProducer } = roomsRef.current[roomId]?.producers || {};
        if (audioProducer) {
            console.log("Muting")
            newMutedState ? audioProducer.pause() : audioProducer.resume();
            // Notify the server about the state change
            socket.current.emit('toggle-producer-state', { roomId, kind: 'audio', paused: newMutedState });
        }
    };

    const onToggleVideo = (roomId) => {
        const newVideoOffState = !isVideoOff;
        setIsVideoOff(newVideoOffState);
        
        const { video: videoProducer } = roomsRef.current[roomId]?.producers || {};
        if (videoProducer) {
            newVideoOffState ? videoProducer.pause() : videoProducer.resume();
            // Notify the server about the state change
            socket.current.emit('toggle-producer-state', { roomId, kind: 'video', paused: newVideoOffState });
        }
    };

    // --- CONTEXT EXPORT ---
    const contextValues = useMemo(() => ({
        socket: socket.current,
        isConnected,
        isMuted,
        isVideoOff,
        rooms: roomState,
        joinRoom,
        leaveRoom,
        onLeave,
        onToggleMute,
        onToggleVideo
    }), [isConnected,isMuted,isVideoOff, roomState, joinRoom, leaveRoom]);

    return (
        <SocketContext.Provider value={contextValues}>
            {props.children}
        </SocketContext.Provider>
    );
};
export { SocketContext };