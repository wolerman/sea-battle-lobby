# Sea Battle 3D lobby

Tiny WebSocket matchmaking + relay server for the Sea Battle 3D game.

- `{"t":"find","room":""}` – wait for an opponent (players in the same room are paired)
- `{"t":"matched","first":true|false}` – paired; `first` shoots first
- `{"t":"msg", ...}` – forwarded to the partner unchanged
- `{"t":"left"}` – the partner disconnected

Run locally: `npm install && npm start` (port from `PORT`, default 8080).
