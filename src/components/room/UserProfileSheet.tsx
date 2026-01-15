
'use client';

import { motion } from 'framer-motion';
import type { Participant } from '@/types';

interface UserProfileSheetProps {
    participant: Participant | null;
    onClose: () => void;
}

export default function UserProfileSheet({ participant, onClose }: UserProfileSheetProps) {
    if (!participant) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm relative z-10 overflow-hidden"
            >
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-100 to-purple-100 z-0" />

                <div className="relative z-10 flex flex-col items-center mt-8">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg mb-4">
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center text-3xl overflow-hidden">
                            {/* Placeholder avatar or initial */}
                            {participant.displayName.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800">{participant.displayName}</h2>
                    <span className="text-sm text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-full mt-1">
                        {participant.role === 'host' ? '👑 Host' : 'Participant'}
                    </span>

                    <div className="mt-6 w-full space-y-3">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Status</p>
                            <p className="text-sm text-gray-700">In the zone</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-8 w-full py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-black transition-transform active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
