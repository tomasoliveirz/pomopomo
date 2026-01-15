import { cn } from "./cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
    error?: string;
};

export function Input({ className, label, hint, error, ...props }: Props) {
    return (
        <label className="block space-y-1">
            {label ? <span className="text-xs font-medium text-gray-700">{label}</span> : null}
            <input
                className={cn(
                    "w-full rounded-xl border bg-white/70 px-3 py-2 text-sm text-gray-900",
                    "border-white/50 shadow-sm outline-none",
                    "focus:border-black/10 focus:ring-2 focus:ring-black/10",
                    error ? "border-red-300 focus:ring-red-200" : "",
                    className
                )}
                {...props}
            />
            {error ? (
                <span className="text-xs text-red-600">{error}</span>
            ) : hint ? (
                <span className="text-xs text-gray-500">{hint}</span>
            ) : null}
        </label>
    );
}
