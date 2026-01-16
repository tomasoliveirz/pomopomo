export interface UserProfileProps {
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    username?: string | null;
    usernameSetAt?: Date | null;
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

    get avatarUrl() {
        return this.props.avatarUrl;
    }

    get bio() {
        return this.props.bio;
    }

    get username() {
        return this.props.username;
    }

    get isCompleted() {
        return this.props.profileCompleted;
    }
}
