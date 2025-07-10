"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
let userCount = 0;
let allSockets = [];
wss.on("connection", (socket) => {
    userCount += 1;
    console.log("User connected, #", userCount);
    // // Handle disconnection and removal from the array
    // socket.on("close", () => {
    //     userCount -= 1;
    //     console.log("User disconnected, #", userCount);
    //     // Remove socket from allSockets
    //     allSockets = allSockets.filter(s => s !== socket);
    //     console.log("Socket removed from allSockets");
    // });
    // now user will send objects
    socket.on("message", (message) => {
        var _a;
        //{"type": "join"...}
        const parseMssg = JSON.parse(message); //why did we do that
        if (parseMssg.type === "join") {
            allSockets.push({
                socket,
                room: parseMssg.payload.roomId
            });
        }
        if (parseMssg.type === "chat") {
            const currentUserRoom = (_a = allSockets.find((x) => x.socket == socket)) === null || _a === void 0 ? void 0 : _a.room;
            allSockets.forEach(x => {
                if (x.room == currentUserRoom) {
                    x.socket.send(parseMssg.payload.message);
                }
            });
        }
    });
});
//# sourceMappingURL=index.js.map