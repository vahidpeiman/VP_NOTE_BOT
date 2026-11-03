import { ALLOWED_USER_IDS } from './config.js';

export const setupMode = () => ALLOWED_USER_IDS.length === 0;
export const isAllowed = (userId) => ALLOWED_USER_IDS.includes(Number(userId));
