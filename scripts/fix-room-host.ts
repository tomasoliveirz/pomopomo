#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoomHost(roomCode: string, hostDisplayName: string) {
  console.log(`🔧 Fixing host for room ${roomCode}...`);
  
  // Find the room
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: {
      participants: {
        orderBy: { joinedAt: 'asc' }
      }
    }
  });

  if (!room) {
    console.error(`❌ Room ${roomCode} not found`);
    process.exit(1);
  }

  console.log(`\n📊 Current state:`);
  console.log(`Room ID: ${room.id}`);
  console.log(`Room hostSessionId: ${room.hostSessionId}`);
  console.log(`\nParticipants:`);
  room.participants.forEach(p => {
    console.log(`  - ${p.displayName} (${p.role}) - Session: ${p.sessionId}`);
  });

  // Find the participant that should be host
  const targetHost = room.participants.find(
    p => p.displayName.toLowerCase() === hostDisplayName.toLowerCase()
  );

  if (!targetHost) {
    console.error(`\n❌ Participant "${hostDisplayName}" not found in room`);
    console.log(`\nAvailable participants:`);
    room.participants.forEach(p => {
      console.log(`  - ${p.displayName}`);
    });
    process.exit(1);
  }

  console.log(`\n✅ Found target host: ${targetHost.displayName} (ID: ${targetHost.id})`);
  console.log(`\n🔄 Applying fixes...`);

  // Set all participants to guest first
  const demoteResult = await prisma.participant.updateMany({
    where: { 
      roomId: room.id,
      role: 'host'
    },
    data: { role: 'guest' }
  });
  console.log(`  ✓ Demoted ${demoteResult.count} participants to guest`);

  // Set the target participant as host
  await prisma.participant.update({
    where: { id: targetHost.id },
    data: { role: 'host' }
  });
  console.log(`  ✓ Promoted ${targetHost.displayName} to host`);

  // Update room's hostSessionId
  await prisma.room.update({
    where: { id: room.id },
    data: { hostSessionId: targetHost.sessionId }
  });
  console.log(`  ✓ Updated room hostSessionId to ${targetHost.sessionId}`);

  // Verify the changes
  const updatedRoom = await prisma.room.findUnique({
    where: { code: roomCode },
    include: {
      participants: {
        orderBy: { joinedAt: 'asc' }
      }
    }
  });

  console.log(`\n✅ Updated state:`);
  console.log(`Room hostSessionId: ${updatedRoom?.hostSessionId}`);
  console.log(`\nParticipants:`);
  updatedRoom?.participants.forEach(p => {
    console.log(`  - ${p.displayName} (${p.role})`);
  });

  const hostCount = updatedRoom?.participants.filter(p => p.role === 'host').length || 0;
  console.log(`\n🎉 Done! Total hosts: ${hostCount}`);
}

// Get args from command line
const roomCode = process.argv[2];
const hostName = process.argv[3];

if (!roomCode || !hostName) {
  console.error('Usage: ts-node fix-room-host.ts <ROOM_CODE> <HOST_DISPLAY_NAME>');
  console.error('Example: ts-node fix-room-host.ts VWXB tomy');
  process.exit(1);
}

fixRoomHost(roomCode, hostName)
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });



