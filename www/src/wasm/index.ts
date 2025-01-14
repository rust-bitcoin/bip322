import init, { verify } from './bip322.js';

let isInitialized = false;

export const initBip322 = async () => {
  if (!isInitialized) {
    await init();
    isInitialized = true;
  }
};

export { verify };