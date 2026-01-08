import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/db/prisma/prismaClient';
import { z } from 'zod';

const reportSchema = z.object({
    name: z.string().optional(),
    subject: z.string().min(1, 'Subject is required'),
    message: z.string().min(1, 'Message is required'),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validated = reportSchema.parse(body);

        const report = await prisma.report.create({
            data: {
                name: validated.name || 'Anonymous',
                subject: validated.subject,
                message: validated.message,
            },
        });

        return NextResponse.json({ success: true, data: report });
    } catch (error) {
        console.error('Failed to submit report:', error);
        return NextResponse.json(
            { error: 'Failed to submit report' },
            { status: 500 }
        );
    }
}
