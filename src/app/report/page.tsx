'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';
import ReportForm from '@/components/ReportForm';

export default function ReportPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg text-text transition-colors duration-500">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg"
            >
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <Logo size="large" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3 font-display">Something wrong?</h1>
                    <p className="text-lg opacity-80">
                        Don't worry! It all will be solved so please tell us!!! (｡•̀ᴗ-)✧
                    </p>
                </div>

                <div className="card backdrop-blur-sm bg-card/80 shadow-xl border-2 border-accent/20">
                    <ReportForm />
                </div>

                <div className="text-center mt-8">
                    <Link
                        href="/"
                        className="text-sm opacity-60 hover:opacity-100 hover:text-accent transition-colors flex items-center justify-center gap-2"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
