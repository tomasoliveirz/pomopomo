import { Role } from '../../domain/types';

export interface TokenPayload {
    roomId: string;
    sessionId: string;
    participantId: string;
    role: Role;
    actorType: 'user' | 'guest';
    userId?: string | null;
}

export interface IAuthService {
    generateToken(payload: TokenPayload, expiresIn?: string): Promise<string>;
    verifyToken(token: string): Promise<TokenPayload | null>;
    generateSessionId(): string;
}
