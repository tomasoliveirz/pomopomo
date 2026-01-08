'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function ReportForm() {
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');

        try {
            const response = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, subject, message }),
            });

            if (!response.ok) throw new Error('Failed to submit');

            setStatus('success');
            setName('');
            setSubject('');
            setMessage('');
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center py-12 space-y-4">
                <div className="text-4xl">✨</div>
                <h3 className="text-xl font-bold text-accent">Report Sent!</h3>
                <p className="text-text opacity-70">Thank you for helping us improve Pomopomo!</p>
                <button
                    onClick={() => setStatus('idle')}
                    className="btn-secondary mt-4"
                >
                    Send another
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium mb-2 opacity-80 text-text">Your Name (Optional)</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tomio"
                    className="input w-full bg-bg/50 focus:bg-bg transition-colors"
                    disabled={status === 'submitting'}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2 opacity-80 text-text">What's happening?</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Timer stopped working..."
                    required
                    className="input w-full bg-bg/50 focus:bg-bg transition-colors"
                    disabled={status === 'submitting'}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2 opacity-80 text-text">Tell us more details!</label>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe what happened so we can fix it fast! (´｡• ᵕ •｡`)"
                    required
                    rows={5}
                    className="input w-full bg-bg/50 focus:bg-bg transition-colors resize-none py-3"
                    disabled={status === 'submitting'}
                />
            </div>

            {status === 'error' && (
                <div className="text-red-500 text-sm text-center">
                    Something went wrong. Please try again.
                </div>
            )}

            <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-3 rounded-lg font-bold text-lg shadow-lg shadow-accent/20 hover:shadow-accent/40 transform hover:-translate-y-0.5 transition-all bg-accent text-gray-900 hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {status === 'submitting' ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        Sending...
                    </>
                ) : (
                    'Send Report 🚀'
                )}
            </button>
        </form>
    );
}

