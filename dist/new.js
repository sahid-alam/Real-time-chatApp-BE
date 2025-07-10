"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8081 });
console.log("WebSocket server started at ws://localhost:8081");
const rooms = new Map();
const users = new Map();
// Helper function to broadcast user count to a room
function broadcastUserCount(room) {
    const roomUsers = rooms.get(room);
    if (roomUsers) {
        const count = roomUsers.size;
        const userCountMsg = {
            type: "user_count",
            count,
            room,
        };
        roomUsers.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(JSON.stringify(userCountMsg));
            }
        });
    }
}
wss.on("connection", (socket) => {
    console.log("New user connected");
    socket.on("message", (data) => {
        var _a, _b, _c;
        let msg;
        // Parse & validate message
        try {
            msg = JSON.parse(data.toString());
        }
        catch (err) {
            socket.send(JSON.stringify({ type: "error", message: "Invalid JSON format" }));
            return;
        }
        if (!msg.type) {
            socket.send(JSON.stringify({ type: "error", message: "Missing message type" }));
            return;
        }
        // Handle join
        if (msg.type === "join") {
            const { room, name } = msg;
            if (typeof room !== "string" ||
                typeof name !== "string" ||
                !room.trim() ||
                !name.trim()) {
                socket.send(JSON.stringify({ type: "error", message: "Invalid join payload" }));
                return;
            }
            // Remove from previous room if exists
            const oldInfo = users.get(socket);
            if (oldInfo) {
                (_a = rooms.get(oldInfo.room)) === null || _a === void 0 ? void 0 : _a.delete(socket);
                if (((_b = rooms.get(oldInfo.room)) === null || _b === void 0 ? void 0 : _b.size) === 0) {
                    rooms.delete(oldInfo.room);
                }
                else {
                    // Broadcast updated count to old room
                    broadcastUserCount(oldInfo.room);
                }
            }
            // Add to new room
            if (!rooms.has(room)) {
                rooms.set(room, new Set());
            }
            rooms.get(room).add(socket);
            // Save user info
            users.set(socket, { room, name });
            console.log(`👤 ${name} joined room: ${room}`);
            const infoMsg = {
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
                socket.send(JSON.stringify({ type: "error", message: "You must join a room first" }));
                return;
            }
            const { room, name } = userInfo;
            const chatMsg = {
                type: "chat",
                text: msg.text,
                room,
                from: name,
            };
            // Broadcast to everyone in the room
            (_c = rooms.get(room)) === null || _c === void 0 ? void 0 : _c.forEach((client) => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(JSON.stringify(chatMsg));
                }
            });
            return;
        }
        // Unknown type
        socket.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
    });
    socket.on("close", () => {
        var _a, _b;
        const userInfo = users.get(socket);
        if (userInfo) {
            const { room, name } = userInfo;
            (_a = rooms.get(room)) === null || _a === void 0 ? void 0 : _a.delete(socket);
            if (((_b = rooms.get(room)) === null || _b === void 0 ? void 0 : _b.size) === 0) {
                rooms.delete(room);
            }
            else {
                // Broadcast updated count to remaining users in the room
                broadcastUserCount(room);
            }
            users.delete(socket);
            console.log(`❎ ${name} disconnected from ${room}`);
        }
        else {
            console.log("❎ User disconnected");
        }
    });
});
//# sourceMappingURL=new.js.map