export const usernamePattern = /^[\p{L}\p{N}_-]{3,24}$/u;
export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[^\s]{8,15}$/;
export const passwordHint = '8–15位，至少包含大写字母、小写字母和数字。';
export const normalizeUsername = value => String(value || '').normalize('NFKC').trim().toLowerCase();
export function validUsername(value) { return typeof value === 'string' && usernamePattern.test(normalizeUsername(value)); }
