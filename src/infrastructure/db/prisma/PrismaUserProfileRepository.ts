import { IUserProfileRepository } from "../../../core/application/ports/IUserProfileRepository";
import { UserProfile } from "../../../core/domain/entities/UserProfile";
import { prisma } from "./prismaClient";

export class PrismaUserProfileRepository implements IUserProfileRepository {
    async findByUserId(userId: string): Promise<UserProfile | null> {
        const model = await prisma.userProfile.findUnique({
            where: { userId }
        });

        if (!model) return null;

        return new UserProfile(model.id, {
            userId: model.userId,
            displayName: model.displayName,
            avatarUrl: model.avatarUrl,
            bio: model.bio,
            profileCompleted: model.profileCompleted,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt
        });
    }

    async save(profile: UserProfile): Promise<void> {
        await prisma.userProfile.upsert({
            where: { userId: profile.props.userId },
            update: {
                displayName: profile.props.displayName,
                avatarUrl: profile.props.avatarUrl,
                bio: profile.props.bio,
                profileCompleted: profile.props.profileCompleted,
                updatedAt: new Date()
            },
            create: {
                id: profile.id, // Use the ID passed from domain, or let DB generate if needed (uuid). But domain usually owns ID.
                userId: profile.props.userId,
                displayName: profile.props.displayName,
                avatarUrl: profile.props.avatarUrl,
                bio: profile.props.bio,
                profileCompleted: profile.props.profileCompleted
            }
        });
    }
}
