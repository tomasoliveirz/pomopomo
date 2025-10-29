# Scripts de Gerenciamento do PomoPomo

Este diretório contém scripts para gerenciar e monitorar o sistema PomoPomo.

## 📊 Visualizar Estatísticas

Visualiza estatísticas do sistema sem fazer alterações:

```bash
npm run stats:view
```

Este script mostra:
- **Estatísticas de hoje**: salas criadas, participantes, minutos de foco
- **Salas atuais**: todas as salas ativas no momento
- **Estatísticas históricas**: dados agregados dos últimos 30 dias e totais desde o início

## 🧹 Limpar Salas (Preservando Estatísticas)

Limpa todas as salas do sistema mas preserva as estatísticas:

```bash
npm run clean:rooms
```

Este script:
1. **Coleta estatísticas** de todas as salas existentes (por dia)
2. **Salva as estatísticas** na tabela `daily_statistics`
3. **Limpa todas as salas** do banco de dados PostgreSQL
4. **Limpa dados de salas** do Redis
5. **Mostra estatísticas preservadas** para confirmação

### O que é preservado:

- ✅ Número de salas criadas por dia
- ✅ Total de participantes por dia
- ✅ Número de sessões únicas por dia
- ✅ Minutos de foco totais por dia

### O que é removido:

- ❌ Todas as salas (Room)
- ❌ Todos os segmentos (Segment)
- ❌ Todos os participantes (Participant)
- ❌ Todas as tarefas (Task)
- ❌ Todas as propostas (Proposal)
- ❌ Todas as mensagens (Message)
- ❌ Dados de salas no Redis

## 🗄️ Estrutura do Banco de Dados

### Tabela `daily_statistics`

Armazena estatísticas agregadas por dia:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `date` | Date | Data (única) |
| `rooms_created` | Integer | Número de salas criadas |
| `total_participants` | Integer | Total de participantes |
| `total_sessions` | Integer | Sessões únicas (por sessionId) |
| `total_focus_minutes` | Integer | Minutos de foco planejados |
| `updated_at` | DateTime | Última atualização |

## 🚀 Como Aplicar a Migration

Antes de executar os scripts, certifique-se de que a migration foi aplicada:

```bash
# Opção 1: Aplicar todas as migrations pendentes
npm run prisma:migrate

# Opção 2: Push do schema diretamente (desenvolvimento)
npm run prisma:push

# Opção 3: Aplicar manualmente
npx prisma migrate deploy
```

## 📝 Exemplos de Uso

### Cenário 1: Limpeza Semanal

```bash
# 1. Ver estatísticas antes da limpeza
npm run stats:view

# 2. Limpar salas antigas
npm run clean:rooms

# 3. Verificar que estatísticas foram preservadas
npm run stats:view
```

### Cenário 2: Monitoramento Diário

```bash
# Verificar atividade do dia e histórico
npm run stats:view
```

## ⚙️ Configuração

Os scripts utilizam as seguintes variáveis de ambiente:

- `DATABASE_URL`: URL de conexão do PostgreSQL
- `REDIS_URL`: URL de conexão do Redis (padrão: `redis://localhost:6379`)

Certifique-se de que o arquivo `.env` está configurado corretamente.

## ⚠️ Avisos Importantes

1. **Backup**: Sempre faça backup do banco de dados antes de executar `clean:rooms`
2. **Produção**: Em produção, considere usar um job cron para limpeza automática de salas expiradas
3. **Redis**: O script limpa apenas chaves que começam com `room:*`
4. **Estatísticas**: Uma vez que estatísticas são agregadas, não podem ser desagregadas

## 🔧 Troubleshooting

### Erro: "Can't reach database server"

Certifique-se de que o PostgreSQL está rodando:

```bash
# Docker
docker-compose up -d postgres

# Serviço local
sudo systemctl start postgresql
```

### Erro: "Table 'daily_statistics' does not exist"

Aplique a migration:

```bash
npm run prisma:migrate
```

### Erro de conexão com Redis

Verifique se o Redis está rodando:

```bash
# Docker
docker-compose up -d redis

# Serviço local
sudo systemctl start redis
```



