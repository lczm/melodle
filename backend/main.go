package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Room struct {
	ID      string
	Clients map[*websocket.Conn]bool
	Ready   map[*websocket.Conn]bool
	Host    *websocket.Conn
	mu      sync.Mutex
}

var (
	rooms    = make(map[string]*Room)
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for demo
		},
	}
)

func createRoom() string {
	id := strings.ToUpper(uuid.New().String()[:4]) // Get first 4 characters of UUID
	rooms[id] = &Room{
		ID:      id,
		Clients: make(map[*websocket.Conn]bool),
		Ready:   make(map[*websocket.Conn]bool),
	}
	return id
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	for {
		var msg struct {
			Action string `json:"action"`
			RoomID string `json:"roomId"`
		}

		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		switch msg.Action {
		case "debug":
			debugInfo := make(map[string]interface{})
			roomList := make([]map[string]interface{}, 0)

			for roomID, room := range rooms {
				room.mu.Lock()
				clientList := make([]map[string]interface{}, 0)

				for client := range room.Clients {
					clientInfo := map[string]interface{}{
						"address": client.RemoteAddr().String(),
						"isHost":  client == room.Host,
						"ready":   room.Ready[client],
					}
					clientList = append(clientList, clientInfo)
				}

				roomInfo := map[string]interface{}{
					"roomId":       roomID,
					"totalClients": len(room.Clients),
					"readyClients": len(room.Ready),
					"hostAddress":  room.Host.RemoteAddr().String(),
					"clients":      clientList,
				}
				roomList = append(roomList, roomInfo)
				room.mu.Unlock()
			}

			debugInfo["rooms"] = roomList
			debugInfo["totalRooms"] = len(rooms)

			conn.WriteJSON(map[string]interface{}{
				"action": "debug",
				"data":   debugInfo,
			})

		case "create":
			roomID := createRoom()
			room := rooms[roomID]
			room.mu.Lock()
			room.Clients[conn] = true
			// The room host, only the host can start the game
			room.Host = conn
			room.mu.Unlock()

			conn.WriteJSON(map[string]string{
				"action": "created",
				"roomId": roomID,
			})

		case "ready":
			room, exists := rooms[msg.RoomID]
			if !exists {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Room not found",
				})
				continue
			}

			room.mu.Lock()
			room.Ready[conn] = true
			readyCount := len(room.Ready)
			totalCount := len(room.Clients)
			room.mu.Unlock()

			// Broadcast to all
			for client := range room.Clients {
				client.WriteJSON(map[string]interface{}{
					"action":     "readyUpdate",
					"readyCount": readyCount,
					"totalCount": totalCount,
				})
			}

		case "join":
			room, exists := rooms[msg.RoomID]
			if !exists {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Room not found",
				})
				continue
			}

			// Temporary : Make a max of 3 players per room
			if len(room.Clients) == 3 {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Room is full",
				})
				continue
			}

			room.mu.Lock()
			room.Clients[conn] = true
			room.mu.Unlock()

			conn.WriteJSON(map[string]string{
				"action": "joined",
				"roomId": msg.RoomID,
			})

		case "start":
			room, exists := rooms[msg.RoomID]
			if !exists {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Room not found",
				})
				continue
			}

			room.mu.Lock()
			isHost := room.Host == conn
			readyCount := len(room.Ready)
			totalCount := len(room.Clients)
			room.mu.Unlock()

			if !isHost {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Only host can start game",
				})
				continue
			}

			// Start the game only if there is 3 players.
			if readyCount != totalCount {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Not all players are ready",
				})
				continue
			}

			// Broad game start to all clients
			for client := range room.Clients {
				client.WriteJSON(map[string]string{
					"action": "gameStarted",
					"roomId": msg.RoomID,
				})
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)

	port := ":8080"
	fmt.Printf("Server starting on %s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("ListenAndServe error:", err)
	}
}
