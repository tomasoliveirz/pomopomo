import { cn } from "./cn";

export function KawaiiBackground({ className }: { className?: string }) {
    return (
        <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-pink-300/30 blur-3xl" />
            <div className="absolute top-10 -right-24 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
        </div>
    );
}
