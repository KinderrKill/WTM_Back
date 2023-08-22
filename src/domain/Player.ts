import { randomUUID } from 'crypto';

export class Player {
  private uuid: string;
  private socketId: string;
  private username: string;
  private readyToPlay: boolean;

  constructor(socketId: string, username: string) {
    this.uuid = randomUUID();
    this.socketId = socketId;
    this.username = username;
    this.readyToPlay = false;
  }

  setSocketId(socketId: string) {
    this.socketId = socketId;
  }

  getUUID() {
    return this.uuid;
  }

  getSocketId() {
    return this.socketId;
  }

  getUsername() {
    return this.username;
  }

  isReadyToPlay() {
    return this.readyToPlay;
  }

  toggleReadyToPlay() {
    this.readyToPlay = !this.readyToPlay;
  }
}
