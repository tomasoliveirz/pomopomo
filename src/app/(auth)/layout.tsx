import { KawaiiBackground } from "@/components/ui/KawaiiBackground";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen bg-[#fafafa] text-gray-900">
            <KawaiiBackground />
            <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
                {children}
            </div>
        </div>
    );
}
