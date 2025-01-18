# Quick checks

Download `websocat` somehow - it's in the brew repositories if you're using that.

## Create room

```
cat create_room.json | websocat ws://localhost:8080/ws
```

## Join room

```
cat join_room.json | websocat ws://localhost:8080/ws
```
