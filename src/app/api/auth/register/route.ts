
import { NextResponse } from 'next/server';
import { prisma } from '@infra/db/prisma/prismaClient';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
    displayName: z.string().min(2).max(30),
    email: z.string().email(),
    password: z.string().min(6),
    roomId: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { displayName, email, password, roomId } = registerSchema.parse(body);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email já registado.' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User
        const newUser = await prisma.user.create({
            data: {
                name: displayName,
                email,
                passwordHash: hashedPassword,
                image: `https://api.dicebear.com/7.x/notionists/svg?seed=${email}`,
                profile: {
                    create: {
                        displayName: displayName,
                        profileCompleted: false
                    }
                }
            },
        });

        // Usually with NextAuth + Prisma Adapter, credentials are not stored in User table unless customized.
        // I need to check schema.prisma to see if there is a `password` field on User or if I need to create an Entry.
        // STOP. I must check schema.prisma before writing this file completely.

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Error' }, { status: 400 });
    }
}
