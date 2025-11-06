#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface DailyStats {
  date: string;
  roomsCreated: number;
  totalParticipants: number;
  totalSessions: number;
  totalFocusMinutes: number;
}

async function collectStatistics() {
  console.log('📊 Coletando estatísticas das salas existentes...');

  // Buscar todas as salas com seus relacionamentos
  const rooms = await prisma.room.findMany({
    include: {
      segments: true,
      participants: true,
    },
  });

  if (rooms.length === 0) {
    console.log('✅ Nenhuma sala encontrada para coletar estatísticas.');
    return;
  }

  console.log(`📈 Encontradas ${rooms.length} salas para processar.`);

  // Agrupar estatísticas por dia
  const statsByDay = new Map<string, DailyStats>();

  for (const room of rooms) {
    const dateKey = room.createdAt.toISOString().split('T')[0];
    
    if (!statsByDay.has(dateKey)) {
      statsByDay.set(dateKey, {
        date: dateKey,
        roomsCreated: 0,
        totalParticipants: 0,
        totalSessions: 0,
        totalFocusMinutes: 0,
      });
    }

    const stats = statsByDay.get(dateKey)!;
    stats.roomsCreated += 1;
    stats.totalParticipants += room.participants.length;
    
    // Contar sessões únicas (participantes únicos por sessionId)
    const uniqueSessions = new Set(room.participants.map(p => p.sessionId));
    stats.totalSessions += uniqueSessions.size;

    // Calcular tempo de foco
    const focusSegments = room.segments.filter(
      seg => seg.kind === 'focus' || seg.kind === 'custom'
    );
    const focusMinutes = focusSegments.reduce(
      (sum, seg) => sum + Math.floor(seg.durationSec / 60),
      0
    );
    stats.totalFocusMinutes += focusMinutes;
  }

  // Salvar ou atualizar estatísticas no banco
  console.log(`💾 Salvando estatísticas de ${statsByDay.size} dias...`);
  
  for (const [dateKey, stats] of statsByDay) {
    const existingStat = await prisma.dailyStatistic.findUnique({
      where: { date: new Date(dateKey) },
    });

    if (existingStat) {
      // Incrementar estatísticas existentes
      await prisma.dailyStatistic.update({
        where: { date: new Date(dateKey) },
        data: {
          roomsCreated: existingStat.roomsCreated + stats.roomsCreated,
          totalParticipants: existingStat.totalParticipants + stats.totalParticipants,
          totalSessions: existingStat.totalSessions + stats.totalSessions,
          totalFocusMinutes: existingStat.totalFocusMinutes + stats.totalFocusMinutes,
        },
      });
      console.log(`  ✓ Atualizado: ${dateKey} (+${stats.roomsCreated} salas)`);
    } else {
      // Criar nova entrada
      await prisma.dailyStatistic.create({
        data: {
          date: new Date(dateKey),
          roomsCreated: stats.roomsCreated,
          totalParticipants: stats.totalParticipants,
          totalSessions: stats.totalSessions,
          totalFocusMinutes: stats.totalFocusMinutes,
        },
      });
      console.log(`  ✓ Criado: ${dateKey} (${stats.roomsCreated} salas)`);
    }
  }

  // Mostrar resumo
  const totals = Array.from(statsByDay.values()).reduce(
    (acc, stats) => ({
      rooms: acc.rooms + stats.roomsCreated,
      participants: acc.participants + stats.totalParticipants,
      sessions: acc.sessions + stats.totalSessions,
      focusMinutes: acc.focusMinutes + stats.totalFocusMinutes,
    }),
    { rooms: 0, participants: 0, sessions: 0, focusMinutes: 0 }
  );

  console.log('\n📊 Resumo das estatísticas coletadas:');
  console.log(`   Salas criadas: ${totals.rooms}`);
  console.log(`   Total de participantes: ${totals.participants}`);
  console.log(`   Sessões únicas: ${totals.sessions}`);
  console.log(`   Minutos de foco: ${totals.focusMinutes}`);
}

async function cleanRooms() {
  console.log('\n🧹 Limpando todas as salas...');

  try {
    // Contar salas antes de deletar
    const roomCount = await prisma.room.count();
    
    if (roomCount === 0) {
      console.log('✅ Nenhuma sala para limpar.');
      return;
    }

    // Deletar todas as salas (Cascade irá deletar todos os relacionamentos)
    await prisma.room.deleteMany({});
    
    console.log(`✅ ${roomCount} salas deletadas com sucesso.`);
  } catch (error) {
    console.error('❌ Erro ao limpar salas:', error);
    throw error;
  }
}

async function cleanRedis() {
  console.log('\n🧹 Limpando dados do Redis relacionados a salas...');

  try {
    // Buscar todas as chaves relacionadas a salas
    const keys = await redis.keys('room:*');
    
    if (keys.length === 0) {
      console.log('✅ Nenhuma chave de sala no Redis.');
      return;
    }

    // Deletar todas as chaves
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✅ ${keys.length} chaves deletadas do Redis.`);
    }
  } catch (error) {
    console.error('❌ Erro ao limpar Redis:', error);
    throw error;
  }
}

async function showStatistics() {
  console.log('\n📈 Estatísticas atuais no banco:');
  
  const stats = await prisma.dailyStatistic.findMany({
    orderBy: { date: 'desc' },
    take: 10,
  });

  if (stats.length === 0) {
    console.log('   Nenhuma estatística registrada ainda.');
    return;
  }

  console.log('\n   Últimos 10 dias:');
  for (const stat of stats) {
    const date = stat.date.toISOString().split('T')[0];
    console.log(`   ${date}:`);
    console.log(`     Salas: ${stat.roomsCreated}`);
    console.log(`     Participantes: ${stat.totalParticipants}`);
    console.log(`     Sessões: ${stat.totalSessions}`);
    console.log(`     Minutos de foco: ${stat.totalFocusMinutes}`);
  }

  // Mostrar totais
  const totals = stats.reduce(
    (acc, stat) => ({
      rooms: acc.rooms + stat.roomsCreated,
      participants: acc.participants + stat.totalParticipants,
      sessions: acc.sessions + stat.totalSessions,
      focusMinutes: acc.focusMinutes + stat.totalFocusMinutes,
    }),
    { rooms: 0, participants: 0, sessions: 0, focusMinutes: 0 }
  );

  console.log('\n   Totais (últimos 10 dias):');
  console.log(`     Salas: ${totals.rooms}`);
  console.log(`     Participantes: ${totals.participants}`);
  console.log(`     Sessões: ${totals.sessions}`);
  console.log(`     Minutos de foco: ${totals.focusMinutes}`);
}

async function main() {
  try {
    console.log('🚀 Iniciando limpeza de salas...\n');

    // 1. Coletar estatísticas antes de limpar
    await collectStatistics();

    // 2. Limpar salas do banco de dados
    await cleanRooms();

    // 3. Limpar dados do Redis
    await cleanRedis();

    // 4. Mostrar estatísticas preservadas
    await showStatistics();

    console.log('\n✅ Limpeza concluída com sucesso!');
    console.log('📊 Todas as estatísticas foram preservadas.\n');
  } catch (error) {
    console.error('\n❌ Erro durante a limpeza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

main();
















