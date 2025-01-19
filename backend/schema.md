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
    "roomId":"ABCD"
}
```

# Join Room (Send)

```
{
    action: "join",
    roomId: "ABCD"
}
```

After joining, the server will **broadcast** back to the host.

```
{
    "action": "joined",
    "roomId":"ABCD"
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
    audio: blob,
}
```

to all connections. The frontend will compare the playerId to the internal playerId.

If it is the player's turn - the player will go through with playing with the game and record their individual audio tracks and send the data back.

```
{
    action: "recording",
    roomId: "ABCD"
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

And so on until the last player. 

## Challenge
Instead of sending a `turn` message, the last player will receive a `challenge` message.
The frontend should prompt the last player to guess the original song.
```
{
    action: "challenge"
    playerId: 2,
    audio: blob,
}
```

The frontend shall respond with the players of the song.
```
{
    action: "guess",
    roomId: "ABCD"
    playerId: 1,
    guess: string,
}
```


## End
At the end of the game, the server will send an end message signalling the end of the game:
- `song` is the actual title of the song
- `guess` is the guess of the song given by the last player
```
{
    action: "end",
    song: string,
    guess: string,
    audios: Array[blob]
}
```

which will then move all the players to the last screen
