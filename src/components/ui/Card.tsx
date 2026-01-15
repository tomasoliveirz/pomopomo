import { cn } from "./cn";

type Props = React.PropsWithChildren<{
    className?: string;
}>;

export function Card({ className, children }: Props) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg",
                "ring-1 ring-black/5",
                className
            )}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children }: Props) {
    return <div className={cn("p-6 pb-3", className)}>{children}</div>;
}

export function CardContent({ className, children }: Props) {
    return <div className={cn("p-6 pt-3", className)}>{children}</div>;
}

export function CardFooter({ className, children }: Props) {
    return <div className={cn("p-6 pt-3", className)}>{children}</div>;
}
