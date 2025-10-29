# 🍅 PomoPomo - Informações de Deploy

## ✅ Deploy Completo Realizado

**Data:** 29 de Outubro de 2025  
**Servidor:** ubuntu@51.38.190.126  
**Status:** ✅ Online e Funcionando

---

## 🌐 URLs de Acesso

### Aplicação Web
- **URL:** http://51.38.190.126:3050
- **Porta:** 3050
- **Serviço:** Next.js 14.2.33

### WebSocket Server
- **URL:** ws://51.38.190.126:3051
- **Porta:** 3051
- **Serviço:** Socket.IO

---

## 🗄️ Banco de Dados

### PostgreSQL (Docker)
- **Container:** pomopomo-postgres
- **Host:** localhost:5434 (mapeado para 5432 interno)
- **Database:** pomopomo
- **Usuário:** pomopomo
- **Senha:** pomopomo_secure_2024
- **Imagem:** postgres:15-alpine

### Redis (Docker)
- **Container:** pomopomo-redis
- **URL:** redis://localhost:6380
- **Porta:** 6380 (mapeada para 6379 interno)
- **Imagem:** redis:7-alpine

---

## 📦 Serviços PM2

### Aplicação Web (pomopomo-web)
- **ID:** 89
- **Comando:** `npm start`
- **Porta:** 3050
- **Logs:** `/home/ubuntu/pomopomo/logs/web-*.log`

### WebSocket Server (pomopomo-ws)
- **ID:** 90
- **Comando:** `npm run ws`
- **Porta:** 3051
- **Logs:** `/home/ubuntu/pomopomo/logs/ws-*.log`

---

## 🚀 Comandos Úteis

### Gerenciar Serviços PM2
```bash
# Ver status dos serviços
pm2 list

# Ver logs em tempo real
pm2 logs pomopomo-web
pm2 logs pomopomo-ws

# Reiniciar serviços
pm2 restart pomopomo-web pomopomo-ws

# Parar serviços
pm2 stop pomopomo-web pomopomo-ws

# Ver informações detalhadas
pm2 show pomopomo-web
```

### Gerenciar Banco de Dados
```bash
# Acessar PostgreSQL
docker exec -it pomopomo-postgres psql -U pomopomo -d pomopomo

# Ver tabelas
docker exec pomopomo-postgres psql -U pomopomo -d pomopomo -c "\dt"

# Aplicar migrations
cd /home/ubuntu/pomopomo
npx prisma migrate deploy

# Ver status das migrations
npx prisma migrate status
```

### Scripts de Estatísticas
```bash
cd /home/ubuntu/pomopomo

# Ver estatísticas
npm run stats:view

# Limpar salas (mantém estatísticas)
npm run clean:rooms
```

---

## 📁 Estrutura de Diretórios

```
/home/ubuntu/pomopomo/
├── .env                    # Variáveis de ambiente
├── .next/                  # Build do Next.js
├── node_modules/           # Dependências
├── src/                    # Código fonte
├── prisma/                 # Schema e migrations
├── scripts/                # Scripts utilitários
│   ├── clean-rooms.ts      # Limpa salas preservando stats
│   └── view-stats.ts       # Visualiza estatísticas
├── logs/                   # Logs do PM2
│   ├── web-out-*.log
│   ├── web-error-*.log
│   ├── ws-out-*.log
│   └── ws-error-*.log
├── data/                   # Dados persistentes (Docker)
│   ├── postgres/
│   └── redis/
└── ecosystem.config.js     # Configuração PM2
```

---

## 🔧 Configuração de Variáveis de Ambiente

### Arquivo `.env` no Servidor
```env
DATABASE_URL="postgresql://pomopomo:pomopomo_secure_2024@localhost:5434/pomopomo?schema=public"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="[gerado automaticamente]"
SESSION_SECRET="[gerado automaticamente]"
NODE_ENV="production"
NEXT_PUBLIC_WS_URL="ws://51.38.190.126:3051"
NEXT_PUBLIC_API_URL="http://51.38.190.126:3050"
```

⚠️ **Importante**: Redis está na porta **6380**, não na porta padrão 6379.

---

## ✨ Melhorias Implementadas

### 1. **UI/UX**
- ✅ Scroll vertical no QueuePanel (sem estender a tela)
- ✅ MemberList compacto com avatares empilhados
- ✅ Tooltips nos avatares dos participantes
- ✅ Botão "Show more" para muitos participantes
- ✅ Layout responsivo e elegante

### 2. **Sistema de Compartilhamento**
- ✅ Link com código pré-preenchido (`/join?code=XXXX`)
- ✅ Campo de código bloqueado quando vindo de link
- ✅ Foco automático no campo de nome
- ✅ Opção para mudar o código se necessário
- ✅ Feedback visual ao copiar link

### 3. **Sistema de Estatísticas**
- ✅ Tabela `daily_statistics` para métricas históricas
- ✅ Script de limpeza que preserva estatísticas
- ✅ Script de visualização de estatísticas
- ✅ Rastreamento de:
  - Salas criadas por dia
  - Participantes totais
  - Sessões únicas
  - Minutos de foco

---

## 🔄 Atualizações Futuras

Para fazer deploy de novas versões:

```bash
# 1. No seu computador local
cd /home/tomio/Documents/Projects/pomopomo
npm run build  # Testar build localmente

# 2. Fazer upload para o servidor
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /home/tomio/Documents/Projects/pomopomo/ \
  ubuntu@51.38.190.126:/home/ubuntu/pomopomo/

# 3. No servidor
ssh ubuntu@51.38.190.126
cd /home/ubuntu/pomopomo
npm install
npx prisma generate
npx prisma migrate deploy
pm2 delete pomopomo-web pomopomo-ws
pm2 start ecosystem.config.js
pm2 save
```

---

## 🐛 Troubleshooting

### Erro de Autenticação do Banco de Dados
```bash
# Verificar credenciais
docker inspect pomopomo-postgres | grep POSTGRES_PASSWORD

# Atualizar .env com a senha correta
# Reiniciar serviços
pm2 delete pomopomo-web pomopomo-ws
pm2 start ecosystem.config.js
```

### Serviços Não Iniciam
```bash
# Ver logs de erro
pm2 logs --err

# Verificar se as portas estão livres
lsof -i :3050
lsof -i :3051

# Limpar e reiniciar
pm2 flush
pm2 delete all
pm2 start ecosystem.config.js
```

### Migrations com Erro
```bash
# Ver status
npx prisma migrate status

# Marcar migration como aplicada (se já foi aplicada manualmente)
npx prisma migrate resolve --applied MIGRATION_NAME

# Forçar reset (CUIDADO: apaga dados!)
# npx prisma migrate reset
```

---

## 📊 Monitoramento

### Verificar Saúde da Aplicação
```bash
# Testar web app
curl http://localhost:3050

# Ver recursos utilizados
pm2 monit

# Ver logs em tempo real
pm2 logs

# Estatísticas do sistema
pm2 list
```

### Backup do Banco de Dados
```bash
# Backup manual
docker exec pomopomo-postgres pg_dump -U pomopomo pomopomo > backup.sql

# Restaurar backup
docker exec -i pomopomo-postgres psql -U pomopomo pomopomo < backup.sql
```

---

## 📝 Notas Importantes

1. **Segurança**: As senhas atuais são para desenvolvimento. Em produção real, use senhas mais fortes e considere usar secrets management.

2. **HTTPS**: Atualmente rodando em HTTP. Para produção, configure Nginx com SSL/TLS (Let's Encrypt).

3. **Domínio**: Configure um domínio personalizado e atualize as variáveis `NEXT_PUBLIC_*` no `.env`.

4. **Firewall**: As portas 3050 e 3051 precisam estar abertas no firewall para acesso externo.

5. **Backups**: Configure backups automáticos do PostgreSQL para evitar perda de dados.

6. **Logs**: Os logs do PM2 crescem com o tempo. O `pm2-logrotate` está instalado para rotação automática.

---

## 🎉 Status Final

✅ **Aplicação Web**: Online na porta 3050  
✅ **WebSocket Server**: Online na porta 3051  
✅ **PostgreSQL**: Rodando no Docker (porta 5434)  
✅ **Redis**: Rodando no Docker (porta 6379)  
✅ **Migrations**: Todas aplicadas com sucesso  
✅ **PM2**: Gerenciando ambos os serviços  
✅ **Estatísticas**: Sistema implementado e funcional  

**O PomoPomo está completamente deployado e funcionando! 🚀**

