import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
};

const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
    primary: "bg-gray-900 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-white/50 text-gray-900 border border-white/40 hover:bg-white/70",
    ghost: "text-gray-600 hover:text-gray-900 hover:bg-black/5",
    danger: "text-red-600 hover:bg-red-50",
};

const sizes: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
};

export function Button({
    className,
    variant = "primary",
    size = "md",
    loading,
    children,
    ...props
}: Props) {
    return (
        <button
            className={cn(base, variants[variant], sizes[size], className)}
            {...props}
        >
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
            {children}
        </button>
    );
}
