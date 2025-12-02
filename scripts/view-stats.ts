#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showCurrentRooms() {
  console.log('📊 Salas Atuais no Sistema\n');
  
  const rooms = await prisma.room.findMany({
    include: {
      participants: true,
      segments: true,
      _count: {
        select: {
          messages: true,
          tasks: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (rooms.length === 0) {
    console.log('   Nenhuma sala ativa no momento.\n');
    return;
  }

  console.log(`   Total de salas: ${rooms.length}\n`);

  for (const room of rooms) {
    const focusSegments = room.segments.filter(
      seg => seg.kind === 'focus' || seg.kind === 'custom'
    );
    const focusMinutes = focusSegments.reduce(
      (sum, seg) => sum + Math.floor(seg.durationSec / 60),
      0
    );

    console.log(`   Sala: ${room.code}`);
    console.log(`     Status: ${room.status}`);
    console.log(`     Tema: ${room.theme}`);
    console.log(`     Criada: ${room.createdAt.toLocaleString('pt-BR')}`);
    console.log(`     Expira: ${room.expiresAt.toLocaleString('pt-BR')}`);
    console.log(`     Participantes: ${room.participants.length}`);
    console.log(`     Segmentos: ${room.segments.length}`);
    console.log(`     Minutos de foco: ${focusMinutes}`);
    console.log(`     Mensagens: ${room._count.messages}`);
    console.log(`     Tarefas: ${room._count.tasks}`);
    console.log('');
  }
}

async function showHistoricalStats() {
  console.log('📈 Estatísticas Históricas\n');
  
  const stats = await prisma.dailyStatistic.findMany({
    orderBy: { date: 'desc' },
  });

  if (stats.length === 0) {
    console.log('   Nenhuma estatística histórica registrada.\n');
    return;
  }

  console.log(`   Total de dias com registros: ${stats.length}\n`);

  // Mostrar últimos 30 dias
  const recentStats = stats.slice(0, 30);
  console.log('   Últimos 30 dias:\n');
  
  for (const stat of recentStats) {
    const date = stat.date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    console.log(`   ${date}:`);
    console.log(`     Salas criadas: ${stat.roomsCreated}`);
    console.log(`     Participantes: ${stat.totalParticipants}`);
    console.log(`     Sessões únicas: ${stat.totalSessions}`);
    console.log(`     Minutos de foco: ${stat.totalFocusMinutes}`);
    console.log('');
  }

  // Calcular totais
  const totals = stats.reduce(
    (acc, stat) => ({
      rooms: acc.rooms + stat.roomsCreated,
      participants: acc.participants + stat.totalParticipants,
      sessions: acc.sessions + stat.totalSessions,
      focusMinutes: acc.focusMinutes + stat.totalFocusMinutes,
    }),
    { rooms: 0, participants: 0, sessions: 0, focusMinutes: 0 }
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n   TOTAIS (Desde o início):');
  console.log(`     Salas criadas: ${totals.rooms}`);
  console.log(`     Total de participantes: ${totals.participants}`);
  console.log(`     Sessões únicas: ${totals.sessions}`);
  console.log(`     Minutos de foco: ${totals.focusMinutes}`);
  console.log(`     Horas de foco: ${Math.floor(totals.focusMinutes / 60)}`);
  console.log('');

  // Calcular médias
  console.log('   MÉDIAS DIÁRIAS:');
  const avgRooms = (totals.rooms / stats.length).toFixed(2);
  const avgParticipants = (totals.participants / stats.length).toFixed(2);
  const avgSessions = (totals.sessions / stats.length).toFixed(2);
  const avgFocusMinutes = (totals.focusMinutes / stats.length).toFixed(2);
  
  console.log(`     Salas: ${avgRooms}`);
  console.log(`     Participantes: ${avgParticipants}`);
  console.log(`     Sessões: ${avgSessions}`);
  console.log(`     Minutos de foco: ${avgFocusMinutes}`);
  console.log('\n');
}

async function showTodayStats() {
  console.log('📅 Estatísticas de Hoje\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayRooms = await prisma.room.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  const todayParticipants = await prisma.participant.count({
    where: {
      joinedAt: {
        gte: today,
      },
    },
  });

  const rooms = await prisma.room.findMany({
    where: {
      createdAt: {
        gte: today,
      },
    },
    include: {
      segments: true,
    },
  });

  const todayFocusMinutes = rooms.reduce((total, room) => {
    const focusSegments = room.segments.filter(
      seg => seg.kind === 'focus' || seg.kind === 'custom'
    );
    return total + focusSegments.reduce(
      (sum, seg) => sum + Math.floor(seg.durationSec / 60),
      0
    );
  }, 0);

  console.log(`   Salas criadas hoje: ${todayRooms}`);
  console.log(`   Participantes hoje: ${todayParticipants}`);
  console.log(`   Minutos de foco planejados: ${todayFocusMinutes}`);
  console.log(`   Horas de foco planejadas: ${Math.floor(todayFocusMinutes / 60)}`);
  console.log('\n');
}

async function main() {
  try {
    console.log('\n🚀 PomoPomo - Visualização de Estatísticas\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await showTodayStats();
    await showCurrentRooms();
    await showHistoricalStats();

    console.log('✅ Relatório concluído!\n');
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();