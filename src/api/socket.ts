
import { createServer } from "http";
import { Server } from 'socket.io'

const httpServer = createServer((req,res) => {
    console.log('hi')
});

export const io = new Server(httpServer,
    {
        cors: {
            origin: '*'
        }
    });

httpServer.listen( parseInt(process.env.SERVERPORT) || 3000)


console.log(`Initializing Socket.io Server on Port ${parseInt(process.env.SERVERPORT) || 3000}`)

