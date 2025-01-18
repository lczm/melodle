// Define the socket globally
window.socket = new WebSocket("ws://localhost:8080/ws");

// Open connection
window.socket.addEventListener("open", function (event) {
  console.log("WebSocket connection opened");
});

// Listen for incoming messages
window.socket.addEventListener("message", function (event) {
  console.log("Message received from server:", event.data);
});

// Handle errors
window.socket.addEventListener("error", function (event) {
  console.error("WebSocket error:", event);
});

// Handle connection close
window.socket.addEventListener("close", function (event) {
  console.log("WebSocket connection closed:", event);
});

// Send the initial "create" message
// const message = JSON.stringify({ action: "create" });
// window.socket.send(message);
// console.log("Message sent:", message);
