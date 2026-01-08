'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';

export default function ReportPage() {
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const email = 'contact.orbit.app@gmail.com';
        const emailSubject = encodeURIComponent(`[Bug Report] ${subject}`);
        const emailBody = encodeURIComponent(`Name: ${name}\n\nMessage:\n${message}`);

        window.location.href = `mailto:${email}?subject=${emailSubject}&body=${emailBody}`;
    };

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
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2 opacity-80">Your Name (Optional)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Tomio"
                                className="input w-full bg-bg/50 focus:bg-bg transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 opacity-80">What's happening?</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. Timer stopped working..."
                                required
                                className="input w-full bg-bg/50 focus:bg-bg transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 opacity-80">Tell us more details!</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe what happened so we can fix it fast! (´｡• ᵕ •｡`)"
                                required
                                rows={5}
                                className="input w-full bg-bg/50 focus:bg-bg transition-colors resize-none py-3"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary w-full py-3 text-lg font-bold shadow-lg shadow-accent/20 hover:shadow-accent/40 transform hover:-translate-y-0.5 transition-all"
                        >
                            Send Report 🚀
                        </button>
                    </form>
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
