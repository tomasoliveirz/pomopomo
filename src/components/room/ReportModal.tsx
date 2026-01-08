'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import ReportForm from '@/components/ReportForm';

interface ReportModalProps {
    onClose: () => void;
}

export default function ReportModal({ onClose }: ReportModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-card rounded-3xl shadow-2xl overflow-hidden border-4 border-accent/20"
            >
                {/* Header */}
                <div className="relative h-32 bg-accent/10 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent" />
                    <div className="text-center z-10">
                        <h2 className="text-3xl font-bold font-display text-accent mb-1">Report Bug</h2>
                        <p className="text-sm opacity-70">Let's fix this together! (｡•̀ᴗ-)✧</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
                    >
                        <X size={24} className="opacity-50" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <ReportForm />
                </div>
            </motion.div>
        </div>
    );
}
