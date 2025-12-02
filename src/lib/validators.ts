import { z } from 'zod';

// Room validators
export const createRoomSchema = z.object({
  theme: z.enum(['midnight_bloom', 'lilac_mist', 'solar_cream', 'verdant_dew', 'sakura_ink', 'arctic_drift', 'amber_dusk', 'coral_velvet', 'noir_mint']).optional(),
});

export const joinRoomSchema = z.object({
  code: z.string().min(6).max(12),
  displayName: z.string().min(1).max(50).trim(),
});

// Segment validators
export const segmentSchema = z.object({
  kind: z.enum(['focus', 'break', 'long_break', 'custom']),
  label: z.string().min(1).max(100).trim(),
  durationSec: z.number().int().min(60).max(7200), // 1 min to 2 hours
  publicTask: z.string().max(500).trim().optional().nullable(),
});

export const replaceQueueSchema = z.object({
  segments: z.array(segmentSchema).min(1).max(50),
});

export const reorderQueueSchema = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
});

// Task validators
export const setTaskSchema = z.object({
  segmentId: z.string().uuid(),
  text: z.string().max(500).trim(),
  visibility: z.enum(['private', 'public']),
});

// Proposal validators
export const submitProposalSchema = z.object({
  type: z.enum(['add_segment', 'edit_segment', 'public_task']),
  payload: z.any(),
});

export const moderateProposalSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(['accepted', 'rejected']),
});

// Chat validators
export const sendChatSchema = z.object({
  text: z.string().min(1).max(500).trim(),
});



// Play/skip validators
export const playQueueSchema = z.object({
  index: z.number().int().min(0).optional(),
});


