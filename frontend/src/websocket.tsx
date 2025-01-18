import React, { createContext, useContext, useEffect, useRef } from "react";

const WebSocketContext = createContext<WebSocket | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const websocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = "ws://206.189.40.120:8080/ws";
    websocketRef.current = new WebSocket(url);

    websocketRef.current.onopen = () => {
      console.log("WebSocket connection opened");
    };

    websocketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    websocketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      websocketRef.current?.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={websocketRef.current}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};