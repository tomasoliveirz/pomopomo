'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import { motion, AnimatePresence } from 'framer-motion';
import throttle from 'lodash.throttle';
import type { Socket } from 'socket.io-client';
import type { Stroke, ShapeType, Participant } from '@/types';

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

export default function Whiteboard({ roomId, socket, userId, participants, onClose }: WhiteboardProps) {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [tool, setTool] = useState<ShapeType | 'eraser' | 'pointer'>('pen');
    const [color, setColor] = useState(COLORS[0]);
    const [hoveredStroke, setHoveredStroke] = useState<Stroke | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

    const handlePointerDown = (e: React.PointerEvent) => {
        if (tool === 'eraser' || tool === 'pointer') return;

        e.currentTarget.setPointerCapture(e.pointerId);
        const point = [e.clientX, e.clientY, e.pressure];

        const id = Date.now().toString();
        const newStroke: Stroke = {
            id,
            userId,
            type: tool === 'pen' ? 'pen' : (tool as ShapeType),
            color,
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

        if (tool === 'eraser' || tool === 'pointer') return;
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

    const deleteStroke = (strokeId: string) => {
        setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
        socket?.emit('whiteboard:erase', { roomId, strokeId });
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
        if (stroke.type === 'pen') {
            const outlinePoints = getStroke(stroke.points, {
                size: 8,
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
                    strokeWidth={4}
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
                    strokeWidth={4}
                />
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
                style={{ cursor: tool === 'pointer' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair' }}
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

            {/* Tooltip */}
            {tool === 'pointer' && hoveredStroke && (
                <div
                    className="fixed z-50 px-3 py-1 bg-black/80 text-white text-xs rounded-full pointer-events-none"
                    style={{ top: mousePos.y + 16, left: mousePos.x + 16 }}
                >
                    {getUserName(hoveredStroke.userId)}
                </div>
            )}

            {/* Toolbar - Moved to Top */}
            <div className="fixed top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40 z-50">
                <div className="flex gap-2 pr-4 border-r border-gray-200">
                    <ToolButton active={tool === 'pointer'} onClick={() => setTool('pointer')} icon="↖️" />
                    <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')} icon="🖊️" />
                    <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} icon="⬜" />
                    <ToolButton active={tool === 'circle'} onClick={() => setTool('circle')} icon="⭕" />
                    <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon="🧹" />
                </div>

                <div className="flex gap-2">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-gray-400 scale-110' : 'border-transparent'
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <div className="w-px h-8 bg-gray-200 mx-2" />

                <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 transition-colors"
                >
                    ✕
                </button>
            </div>
        </motion.div>
    );
}

function ToolButton({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all ${active ? 'bg-gray-100 shadow-inner scale-95' : 'hover:bg-gray-50 hover:scale-105'
                }`}
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
