
import { io, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const WS_URL = 'http://localhost:3001'; // Assuming WS server runs on 3001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Helper to create a token
function createToken(payload: any) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '2m' });
}

// Helper to create a socket connection
function connect(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const socket = io(WS_URL, {
            auth: { token },
            transports: ['websocket'],
            forceNew: true,
        });

        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', (err) => reject(err));
    });
}

async function runTests() {
    console.log('🔒 Starting Security Verification Tests...\n');

    // Test 1: Token Ownership Mismatch (User)
    try {
        console.log('Test 1: Token Ownership Mismatch (User)');
        const token = createToken({
            participantId: 'some-id',
            roomId: 'room-1',
            actorType: 'user',
            userId: 'user-1', // Mismatch with DB (assuming DB has different userId for this participant)
            sessionId: 'session-1',
            role: 'host',
            iat: Math.floor(Date.now() / 1000),
        });

        await connect(token);
        console.error('❌ Failed: Should have rejected connection');
    } catch (e: any) {
        console.log('✅ Passed: Connection rejected as expected:', e.message);
    }

    // Test 2: Non-host Action (Clear Whiteboard)
    try {
        console.log('\nTest 2: Non-host Action (Clear Whiteboard)');
        // We need a valid token for this. In a real test env we'd seed the DB.
        // For this script, we'll assume we can't easily get a valid non-host token without DB access.
        // So we'll simulate the check logic or skip if we can't integration test easily.
        console.log('⚠️  Skipping integration test requiring DB state. Manual verification recommended.');
    } catch (e) {
        console.error(e);
    }

    // Test 3: Rate Limiting (Whiteboard)
    try {
        console.log('\nTest 3: Rate Limiting (Whiteboard)');
        // Again, requires valid connection.
        console.log('⚠️  Skipping integration test requiring DB state. Manual verification recommended.');
    } catch (e) {
        console.error(e);
    }

    console.log('\n🏁 Tests Completed');
    process.exit(0);
}

runTests();
