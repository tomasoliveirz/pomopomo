'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// Using a simple inline SVG set for now, as I can't check all Lucide icons availability
// But the user mentioned 'lucide-react' is in package.json
import { LogOut, User as UserIcon, Loader2 } from 'lucide-react';

export default function UserMenu() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const handleSignIn = () => {
        signIn('google', { callbackUrl: pathname });
    };

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
    };

    if (status === 'loading') {
        return (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-gray-500 font-medium">Guest Mode</span>
                <button
                    onClick={handleSignIn}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
                >
                    <UserIcon size={14} />
                    <span>Sign in to save progress</span>
                </button>
            </div>
        );
    }

    // Authenticated State
    const userName = session?.user?.name || 'User';
    const userImage = session?.user?.image;
    const isClaimed = typeof window !== 'undefined' && localStorage.getItem('identity_claimed_for') === session?.user?.id;
    // Note: The 'isClaimed' check here is purely visual optimization. 
    // The real source of truth is the 'actor' resolution on the server.

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 focus:outline-none"
            >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shadow-sm relative group">
                    {userImage ? (
                        <img
                            src={userImage}
                            alt={userName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <UserIcon size={18} />
                        </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                        <div className="px-4 py-3 border-b border-gray-50">
                            <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
                            <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                        </div>

                        <div className="p-2">

                            {/* Placeholder for future Profile/Settings links */}

                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut size={16} />
                                <span>Sign out</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
