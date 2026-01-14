export interface UserProfileProps {
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    profileCompleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export class UserProfile {
    constructor(
        public readonly id: string,
        public props: UserProfileProps
    ) { }

    get displayName() {
        return this.props.displayName;
    }

    get isCompleted() {
        return this.props.profileCompleted;
    }
}
