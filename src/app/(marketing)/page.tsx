import UserMenu from '@/components/UserMenu';
import MarketingClient from './MarketingClient';

export default function HomePage() {
  return (
    <MarketingClient>
      <div className="absolute top-4 right-4 z-50 pointer-events-auto">
        <UserMenu />
      </div>
    </MarketingClient>
  );
}
