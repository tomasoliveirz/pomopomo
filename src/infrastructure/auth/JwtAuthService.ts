import { SignJWT, jwtVerify } from 'jose';
import { IAuthService, TokenPayload } from '../../core/application/ports/IAuthService';
import { config } from '../config/env';

export class JwtAuthService implements IAuthService {
    private secret: Uint8Array;

    constructor() {
        this.secret = new TextEncoder().encode(config.JWT_SECRET);
    }

    async generateToken(payload: TokenPayload): Promise<string> {
        return new SignJWT({ ...payload })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h') // Token valid for 24h
            .sign(this.secret);
    }

    async verifyToken(token: string): Promise<TokenPayload | null> {
        try {
            const { payload } = await jwtVerify(token, this.secret);
            return payload as unknown as TokenPayload;
        } catch (e) {
            return null;
        }
    }

    generateSessionId(): string {
        return crypto.randomUUID();
    }
}
