export const config = {
  room: {
    ttlHours: parseInt(process.env.ROOM_TTL_HOURS || '72', 10),
    maxParticipants: parseInt(process.env.MAX_PARTICIPANTS_PER_ROOM || '20', 10),
  },
  rateLimit: {
    chat: {
      maxMessages: 5,
      windowSec: 10,
    },
    actions: {
      maxActions: 20,
      windowSec: 60,
    },
    connections: {
      maxPerIp: 10,
      windowSec: 300,
    },
  },
  ws: {
    port: parseInt(process.env.WS_PORT || '3001', 10),
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050',
            'http://51.38.190.126:3050',
            'http://localhost:3050'
          ]
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
  },
};




