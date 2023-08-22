import { Socket } from 'socket.io';
import { playerController } from '../index.js';
import { generateGameId } from '../utils/utils.js';
import { GameResult, LikedMeme, PHASE, PhaseType, PlayerChoice, PlayerChoiceSocket } from './../utils/types.js';
import { Player } from './Player.js';

export class Game {
  private id: string;
  private private: boolean;
  private phase: PhaseType;
  private owner: Player;
  private players: Player[];
  private actualRound: number;
  private playersChoices: PlayerChoice[];
  private likedMemes: LikedMeme[];

  constructor(owner: Player, isPrivate = false) {
    this.id = generateGameId();
    this.private = isPrivate;
    this.phase = PHASE.PENDING;
    this.owner = owner;
    this.players = [];
    this.actualRound = 0;
    this.playersChoices = [];
    this.likedMemes = [];

    this.players.push(owner);
  }

  addPlayerToGame(player: Player) {
    if (this.getPlayerByUUID(player.getUUID()) === undefined) {
      this.players.push(player);
      console.log(`🤽 Joueur ${player.getUsername()} ajouté à la partie ${this.id}`);
    }
  }

  removePlayerFromGame(player: Player) {
    const playerIndex = this.players.findIndex((p) => p.getUUID() === player.getUUID());
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1);
      console.log(`🌊 Joueur ${player.getUsername()} retiré à la partie ${this.id}`);

      if (this.players.length === 0) return;

      // todo: timeout after X secondes, vérifier si l'owner est toujours présent sinon transférer le rôle !
      if (player.getUUID() === this.owner.getUUID()) {
        this.owner = this.players[0];
        console.log(`👑 Transfert du maître du jeu à ${this.owner.getUsername()}, suite au départ du précédent MJ`);
      }
    } else {
      console.error(`❌ Erreur: Le joeuur ${player.getUsername()} n'est pas dans cette partie ${this.id}`);
    }
  }

  getPlayerByUUID(uuid: string): Player | undefined {
    return this.players.find((player) => player.getUUID() === uuid);
  }

  getId() {
    return this.id;
  }

  togglePrivacy() {
    this.private = !this.private;
  }

  isPrivate() {
    return this.private;
  }

  getPlayers() {
    return this.players;
  }

  incrementRound() {
    this.actualRound++;
  }

  getActualRound() {
    return this.actualRound;
  }

  getPlayerChoices() {
    return this.playersChoices;
  }

  setPhase(phase: PhaseType) {
    this.phase = phase;
  }

  updatePlayer(player: Player) {
    const playerIndex = this.players.findIndex((p) => p.getUUID() === player.getUUID());
    if (playerIndex !== -1) {
      this.players[playerIndex] = player;
    }
  }

  addLikedMeme(socket: Socket, game: Game, liker: string, choice: PlayerChoiceSocket) {
    const likedMemesByRound = this.likedMemes.filter((value) => value.round === game.getActualRound());
    const lmIndex = likedMemesByRound.findIndex((value) => value.likedBy === liker);

    if (lmIndex !== -1) {
      this.likedMemes[lmIndex] = this.generateLikedMeme(choice.uuid, liker, choice.round, choice.choice);
    } else {
      this.likedMemes.push(this.generateLikedMeme(choice.uuid, liker, choice.round, choice.choice));
    }
  }

  private generateLikedMeme(author: string, likedBy: string, round: number, gifUrl: string): LikedMeme {
    return {
      author,
      likedBy,
      round,
      gifUrl,
    };
  }

  getLikedMemes() {
    return this.likedMemes;
  }

  getResults() {
    const results: GameResult[] = [];

    for (let r = 1; r <= 3; r++) {
      const choicesPerRound: LikedMeme[] = this.likedMemes.filter((value) => value.round === r);

      const authorMap: { [author: string]: GameResult } = {};

      for (const choice of choicesPerRound) {
        if (!authorMap[choice.author]) {
          const player = this.getPlayerByUUID(choice.author);

          authorMap[choice.author] = {
            round: r,
            author: {
              uuid: player.getUUID(),
              username: player.getUsername(),
            },
            gifUrl: choice.gifUrl,
            totalPoints: 0,
            likes: 0,
          };
        }

        const authorResult = authorMap[choice.author];
        authorResult.totalPoints += 100;
        authorResult.likes += 1;
      }

      const roundResults = Object.values(authorMap);
      results.push(...roundResults);
    }

    results.sort((a, b) => {
      if (a.likes === b.likes) {
        return b.totalPoints - a.totalPoints;
      }
      return b.likes - a.likes;
    });

    return results;
  }

  // Getters for phase
  isPhasePending() {
    return this.phase === PHASE.PENDING;
  }

  isPhaseDraft() {
    return this.phase === PHASE.DRAFT;
  }

  isPhaseVote() {
    return this.phase === PHASE.VOTE;
  }

  isPhaseResult() {
    return this.phase === PHASE.RESULT;
  }

  isPhaseEnd() {
    return this.phase === PHASE.END;
  }
}
