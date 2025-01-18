import { useState } from "react";
import "./App.css";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "./WebSocketContext";

function Home() {
  const [code, setCode] = useState("");
  const navigate = useNavigate()
  const ws = useWebSocket()
  console.log(ws)

  const handleClick = (): void => {
    console.log(code);
    navigate(`/room/${code}`)
  };
  const createRoom = () : void => {
    // const url = "ws://206.189.40.120:8080/ws"  
    // const ws = new WebSocket(url)
    ws.send(JSON.stringify({"action": "create"}))
    
    ws.onmessage = (e) => {
      console.log(e.data)
      const res = JSON.parse(e.data)
      if (res.action == "created") {
        navigate(`/room/${res.roomId}`)
      }
    }
  }
  return <>
              <input
                id="code"
                required
                placeholder="Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="min-w-0 flex-auto rounded-md bg-white/5 px-3.5 py-2 text-base text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
              />
             <button
                type="submit"
                onClick={handleClick}
                className="flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Enter
              </button>

              <button
              onClick={createRoom}
              className="flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              
              
              >Create Room</button>

  
  
  </>;
}

export default Home;
