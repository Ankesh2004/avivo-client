// src/components/RealtimeAgentWidget.jsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { Button } from "@/components/ui/button"; // Assuming you use shadcn/ui
import { Phone, PhoneOff, Mic } from "lucide-react"; // Example icons

// A helper component for the status indicator
const StatusIndicator = ({ isConnected }) => (
  <div className="flex items-center space-x-2">
    <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
    <span className="text-sm text-gray-600">{isConnected ? 'Connected' : 'Not Connected'}</span>
  </div>
);

export default function RealtimeAgentWidget({
  agentName = 'Assistant',
  agentInstructions = 'You are a friendly and helpful assistant. Keep your responses concise.',
  tokenUrl = 'https://localhost:3001/api/get-token'
}) {
  const [status, setStatus] = useState('Not Connected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // Note: Transcript state is ready for future use if you want to display it.
  const [transcript, setTranscript] = useState(''); 
  const sessionRef = useRef(null);

  const getEphemeralToken = useCallback(async () => {
    try {
      const response = await fetch(tokenUrl, { method: 'POST' });
      if (!response.ok) throw new Error(`Server error (${response.status})`);
      const data = await response.json();
      if (!data.token) throw new Error('Token not found in server response.');
      return data.token;
    } catch (error) {
      console.error("Error fetching token:", error);
      setStatus(`Error: ${error.message}`);
      return null;
    }
  }, [tokenUrl]);

  const handleConnect = useCallback(async () => {
    if (sessionRef.current) return; // Prevent multiple connections

    setIsConnecting(true);
    setTranscript('');
    setStatus('Requesting token...');

    const ephemeralKey = await getEphemeralToken();
    if (!ephemeralKey) {
      setIsConnecting(false);
      return;
    }

    try {
      setStatus('Creating agent...');
      const agent = new RealtimeAgent({ name: agentName, instructions: agentInstructions });
      
      setStatus('Creating session...');
      const session = new RealtimeSession(agent, { model: 'gpt-4o-mini-realtime-preview' });
      sessionRef.current = session;

      session.on('error', (error) => {
        console.error('Session runtime error:', error);
        setStatus(`Error: ${error.message}`);
      });
      
      // You can listen to transcript updates like this:
      // session.on('transcript', (newTranscript) => {
      //   setTranscript(prev => prev + ' ' + newTranscript);
      // });

      setStatus('Connecting to session...');
      await session.connect({ apiKey: ephemeralKey });
      
      setIsConnected(true);
      setStatus('Connected');
    } catch (error) {
      console.error('Connection failed:', error);
      setStatus(`Error: ${error.message}`);
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
    } finally {
      setIsConnecting(false);
    }
  }, [getEphemeralToken, agentName, agentInstructions]);

  const handleDisconnect = useCallback(() => {
    if (sessionRef.current) {
      console.log("Closing session.");
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsConnected(false);
    setStatus('Not Connected');
  }, []);

  const handleToggleConnection = () => {
    if (isConnected) {
      handleDisconnect();
    } else {
      handleConnect();
    }
  };

  // Effect for cleaning up the session when the component unmounts
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        console.log("Widget unmounting. Cleaning up session.");
        handleDisconnect();
      }
    };
  }, [handleDisconnect]);

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white w-full max-w-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">AI Agent</h3>
        <StatusIndicator isConnected={isConnected} />
      </div>
      
      <p className="text-sm text-gray-500 min-h-[40px] mb-4">
        Status: {isConnecting ? 'Connecting...' : status}
      </p>

      <Button
        onClick={handleToggleConnection}
        disabled={isConnecting}
        className="w-full"
      >
        {isConnected ? (
          <>
            <PhoneOff className="mr-2 h-4 w-4" /> Disconnect
          </>
        ) : (
          <>
            <Phone className="mr-2 h-4 w-4" /> Connect to Agent
          </>
        )}
      </Button>
    </div>
  );
}