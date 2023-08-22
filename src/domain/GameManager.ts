import { PlayerChoice } from './../utils/types';
import { Socket } from 'socket.io';
import { removeCookie } from '../utils/cookie.js';
import { Game } from './Game.js';
import { Player } from './Player.js';

export class GameManager {
  private maxRoomSize = 9;
  games: Game[];

  constructor() {
    this.games = [];
  }

  createGame(owner: Player, isPrivateGame: boolean): Game {
    const game = new Game(owner, isPrivateGame);
    this.games.push(game);

    console.log('🕹️ -> Partie créée !', game.getId());
    return game;
  }

  removeGame(id: string) {
    const gameIndex = this.games.findIndex((game) => game.getId() === id);
    if (gameIndex !== -1) {
      this.games.splice(gameIndex, 1);
    } else {
      console.error("❌ removeGame: Aucune partie trouvée avec l'ID", id);
    }
  }

  addPlayerToGame(socket: Socket, game: Game, player: Player) {
    game.addPlayerToGame(player);
    this.updateGame(socket, game);
  }

  removePlayerFromGame(socket: Socket, game: Game, player: Player) {
    game.removePlayerFromGame(player);
    setTimeout(() => {
      if (game.getPlayers().length <= 0) {
        this.removeGame(game.getId());
        removeCookie(socket);
      }
    }, 10 * 1000);

    this.updateGame(socket, game);
  }

  addPlayerChoice(socket: Socket, game: Game, playerChoice: PlayerChoice) {
    const pcIndex = game
      .getPlayerChoices()
      .findIndex((value) => value.round === game.getActualRound() && value.uuid === playerChoice.uuid);

    if (pcIndex !== -1) {
      game.getPlayerChoices()[pcIndex].choice = playerChoice.choice;
    } else {
      game.getPlayerChoices().push(playerChoice);
    }

    this.updateGame(socket, game);
  }

  allPlayerHaveChoosenAGif(game: Game) {
    const players = game.getPlayers();
    const choices = game.getPlayerChoices().filter((choice) => choice.round === game.getActualRound());

    return players.every((playerInGame) => choices.find((choice) => playerInGame.getUUID() === choice.uuid));
  }

  updateGame(socket: Socket, game: Game, updatePlayer: boolean = true) {
    const gameIndex = this.games.findIndex((g) => g.getId() === game.getId());
    if (gameIndex !== -1) {
      this.games[gameIndex] = game;
    } else {
      this.games.push(game);
    }

    if (updatePlayer) {
      this.updateGameForPlayers(socket, game);
    }
  }

  private updateGameForPlayers(socket: Socket, game: Game) {
    // For the sender
    socket.emit('update_game', { game });
    // For the others players
    socket.to(game.getId()).emit('update_game', { game });
  }

  getPublicGames(onlyEmptyGame: boolean): Game[] {
    return this.games.filter((game) =>
      onlyEmptyGame ? !game.isPrivate() && game.getPlayers().length <= this.maxRoomSize : !game.isPrivate()
    );
  }

  getPrivateGames(onlyEmptyGame: boolean): Game[] {
    return this.games.filter((game) =>
      onlyEmptyGame ? game.isPrivate() && game.getPlayers().length <= this.maxRoomSize : game.isPrivate()
    );
  }

  findGameByPlayer(player: Player): Game | undefined {
    if (player === undefined) return;
    return this.games.find((game) => game.getPlayerByUUID(player.getUUID()) !== undefined);
  }

  getGameById(id: string): Game | undefined {
    return this.games.find((game) => game.getId() === id);
  }
}
