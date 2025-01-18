import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "./WebSocketContext";
import { useLocation, useParams } from "react-router-dom";

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
  const location = useLocation();
  const { previousAction } = location.state || {}
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY)
  const [playerId, setPlayerId] = useState(0)
  const [audioUrl, setAudioUrl] = useState<null | string>()

  useEffect(() => {
    if (!websocket) {
      console.error("WebSocket is not available.");
      return;
    }

     // Convert Base64 to a binary Blob
     function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64); // Decode Base64 string
        const byteNumbers = Array.from(byteCharacters).map(char => char.charCodeAt(0));
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
      }
      console.log(previousAction)
      if (previousAction != "create") {
          websocket.send(JSON.stringify({ action: "join", roomId: roomCode }));
    }

    websocket.onmessage = (e) => {
      const res = JSON.parse(e.data);
      console.log("Message from server:", res);
      const state = res.action
      console.log(`Current state: ${state}`)
      switch (state) {
        case "joined":
            setPlayerId(res.playerId)
            break;

        case "turn":
            console.log(`turn`)
            console.log(`Currently recording: ${res.playerId}`)
            console.log(`You are: ${playerId}`)
            if (playerId === res.playerId) {
                setGameState(GameState.RECORDING)
                const aud = res.audio
                const audioBlob = base64ToBlob(aud, "audio/mpeg");
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);

            } else {
                setGameState(GameState.WAITING)
           
            }
            break;
 
        case "end":
            setGameState(GameState.END)
            break
      }
    };
  }, [websocket, roomCode, playerId]);

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
         <h2>You are: Player {playerId}</h2>
        {gameState === GameState.LOBBY && <> <h1>Room Code: {roomCode}</h1>
        <button onClick={handleStart}>Start Game</button></>}
        {gameState === GameState.WAITING && <>
           
            <h1>Please wait for your turn...</h1>
        </> }
        {gameState === GameState.RECORDING && 
        <>
            <h1>ur turn</h1>
            <audio src={audioUrl} controls></audio>
        </>}
        {gameState === GameState.END && <h1>What is the song?</h1>}
    
    </div>
  );
}

export default Room;