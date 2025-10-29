import { SignJWT, jwtVerify } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import type { WsTokenPayload } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-in-production-super-secret'
);

export function generateSessionId(): string {
  return uuidv4();
}

export async function createWsToken(payload: Omit<WsTokenPayload, 'exp'>): Promise<string> {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
  
  return token;
}

export async function verifyWsToken(token: string): Promise<WsTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as WsTokenPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Generate room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  let code = 'pomo-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate random room emoji
export function generateRoomEmoji(): string {
  const emojis = ['🍅', '🌸', '🌙', '⭐', '🌈', '🍵', '🍰', '🎀', '💜', '🌺', '🌼', '✨'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

