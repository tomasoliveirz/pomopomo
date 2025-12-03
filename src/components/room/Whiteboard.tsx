'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import { motion, AnimatePresence } from 'framer-motion';
import throttle from 'lodash.throttle';
import type { Socket } from 'socket.io-client';
import type { Stroke, ShapeType, Participant } from '@/types';
import {
    MousePointer2,
    Pen,
    Square,
    Circle,
    Type,
    Eraser,
    Trash2,
    X
} from 'lucide-react';

interface WhiteboardProps {
    roomId: string;
    socket: Socket | null;
    userId: string;
    participants: Participant[];
    onClose: () => void;
}

const COLORS = [
    '#fda4af', // rose-300
    '#93c5fd', // blue-300
    '#86efac', // green-300
    '#fde047', // yellow-300
    '#4b5563', // gray-600 (soft black)
];

const SIZES = [4, 8, 16];

export default function Whiteboard({ roomId, socket, userId, participants, onClose }: WhiteboardProps) {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [tool, setTool] = useState<ShapeType | 'eraser' | 'pointer'>('pen');
    const [color, setColor] = useState(COLORS[0]);
    const [strokeWidth, setStrokeWidth] = useState(8);
    const [hoveredStroke, setHoveredStroke] = useState<Stroke | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Text Tool State
    const [textInput, setTextInput] = useState<{ x: number; y: number; content: string } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    // Throttled socket emitter
    const emitDraw = useCallback(
        throttle((stroke: Stroke) => {
            socket?.emit('whiteboard:draw', { roomId, stroke });
        }, 20),
        [roomId, socket]
    );

    useEffect(() => {
        if (!socket) return;

        const handleState = (serverStrokes: Stroke[]) => setStrokes(serverStrokes);
        const handleNewStroke = (stroke: Stroke) => {
            setStrokes((prev) => [...prev, stroke]);
        };
        const handleErase = (strokeId: string) => {
            setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
        };
        const handleClear = () => setStrokes([]);

        socket.on('whiteboard:state', handleState);
        socket.on('whiteboard:new-stroke', handleNewStroke);
        socket.on('whiteboard:erase', handleErase);
        socket.on('whiteboard:clear', handleClear);

        // Request initial state
        socket.emit('whiteboard:request-state', roomId);

        return () => {
            socket.off('whiteboard:state', handleState);
            socket.off('whiteboard:new-stroke', handleNewStroke);
            socket.off('whiteboard:erase', handleErase);
            socket.off('whiteboard:clear', handleClear);
        };
    }, [socket, roomId]);

    // Focus text input when it appears
    useEffect(() => {
        if (textInput && textInputRef.current) {
            textInputRef.current.focus();
        }
    }, [textInput]);

    const commitText = () => {
        if (!textInput) return;

        if (textInput.content.trim()) {
            const id = Date.now().toString();
            const newStroke: Stroke = {
                id,
                userId,
                type: 'text',
                color,
                points: [],
                x: textInput.x,
                y: textInput.y,
                content: textInput.content,
                fontSize: 24, // Default font size
            };

            setStrokes((prev) => [...prev, newStroke]);
            socket?.emit('whiteboard:draw', { roomId, stroke: newStroke });
        }

        setTextInput(null);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        // If we have an active text input and click elsewhere, commit it first
        if (textInput) {
            // Check if clicking inside the input (handled by input itself usually, but safe to check)
            if (e.target === textInputRef.current) return;

            commitText();
            return;
        }

        if (tool === 'eraser' || tool === 'pointer') return;

        // Text Tool Logic
        if (tool === 'text') {
            setTextInput({ x: e.clientX, y: e.clientY, content: '' });
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        const point = [e.clientX, e.clientY, e.pressure];

        const id = Date.now().toString();
        const newStroke: Stroke = {
            id,
            userId,
            type: tool as ShapeType,
            color,
            strokeWidth,
            points: [point],
            x: point[0],
            y: point[1],
            width: 0,
            height: 0,
        };

        setCurrentStroke(newStroke);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });

        if (tool === 'eraser' || tool === 'pointer' || tool === 'text') return;
        if (!currentStroke) return;

        const point = [e.clientX, e.clientY, e.pressure];
        const updatedStroke = { ...currentStroke };

        if (tool === 'pen') {
            updatedStroke.points = [...updatedStroke.points, point];
        } else {
            // For shapes, points[0] is start, current point is end
            const start = updatedStroke.points[0];
            updatedStroke.points = [start, point];

            updatedStroke.x = Math.min(start[0], point[0]);
            updatedStroke.y = Math.min(start[1], point[1]);
            updatedStroke.width = Math.abs(point[0] - start[0]);
            updatedStroke.height = Math.abs(point[1] - start[1]);

            if (tool === 'circle') {
                const dx = point[0] - start[0];
                const dy = point[1] - start[1];
                updatedStroke.radius = Math.sqrt(dx * dx + dy * dy);
            }
        }

        setCurrentStroke(updatedStroke);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (currentStroke) {
            setStrokes((prev) => [...prev, currentStroke]);
            socket?.emit('whiteboard:draw', { roomId, stroke: currentStroke });
            setCurrentStroke(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commitText();
        }
    };

    const deleteStroke = (strokeId: string) => {
        setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
        socket?.emit('whiteboard:erase', { roomId, strokeId });
    };

    const handleClearAll = () => {
        if (confirm('Clear entire whiteboard?')) {
            setStrokes([]);
            socket?.emit('whiteboard:clear', roomId);
        }
    };

    const handleStrokePointerDown = (e: React.PointerEvent, strokeId: string) => {
        if (tool === 'eraser') {
            e.stopPropagation();
            deleteStroke(strokeId);
        }
    };

    const handleStrokePointerEnter = (e: React.PointerEvent, stroke: Stroke) => {
        if (tool === 'eraser' && e.buttons === 1) {
            deleteStroke(stroke.id);
        }
        if (tool === 'pointer') {
            setHoveredStroke(stroke);
        }
    };

    const handleStrokePointerLeave = () => {
        setHoveredStroke(null);
    };

    const getUserName = (id: string) => {
        if (id === userId) return 'You';
        return participants.find((p) => p.id === id)?.displayName || 'Unknown';
    };

    // Render helpers
    const renderStroke = (stroke: Stroke) => {
        const sw = stroke.strokeWidth || 8;

        if (stroke.type === 'pen') {
            const outlinePoints = getStroke(stroke.points, {
                size: sw,
                thinning: 0.5,
                smoothing: 0.5,
                streamline: 0.5,
            });
            const pathData = getSvgPathFromStroke(outlinePoints);
            return <path d={pathData} fill={stroke.color} />;
        } else if (stroke.type === 'rect') {
            return (
                <rect
                    x={stroke.x}
                    y={stroke.y}
                    width={stroke.width}
                    height={stroke.height}
                    rx={10}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={sw}
                />
            );
        } else if (stroke.type === 'circle') {
            const start = stroke.points[0];
            return (
                <circle
                    cx={start[0]}
                    cy={start[1]}
                    r={stroke.radius}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={sw}
                />
            );
        } else if (stroke.type === 'text') {
            return (
                <text
                    x={stroke.x}
                    y={stroke.y}
                    fill={stroke.color}
                    fontSize={stroke.fontSize || 24}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="600"
                    dominantBaseline="hanging"
                    style={{ userSelect: 'none' }}
                >
                    {stroke.content}
                </text>
            );
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-white/30 backdrop-blur-xl"
        >
            <svg
                className="w-full h-full touch-none"
                style={{
                    cursor: tool === 'pointer' ? 'default'
                        : tool === 'eraser' ? 'cell'
                            : tool === 'text' ? 'text'
                                : 'crosshair'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {strokes.map((stroke) => (
                    <g
                        key={stroke.id}
                        onPointerDown={(e) => handleStrokePointerDown(e, stroke.id)}
                        onPointerEnter={(e) => handleStrokePointerEnter(e, stroke)}
                        onPointerLeave={handleStrokePointerLeave}
                        className={tool === 'pointer' ? 'hover:opacity-80 cursor-help' : ''}
                    >
                        {renderStroke(stroke)}
                    </g>
                ))}
                {currentStroke && (
                    <g className="opacity-70">
                        {renderStroke(currentStroke)}
                    </g>
                )}
            </svg>

            {/* Text Input Overlay */}
            {textInput && (
                <div
                    className="absolute z-50"
                    style={{ top: textInput.y, left: textInput.x }}
                >
                    <input
                        ref={textInputRef}
                        type="text"
                        autoFocus
                        value={textInput.content}
                        onChange={(e) => setTextInput({ ...textInput, content: e.target.value })}
                        onKeyDown={handleKeyDown}
                        onBlur={commitText}
                        className="bg-transparent border-b-2 border-blue-500 outline-none text-2xl font-semibold text-gray-800 min-w-[100px]"
                        style={{ color: color, fontFamily: 'system-ui' }}
                        placeholder="Type..."
                    />
                </div>
            )}

            {/* Tooltip */}
            {tool === 'pointer' && hoveredStroke && (
                <div
                    className="fixed z-50 px-3 py-1 bg-black/80 text-white text-xs rounded-full pointer-events-none"
                    style={{ top: mousePos.y + 16, left: mousePos.x + 16 }}
                >
                    {getUserName(hoveredStroke.userId)}
                </div>
            )}

            {/* Toolbar - Clean & Pro */}
            <div className="fixed top-8 left-1/2 -translate-x-1/2 flex items-center py-3 px-4 bg-white/95 backdrop-blur-2xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60 z-50 gap-1">

                {/* Tools */}
                <div className="flex gap-1">
                    <ToolButton active={tool === 'pointer'} onClick={() => setTool('pointer')} icon={<MousePointer2 size={20} strokeWidth={2} />} label="Select" />
                    <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')} icon={<Pen size={20} strokeWidth={2} />} label="Pen" />
                    <ToolButton active={tool === 'text'} onClick={() => setTool('text')} icon={<Type size={20} strokeWidth={2} />} label="Text" />
                    <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={20} strokeWidth={2} />} label="Eraser" />
                </div>

                <div className="border-l border-gray-200 h-6 mx-2" />

                {/* Shapes */}
                <div className="flex gap-1">
                    <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={<Square size={20} strokeWidth={2} />} label="Rect" />
                    <ToolButton active={tool === 'circle'} onClick={() => setTool('circle')} icon={<Circle size={20} strokeWidth={2} />} label="Circle" />
                </div>

                <div className="border-l border-gray-200 h-6 mx-2" />

                {/* Sizes */}
                <div className="flex gap-3 px-2 items-center">
                    {SIZES.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStrokeWidth(s)}
                            className={`rounded-full bg-gray-800 transition-all ${strokeWidth === s ? 'opacity-100 scale-125 ring-2 ring-offset-2 ring-gray-300' : 'opacity-30 hover:opacity-60'
                                }`}
                            style={{ width: Math.max(s, 6), height: Math.max(s, 6) }}
                            title={`Size ${s}px`}
                        />
                    ))}
                </div>

                <div className="border-l border-gray-200 h-6 mx-2" />

                {/* Colors */}
                <div className="flex gap-2 px-1">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${color === c ? 'border-gray-400 scale-110 ring-2 ring-offset-2 ring-gray-200' : 'border-transparent'
                                }`}
                            style={{ backgroundColor: c }}
                            title={c}
                        />
                    ))}
                </div>

                <div className="border-l border-gray-200 h-6 mx-2" />

                {/* Actions */}
                <div className="flex gap-1">
                    <button
                        onClick={handleClearAll}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Clear All"
                    >
                        <Trash2 size={20} strokeWidth={2} />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        title="Close"
                    >
                        <X size={20} strokeWidth={2} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function ToolButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${active
                    ? 'bg-blue-50 text-blue-600 shadow-sm scale-105'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
            title={label}
        >
            {icon}
        </button>
    );
}

function getSvgPathFromStroke(stroke: number[][]) {
    if (!stroke.length) return '';

    const d = stroke.reduce(
        (acc, [x0, y0], i, arr) => {
            const [x1, y1] = arr[(i + 1) % arr.length];
            acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
            return acc;
        },
        ['M', ...stroke[0], 'Q']
    );

    d.push('Z');
    return d.join(' ');
}
