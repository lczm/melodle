package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Room struct {
	ID      string
	Clients map[*websocket.Conn]bool
	Turns   []int
	// current turn index
	Index int
	// recordings from players
	Recordings [][]byte
	mu         sync.Mutex
}

type Song struct {
	Title string
	Audio []byte
}

var (
	songs    = make([]Song, 0, 1)
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

func reverseRecordings(recordings [][]byte) {
	for i, j := 0, len(recordings)-1; i < j; i, j = i+1, j-1 {
		recordings[i], recordings[j] = recordings[j], recordings[i]
	}
}

func broadcastEnd(room *Room) {
	// reverse recordings so that last players recording plays first until the song is playered
	reverseRecordings(room.Recordings)

	// broadcast end of game with all audio recordings
	room.mu.Lock()
	for client := range room.Clients {
		client.WriteJSON(map[string]interface{}{
			"action": "end",
			"audios": room.Recordings,
		})
	}
	room.mu.Unlock()
}

// Broadcast turn message to all clients in a room with audio
func broadcastTurn(room *Room) {
	// Broadcast game start using first "turn" message
	room.mu.Lock()
	for client := range room.Clients {
		nRecordings := len(room.Recordings)
		client.WriteJSON(map[string]interface{}{
			"action":   "turn",
			"playerId": room.Turns[room.Index],
			// send last audio track to player to listen
			"audio": base64.RawStdEncoding.EncodeToString(room.Recordings[nRecordings-1]),
		})
	}
	room.mu.Unlock()
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
			Action   string  `json:"action"`
			RoomID   string  `json:"roomId"`
			PlayerId *int    `json:"playerId,omitempty"`
			Audio    *string `json:"audio,omitempty"`
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

			conn.WriteJSON(map[string]interface{}{
				"action":   "created",
				"roomId":   roomID,
				"playerId": 0,
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

			conn.WriteJSON(map[string]interface{}{
				"action":   "joined",
				"roomId":   msg.RoomID,
				"playerId": len(room.Clients),
			})

			room.mu.Lock()
			room.Clients[conn] = true
			room.mu.Unlock()

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

			// Create and shuffle the turn array
			room.Turns = []int{0, 1, 2}
			room.Index = 0
			shuffleArray(room.Turns)

			// Broadcast game start using first "turn" message with initial song
			room.Recordings = append(room.Recordings, songs[0].Audio)
			broadcastTurn(room)

		case "recording":
			room, exists := rooms[msg.RoomID]
			if !exists {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Room not found from recording",
				})
				continue
			}

			if msg.PlayerId == nil {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Expected playerId to be set in recording",
				})
			}

			// not current players turn ignore recording message
			turn := room.Turns[room.Index]
			if *msg.PlayerId != room.Turns[room.Index] {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": fmt.Sprintf("Not current players turn: got=%d, current=%d", msg.PlayerId, turn),
				})
			}

			if msg.Audio == nil {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Expected Audio to be set in recording",
				})
			}

			// save recording from user
			recording, err := base64.RawStdEncoding.DecodeString(*msg.Audio)
			if err != nil {
				conn.WriteJSON(map[string]string{
					"action":  "error",
					"message": "Failed to decode base64 audio recording from user in recording",
				})
			}
			room.Recordings = append(room.Recordings, recording)

			if room.Index == len(room.Clients)-1 {
				// last player has submitted recording
				broadcastEnd(room)
			} else {
				// advance to next turn
				room.Index++
				broadcastTurn(room)
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)

	// read song into base64 string
	songTitle := os.Args[1]
	songBytes, err := os.ReadFile(os.Args[2])
	if err != nil {
		log.Fatal("Failed to read songPath: ", err)
	}
	songs = append(songs, Song{songTitle, songBytes})

	port := ":8080"
	fmt.Printf("Server starting on %s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("ListenAndServe error:", err)
	}
}
