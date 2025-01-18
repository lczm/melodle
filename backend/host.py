import json
import websocket

def on_open(ws):
    print("WebSocket connection opened")

    # Create a room
    message = json.dumps({"action": "create"})
    ws.send(message)
    print("Message sent:", message)

def on_message(ws, message):
    print("Message received from server:", message)

def on_error(ws, error):
    print("WebSocket error:", error)

def on_close(ws, close_status_code, close_msg):
    print(f"WebSocket connection closed: {close_status_code}, {close_msg}")

if __name__ == "__main__":
    websocket_url = "ws://206.189.40.120:8080/ws"

    ws = websocket.WebSocketApp(
        websocket_url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )

    ws.run_forever()
