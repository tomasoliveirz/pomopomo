export type Actor =
    | { actorType: "user"; actorId: string; userId: string; sessionId: string; ip: string }
    | { actorType: "guest"; actorId: string; sessionId: string; ip: string };
