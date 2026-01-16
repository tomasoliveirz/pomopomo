
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
  onSelectParticipant: (participant: Participant) => void;
}

const EMOJI_OPTIONS = ['❤️', '👍', '🔥', '😂', '😮', '😢'];

export default function ChatDrawer({ open, messages, participants, socket, onClose, onSelectParticipant }: ChatDrawerProps) {
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Participant menu state
  const [menuParticipant, setMenuParticipant] = useState<Participant | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuParticipant(null);
        setMenuPosition(null);
      }
    };
    if (menuParticipant) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuParticipant]);

  const handleParticipantClick = (participant: Participant, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuParticipant(participant);
    setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
  };

  const handleViewProfile = () => {
    if (menuParticipant) {
      onSelectParticipant(menuParticipant);
      setMenuParticipant(null);
      setMenuPosition(null);
    }
  };

  // Auto-scroll on new messages if near bottom or just opened
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when replying
  useEffect(() => {
    if (replyTo && open) {
      inputRef.current?.focus();
    }
  }, [replyTo, open]);

  const handleSend = () => {
    if (!socket || !inputText.trim()) return;

    if (replyTo) {
      socket.emit('message:reply', {
        text: inputText.trim(),
        replyToId: replyTo.id
      });
      setReplyTo(null);
    } else {
      socket.emit('chat:send', { text: inputText.trim() });
    }

    setInputText('');
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!socket) return;
    socket.emit('message:react', { messageId, emoji });
  };

  const getParticipant = (id: string) => participants.find((p) => p.id === id);

  // Helper to get author name for reply banner
  const getReplyAuthor = (msg: Message | null) => {
    if (!msg) return '';
    if (msg.participantId === socket?.id) return 'yourself';
    return getParticipant(msg.participantId)?.displayName || 'Unknown';
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: -350, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -350, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-4 top-24 bottom-24 w-80 bg-card/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-white/40 z-40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/50 backdrop-blur-md">
              <h3 className="font-bold text-lg text-gray-800 font-display flex items-center gap-2">
                <span>💬</span> Chat
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-white hover:text-red-500 transition-all shadow-sm text-gray-500"
              >
                ✕
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center opacity-60">
                  <span className="text-4xl mb-3 grayscale opacity-50">�</span>
                  <p>No messages yet.</p>
                  <p className="text-xs mt-1">Be the first to say hello!</p>
                </div>
              ) : (
                // Unique messages only
                Array.from(new Map(messages.map(m => [m.id, m])).values())
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((msg, i, arr) => {
                    const isMe = msg.participantId === socket?.id;
                    const participant = getParticipant(msg.participantId);
                    // Grouping logic: show name if first msg, different author, or >2 mins gap
                    const prevMsg = i > 0 ? arr[i - 1] : null;
                    const isSequence = prevMsg && prevMsg.participantId === msg.participantId && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000);
                    const showName = !isMe && (!isSequence || i === 0);

                    return (
                      <div key={msg.id} className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        {showName && (
                          <button
                            onClick={(e) => participant && handleParticipantClick(participant, e)}
                            className="text-[10px] font-bold text-gray-400 ml-3 mb-1 uppercase tracking-wide hover:underline hover:text-blue-500 transition-colors"
                          >
                            {participant?.displayName || 'Unknown'}
                          </button>
                        )}

                        {/* Message Bubble Container with Actions Group */}
                        <div className="relative max-w-[85%]">

                          {/* Reply Context */}
                          {msg.replyTo && (
                            <div className={`text-xs mb-1 px-2 py-1 border-l-2 ${isMe ? 'border-blue-400 text-right' : 'border-gray-400 text-left'} text-gray-400 italic bg-white/30 rounded-r`}>
                              <span className="font-semibold">{msg.replyTo.displayName}</span>: {msg.replyTo.text.substring(0, 30)}{msg.replyTo.text.length > 30 ? '...' : ''}
                            </div>
                          )}

                          {/* Bubble */}
                          <div
                            className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm relative ${isMe
                              ? 'bg-gray-800 text-white rounded-2xl rounded-tr-sm bg-gradient-to-br from-gray-800 to-gray-900'
                              : 'bg-white text-gray-700 rounded-2xl rounded-tl-sm border border-gray-100'
                              }`}
                          >
                            {msg.text}
                          </div>

                          {/* Reactions Display */}
                          {(msg.reactionSummary && msg.reactionSummary.length > 0) && (
                            <div className={`mt-1 flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {msg.reactionSummary.map((r, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleReact(msg.id, r.emoji)}
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full border border-gray-100 bg-white/80 shadow-sm hover:scale-110 transition-transform ${msg.myReactions?.includes(r.emoji) ? 'bg-blue-50 border-blue-200' : ''}`}
                                >
                                  {r.emoji} <span className="text-gray-500 font-medium">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Hover Actions (Appear on group hover) */}
                          <div className={`absolute -top-6 ${isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                            {/* Reply Button */}
                            <button
                              onClick={() => setReplyTo(msg)}
                              className="p-1.5 bg-white rounded-full shadow-sm text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                              title="Reply"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-reply"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                            </button>

                            {/* Quick React (Heart) */}
                            <button
                              onClick={() => handleReact(msg.id, '❤️')}
                              className="p-1.5 bg-white rounded-full shadow-sm text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Like"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Banner */}
            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between z-10"
                >
                  <div className="flex flex-col text-xs overflow-hidden">
                    <span className="text-gray-500">Replying to <span className="font-semibold text-gray-800">{getReplyAuthor(replyTo)}</span></span>
                    <span className="text-gray-400 truncate max-w-[200px]">{replyTo.text}</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="p-3 bg-white/80 backdrop-blur-md border-t border-white/20">
              <div className="relative group">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={replyTo ? "Type your reply..." : "Type something..."}
                  className="w-full pl-4 pr-10 py-3 rounded-2xl bg-gray-50/50 border border-transparent focus:border-gray-200 focus:bg-white transition-all outline-none text-sm font-medium shadow-inner"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-black hover:scale-105 transition-all disabled:opacity-0 disabled:scale-0 shadow-lg shadow-gray-900/20"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participant Dropdown Menu */}
      <AnimatePresence>
        {menuParticipant && menuPosition && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: menuPosition.x,
              top: menuPosition.y,
              zIndex: 100
            }}
            className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 overflow-hidden min-w-[160px]"
          >
            {/* User info header */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {menuParticipant.displayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {menuParticipant.role === 'host' ? '👑 Host' : 'Participant'}
              </p>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={handleViewProfile}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                See Profile
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
