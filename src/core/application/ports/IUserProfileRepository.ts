import { UserProfile } from "../../domain/entities/UserProfile";

export interface IUserProfileRepository {
    findByUserId(userId: string): Promise<UserProfile | null>;
    save(profile: UserProfile): Promise<void>;
}
