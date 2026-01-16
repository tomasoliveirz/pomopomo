/**
 * PublicProfile - The ONE source of truth for user identity
 * 
 * This is the only "public identity" type that should be exposed:
 * - In room/participant DTOs
 * - In profile sheets
 * - Via public API endpoints
 * 
 * NEVER include: email, profileCompleted, or other internal fields
 */
export type PublicProfile = {
    userId: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
};

/**
 * Helper to map a database UserProfile to PublicProfile
 */
export function toPublicProfile(profile: {
    userId: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
}): PublicProfile {
    return {
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
    };
}
