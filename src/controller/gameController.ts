import { SentenceManager } from './../domain/SentenceManager.js';
import { Socket } from 'socket.io';
import { Game } from '../domain/Game.js';
import {
  ConsultNextPageSocket,
  CreateGameData,
  JoinGameData,
  PHASE,
  PlayerChoiceSocket,
  PlayerType,
} from '../utils/types.js';
import { playerController } from '../index.js';
import { GenericData } from './../utils/types.js';
import { getGameByCookie, getPlayerByCookie, removeCookie, sendCookie } from '../utils/cookie.js';
import { GameManager } from '../domain/GameManager.js';

const MAX_ROOM_SIZE = 9;
const MAX_ROUND = 3;

export class GameController {
  private manager: GameManager;
  private sentenceManager: SentenceManager;

  private countdownInterval: NodeJS.Timeout | undefined;

  constructor() {
    this.manager = new GameManager();
    this.sentenceManager = new SentenceManager();

    this.countdownInterval = undefined;
  }

  handleSocket(socket: Socket) {
    socket.on('quick_game', (data: CreateGameData) => this.onQuickGameSocket(socket, data));
    socket.on('create_game', (data: CreateGameData) => this.onCreateGameSocket(socket, data, true));
    socket.on('join_game', (data: JoinGameData) => this.onJoinGameSocket(socket, data));

    socket.on('update_game_visibility', (gameId: string) => this.onUpdateGameVisibilitySocket(socket, gameId));
    socket.on('ready_to_play', (data: GenericData) => this.onReadyToPlaySocket(socket, data));

    socket.on('update_choice', (data: PlayerChoiceSocket) => this.onUpdateChoiceSocket(socket, data));

    socket.on('add_liked_meme', (data: PlayerChoiceSocket) => this.addLikedMeme(socket, data));
    socket.on('consult_next_page', (data: ConsultNextPageSocket) => this.onConsultNextPageSocket(socket, data));
    socket.on('display_podium', (data: GenericData) => this.onDisplayPodiumSocket(socket, data));

    socket.on('page_load', (data: PlayerType) => this.onPageLoadSocket(socket, data));
    socket.on('page_reload', (data: GenericData) => this.onPageReloadSocket(socket, data));

    socket.on('quit_game', (data: GenericData) => this.handleQuitGame(socket, data));
  }

  handleDisconnect(socket: Socket) {
    const player = playerController.getPlayerBySocketId(socket.id);
    if (player === undefined) return;

    const game = this.manager.findGameByPlayer(player);
    if (game === undefined) return;

    this.manager.removePlayerFromGame(socket, game, player);
    socket.leave(game.getId());
  }

  handleQuitGame(socket: Socket, data: GenericData) {
    const player = getPlayerByCookie(data.cookie);
    if (player === undefined) {
      console.log('Player is undefined when handle quit');
      return;
    }

    const game = this.manager.findGameByPlayer(player);
    if (game === undefined || game.getPlayerByUUID(player.getUUID()) === undefined) {
      console.log('Game is undefined when handle quit');

      return;
    }

    this.manager.removePlayerFromGame(socket, game, player);
    socket.leave(game.getId());
  }

  private onQuickGameSocket(socket: Socket, data: CreateGameData) {
    const player = playerController.getPlayerByCreateGameSocket(socket, data);

    const publicGames = this.manager.getPublicGames(true);
    publicGames.forEach((pb) => console.log(pb));

    let choosenGame: Game | null = null;

    if (publicGames.length === 0) {
      this.onCreateGameSocket(socket, data, false);
      return;
    }

    if (publicGames.length === 1) {
      choosenGame = publicGames[0];
    } else {
      const randomGameIndex = Math.floor(Math.random() * publicGames.length);
      choosenGame = publicGames[randomGameIndex];
    }

    if (choosenGame === null) return;

    this.manager.addPlayerToGame(socket, choosenGame, player);

    socket.emit('goto_game', { joiner: player, game: choosenGame });
    socket.join(choosenGame.getId());
  }

  private onCreateGameSocket(socket: Socket, data: CreateGameData, isPrivateGame: boolean) {
    const player = playerController.getPlayerByCreateGameSocket(socket, data);
    const game = this.manager.createGame(player, isPrivateGame);

    socket.emit('goto_game', { joiner: player, game });
    socket.join(game.getId());
  }

  private onJoinGameSocket(socket: Socket, data: JoinGameData) {
    const player = playerController.getPlayerByCreateGameSocket(socket, data);

    const game = this.manager.getGameById(data.game.id);
    if (game === undefined) {
      console.error(`Impossible de rejoindre la partie ${data.game.id}`);
      return;
    }

    if (game.getPlayers().length >= MAX_ROOM_SIZE) {
      // Todo: Handle max room size error
      return;
    }

    this.manager.addPlayerToGame(socket, game, player);

    socket.emit('goto_game', { joiner: player, game });
    socket.join(game.getId());
  }

  private onUpdateGameVisibilitySocket(socket: Socket, gameId: string) {
    const gameIndex = this.manager.games.findIndex((game) => game.getId() === gameId);

    if (gameIndex === -1) {
      console.error(`Impossible de trouver la partie ${gameId}`);
      return;
    }

    this.manager.games[gameIndex].togglePrivacy();
    console.log('Toggle privacy for game ' + gameId + ' - Is private :' + this.manager.games[gameIndex].isPrivate());
  }

  private onReadyToPlaySocket(socket: Socket, data: GenericData) {
    const player = getPlayerByCookie(data.cookie);
    if (player === undefined) return;

    const game = getGameByCookie(data.cookie);
    if (game === undefined) return;

    player.toggleReadyToPlay();
    game.updatePlayer(player);

    //const launchCountdown = game.getPlayers().length > 1 && game.getPlayers().every((player) => player.isReadyToPlay());
    const launchCountdown = game.getPlayers().every((player) => player.isReadyToPlay());

    if (launchCountdown) {
      let countdown = 3;
      this.countdownInterval = setInterval(() => {
        if (countdown <= 0) {
          game.setPhase(PHASE.DRAFT);
          this.manager.updateGame(socket, game);
          clearInterval(this.countdownInterval);
          this.sendSentence(socket, data);
          return;
        }
        countdown -= 1;
      }, 1 * 1000);
    } else if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // For the sender
    socket.emit('update_player_ready', {
      playerUUID: player.getUUID(),
      launchCountdown,
    });

    // For the others players in the game room
    socket.to(game.getId()).emit('update_player_ready', {
      playerUUID: player.getUUID(),
      launchCountdown,
    });
  }

  private onUpdateChoiceSocket(socket: Socket, data: PlayerChoiceSocket) {
    const player = getPlayerByCookie(data.cookie);
    if (player === undefined) return;

    const game = getGameByCookie(data.cookie);
    if (game === undefined || game.getPlayerByUUID(player.getUUID()) === undefined) return;

    this.manager.addPlayerChoice(socket, game, { uuid: player.getUUID(), round: data.round, choice: data.choice });
  }

  private addLikedMeme(socket: Socket, data: PlayerChoiceSocket) {
    const player = getPlayerByCookie(data.cookie);
    if (player === undefined) return;

    const game = getGameByCookie(data.cookie);
    if (game === undefined || game.getPlayerByUUID(player.getUUID()) === undefined) return;

    game.addLikedMeme(socket, game, player.getUUID(), data);
    this.manager.updateGame(socket, game, false);
  }

  private onConsultNextPageSocket(socket: Socket, data: ConsultNextPageSocket) {
    const player = getPlayerByCookie(data.cookie);
    if (player === undefined) return;

    const game = getGameByCookie(data.cookie);
    if (game === undefined || game.getPlayerByUUID(player.getUUID()) === undefined) return;

    socket.emit('consult_next_page', data.actualRound + 1);
    socket.to(game.getId()).emit('consult_next_page', data.actualRound + 1);
  }

  private onDisplayPodiumSocket(socket: Socket, data: GenericData) {
    const player = getPlayerByCookie(data.cookie);
    if (player === undefined) return;

    const game = getGameByCookie(data.cookie);
    if (game === undefined || game.getPlayerByUUID(player.getUUID()) === undefined) return;

    game.setPhase(PHASE.RESULT);
    this.manager.updateGame(socket, game);

    socket.emit('display_podium', game.getResults());
    socket.to(game.getId()).emit('display_podium', game.getResults());
  }

  private onPageLoadSocket(socket: Socket, data: PlayerType) {
    const player = playerController.getPlayerByUUID(data.uuid);
    const game = this.manager.findGameByPlayer(player);
    if (game === undefined) return;

    sendCookie(socket, { player, game });
  }

  private onPageReloadSocket(socket: Socket, data: GenericData) {
    const player = getPlayerByCookie(data.cookie);

    const game = getGameByCookie(data.cookie);

    if (player === undefined || game === undefined) {
      removeCookie(socket);
    } else {
      player.setSocketId(socket.id);
      game.updatePlayer(player);

      this.manager.addPlayerToGame(socket, game, player);

      socket.join(game.getId());
    }
  }

  private sendSentence(socket: Socket, data: GenericData) {
    const game = getGameByCookie(data.cookie);
    if (game === undefined) return;

    game.incrementRound();

    if (game.getActualRound() <= MAX_ROUND) {
      let countdown = 120;
      this.countdownInterval = setInterval(() => {
        if (this.manager.allPlayerHaveChoosenAGif(game) && game.getActualRound() >= MAX_ROUND) {
          socket.emit('last_round_finished');
          game.setPhase(PHASE.VOTE);
          this.manager.updateGame(socket, game);
          clearInterval(this.countdownInterval);
          return;
        } else if (countdown < 0 || this.manager.allPlayerHaveChoosenAGif(game)) {
          clearInterval(this.countdownInterval);
          this.sendSentence(socket, data);
          return;
        }

        countdown -= 1;
      }, 1 * 1000);
    }

    const sentence = this.sentenceManager.getSentence();
    socket.emit('new_round', sentence);
    socket.to(game.getId()).emit('new_round', sentence);
  }

  getManager() {
    return this.manager;
  }
}
