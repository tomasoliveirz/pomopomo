import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { type Actor } from "@/types/actor";

/**
 * Resolves the current actor from the request context.
 * 
 * Logic:
 * 1. Check for NextAuth session (Server-side).
 * 2. If present -> Actor is User.
 * 3. If absent -> Actor is Guest (using sessionId cookie).
 */
export async function resolveActor(): Promise<Actor> {
    const session = await getServerSession(authOptions);
    const cookieStore = cookies();
    const sessionId = cookieStore.get("sessionId")?.value || "unknown-session";

    // 1. User
    if (session?.user?.id) {
        return {
            actorType: "user",
            actorId: session.user.id,
            userId: session.user.id,
            sessionId: sessionId, // Keep session ID for merging context
            ip: "unknown", // IP resolution is usually middleware-level, optional here
        };
    }

    // 2. Guest
    return {
        actorType: "guest",
        actorId: sessionId,
        sessionId: sessionId,
        ip: "unknown",
    };
}
