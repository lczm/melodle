import { useState } from "react";
import "./App.css";
import { useParams } from "react-router-dom";

function Room() {
  const { roomCode } = useParams()
  const reqBody = {
    "action": "join",
    "roomId": roomCode
  }

  const url = "http://206.189.40.120:8080/ws"

  const connectToRoom = async () => {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(reqBody)
      })

      if (!res.ok) {
        throw new Error(`gg error: ${res.status}`)
      }
      const resData = await res.json()
      console.log(resData)
  }

  connectToRoom()

  return <>
   
  
  </>;
}

export default Room;
