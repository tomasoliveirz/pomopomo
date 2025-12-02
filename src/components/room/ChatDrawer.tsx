'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message, Participant } from '@/types';
import type { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

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
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = () => {
    if (!socket || !inputText.trim()) return;
    socket.emit('chat:send', { text: inputText.trim() });
    setInputText('');
  };

  const getParticipant = (id: string) => participants.find((p) => p.id === id);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: -350, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -350, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-4 top-4 bottom-24 w-80 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-white/40 z-40 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/20 flex items-center justify-between bg-white/30">
            <h3 className="font-bold text-xl text-gray-800 font-display">Chat</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-white hover:text-red-500 transition-all shadow-sm"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center opacity-60">
                <span className="text-2xl mb-2">💭</span>
                <p>Say hello to the room!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.participantId === socket?.id; // Or compare with stored ID
                const participant = getParticipant(msg.participantId);
                const showName = i === 0 || messages[i - 1].participantId !== msg.participantId;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showName && !isMe && (
                      <span className="text-[10px] font-bold text-gray-400 ml-3 mb-1">
                        {participant?.displayName || 'Unknown'}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2 max-w-[85%] text-sm font-medium ${isMe
                        ? 'bg-gray-800 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-gray-100 text-gray-700 rounded-2xl rounded-tl-sm'
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/50 border-t border-gray-100">
            <div className="relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type something..."
                className="w-full pl-4 pr-10 py-3 rounded-full bg-gray-50 border-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all outline-none text-sm font-medium"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-0 disabled:scale-0"
              >
                ↑
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
