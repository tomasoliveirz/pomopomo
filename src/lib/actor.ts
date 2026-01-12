import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { cookies, headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { Actor } from "@/types/actor";

export async function getActorFromRequest(): Promise<Actor> {
    const session = await getServerSession(authOptions);

    // In Next.js 15+ these are async. In 14.2 they are sync but awaiting is safe.
    const cookieStore = await cookies();
    const headerStore = await headers();

    // 1. Get sessionId (should be set by middleware)
    let sessionId = cookieStore.get("sessionId")?.value;

    // Fallback if middleware hasn't set it yet (e.g. first request)
    if (!sessionId) {
        sessionId = uuidv4();
    }

    // 2. Get real IP from headers
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]
        ?? headerStore.get("x-real-ip")
        ?? "0.0.0.0";

    // 3. Check for authenticated user
    if (session?.user?.id) {
        return {
            actorType: "user",
            actorId: session.user.id,
            userId: session.user.id,
            sessionId,
            ip
        };
    }

    // 4. Guest fallback
    return {
        actorType: "guest",
        actorId: sessionId,
        sessionId,
        ip
    };
}
