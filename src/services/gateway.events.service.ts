import { MessageBody, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from "socket.io";

@WebSocketGateway()
export class GateWay implements OnGatewayDisconnect, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server: Server;
    
    afterInit(server: Server) {
        // Configure Redis adapter
        // const pubClient = new Redis({ host: 'localhost', port: 6379 });
        // const subClient = pubClient.duplicate();
        // server.adapter(createAdapter(pubClient, subClient));

        // Add authentication middleware
        server.use((socket: Socket, next) => {
            const token = socket.handshake.auth.token;
            if (token === process.env.GATEWAY_SECRET) {
                next();
            } else {
                next(new Error('Unauthorized'));
            }
        });
    }
    handleConnection(client: Socket) {
        console.log(`Client connected with id: ${client.id}`)
        client.on('error', (error:Error)=>{
            console.log(`Error: ${error.message}`)
        })
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected with id: ${client.id}`)
        
    }
    async emitEvent(event ,data){
        this.server.emit(event, data);
        console.log('data emited from this llm server')
    }

    @SubscribeMessage('send-message')
    handleMessage(@MessageBody() data:any) {
        this.server.emit('recive-message', data)
    }


    @SubscribeMessage('join-session')
    handleJoinSession(socket: Socket , data: {sessionId: string}){
        socket.join(data.sessionId);
        console.log(`Client with id: ${socket.id} joined session with id: ${data.sessionId}`)
        socket.emit('joined-session', {sessionId: data.sessionId})
    }
    
    @SubscribeMessage('leave-session')
    handleLeaveSession(socket:Socket, data:{sessionId: string}){
        socket.leave(data.sessionId)
        console.log(`Client with id ${socket.id} leaved session ${data.sessionId}`)
        socket.emit('leaved-session', {sessionId: data.sessionId})
    }
    
}
