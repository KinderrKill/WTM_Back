import { COOKIE_NAME } from './utils.js';
import { CookieData, CookieProps } from './types.js';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';

import { Player } from './../domain/Player.js';
import { Game } from '../domain/Game.js';
import { playerController, gameController } from '../index.js';

export function sendCookie(socket: Socket, data: CookieProps) {
  const cookieValue = jwt.sign(data, process.env.JWT_KEY);

  const expirationDate = new Date(Date.now() + 30 * 60 * 1000);
  const cookieOptions = {
    expires: expirationDate,
  };

  const cookieString = cookie.serialize(COOKIE_NAME, cookieValue, cookieOptions);
  socket.emit('send_cookie', { username: data.player.getUsername(), cookie: cookieString });
}

export function removeCookie(socket: Socket) {
  socket.emit('remove_cookie', COOKIE_NAME);
}

export function getPlayerByCookie(cookie: string): Player | undefined {
  const splittedCookie = cookie.split('=');
  const cookieName = splittedCookie[0];
  const cookieValue = splittedCookie[1];

  if (cookieName === COOKIE_NAME) {
    let tempPlayer: Player | undefined = undefined;

    jwt.verify(cookieValue, process.env.JWT_KEY, (err, response: CookieData) => {
      if (response) {
        return (tempPlayer = playerController.getPlayerByUUID(response.player.uuid));
      }
    });

    if (tempPlayer === undefined) console.log('Impossible de récuperer le joueur depuis le cookie');
    return tempPlayer;
  }
}

export function getGameByCookie(cookie: string): Game | undefined {
  const splittedCookie = cookie.split('=');
  const cookieName = splittedCookie[0];
  const cookieValue = splittedCookie[1];

  if (cookieName === COOKIE_NAME) {
    let tempGame: Game | undefined = undefined;

    jwt.verify(cookieValue, process.env.JWT_KEY, (err, response: CookieData) => {
      if (response) {
        return (tempGame = gameController.getManager().getGameById(response.game.id));
      }
    });

    if (tempGame === undefined) console.log('Impossible de récuperer le joueur depuis le cookie');
    return tempGame;
  }
}
