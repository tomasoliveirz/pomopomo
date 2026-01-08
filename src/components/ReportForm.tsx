'use client';

import { useState } from 'react';

export default function ReportForm() {
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
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium mb-2 opacity-80 text-text">Your Name (Optional)</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tomio"
                    className="input w-full bg-bg/50 focus:bg-bg transition-colors"
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
                />
            </div>

            <button
                type="submit"
                className="w-full py-3 rounded-lg font-bold text-lg shadow-lg shadow-accent/20 hover:shadow-accent/40 transform hover:-translate-y-0.5 transition-all bg-accent text-white hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
                Send Report 🚀
            </button>
        </form>
    );
}
