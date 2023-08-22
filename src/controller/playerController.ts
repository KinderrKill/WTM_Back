import { Socket } from 'socket.io';
import { CreateGameData, JoinGameData } from './../utils/types.js';
import { Player } from './../domain/Player.js';
import { removeCookie, getPlayerByCookie } from '../utils/cookie.js';

export class PlayerController {
  private players: Player[];

  constructor() {
    this.players = [];
  }

  handleSocket(socket: Socket) {}

  // Player managment functions
  getPlayerByCreateGameSocket(socket: Socket, data: CreateGameData | JoinGameData): Player {
    let player: Player = null;

    if (data.cookie.length === 0) {
      player = this.createPlayer(socket, data.player.username);
      console.log('Create new player', player.getUUID());
    } else {
      player = getPlayerByCookie(data.cookie);
      if (player === undefined) {
        removeCookie(socket);
        player = this.createPlayer(socket, data.player.username);
        console.log('Remove cookie and create new player', player.getUUID());
      }
    }

    return player;
  }

  private createPlayer(socket: Socket, username: string): Player {
    const player = new Player(socket.id, username);

    this.players.push(player);

    return player;
  }

  removePlayer(uuid: string) {
    const playerIndex = this.players.findIndex((player) => player.getUUID() === uuid);
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1);
    }
  }

  getPlayerByUUID(uuid: string): Player | undefined {
    return this.players.find((player) => player.getUUID() === uuid);
  }

  getPlayerBySocketId(socketId: string): Player | undefined {
    return this.players.find((player) => player.getSocketId() === socketId);
  }
}
