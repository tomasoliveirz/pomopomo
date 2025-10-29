'use client';

import { useState, useEffect } from 'react';
import type { Segment, Visibility, Role } from '@/types';
import type { Socket } from 'socket.io-client';
import { useSaveStatus } from '@/hooks/useSaveStatus';
import { motion, AnimatePresence } from 'framer-motion';

export interface InlineSegmentSheetProps {
  segment: Segment;
  role: Role;
  socket: Socket | null;
  roomId: string;
  participantId: string;
  myPrivateTask?: string;
  onClose: () => void;
}

export default function InlineSegmentSheet({
  segment,
  role,
  socket,
  roomId,
  participantId,
  myPrivateTask,
  onClose,
}: InlineSegmentSheetProps) {
  const [privateText, setPrivateText] = useState(myPrivateTask || '');
  const [publicText, setPublicText] = useState('');
  const { status, markSaving, markSaved, markError } = useSaveStatus();
  const [editingPublic, setEditingPublic] = useState(false);

  useEffect(() => {
    setPrivateText(myPrivateTask || '');
  }, [myPrivateTask]);

  const savePrivateTask = () => {
    if (!socket || !privateText.trim()) return;
    
    markSaving();
    socket.emit(
      'segment:task:set',
      {
        segmentId: segment.id,
        text: privateText.trim(),
        visibility: 'private' as Visibility,
      },
      (ok: boolean) => {
        if (ok) {
          markSaved();
        } else {
          markError();
        }
      }
    );
  };

  const proposePublicTask = () => {
    if (!socket || !publicText.trim()) return;

    markSaving();
    socket.emit(
      'segment:task:set',
      {
        segmentId: segment.id,
        text: publicText.trim(),
        visibility: 'public' as Visibility,
      },
      (ok: boolean) => {
        if (ok) {
          markSaved();
          setPublicText('');
          setEditingPublic(false);
        } else {
          markError();
        }
      }
    );
  };

  const editPublicTask = () => {
    if (!socket || !publicText.trim()) return;

    markSaving();
    socket.emit(
      'segment:task:set',
      {
        segmentId: segment.id,
        text: publicText.trim(),
        visibility: 'public' as Visibility,
      },
      (ok: boolean) => {
        if (ok) {
          markSaved();
          setEditingPublic(false);
        } else {
          markError();
        }
      }
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-3 p-3 bg-accent-subtle/5 rounded-lg border border-accent-subtle/10 space-y-3"
      >
        {/* Public Task Section */}
        {segment.publicTask && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide opacity-60">
                Public Task
              </span>
              <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">
                Public
              </span>
            </div>
            {!editingPublic ? (
              <div className="flex items-start gap-2">
                <p className="text-sm flex-1 p-2 bg-accent-subtle/10 rounded">
                  {segment.publicTask}
                </p>
                {role === 'host' && (
                  <button
                    onClick={() => {
                      setPublicText(segment.publicTask || '');
                      setEditingPublic(true);
                    }}
                    className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                    title="Edit public task"
                  >
                    ✏️
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={publicText}
                  onChange={(e) => setPublicText(e.target.value)}
                  placeholder="Edit public task..."
                  className="input text-sm py-2 min-h-[60px] resize-none w-full"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPublicText('');
                      setEditingPublic(false);
                    }}
                    className="btn-ghost text-xs px-3 py-1 flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editPublicTask}
                    className="btn-primary text-xs px-3 py-1 flex-1"
                    disabled={status === 'saving' || !publicText.trim()}
                  >
                    {status === 'saving' ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Propose Public Task (if no public task exists) */}
        {!segment.publicTask && !editingPublic && (
          <div className="space-y-2">
            <button
              onClick={() => setEditingPublic(true)}
              className="w-full text-left text-xs opacity-60 hover:opacity-100 transition-opacity py-2"
            >
              + {role === 'host' ? 'Add public task' : 'Propose public task'}
            </button>
          </div>
        )}

        {!segment.publicTask && editingPublic && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide opacity-60">
                {role === 'host' ? 'Public Task' : 'Propose Public Task'}
              </span>
              {role === 'guest' && (
                <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-500 rounded">
                  Proposal
                </span>
              )}
            </div>
            <textarea
              value={publicText}
              onChange={(e) => setPublicText(e.target.value)}
              placeholder={
                role === 'host'
                  ? "What's the goal for everyone?"
                  : 'Suggest a task for everyone...'
              }
              className="input text-sm py-2 min-h-[60px] resize-none w-full"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPublicText('');
                  setEditingPublic(false);
                }}
                className="btn-ghost text-xs px-3 py-1 flex-1"
              >
                Cancel
              </button>
              <button
                onClick={proposePublicTask}
                className="btn-primary text-xs px-3 py-1 flex-1"
                disabled={status === 'saving' || !publicText.trim()}
              >
                {status === 'saving' ? 'Saving...' : role === 'host' ? 'Save' : 'Propose'}
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        {(segment.publicTask || editingPublic) && (
          <div className="border-t border-accent-subtle/10" />
        )}

        {/* Private Task Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Your Private Task
            </span>
            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded">
              Private
            </span>
          </div>
          <textarea
            value={privateText}
            onChange={(e) => setPrivateText(e.target.value)}
            placeholder="What will you work on?"
            className="input text-sm py-2 min-h-[60px] resize-none w-full"
          />
          <button
            onClick={savePrivateTask}
            className="btn-secondary text-xs px-3 py-1 w-full"
            disabled={status === 'saving' || !privateText.trim()}
          >
            {status === 'saving' ? 'Saving...' : 'Save Private Task'}
          </button>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {status === 'saved' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-green-500 flex items-center gap-1"
            >
              <span>✓</span>
              <span>Saved</span>
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-500 flex items-center gap-1"
            >
              <span>⚠️</span>
              <span>Failed to save. Please try again.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full btn-ghost text-xs py-2 mt-2"
        >
          Close
        </button>
      </motion.div>
    </AnimatePresence>
  );
}




