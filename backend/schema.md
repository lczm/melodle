# Create Room (Send)

```
{
    action: "create"
}
```

After the room is created, the server will **broadcast** back to the host.

```
{
    "action":"created",
    "roomId":"81D8"
}
```

# Join Room (Send)

```
{
    action: "join",
    roomId: "ABCD"
}
```

After joining, the server will **broadcast** out the unique playerId

```
{
    playerId: 1
}
```

# Start Game (Send)

This will assume that there are 3 players in the lobby and everybody is ready to start the game. Only the host is able to start.

```
{
    action: "start",
    roomId: "ABCD"
}
```

After this is processed by the backend, the server will **broadcast**

```
{
    action: "turn",
    playerId: 1
}
```

to all connections. The frontend will compare the playerId to the internal playerId.

If it is the player's turn - the player will go through with playing with the game and record their individual audio tracks and send the data back.

```
{
    action: "recording",
    playerId: 1,
    audio: blob,
}
```

Once the backend receives this - it will process the data, and call the next player's turn.

```
{
    action: "turn",
    playerId: 2,
    audio: blob,
}
```

And so on until the last player. Then the server will **broadcast**

```
{
    action: "end",
    audios: Array[blob]
}
```

which will then move all the players to the last screen
