import { auth } from "@/lib/auth";
import UserMenuClient from "./UserMenuClient";

export default async function UserMenu() {
    const session = await auth();
    return <UserMenuClient session={session} />;
}
