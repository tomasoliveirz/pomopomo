# 🍅 POMOPOMO - Comandos Úteis

## 📊 MONITORAMENTO DE USUÁRIOS ONLINE

### **Comando Completo (Detalhado)**
```bash
ssh ubuntu@51.38.190.126 '/home/ubuntu/pomopomo/check-online.sh'
```
Mostra:
- Número de salas ativas
- Total de usuários online
- Breakdown por sala

---

### **Comando Rápido (Só o Número)**
```bash
ssh ubuntu@51.38.190.126 'docker exec -i $(docker ps -q -f name=redis) redis-cli --raw KEYS "room:presence:*" | while read key; do docker exec -i $(docker ps -q -f name=redis) redis-cli SCARD "$key"; done | awk "{sum += \$1} END {print sum}"'
```
Output: `3` (número de usuários online)

---

### **Comando Super Rápido (Local)**
Se já estás no servidor:
```bash
cd /home/ubuntu/pomopomo && ./check-online.sh
```

---

### **One-liner Super Simples**
```bash
ssh ubuntu@51.38.190.126 'docker exec -i $(docker ps -q -f name=redis) redis-cli --raw KEYS "room:presence:*" | xargs -I {} docker exec -i $(docker ps -q -f name=redis) redis-cli SCARD {} | awk "{s+=\$1} END {print \"👥 Users online:\", s}"'
```

---

## 📈 ESTATÍSTICAS DO SITE

### **Total de Acessos Hoje**
```bash
ssh ubuntu@51.38.190.126 "grep '$(date +%d/%b/%Y)' /var/log/nginx/pomopomo_access.log | wc -l"
```

### **IPs Únicos Hoje**
```bash
ssh ubuntu@51.38.190.126 "awk '\$4 ~ /$(date +%d\\/%b\\/%Y)/ {print \$1}' /var/log/nginx/pomopomo_access.log | sort -u | wc -l"
```

### **Top 5 IPs Ativos Hoje**
```bash
ssh ubuntu@51.38.190.126 "awk '\$4 ~ /$(date +%d\\/%b\\/%Y)/ {print \$1}' /var/log/nginx/pomopomo_access.log | sort | uniq -c | sort -rn | head -5"
```

---

## 🏠 ESTATÍSTICAS DE SALAS

### **Total de Salas**
```bash
ssh ubuntu@51.38.190.126 "docker exec -i pomopomo-postgres psql -U pomopomo -d pomopomo -t -c 'SELECT COUNT(*) FROM rooms;' | xargs"
```

### **Salas Running**
```bash
ssh ubuntu@51.38.190.126 "docker exec -i pomopomo-postgres psql -U pomopomo -d pomopomo -t -c \"SELECT COUNT(*) FROM rooms WHERE status = 'running';\" | xargs"
```

### **Salas Criadas Hoje**
```bash
ssh ubuntu@51.38.190.126 "docker exec -i pomopomo-postgres psql -U pomopomo -d pomopomo -t -c \"SELECT COUNT(*) FROM rooms WHERE created_at::date = CURRENT_DATE;\" | xargs"
```

---

## 🔧 LOGS EM TEMPO REAL

### **Ver Logs do WebSocket**
```bash
ssh ubuntu@51.38.190.126 'pm2 logs pomopomo-ws --lines 50'
```

### **Ver Conexões/Desconexões**
```bash
ssh ubuntu@51.38.190.126 'pm2 logs pomopomo-ws --lines 100 | grep -E "connected|disconnected"'
```

### **Ver Heartbeat Timeouts**
```bash
ssh ubuntu@51.38.190.126 'pm2 logs pomopomo-ws --lines 100 | grep "Heartbeat timeout"'
```

### **Ver Auto-Cleanup de Salas**
```bash
ssh ubuntu@51.38.190.126 'pm2 logs pomopomo-ws --lines 100 | grep -E "empty|cleaning"'
```

---

## 🔄 MANAGEMENT

### **Restart Serviços**
```bash
ssh ubuntu@51.38.190.126 'pm2 restart pomopomo-web pomopomo-ws'
```

### **Status dos Serviços**
```bash
ssh ubuntu@51.38.190.126 'pm2 list | grep pomopomo'
```

### **Health Check do Site**
```bash
curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\n" https://pomopomo.site
```

---

## 💾 DATABASE QUERIES

### **Ver Salas Ativas com Participantes**
```bash
ssh ubuntu@51.38.190.126 "docker exec -i pomopomo-postgres psql -U pomopomo -d pomopomo -c \"SELECT r.code, r.status, COUNT(p.id) as participants FROM rooms r LEFT JOIN participants p ON p.room_id = r.id GROUP BY r.id, r.code, r.status HAVING COUNT(p.id) > 0 ORDER BY COUNT(p.id) DESC LIMIT 10;\""
```

### **Total de Participantes Criados**
```bash
ssh ubuntu@51.38.190.126 "docker exec -i pomopomo-postgres psql -U pomopomo -d pomopomo -t -c 'SELECT COUNT(*) FROM participants;' | xargs"
```

---

## 🎯 ALIASES ÚTEIS (Adicionar ao .bashrc)

```bash
# Adiciona ao ~/.bashrc local:
alias pomo-online='ssh ubuntu@51.38.190.126 "/home/ubuntu/pomopomo/check-online.sh"'
alias pomo-logs='ssh ubuntu@51.38.190.126 "pm2 logs pomopomo-ws --lines 50"'
alias pomo-status='ssh ubuntu@51.38.190.126 "pm2 list | grep pomopomo"'
alias pomo-restart='ssh ubuntu@51.38.190.126 "pm2 restart pomopomo-web pomopomo-ws"'
```

Depois:
```bash
source ~/.bashrc
pomo-online  # Ver usuários online
pomo-logs    # Ver logs
pomo-status  # Ver status
```

---

## 📱 DASHBOARD RÁPIDO

```bash
ssh ubuntu@51.38.190.126 'echo "🍅 POMOPOMO DASHBOARD"; echo "==================="; echo ""; /home/ubuntu/pomopomo/check-online.sh; echo ""; echo "📊 Database:"; docker exec -i pomopomo-postgres psql -U pomopomo -d pomopomo -t -c "SELECT COUNT(*) FROM rooms;" | xargs | awk "{print \"  Total rooms:\", \$1}"; docker exec -i pomopomo-postgres psql -U pomopomo -d pomopomo -t -c "SELECT COUNT(*) FROM participants;" | xargs | awk "{print \"  Total participants:\", \$1}"; echo ""; echo "🌐 Server:"; pm2 list | grep pomopomo'
```

---

**Criado:** 2025-10-28  
**Atualizado:** Automático com cada deploy




