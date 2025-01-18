package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Room struct {
	ID      string
	Clients map[*websocket.Conn]bool
	mu      sync.Mutex
}

// Messages
// Turn message signals the turn of the next player with given player id..
// Frontend shall present audio recording to the next player.
type TurnMsg struct {
	// Shall be "turn"
	Action string `json:"action"`
	// Current Player's Id.
	PlayerId int `json:"playerId"`
	// Base64 encoded audio recording MP3 to play to the player
	Audio string `json:"audio"`
}

// Recording message is sent by current player (current turn) to submit their recording.
type RecordingMsg struct {
	// Shall be "recording"
	Action string `json:"action"`
	// Player Id of the player submitting the recording.
	// Message will be ignored if its not currently the player's turn.
	PlayerId int `json:"playerId"`
	// Base64 encoded audio MP3 recording submitted by the player
	Audio string `json:"audio"`
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
	}
	return id
}

// fisher yates shuffle
func shuffleArray(arr []int) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := len(arr) - 1; i > 0; i-- {
		j := r.Intn(i + 1)
		arr[i], arr[j] = arr[j], arr[i]
	}
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
					}
					clientList = append(clientList, clientInfo)
				}

				roomInfo := map[string]interface{}{
					"roomId":       roomID,
					"totalClients": len(room.Clients),
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
			room.mu.Unlock()

			conn.WriteJSON(map[string]string{
				"action": "created",
				"roomId": roomID,
			})

		case "join":
			room, exists := rooms[msg.RoomID]
			if !exists {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Room not found from join",
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
					"message": "Room not found from start",
				})
				continue
			}

			room.mu.Lock()
			totalCount := len(room.Clients)
			room.mu.Unlock()

			// Anyone can start the game
			// isHost := room.Host == conn
			// if !isHost {
			// 	conn.WriteJSON(map[string]string{
			// 		"action":  "error",
			// 		"message": "Only host can start game",
			// 	})
			// 	continue
			// }

			if totalCount != 3 {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Cannot start game with less than 3 players",
				})
				continue
			}

			// Create and shuffle the array
			numbers := []int{1, 2, 3}
			shuffleArray(numbers)

			// Broadcast game start to all clients with a random playerId
			index := 0
			for client := range room.Clients {
				client.WriteJSON(map[string]interface{}{
					"action":   "turn",
					"playerId": numbers[index],
				})
				index++
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
