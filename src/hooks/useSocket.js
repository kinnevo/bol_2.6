import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Generate a unique browser session ID
const getBrowserSessionId = () => {
  let sessionId = sessionStorage.getItem('browserSessionId');
  if (!sessionId) {
    sessionId = 'browser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('browserSessionId', sessionId);
  }
  return sessionId;
};

const BROWSER_SESSION_ID = getBrowserSessionId();

// Create socket with browser session ID
const createSocket = () => {
  console.log('🔌 Creating socket for browser session:', BROWSER_SESSION_ID);
  
  const socket = io('http://localhost:3001', {
    transports: ['websocket'],
    upgrade: true,
    rememberUpgrade: true,
    autoConnect: true,
    query: {
      browserSessionId: BROWSER_SESSION_ID
    }
  });

  socket.on('connect', () => {
    console.log('🟢 Socket connected:', socket.id, 'Browser Session:', BROWSER_SESSION_ID);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });

  // Handle server session for restart detection
  socket.on('server-session', (data) => {
    const lastServerSession = localStorage.getItem('serverSessionId');
    
    if (lastServerSession && lastServerSession !== data.sessionId) {
      console.log('🔄 Server restart detected, clearing local data');
      localStorage.removeItem('playerName');
      localStorage.removeItem('currentRoom');
      localStorage.removeItem('serverSessionId');
      sessionStorage.clear(); // Clear session data too
      window.location.href = '/?restart=true';
      return;
    }
    
    localStorage.setItem('serverSessionId', data.sessionId);
  });

  return socket;
};

// Single socket instance
let globalSocket = null;

const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Create socket only once
    if (!globalSocket) {
      globalSocket = createSocket();
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleError = (err) => setError(err.message);

    globalSocket.on('connect', handleConnect);
    globalSocket.on('disconnect', handleDisconnect);
    globalSocket.on('connect_error', handleError);

    // Set initial state
    setIsConnected(globalSocket.connected);

    // Cleanup - remove listeners but keep socket alive
    return () => {
      if (globalSocket) {
        globalSocket.off('connect', handleConnect);
        globalSocket.off('disconnect', handleDisconnect);
        globalSocket.off('connect_error', handleError);
      }
    };
  }, []);

  const emit = (event, data, callback) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit(event, data, callback);
    } else {
      console.warn('⚠️ Socket not connected. Cannot emit event:', event);
    }
  };

  const on = (event, handler) => {
    if (globalSocket) {
      globalSocket.on(event, handler);
    }
  };

  const off = (event, handler) => {
    if (globalSocket) {
      globalSocket.off(event, handler);
    }
  };

  const reconnect = () => {
    if (globalSocket && !globalSocket.disconnected) {
      globalSocket.disconnect();
      globalSocket.connect();
    }
  };

  const disconnect = () => {
    if (globalSocket) {
      console.log('🔴 Permanently disconnecting socket');
      try {
        globalSocket.disconnect();
      } catch (error) {
        console.warn('Error disconnecting socket:', error);
      }
      globalSocket = null;
      sessionStorage.removeItem('browserSessionId');
      setIsConnected(false);
    }
  };

  return {
    socket: globalSocket,
    isConnected,
    error,
    emit,
    on,
    off,
    reconnect,
    disconnect,
    browserSessionId: BROWSER_SESSION_ID
  };
};

export default useSocket;