import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true, path: '/socket.io' })
export class BoardGateway {
  @WebSocketServer() server!: Server;

  /** 有人保存成功后广播，房间内其他成员立刻看到最新分工和剩余预算 */
  emitBoardChanged(tripId: number, payload: { reason: string; by: string; at: string }) {
    this.server.to(this.room(tripId)).emit('board-changed', { tripId, ...payload });
  }

  @SubscribeMessage('join-board')
  join(@ConnectedSocket() socket: Socket, @MessageBody() body: { tripId: number }) {
    socket.join(this.room(body.tripId));
    return { room: this.room(body.tripId) };
  }

  private room(tripId: number) {
    return `trip-${tripId}`;
  }
}
