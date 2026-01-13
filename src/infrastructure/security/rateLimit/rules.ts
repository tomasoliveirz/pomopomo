export const RATE_LIMIT_RULES = {
    // HTTP
    http: {
        join: {
            ip: { max: 10, windowSec: 60 },
            room: { max: 30, windowSec: 60 },
        },
        wsToken: {
            ip: { max: 20, windowSec: 60 },
        },
    },
    // WebSocket
    ws: {
        connect: { max: 20, windowSec: 60 }, // per IP
        chat: { max: 5, windowSec: 10 },    // per participant
        whiteboard: { max: 30, windowSec: 10 }, // per participant
        task: { max: 10, windowSec: 60 },   // per participant
        proposal: { max: 10, windowSec: 60 }, // per participant (submit)
        host: { max: 20, windowSec: 60 },   // per room (all host controls)
    },
};
