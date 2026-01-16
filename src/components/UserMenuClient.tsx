"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon, Pencil, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { signOut } from "next-auth/react";

export default function UserMenuClient({ session }: { session: any }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [editForm, setEditForm] = useState({ displayName: "", bio: "", avatarUrl: "" });
    const [saving, setSaving] = useState(false);

    const isAuthed = !!session?.user;
    const name = session?.user?.name || "User";
    const email = session?.user?.email || "";

    // Fetch user profile
    const fetchProfile = async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/user/profile/${session.user.id}`);
            const data = await res.json();
            if (data.profile) {
                setProfile(data.profile);
                setEditForm({ displayName: data.profile.displayName || "", bio: data.profile.bio || "", avatarUrl: data.profile.avatarUrl || "" });
            }
        } catch (err) {
            console.error("Failed to fetch profile", err);
        } finally {
            setLoading(false);
        }
    };

    // Save profile changes
    const handleSaveProfile = async () => {
        if (!session?.user?.id) return;
        setSaving(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (res.status === 401) {
                await signOut({ callbackUrl: "/" });
                return;
            }

            if (!res.ok) {
                const data = await res.json();
                console.error("Failed to save profile:", data.error);
                alert(data.error || "Error saving profile (Try again)");
                return;
            }

            setShowEditProfile(false);
            setProfile({ ...profile, ...editForm });
        } catch (err) {
            console.error("Failed to save profile", err);
            alert("Connection error.");
        } finally {
            setSaving(false);
        }
    };

    if (!isAuthed) {
        return (
            <div className="flex items-center gap-3">
                <Badge>Guest</Badge>
                <a href={`/signin?callbackUrl=${encodeURIComponent(pathname)}`}>
                    <Button size="sm" variant="primary">
                        <UserIcon size={14} />
                        Sign In
                    </Button>
                </a>
            </div>
        );
    }

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className={cn("flex items-center gap-2 rounded-full focus:outline-none")}
                >
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-white/50 bg-white/60 shadow-sm grid place-items-center">
                        <UserIcon size={18} className="text-gray-700" />
                    </div>
                </button>

                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-xl">
                            <div className="p-4 border-b border-black/5">
                                <div className="text-sm font-semibold truncate text-gray-800">{name}</div>
                                <div className="text-xs text-gray-600 truncate">{email}</div>
                            </div>

                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        setShowProfile(true);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors"
                                >
                                    <UserIcon size={16} />
                                    View Profile
                                </button>

                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        setShowEditProfile(true);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors"
                                >
                                    <Pencil size={16} />
                                    Edit Profile
                                </button>

                                <div className="border-t border-black/5 my-1" />

                                <button
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50/50 transition-colors"
                                >
                                    <LogOut size={16} />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Profile View Modal */}
            <AnimatePresence>
                {showProfile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProfile(false)}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onAnimationStart={() => fetchProfile()}
                            className="rounded-[2rem] border border-white/40 bg-white/70 backdrop-blur-xl shadow-2xl p-6 w-full max-w-sm relative z-10 overflow-hidden"
                        >
                            <button
                                onClick={() => setShowProfile(false)}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>

                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 rounded-full border-4 border-white/50 shadow-inner bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center text-4xl text-primary mb-4 overflow-hidden">
                                    {profile?.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        name.charAt(0).toUpperCase()
                                    )}
                                </div>

                                <h2 className="text-2xl font-bold text-gray-800">
                                    {profile?.displayName || name}
                                </h2>

                                {profile?.username && (
                                    <p className="text-primary font-mono text-sm font-medium">@{profile.username}</p>
                                )}

                                {loading ? (
                                    <div className="mt-4 text-sm text-gray-400 animate-pulse">Loading...</div>
                                ) : profile?.bio ? (
                                    <div className="mt-6 p-4 bg-white/40 rounded-2xl w-full border border-white/20">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Bio</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
                                    </div>
                                ) : (
                                    <div className="mt-6 p-4 bg-white/40 rounded-2xl w-full text-center border border-white/20">
                                        <p className="text-sm text-gray-400 italic">No bio yet</p>
                                    </div>
                                )}

                                <button
                                    onClick={() => { setShowProfile(false); setShowEditProfile(true); }}
                                    className="mt-8 w-full py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    <Pencil size={18} />
                                    Edit Profile
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Profile Edit Modal */}
            <AnimatePresence>
                {showEditProfile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowEditProfile(false)}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onAnimationStart={() => !profile && fetchProfile()}
                            className="rounded-[2rem] border border-white/40 bg-white/70 backdrop-blur-xl shadow-2xl p-6 w-full max-w-sm relative z-10 overflow-hidden"
                        >
                            <button
                                onClick={() => setShowEditProfile(false)}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>

                            <h2 className="text-xl font-bold text-gray-800 mb-6">Edit Profile</h2>

                            <div className="space-y-4">
                                {/* Avatar Upload Section */}
                                <div className="flex flex-col items-center mb-6">
                                    <div className="relative group cursor-pointer w-24 h-24 mb-2">
                                        <div className="w-full h-full rounded-full border-4 border-white/50 shadow-inner bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center text-4xl text-primary overflow-hidden">
                                            {editForm.avatarUrl ? (
                                                <img
                                                    src={editForm.avatarUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                name.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        {/* Overlay with edit icon */}
                                        <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Pencil className="text-white" size={24} />
                                        </label>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 1024 * 1024) { // 1MB limit
                                                        alert("Image must be at most 1MB.");
                                                        return;
                                                    }
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const result = ev.target?.result as string;
                                                        setEditForm({ ...editForm, avatarUrl: result });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </div>
                                    <label htmlFor="avatar-upload" className="text-sm font-medium text-primary hover:underline cursor-pointer">
                                        Change photo
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={editForm.displayName}
                                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/50 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                        placeholder="Your name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bio</label>
                                    <textarea
                                        value={editForm.bio}
                                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/50 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none transition-all placeholder:text-gray-400"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setShowEditProfile(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
