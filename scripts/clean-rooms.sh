#!/bin/bash

# Script auxiliar para limpar salas com verificações

set -e

echo "🚀 PomoPomo - Limpeza de Salas"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ Erro: Arquivo .env não encontrado${NC}"
    echo "   Crie o arquivo .env com DATABASE_URL e REDIS_URL"
    exit 1
fi

# Carregar variáveis de ambiente
export $(cat .env | grep -v '^#' | xargs)

echo "🔍 Verificando dependências..."
echo ""

# Verificar PostgreSQL
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL cliente encontrado"
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL cliente não encontrado (opcional)"
fi

# Verificar Redis
if command -v redis-cli &> /dev/null; then
    echo -e "${GREEN}✓${NC} Redis cliente encontrado"
else
    echo -e "${YELLOW}⚠${NC} Redis cliente não encontrado (opcional)"
fi

echo ""
echo "📊 Estatísticas atuais:"
echo ""

# Mostrar estatísticas antes da limpeza
npm run stats:view

echo ""
echo -e "${YELLOW}⚠ AVISO: Esta operação irá:${NC}"
echo "   1. Coletar estatísticas de todas as salas"
echo "   2. Salvar estatísticas na tabela daily_statistics"
echo "   3. DELETAR todas as salas do banco de dados"
echo "   4. DELETAR todos os dados de salas do Redis"
echo ""
echo -e "${GREEN}✓ As estatísticas serão preservadas${NC}"
echo ""

# Confirmar ação
read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
echo "🧹 Iniciando limpeza..."
echo ""

# Executar limpeza
npm run clean:rooms

echo ""
echo -e "${GREEN}✅ Limpeza concluída!${NC}"
echo ""
echo "Para visualizar as estatísticas preservadas, execute:"
echo "  npm run stats:view"
echo ""



