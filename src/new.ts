import { WebSocketServer, WebSocket } from "ws";

const PORT = +(process.env.PORT || 8081);

const wss = new WebSocketServer({ port: PORT });
console.log(`✅ WebSocket server started at ws://0.0.0.0:${PORT}`);


const rooms = new Map<string, Set<WebSocket>>();

interface UserInfo {
  room: string;
  name: string;
}

const users = new Map<WebSocket, UserInfo>();

// Helper function to broadcast user count to a room
function broadcastUserCount(room: string) {
  const roomUsers = rooms.get(room);
  if (roomUsers) {
    const count = roomUsers.size;
    const userCountMsg: ServerMessage = {
      type: "user_count",
      count,
      room,
    };
    
    roomUsers.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(userCountMsg));
      }
    });
  }
}

// Incoming message types
type ClientMessage =
  | { type: "join"; room: string; name: string }
  | { type: "chat"; text: string };

// Outgoing message types
type ServerMessage =
  | { type: "info"; message: string }
  | { type: "error"; message: string }
  | { type: "chat"; text: string; room: string; from: string }
  | { type: "user_count"; count: number; room: string };

wss.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("message", (data) => {
    let msg: ClientMessage;

    // Parse & validate message
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      socket.send(
        JSON.stringify({ type: "error", message: "Invalid JSON format" })
      );
      return;
    }

    if (!msg.type) {
      socket.send(
        JSON.stringify({ type: "error", message: "Missing message type" })
      );
      return;
    }

    // Handle join
    if (msg.type === "join") {
      const { room, name } = msg;

      if (
        typeof room !== "string" ||
        typeof name !== "string" ||
        !room.trim() ||
        !name.trim()
      ) {
        socket.send(
          JSON.stringify({ type: "error", message: "Invalid join payload" })
        );
        return;
      }

      // Remove from previous room if exists
      const oldInfo = users.get(socket);
      if (oldInfo) {
        rooms.get(oldInfo.room)?.delete(socket);
        if (rooms.get(oldInfo.room)?.size === 0) {
          rooms.delete(oldInfo.room);
        } else {
          // Broadcast updated count to old room
          broadcastUserCount(oldInfo.room);
        }
      }

      // Add to new room
      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }
      rooms.get(room)!.add(socket);

      // Save user info
      users.set(socket, { room, name });

      console.log(`👤 ${name} joined room: ${room}`);

      const infoMsg: ServerMessage = {
        type: "info",
        message: `You joined room: ${room}`,
      };
      socket.send(JSON.stringify(infoMsg));
      
      // Broadcast updated user count to the room
      broadcastUserCount(room);
      return;
    }

    // Handle chat
    if (msg.type === "chat") {
      const userInfo = users.get(socket);

      if (!userInfo) {
        socket.send(
          JSON.stringify({ type: "error", message: "You must join a room first" })
        );
        return;
      }

      const { room, name } = userInfo;

      const chatMsg: ServerMessage = {
        type: "chat",
        text: msg.text,
        room,
        from: name,
      };

      // Broadcast to everyone in the room
      rooms.get(room)?.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(chatMsg));
        }
      });

      return;
    }

    // Unknown type
    socket.send(
      JSON.stringify({ type: "error", message: "Unknown message type" })
    );
  });

  socket.on("close", () => {
    const userInfo = users.get(socket);

    if (userInfo) {
      const { room, name } = userInfo;
      rooms.get(room)?.delete(socket);
      if (rooms.get(room)?.size === 0) {
        rooms.delete(room);
      } else {
        // Broadcast updated count to remaining users in the room
        broadcastUserCount(room);
      }
      users.delete(socket);
      console.log(`❎ ${name} disconnected from ${room}`);
    } else {
      console.log("❎ User disconnected");
    }
  });
});
