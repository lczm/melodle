import React, { createContext, useContext, useMemo } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const websocket = useMemo(() => new WebSocket('ws://206.189.40.120:8080/ws'), []);
  console.log("hello")

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);