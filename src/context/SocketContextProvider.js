'use client';
import React, { createContext, use, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Device } from 'mediasoup-client';
import { get } from "http";
const SocketContext = createContext(null);

// Handling multiple remote streams :
// 1. Convert remoteStream --> remoteStreams

export const SocketContextProvider = (props) => {
    const [isConnected,setIsConnected] = useState(false);
    // const [device,setDevice] = useState(null);
    // const [localStream,setLocalStream] = useState(null);
    // const [producerTransport,setProducerTransport] = useState(null);
    // const [producer,setProducer] = useState(null);
    // const [consumerTransport,setConsumerTransport] = useState(null);

    // Golbals
    const socket = useRef(null);
    const [localStream,setLocalStream] = useState(null);
    const [deviceReady,setDeviceReady] = useState(false);
    const [remoteStreams,setRemoteStreams] = useState([]);
    const [isProducerTransportReady,setIsProducerTransportReady] = useState(false);
    const [isConsumerTransportReady,setIsConsumerTransportReady] = useState(false);
    const [otherPeerPresent,setOtherPeerPresent] = useState(false);

    // ref
    const deviceRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const producerTransportRef = useRef({video:null,audio:null});
    const producerRef = useRef({video:null,audio:null});
    const consumerTransportRef = useRef({video:null,audio:null});
    const consumerRef = useRef({});

    // list of all producers (except the client's)
    const allProducers = useRef([]);
    // Data model:
    // [ {producerId,producerSocketId,kind} ]
    const consuming = useRef(new Set());

    // Init socket connection and handle its lifecycle
    useEffect(()=>{
        const newSocket = io("https://localhost:3001");
        const stream = new MediaStream();
        localVideoRef.current = stream;
        newSocket.on("connect",()=>{
            console.log(`Client ${newSocket.id} connected`);
            setIsConnected(true);
        })
        newSocket.on("disconnect",()=>{
            console.log(`Client ${newSocket.id} disconnected`);
            setIsConnected(false);
        })
        // listeners on socket
        newSocket.on('existing-producers',(producers)=>{
            console.log('Getting xisting prodcucers:',producers);
            for(const producer of producers){
                allProducers.current.push(producer);
            }
            //TODO : handle better : currently given timer to let the deviceSetup complete before calling consume
            setTimeout(()=>{
                consumeFeed();
            },5000)
            
        })
        newSocket.on('new-producer',(producer)=>{
            allProducers.current.push(producer);
            consumeFeed();
        })
        socket.current = newSocket;
        return ()=>{
            newSocket.close();
        }
        
    },[]);
    
    const deviceSetup = async()=>{
        deviceRef.current = new Device();
        // load the device
        if(!socket){
            console.log('Socket not initialized yet');
            return;
        }
        await socket.current.emit('getRtpCap',async(rtpCaps)=>{
            try{
                await deviceRef.current.load({ routerRtpCapabilities: rtpCaps });
                console.log('Device loaded successfully:', deviceRef.current.loaded);
                setDeviceReady(true);
            }catch(err){
                console.log(err);
                if(err.name === 'UnsupportedError'){
                    console.warn("browser not supported");
                }
            }
        });
    }
    const startProduction = async()=>{
        // 1. Create producer transport and connect client transport to server's transport
        try{
            await navigator.mediaDevices.getUserMedia({
                audio:true,
                video:true
            })
            .then((stream)=>setLocalStream(stream));
            localVideoRef.current.srcObject = localStream;
        }catch(error){
            console.log("GUM error",error);
        }
        // 2. Add listeners of producerTransport
        socket.current.emit('create-producer-transport',{kind:"video"},async (data)=>{
            console.log(data);
            const {id,iceParameters,iceCandidates,dtlsParameters} = data;
            const transport = deviceRef.current.createSendTransport({
                id,
                iceParameters,
                iceCandidates,
                dtlsParameters
            });
            producerTransportRef.current.video = transport;
            setIsProducerTransportReady(true);
    
            producerTransportRef.current.video.on('connect',async ({dtlsParameters},callback,errback)=>{
                console.log("Producer transport connected !",dtlsParameters);
        
                await socket.current.emit('connect-producer-transport',{kind:"video",dtlsParameters},(res)=>{
                    console.log(res);
        
                    if(res==="success"){
                        callback(); // must be called after server side transport is being connected to the router
                    }
                    else{
                        errback();
                    }
                });
            })
            producerTransportRef.current.video.on('produce',async(parameters,callback,errback)=>{
                console.log('Transport producer event fired!');
    
                const {kind,rtpParameters} = parameters;
                await socket.current.emit('start-producing',{kind,rtpParameters},(res)=>{
                    console.log(res);
    
                    if(res==="error"){
                        console.error('Something went wrong when server tried to produce the feed to the router');
                        errback();
                    }
                    else{
                        callback({id:res});
                    }
                });
            })
        });
        socket.current.emit('create-producer-transport',{kind:"audio"},async (data)=>{
            console.log(data);
            const {id,iceParameters,iceCandidates,dtlsParameters} = data;
            const transport = deviceRef.current.createSendTransport({
                id,
                iceParameters,
                iceCandidates,
                dtlsParameters
            });
            producerTransportRef.current.audio = transport;
            setIsProducerTransportReady(true);
    
            producerTransportRef.current.audio.on('connect',async ({dtlsParameters},callback,errback)=>{
                console.log("Producer transport connected !",dtlsParameters);
        
                await socket.current.emit('connect-producer-transport',{kind:"audio",dtlsParameters},(res)=>{
                    console.log(res);
        
                    if(res==="success"){
                        callback(); // must be called after server side transport is being connected to the router
                    }
                    else{
                        errback();
                    }
                });
            })
            producerTransportRef.current.audio.on('produce',async(parameters,callback,errback)=>{
                console.log('Transport producer event fired!');
    
                const {kind,rtpParameters} = parameters;
                await socket.current.emit('start-producing',{kind,rtpParameters},(res)=>{
                    console.log(res);
    
                    if(res==="error"){
                        console.error('Something went wrong when server tried to produce the feed to the router');
                        errback();
                    }
                    else{
                        callback({id:res});
                    }
                });
            })
        });

        // // 3. Publish the feed
        // const track = localStream.getVideoTracks()[0];
        // producerRef.current = await producerTransportRef.current.produce({track});
    }
    const publishFeed = async()=>{
        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        producerRef.current = {
            audio: await producerTransportRef.current.audio.produce({ track: audioTrack }),
            video: await producerTransportRef.current.video.produce({ track: videoTrack }),
        };

        // allProducers.current.push(producerRef.current); // TODO: consuming self-stream for testing
        setIsConsumerTransportReady(true);
        console.log(allProducers.current);
    }
    useEffect(()=>{
        if(!isProducerTransportReady || !localStream) return;
        console.log("Publishing feed...");
        // 3. Publish the feed
        publishFeed();
    },[isProducerTransportReady,localStream])

    const startConsumption = async()=>{
        // 1. Create consumer transport (single transport to consume all consumers)
        socket.current.emit('create-consumer-transport',{kind:"video"},async (data)=>{
            console.log(data);
            const {id,iceParameters,iceCandidates,dtlsParameters} = data;
            const transport = deviceRef.current.createRecvTransport({
                id,
                iceParameters,
                iceCandidates,
                dtlsParameters
            });
            consumerTransportRef.current.video = transport;
            
            console.log("Cosumer transport created!")
            // 2. add event listence to connect to server's side transport when triggered to use
            consumerTransportRef.current.video.on('connect',async ({dtlsParameters},callback,errback)=>{
                console.log("Consumer transport connected !",dtlsParameters);
        
                await socket.current.emit('connect-consumer-transport',{kind:"video",dtlsParameters},(res)=>{
                    console.log(res);
        
                    if(res==="success"){
                        callback(); // must be called after server side transport is being connected to the router
                    }
                    else{
                        errback();
                    }
                });
            })
        });

        socket.current.emit('create-consumer-transport',{kind:"audio"},async (data)=>{
            console.log(data);
            const {id,iceParameters,iceCandidates,dtlsParameters} = data;
            const transport = deviceRef.current.createRecvTransport({
                id,
                iceParameters,
                iceCandidates,
                dtlsParameters
            });
            consumerTransportRef.current.audio = transport;
            
            console.log("Cosumer transport created!")
            // 2. add event listence to connect to server's side transport when triggered to use
            consumerTransportRef.current.audio.on('connect',async ({dtlsParameters},callback,errback)=>{
                console.log("Consumer transport connected !",dtlsParameters);
        
                await socket.current.emit('connect-consumer-transport',{kind:"audio",dtlsParameters},(res)=>{
                    console.log(res);
        
                    if(res==="success"){
                        callback(); // must be called after server side transport is being connected to the router
                    }
                    else{
                        errback();
                    }
                });
            })
        });
        
    }

    // const consumeFeed = async()=>{
    //     if(allProducers.current.length=== 0){
    //         console.log("No producer available to consume from , let someone join !");
    //         return;
    //     }
    //     // 3. consume the feed
    //     // TODO : sending only one producer for testing
    //     for(const producer of allProducers.current){
    //         // don't consume if already consuming TODO: Handle clean up
    //         if(consuming.current.has(producer.producerId)){
    //             continue;
    //         }
    //     await socket.current.emit('start-consuming',{producerId:producer.producerId,clientRtpCapabilities:deviceRef.current.rtpCapabilities,kind:producer.kind},async res=>{
    //         console.log(res);
            
    //         if(res==="error"){
    //             console.error('Something went wrong when server tried to consume the feed from the router');
    //             return;
    //         }
    //         const {id,producerId,kind,rtpParameters} = res;
    //         console.log("BBB:",res);
    //         const consumer =  await consumerTransportRef.current.consume({
    //             id,
    //             producerId:producerId,
    //             kind,
    //             rtpParameters
    //         })
    //         consumerRef.current[producerId] =consumer;
    
    //         await socket.current.emit('resume-consuming',{consumerId:consumer.id},()=>{
    //             try{
    //                 const { track } = consumer;
    //                 const newRemoteStream = new MediaStream([track]);
    //                 setRemoteStreams((prev)=>{
    //                     return [...prev,newRemoteStream]
    //                 });
    //                 remoteVideoRef.current.srcObject = new MediaStream([track]);
    //             }catch(error){
    //                 console.log('Error in resuming consumer feed on client side',error);
    //             }
    //         })
    //         // resume the tracks
    //         await consumer.resume();

    //     });
    //     consuming.current.add(producer.producerId);
    //     }
    // }

    // useEffect(()=>{
    //     if(!otherPeerPresent) return;
    //     console.log("Consuming feed of other peer...");
    //     consumeFeed();
    // },[otherPeerPresent])

    // client code (FIXED)

const consumeFeed = async () => {
    if (allProducers.current.length === 0) {
        console.log("No producers available to consume from.");
        return;
    }

    for (const producer of allProducers.current) {
        // Skip if we are already consuming this producer
        if (consuming.current.has(producer.producerId)) {
            continue;
        }

        // Emit 'start-consuming' to the server
        socket.current.emit('start-consuming', {
            producerId: producer.producerId,
            clientRtpCapabilities: deviceRef.current.rtpCapabilities,
            kind: producer.kind
        }, async (res) => {
            if (res.error) {
                console.error(`Error consuming producer ${producer.producerId}:`, res.details);
                return;
            }

            const { id, producerId, kind, rtpParameters } = res;

            // --- THIS IS THE CRITICAL FIX ---
            // 1. Select the correct transport (video or audio) based on the kind
            const transportToUse = kind === 'video'
                ? consumerTransportRef.current.video
                : consumerTransportRef.current.audio;

            if (!transportToUse) {
                console.error(`Consumer transport for kind "${kind}" not found!`);
                return;
            }

            // 2. Consume on the *correct* transport
            const consumer = await transportToUse.consume({
                id,
                producerId,
                kind,
                rtpParameters,
            });
            consumerRef.current[consumer.id] = consumer; // Store by consumer.id for easier management

            // 3. Resume the consumer on the server
            await socket.current.emit('resume-consuming', { consumerId: consumer.id }, (resumeResult) => {
                 if (resumeResult && resumeResult.error) {
                    console.error('Error resuming consumer:', resumeResult.error);
                    return;
                 }
                console.log(`Resumed consumer for kind: ${kind}`);
            });
            
            // 4. Handle the received track correctly
            const { track } = consumer;
            
            // Update state with the new stream, associating it with its producerId and kind
            setRemoteStreams((prevStreams) => {
                // Prevent duplicate entries
                if (prevStreams.find(s => s.id === producerId && s.kind === kind)) {
                    return prevStreams;
                }
                return [
                    ...prevStreams,
                    { id: producerId, stream: new MediaStream([track]), kind: kind }
                ];
            });

            // Mark this producer as being consumed
            consuming.current.add(producer.producerId);
        });
    }
};
    const joinRoom = async()=>{
        try{
            await deviceSetup();
            await startProduction();
            await startConsumption();
            console.log("WORKING : Successfully joined room !");
        }
        catch(error){
            console.log("Something went wrong in starting production or consumption...",error);
            return;
        }
    };
    const lenaStart = async()=>{
        if(!isConsumerTransportReady || allProducers.current.length === 0){
            console.log("Check something....",allProducers.current);
            return;
        }
        console.log("Lena start called...");
        setOtherPeerPresent(true);
        consumeFeed();
    }

    const contextValues = useMemo(()=>({
        socket,
        localStream,
        isConnected,
        remoteStreams,
        joinRoom,
        lenaStart
        
    }),[socket,localStream,isConnected,remoteStreams,lenaStart]);
    return (
        <SocketContext.Provider value={contextValues}>
            {props.children}
        </SocketContext.Provider>
    );
};
export { SocketContext };