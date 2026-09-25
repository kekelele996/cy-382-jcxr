import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, path: '/socket.io' })
export class ChatGateway {
  @WebSocketServer() server!: Server;
  @SubscribeMessage('trip-message')
  handleMessage(@MessageBody() body: { tripId: number; sender: string; content: string; type: string }) {
    this.server.to(`trip-${body.tripId}`).emit('trip-message', { ...body, sentAt: new Date().toISOString() });
  }
  @SubscribeMessage('join-trip')
  join(@MessageBody() body: { tripId: number }, @ConnectedSocket() client: Socket) {
    client.join(`trip-${body.tripId}`);
    return { room: `trip-${body.tripId}` };
  }
  @SubscribeMessage('board-changed')
  boardChanged(@MessageBody() body: { tripId: number }, @ConnectedSocket() client: Socket) {
    client.broadcast.to(`trip-${body.tripId}`).emit('board-updated', { tripId: body.tripId, at: new Date().toISOString() });
  }
}
