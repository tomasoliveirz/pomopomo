import { PrismaRoomRepository } from '../infrastructure/db/prisma/PrismaRoomRepository';
import { PrismaParticipantRepository } from '../infrastructure/db/prisma/PrismaParticipantRepository';
import { NullRoomEventsBus } from '../infrastructure/ws/NullRoomEventsBus';
import { SystemClock } from '../infrastructure/config/SystemClock';
import { JwtAuthService } from '../infrastructure/auth/JwtAuthService';
import { CreateRoomUseCase } from '../core/application/use-cases/CreateRoomUseCase';

import { JoinRoomUseCase } from '../core/application/use-cases/JoinRoomUseCase';

// Singletons
const roomRepo = new PrismaRoomRepository();
const participantRepo = new PrismaParticipantRepository();
const nullEventsBus = new NullRoomEventsBus();
const clock = new SystemClock();
const authService = new JwtAuthService();

// Use Cases
const createRoomUseCase = new CreateRoomUseCase(
    roomRepo,
    participantRepo,
    nullEventsBus,
    clock
);

const joinRoomUseCase = new JoinRoomUseCase(
    roomRepo,
    participantRepo,
    authService,
    nullEventsBus,
    clock
);

export const container = {
    createRoomUseCase,
    joinRoomUseCase,
    authService
};
