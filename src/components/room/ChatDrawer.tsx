'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message, Participant } from '@/types';
import type { Socket } from 'socket.io-client';

interface ChatDrawerProps {
  open: boolean;
  messages: Message[];
  participants: Participant[];
  socket: Socket | null;
  onClose: () => void;
}

export default function ChatDrawer({ open, messages, participants, socket, onClose }: ChatDrawerProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!socket || !inputText.trim()) return;

    socket.emit('chat:send', { text: inputText.trim() });
    setInputText('');
  };

  const getParticipantName = (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    return participant?.displayName || 'Unknown';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-80 bg-card border-t border-accent-subtle/20 shadow-lg flex flex-col animate-fade-in z-50">
      <div className="px-4 py-3 border-b border-accent-subtle/20 flex items-center justify-between">
        <h3 className="font-semibold">Chat</h3>
        <button onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-sm opacity-60">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{getParticipantName(message.participantId)}</span>
                <span className="text-xs opacity-40">{formatTime(message.createdAt)}</span>
              </div>
              <div className="text-sm bg-bg/50 rounded-lg px-3 py-2">{message.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-accent-subtle/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1"
            maxLength={500}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="btn-primary px-4"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}






