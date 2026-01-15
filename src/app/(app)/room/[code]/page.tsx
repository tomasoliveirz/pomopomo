import { auth } from '@/lib/auth';
import UserMenu from '@/components/UserMenu';
import RoomClient from '@/components/room/RoomClient';

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RoomPageProps {
  params: {
    code: string;
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const session = await auth();
  return (
    <RoomClient
      code={params.code}
      userMenu={<UserMenu />}
      isAuthenticated={!!session?.user}
    />
  );
}

