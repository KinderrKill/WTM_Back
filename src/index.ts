import * as dotenv from 'dotenv';
import express, { Express, Request } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { GameController } from './controller/gameController.js';
import { PlayerController } from './controller/playerController.js';

dotenv.config();

const app: Express = express();

const httpServer = createServer(app);

const ioServer = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'https://whatthememe.fr'],
    methods: ['GET', 'POST'],
  },
});

// Initialize controller
export const playerController = new PlayerController();
export const gameController = new GameController();

ioServer.on('connection', (socket) => {
  console.log('🟢 -> Connection established with client ' + socket.id);

  playerController.handleSocket(socket);
  gameController.handleSocket(socket);

  socket.on('disconnect', () => {
    console.log('🔴 -> Connection lost with client ' + socket.id);

    gameController.handleDisconnect(socket);
  });
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

httpServer.listen(parseInt(process.env.PORT));
console.log(`[Serveur] Démarré avec succès : http://localhost:${process.env.PORT}`);
