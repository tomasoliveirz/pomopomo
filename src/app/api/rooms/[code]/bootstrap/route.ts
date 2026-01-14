import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/app/container';
import { resolveActor } from '@/lib/actor';
import { RoomCode } from '@/core/domain/value-objects/RoomCode';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { TokenPayload } from '@/core/application/ports/IAuthService';
import { UserProfile } from '@/core/domain/entities/UserProfile';
import { Participant } from '@/core/domain/entities/Participant';

export async function POST(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    try {
        const { code } = params;
        const normalizedCode = RoomCode.normalize(code); // Used for UseCase/Code creation
        const actor = await resolveActor();

        // 1. Find Room
        const roomCode = RoomCode.create(code);
        const room = await container.roomRepo.findByCode(roomCode);
        if (!room) {
            return NextResponse.json({ status: 'room-not-found' }, { status: 404 });
        }

        // 2. Check for existing participant with robust fallback
        let participant = null;

        if (actor.actorType === 'user' && actor.userId) {
            // A. Authenticated User: Try resolving by UserID first
            participant = await container.participantRepo.findByUserId(room.id, actor.userId);

            // B. Fallback: If not found by UserID, check if they have a Guest session (Candidate for connect/upgrade)
            if (!participant) {
                const sessionParticipant = await container.participantRepo.findBySessionId(room.id, actor.sessionId);
                // If found AND it's a guest participant (no userId linked yet), we take it.
                if (sessionParticipant && !sessionParticipant.props.userId) {
                    participant = sessionParticipant;
                }
            }
        } else {
            // C. Guest: Resolve by SessionID
            participant = await container.participantRepo.findBySessionId(room.id, actor.sessionId);
        }

        // 3. IDEMPOTENT RETURN (Already joined)
        if (participant) {
            // GUEST UPGRADE: Merge session participant into user participant
            // This runs if we found a participant (via UserId OR SessionId fallback) that needs upgrading.
            // Condition: We are a User, but the participant has no UserId (it was a guest session).
            if (!participant.props.userId && actor.actorType === 'user' && actor.userId) {
                console.log(`✨ Upgrading guest participant ${participant.id} to user ${actor.userId}`);

                // Update the participant entity with the new user ID
                const upgradedParticipant = new Participant({
                    ...participant.props,
                    userId: actor.userId,
                    // Decision: Keep the guest name to avoid confusion. User can update in profile.
                });

                await container.participantRepo.save(upgradedParticipant);

                // Update local reference so token is generated correctly
                participant = upgradedParticipant;
            }

            // P1 FIX: Check if profile setup is needed even for existing/upgraded participants
            let needsProfileSetup = false;
            if (actor.actorType === 'user' && actor.userId) {
                const profile = await container.userProfileRepo.findByUserId(actor.userId);
                if (!profile || !profile.isCompleted) {
                    needsProfileSetup = true;
                    // Ensure profile exists if missing (auto-heal/provisional)
                    if (!profile) {
                        const provisionalName = "Pomo User";
                        await container.userProfileRepo.save(new UserProfile(crypto.randomUUID(), {
                            userId: actor.userId,
                            displayName: provisionalName,
                            profileCompleted: false,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }));
                    }
                }
            }

            const tokenPayload: TokenPayload = {
                actorType: actor.actorType,
                roomId: room.id,
                participantId: participant.id,
                role: participant.role,
                userId: actor.actorType === 'user' ? actor.userId : undefined,
                sessionId: actor.sessionId
            };

            const token = await container.authService.generateToken(tokenPayload);

            return NextResponse.json({
                status: 'joined',
                needsProfileSetup, // Now correctly populated for all paths
                data: {
                    participant: {
                        id: participant.id,
                        displayName: participant.displayName,
                        role: participant.role,
                        joinedAt: participant.props.joinedAt.toISOString(),
                    },
                    room: {
                        id: room.id,
                        code: room.code.toString(),
                        theme: room.props.theme,
                        status: room.status,
                        currentSegmentIndex: room.currentSegmentIndex,
                    },
                    wsToken: token
                }
            });
        }

        // 4. Not joined yet - Determine Next Step
        if (actor.actorType === 'user' && actor.userId) {
            // Check Profile
            let profile = await container.userProfileRepo.findByUserId(actor.userId);
            let needsProfileSetup = false;

            if (!profile) {
                // PROGRESSIVE ONBOARDING: Create provisional profile
                const provisionalName = "Pomo User";
                const newProfile = new UserProfile(crypto.randomUUID(), {
                    userId: actor.userId,
                    displayName: provisionalName,
                    profileCompleted: false, // Flag for UI
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await container.userProfileRepo.save(newProfile);
                profile = newProfile;
                needsProfileSetup = true;
            } else if (!profile.isCompleted) {
                needsProfileSetup = true;
            }

            // AUTO-JOIN (Provisional or Full)
            try {
                const result = await container.joinRoomUseCase.execute({
                    code: normalizedCode,
                    sessionId: actor.sessionId,
                    userId: actor.userId,
                    displayName: profile.displayName
                });

                return NextResponse.json({
                    status: 'joined',
                    needsProfileSetup, // Frontend trigger for modal
                    data: {
                        participant: {
                            id: result.participant.id,
                            displayName: result.participant.displayName,
                            role: result.participant.role,
                            joinedAt: result.participant.props.joinedAt.toISOString(),
                        },
                        room: {
                            id: result.room.id,
                            code: result.room.code.toString(),
                            theme: result.room.props.theme,
                            status: result.room.status,
                            currentSegmentIndex: result.room.currentSegmentIndex,
                        },
                        wsToken: result.token
                    }
                });
            } catch (e: any) {
                console.error("Auto-join error", e);
                return NextResponse.json({ status: 'error', message: e.message }, { status: 400 });
            }
        } else {
            // Guest logic remains same
            return NextResponse.json({ status: 'needs-join' });
        }

    } catch (error: any) {
        console.error('Bootstrap error:', error);
        return NextResponse.json(
            { status: 'error', message: error.message || 'Bootstrap failed' },
            { status: 500 }
        );
    }
}
