import { useEffect } from "react";
import { useWebSocket } from "./WebSocketContext";
import { useParams } from "react-router-dom";

function Room() {
  const { roomCode } = useParams();
  const websocket = useWebSocket();

  useEffect(() => {
    if (!websocket) {
      console.error("WebSocket is not available.");
      return;
    }

    websocket.send(JSON.stringify({ action: "join", roomId: roomCode }));

    websocket.onmessage = (e) => {
      const res = JSON.parse(e.data);
      console.log("Message from server:", res);
    };
  }, [websocket, roomCode]);

  const handleStart = () => {
    if (!websocket) {
      console.error("WebSocket is not available.");
      return;
    }
    websocket.send(JSON.stringify({ action: "start", roomId: roomCode }));
  };

  return (
    <div>
      <h1>Room Code: {roomCode}</h1>
      <button onClick={handleStart}>Start Game</button>
    </div>
  );
}

export default Room;