import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const WS_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3000';
const ROOM_CODE = 'TEST' + Math.floor(Math.random() * 1000);

async function testHttpRateLimits() {
    console.log('\n🧪 Testing HTTP Rate Limits...');

    // Test Join Limit (IP based)
    console.log('  Attempting 15 joins in parallel...');
    const joins = Array(15).fill(0).map((_, i) =>
        fetch(`${API_URL}/api/rooms/${ROOM_CODE}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: `Bot${i}` })
        }).then(res => res.status)
    );

    const results = await Promise.all(joins);
    const successCount = results.filter(s => s === 200 || s === 201).length;
    const limitedCount = results.filter(s => s === 429).length;

    console.log(`  Results: ${successCount} successes, ${limitedCount} rate limited`);

    if (limitedCount > 0) {
        console.log('  ✅ HTTP IP Rate limit working!');
    } else {
        console.error('  ❌ HTTP IP Rate limit FAILED (or limits are too high)');
    }
}

async function testSocketRateLimits() {
    console.log('\n🧪 Testing Socket Rate Limits...');

    // 1. Get a token via HTTP (assuming we are not rate limited yet or using a new IP if checked)
    // For this test script, we might fail if HTTP limit is already hit. 
    // We will try one join.
    let token;
    let participantId;

    try {
        const joinRes = await fetch(`${API_URL}/api/rooms/${ROOM_CODE}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: `SocketBot` })
        });

        if (joinRes.status === 429) {
            console.log('  ⚠️ Cannot get token, HTTP limit hit. Rerun script later.');
            return;
        }

        const data = await joinRes.json() as any;
        // Fix based on API shape: { status: 'success', data: { wsToken: '...' } }
        token = data.data?.wsToken;
        participantId = data.data?.participantId;

        if (!token) {
            console.error('  ❌ Token structure mismatch:', JSON.stringify(data));
            return;
        }
        console.log('  ✅ Got WS Token');

    } catch (e) {
        console.error('  ❌ Failed to get token:', e);
        return;
    }

    if (!token) return;

    // 2. Connect Socket
    const socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false
    });

    await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
            console.log('  ✅ Socket connected');
            resolve();
        });
        socket.on('connect_error', (err) => {
            console.error('  ❌ Connection error:', err.message);
            reject(err);
        });
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // 3. Spam Chat
    console.log('  🔥 Spamming 10 chat messages...');
    let errors = 0;

    socket.on('error', (err: any) => {
        if (err.message.includes('Too Many Requests') || err.message.includes('fast')) {
            errors++;
        }
    });

    for (let i = 0; i < 10; i++) {
        socket.emit('chat:send', { text: `Spam ${i}` });
        await new Promise(r => setTimeout(r, 100)); // 100ms interval (10/sec) -> limit is 5/10s
    }

    // Wait for responses
    await new Promise(r => setTimeout(r, 1000));

    if (errors > 0) {
        console.log(`  ✅ Chat Rate limit triggered! Received ${errors} errors.`);
    } else {
        console.error('  ❌ Chat: No rate limit errors received.');
    }

    // 4. Spam Whiteboard (should silently drop or error depending on implementation? implemented throw now)
    console.log('  🔥 Spamming 15 whiteboard strokes...');
    let wbErrors = 0;
    // We need a separate listener or reset errors count if we want to be precise, 
    // but let's just use the global error listener we already have.
    const initialErrors = errors;

    for (let i = 0; i < 15; i++) {
        socket.emit('whiteboard:draw', {
            id: 'uuid-test-' + i,
            points: [1, 2, 3],
            color: '#000',
            size: 2,
            tool: 'pen',
            isComplete: true
        });
        await new Promise(r => setTimeout(r, 50)); // Fast spam
    }
    await new Promise(r => setTimeout(r, 1000));

    // Note: whiteboard implementation used to fail silently, now it throws.
    // We expect at least some errors if limit is 30/10s? Wait, loop is 15. Rules say 30/10s.
    // So 15 shouldn't trigger limit. Let's do 40.
    for (let i = 0; i < 20; i++) {
        socket.emit('whiteboard:draw', {
            id: 'uuid-test-more-' + i,
            points: [1, 2, 3],
            color: '#000',
            size: 2,
            tool: 'pen',
            isComplete: true
        });
    }
    await new Promise(r => setTimeout(r, 1000));
    // Actually checking specific error messages would be better but simple count diff is okay request-wise.

    socket.close();
}

async function run() {
    await testHttpRateLimits();
    await testSocketRateLimits();
}

run().catch(console.error);
