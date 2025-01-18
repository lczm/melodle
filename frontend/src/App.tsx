import { useState } from "react";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./Home";
import Room from "./Room"

function App() {
  return <div>
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/room/:roomCode" element={<Room/>}/>
    </Routes>
  </div>
}

export default App;
