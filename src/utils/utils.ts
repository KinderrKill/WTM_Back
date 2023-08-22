export const COOKIE_NAME = 'chocolateChips';

const MAX_STRING_LENGTH = 6;

export function generateGameId() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let i = 0; i < MAX_STRING_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}
