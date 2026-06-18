import { Injectable } from '@nestjs/common';
import { SocketGateway } from './socket.getway';

@Injectable()
export class SocketService {
  constructor(private readonly gateway: SocketGateway) { }

  /** Broadcast to all connected clients */
  emit(event: string, payload: any) {
    this.gateway.server.emit(event, payload);
  }

  getServer() {
    return this.gateway.server;
  }

  /** Send to a specific socket room (user ID or room name) */
  emitToRoom(room: string, event: string, payload: any) {
    this.gateway.server.to(room).emit(event, payload);
  }

  /** Alias: send to a specific user by userId (user must join room with their userId) */
  emitToUser(userId: string, event: string, payload: any) {
    this.gateway.server.to(userId).emit(event, payload);
  }
}
