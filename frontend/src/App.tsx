import { useState } from "react";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./Home";
import Room from "./Room"
import { WebSocketProvider } from "./WebSocketContext";

function App() {

  return <div>
    <WebSocketProvider>
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/room/:roomCode" element={<Room/>}/>
    </Routes>
    </WebSocketProvider>
   
  </div>
}

export default App;
