'use client';

import { useEffect, useRef } from 'react';
import Matter from 'matter-js';

export default function BackgroundPhysics() {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    useEffect(() => {
        if (!sceneRef.current) return;

        // Module aliases
        const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            Bodies = Matter.Bodies,
            Composite = Matter.Composite,
            Mouse = Matter.Mouse,
            MouseConstraint = Matter.MouseConstraint,
            Events = Matter.Events;

        // Create engine
        const engine = Engine.create();
        const world = engine.world;
        engineRef.current = engine;

        // Create renderer
        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                background: '#fdfbf7', // Cream/Kawaii background
                wireframes: false,
                pixelRatio: window.devicePixelRatio, // Ensure correct scaling
            },
        });
        renderRef.current = render;

        // Create walls
        const wallOptions = {
            isStatic: true,
            render: { visible: false }
        };

        const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, wallOptions);
        const ceiling = Bodies.rectangle(window.innerWidth / 2, -50, window.innerWidth, 100, wallOptions);
        const leftWall = Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, wallOptions);
        const rightWall = Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, wallOptions);

        Composite.add(world, [ground, ceiling, leftWall, rightWall]);

        // Create tomatoes
        const tomatoes: Matter.Body[] = [];
        const tomatoCount = 10; // Increased count for smaller size

        for (let i = 0; i < tomatoCount; i++) {
            const size = 200 + Math.random() * 100; // Half size: 200-300px
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * (window.innerHeight / 2) - 200; // Start above

            const tomato = Bodies.circle(x, y, size / 2, {
                restitution: 1, // Perfectly elastic - no energy loss on collision
                friction: 0,      // No friction
                frictionAir: 0,   // No air resistance
                frictionStatic: 0,
                render: {
                    sprite: {
                        texture: '/branding/logo.svg',
                        xScale: size / 500, // Adjusted for 500px image to fill hitbox exactly
                        yScale: size / 500,
                    },
                },
            });

            // Give them a random initial velocity so they aren't static
            Matter.Body.setVelocity(tomato, {
                x: (Math.random() - 0.5) * 5,
                y: (Math.random() - 0.5) * 5
            });

            tomatoes.push(tomato);
        }

        Composite.add(world, tomatoes);

        // Add "Living Particles" behavior
        Events.on(engine, 'beforeUpdate', () => {
            tomatoes.forEach(tomato => {
                // Random jump / propulsion
                // 1% chance per frame to change direction/impulse
                if (Math.random() < 0.01) {
                    // Apply a small force in a random direction
                    const forceMagnitude = 0.005 * tomato.mass; // Small enough to be subtle but noticeable
                    Matter.Body.applyForce(tomato, tomato.position, {
                        x: (Math.random() - 0.5) * forceMagnitude,
                        y: (Math.random() - 0.5) * forceMagnitude,
                    });
                }

                // Limit velocity to prevent chaos
                const maxSpeed = 8;
                if (tomato.speed > maxSpeed) {
                    Matter.Body.setSpeed(tomato, maxSpeed);
                }
            });
        });

        // Add mouse control
        const mouse = Mouse.create(render.canvas);
        mouse.pixelRatio = window.devicePixelRatio || 1; // Fix for high DPI screens

        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false,
                },
            },
        });

        Composite.add(world, mouseConstraint);

        // Keep the mouse in sync with rendering
        render.mouse = mouse;

        // Run the engine
        Render.run(render);
        const runner = Runner.create();
        runnerRef.current = runner;
        Runner.run(runner, engine);

        // Handle resize
        const handleResize = () => {
            render.canvas.width = window.innerWidth;
            render.canvas.height = window.innerHeight;
            // Update pixel ratio on resize if moved to different screen
            mouse.pixelRatio = window.devicePixelRatio || 1;

            // Reposition walls
            Matter.Body.setPosition(ground, { x: window.innerWidth / 2, y: window.innerHeight + 50 });
            Matter.Body.setPosition(ceiling, { x: window.innerWidth / 2, y: -50 });
            Matter.Body.setPosition(leftWall, { x: -50, y: window.innerHeight / 2 });
            Matter.Body.setPosition(rightWall, { x: window.innerWidth + 50, y: window.innerHeight / 2 });

            // Resize bodies
            // Note: Changing body size is complex in Matter.js, usually easier to just update positions
        };

        window.addEventListener('resize', handleResize);

        // Handle device orientation for gravity
        const handleOrientation = (event: DeviceOrientationEvent) => {
            const { gamma, beta } = event; // gamma: left-to-right, beta: front-to-back

            if (gamma !== null && beta !== null) {
                // Clamp gravity values
                const gravityX = Math.min(Math.max(gamma / 45, -1), 1);
                const gravityY = Math.min(Math.max(beta / 45, -1), 1);

                engine.world.gravity.x = gravityX;
                engine.world.gravity.y = Math.abs(gravityY) < 0.2 ? 1 : gravityY; // Default to down if flat
            }
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation);
        }

        return () => {
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas) {
                render.canvas.remove();
            }
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, []);

    return (
        <div
            ref={sceneRef}
            className="fixed inset-0 z-0 pointer-events-auto"
            style={{ touchAction: 'none' }} // Prevent scrolling on mobile while interacting
        />
    );
}
