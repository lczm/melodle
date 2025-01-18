import React, { createContext, useContext, useMemo, ReactNode } from 'react';

const WebSocketContext = createContext<WebSocket | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const websocket = useMemo(() => new WebSocket('ws://206.189.40.120:8080/ws'), []);

  websocket.onopen = () => {
    console.log('WebSocket Connected');
  };

  websocket.onclose = () => {
    console.log('WebSocket Disconnected');
  };

  websocket.onerror = (error) => {
    console.error('WebSocket Error:', error);
  };

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
