import { cn } from "./cn";

export function Badge({
    children,
    className,
}: React.PropsWithChildren<{ className?: string }>) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                "bg-black/5 text-gray-700 border border-black/5",
                className
            )}
        >
            {children}
        </span>
    );
}
