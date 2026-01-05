import Link from 'next/link';
import Logo from './Logo';

export default function RoomNotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="flex justify-center mb-8">
                    <Logo size="large" />
                </div>

                <h1 className="text-3xl font-bold">Room Not Found</h1>

                <p className="text-lg opacity-80">
                    The room you are looking for does not exist or has expired.
                </p>

                <div className="pt-8">
                    <Link
                        href="/"
                        className="btn-primary inline-block px-8 py-3 text-lg"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
