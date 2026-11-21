// Sea Battle 3D — matchmaking lobby + relay.
// Players connect over WebSocket and send {"t":"find","room":""}. The first two players
// waiting in the same room are paired; after that every {"t":"msg",...} is forwarded to
// the partner as-is. The server never sees fleets, only the turn messages players exchange.
const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const waiting = new Map(); // room -> socket

const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("sea battle lobby ok\n");
});

const wss = new WebSocketServer({ server });

function send(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function unpair(ws) {
  if (waiting.get(ws.room) === ws) waiting.delete(ws.room);
  const p = ws.partner;
  ws.partner = null;
  if (p) {
    p.partner = null;
    send(p, { t: "left" });
  }
}

wss.on("connection", (ws) => {
  ws.alive = true;
  ws.partner = null;
  ws.room = null;
  ws.on("pong", () => (ws.alive = true));

  ws.on("message", (data) => {
    let m;
    try {
      m = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (m.t === "find") {
      unpair(ws);
      ws.room = String(m.room || "").slice(0, 32);
      const other = waiting.get(ws.room);
      if (other && other !== ws && other.readyState === other.OPEN) {
        waiting.delete(ws.room);
        ws.partner = other;
        other.partner = ws;
        // whoever waited longer shoots first
        send(other, { t: "matched", first: true });
        send(ws, { t: "matched", first: false });
      } else {
        waiting.set(ws.room, ws);
        send(ws, { t: "waiting" });
      }
    } else if (m.t === "cancel") {
      unpair(ws);
    } else if (m.t === "msg" && ws.partner) {
      send(ws.partner, m);
    }
  });

  ws.on("close", () => unpair(ws));
  ws.on("error", () => unpair(ws));
});

// keep connections alive through proxies and drop dead ones
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }
}, 25000);

server.listen(PORT, () => console.log("lobby listening on " + PORT));
