import { io } from 'socket.io-client';

// Ensure fetch is available (Node 18+ has it globally, but for older node/types we might need this)
// If running with tsx, global fetch is usually present.
declare global {
    var fetch: any;
}

const WS_URL = process.env.WS_URL ?? 'http://127.0.0.1:3001';
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3000';
// ROOM_CODE will be set dynamically
let ROOM_CODE = '';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function createRoom() {
    console.log(`  🔨 Creating room ${ROOM_CODE}...`);
    // Note: The API might generate its own code or accept one. 
    // Looking at POST /api/rooms usually generates one.
    // But we need a known code or to read the one it created.
    // If the API allows force-code (for testing) that's great, but likely it doesn't.
    // So we should CREATE first, then use the returned code.
    const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'lofi_girl', status: 'idle' })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create room failed ${res.status}: ${text}`);
    }

    const json = await res.json();
    return json.data.room.code;
}

async function joinAndGetToken() {
    console.log(`  🔍 Joining room ${ROOM_CODE} via HTTP...`);
    const res = await fetch(`${API_URL}/api/rooms/${ROOM_CODE}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ displayName: 'SocketBot' }),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`join failed ${res.status}: ${text.slice(0, 300)}`);

    const json = JSON.parse(text);
    const token = json?.data?.wsToken;
    const roomId = json?.data?.room?.id; // Internal UUID

    if (!token || !roomId) throw new Error(`Token/ID shape mismatch: ${JSON.stringify(json).slice(0, 300)}`);

    return { token, roomId };
}

function connectOnce(token: string) {
    return new Promise<{ socket: any }>((resolve, reject) => {
        const socket = io(WS_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: false,
        });

        const t = setTimeout(() => {
            socket.close();
            reject(new Error('connect timeout'));
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(t);
            resolve({ socket });
        });

        socket.on('connect_error', (err: any) => {
            clearTimeout(t);
            reject(err);
        });
    });
}

function validStroke() {
    // Simple UUID v4 replacement if crypto not available
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    return {
        id: uuid,
        type: 'pen',
        color: '#000000',
        points: [
            [100, 100, 0.5],
            [101, 101, 0.5],
        ],
        strokeWidth: 2,
    };
}

async function testWsRateLimits() {
    console.log('\n🧪 Testing WS Rate Limits...');

    const { token, roomId } = await joinAndGetToken();
    console.log(`  ✅ Got WS token and Room UUID: ${roomId}`);

    // --- 2) Stable connection for chat/whiteboard tests
    // We run this FIRST so we don't block ourselves with the connect limiter.
    if (process.env.MODE !== 'connect') {
        console.log('\n🧪 Testing Event Rate Limits (Chat/Whiteboard)...');
        console.log('  🔌 Connecting for event limit tests...');

        const { socket } = await connectOnce(token);
        console.log('  ✅ Connected for event tests');

        let rateErrors = 0;
        socket.on('error', (err: any) => {
            // Robust detection: check for retryAfterSec (preferred)
            if (typeof err?.retryAfterSec === 'number') {
                rateErrors++;
            }
        });

        // --- Chat limiter: 5 per 10s ---
        console.log('  🔥 Spamming chat (12 messages fast)...');
        const chatBefore = rateErrors;
        for (let i = 0; i < 12; i++) {
            socket.emit('chat:send', { text: `Spam ${i}` });
            await sleep(150);
        }
        await sleep(1000);

        if (rateErrors - chatBefore > 0) {
            console.log(`  ✅ Chat limiter triggered (${rateErrors - chatBefore} errors)`);
        } else {
            console.log('  ❌ Chat limiter not observed');
        }

        // --- Whiteboard limiter: 30 per 10s ---
        console.log('  🔥 Spamming whiteboard (40 strokes fast)...');

        const wbBefore = rateErrors;
        for (let i = 0; i < 40; i++) {
            socket.emit('whiteboard:draw', { roomId, stroke: validStroke() });
            await sleep(30);
        }
        await sleep(1000);

        const wbErrors = rateErrors - wbBefore;
        if (wbErrors > 0) {
            console.log(`  ✅ Whiteboard limiter triggered (${wbErrors} new errors)`);
        } else {
            console.log('  ⚠️ Whiteboard limiter not observed.');
        }

        socket.close();
    }

    // --- 1) Connect limiter: 20/min per IP
    // Run this LAST or only if MODE=connect/all, because it bans the IP.
    if (process.env.MODE === 'connect' || process.env.MODE === 'all' || !process.env.MODE) {
        // Logic: if we just ran events, we might need a small pause, but we WANT to trigger the limit now.
        console.log('\n🧪 Testing Connect Rate Limiter (reconnecting 25x)...');
        console.log('  (This is run last because it might block your IP for a minute)');

        let connectErrors = 0;
        for (let i = 0; i < 25; i++) {
            try {
                const { socket } = await connectOnce(token);
                socket.close();
            } catch (e: any) {
                connectErrors++;
                // once blocked, we might get errors fast
                await sleep(50);
            }
            // small delay between attempts
            await sleep(50);
        }

        if (connectErrors > 0) {
            console.log(`  ✅ Connect limiter triggered (${connectErrors} connect errors)`);
        } else {
            console.log('  ⚠️ No connect errors observed (maybe limits higher or window not hit)');
        }
    }
}

async function testHttpJoinIpLimit() {
    console.log('\n🧪 Testing HTTP Join IP limit...');

    console.log('  Attempting 15 joins in parallel...');
    const joins = Array.from({ length: 15 }, (_, i) =>
        fetch(`${API_URL}/api/rooms/${ROOM_CODE}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: `Bot${i}` }),
        }).then((r: any) => r.status)
    );

    const results = await Promise.all(joins);
    const ok = results.filter((s) => s === 200 || s === 201).length;
    const rl = results.filter((s) => s === 429).length;

    console.log(`  Results: ${ok} ok, ${rl} rate-limited`);
    console.log(rl > 0 ? '  ✅ HTTP IP limiter working' : '  ❌ HTTP IP limiter not observed');
}

async function run() {
    ROOM_CODE = await createRoom();
    console.log(`  ✅ Created room: ${ROOM_CODE}`);
    await testWsRateLimits();
    // await testHttpJoinIpLimit();
}

run().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
