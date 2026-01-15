import UserMenu from '../UserMenu';
import RoomHeaderClient from './RoomHeaderClient';
import type { Room } from '@/types';

interface RoomHeaderProps {
  room: Room;
  onShareClick: () => void;
  onReportClick: () => void;
}

export default function RoomHeader({ room, onShareClick, onReportClick }: RoomHeaderProps) {
  return (
    <RoomHeaderClient room={room} onShareClick={onShareClick} onReportClick={onReportClick}>
      <UserMenu />
    </RoomHeaderClient>
  );
}

