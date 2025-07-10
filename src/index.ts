import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

let userCount = 0;

// do it usig maps and record (ts)
interface User {
    socket: WebSocket,
    room: string
}
let allSockets: User[] = [];

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
        //{"type": "join"...}
        const parseMssg = JSON.parse(message as unknown as string)  //why did we do that

        if (parseMssg.type === "join"){
            allSockets.push({
                socket,
                room: parseMssg.payload.roomId
            })
        } 

        if (parseMssg.type === "chat"){
            const currentUserRoom = allSockets.find( (x) => x.socket == socket)?.room

            allSockets.forEach( x => {
                if ( x.room == currentUserRoom){
                    x.socket.send(parseMssg.payload.message)
                }
            });
        } 

        
    });
});