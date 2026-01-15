"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { signOut } from "next-auth/react";

export default function UserMenuClient({ session }: { session: any }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isAuthed = !!session?.user;
    const name = session?.user?.name || "User";
    const email = session?.user?.email || "";

    if (!isAuthed) {
        return (
            <div className="flex items-center gap-3">
                <Badge>Guest</Badge>
                <a href={`/signin?callbackUrl=${encodeURIComponent(pathname)}`}>
                    <Button size="sm" variant="primary">
                        <UserIcon size={14} />
                        Entrar
                    </Button>
                </a>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className={cn("flex items-center gap-2 rounded-full focus:outline-none")}
            >
                <div className="h-9 w-9 overflow-hidden rounded-full border border-white/50 bg-white/60 shadow-sm grid place-items-center">
                    <UserIcon size={18} className="text-gray-700" />
                </div>
            </button>

            {open ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-xl">
                        <div className="p-4 border-b border-black/5">
                            <div className="text-sm font-semibold truncate">{name}</div>
                            <div className="text-xs text-gray-600 truncate">{email}</div>
                        </div>

                        <div className="p-2">
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <LogOut size={16} />
                                Sair
                            </button>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}
