import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "./WebSocketContext";
import { useParams } from "react-router-dom";

enum GameState {
    LOBBY,  
    LISTENING,
    RECORDING,
    WAITING,
    END 
}

function Room() {
  const { roomCode } = useParams();
  const websocket = useWebSocket();
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY)
  const [playerId, setPlayerId] = useState()

  useEffect(() => {
    if (!websocket) {
      console.error("WebSocket is not available.");
      return;
    }

    websocket.send(JSON.stringify({ action: "join", roomId: roomCode }));

    websocket.onmessage = (e) => {
      const res = JSON.parse(e.data);
      console.log("Message from server:", res);
      switch (res.action) {
        case "turn":
            console.log(`turn`)
            console.log(res)
            setPlayerId(res.playerId)
            setGameState(GameState.WAITING)
        
            break;
        case "recording":
            if (res.playerId != playerId) {
                console.log(`It's not your turn. It's ${res.playerId}'s turn`)
                return
            }
            setGameState(GameState.RECORDING)
            const audioBlob = res.audio
            break;
        case "end":
            setGameState(GameState.END)
            break
      }
    };
  }, [websocket, roomCode]);

  const handleStart = () => {
    if (!websocket) {
      console.error("WebSocket is not available.");
      return;
    }
    websocket.send(JSON.stringify({ action: "start", roomId: roomCode }));
  };

  const handleSubmitRecording = () => {
    if (!websocket) {
        console.error("WebSocket is not available.")
        return
    }
    const req = {
        action: "turn",
        playerId: playerId,
        audio: "blob"
    }
    websocket.send(JSON.stringify(req))
  }

  return (
    <div>
        {gameState === GameState.LOBBY && <> <h1>Room Code: {roomCode}</h1>
        <button onClick={handleStart}>Start Game</button></>}
        {gameState === GameState.WAITING && <>
            <h2>You are: Player {playerId}</h2>
            <h1>Please wait for your turn...</h1>
        </> }
        {gameState === GameState.RECORDING && <><h1>ur turn</h1>
            </>}
        {gameState === GameState.END && <h1>What is the song?</h1>}
    
    </div>
  );
}

export default Room;