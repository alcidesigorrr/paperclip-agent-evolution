# Deployment Guide

## 🚀 Quick Deploy

### 1. Pré-requisitos
```bash
✅ Node.js >= 18
✅ npm ou pnpm
✅ Supabase account (free tier works)
✅ Git + GitHub account
```

### 2. Clone & Setup
```bash
git clone https://github.com/alcidesigorrr/paperclip-agent-evolution.git
cd paperclip-agent-evolution
npm install
```

### 3. Configurar Supabase

#### Via Supabase Dashboard
1. Criar novo projeto em https://supabase.com
2. Salvar `Project URL` e `Service Role Key`
3. Copiar `.env.example`:
```bash
cp .env.example .env.local
```

4. Preencher `.env.local`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PAPERCLIP_API=http://127.0.0.1:3100/api  # Paperclip local (optional)
```

#### Via Supabase CLI
```bash
supabase init
supabase login
supabase link --project-ref your-project-ref
```

### 4. Executar Migrations

#### Opção A: Via CLI
```bash
supabase db push
```

#### Opção B: Manual
1. Ir em Supabase Dashboard → SQL Editor
2. Executar em ordem:
   - `migrations/20260418_team_decision_making.sql`
   - `migrations/20260419_cross_team_learning.sql`
   - `migrations/20260420_emergent_hierarchies.sql`
   - `migrations/20260421_adaptive_strategy_optimization.sql`

### 5. Iniciar Bridge
```bash
npm start
# ou modo desenvolvimento:
npm run dev
```

**Expected Output**:
```
[start] Paperclip-Sondar Bridge v2 iniciado
[config] Supabase: https://your-project.supabase.co
[config] Paperclip: http://127.0.0.1:3100/api
[config] Poll: 30s
[phase1] 📊 Avaliando trabalho...
[phase2] 🤝 Formando times...
```

---

## 📦 Production Deployment

### Opção 1: Heroku (Recomendado para começar)

```bash
# 1. Login
heroku login

# 2. Criar app
heroku create paperclip-evolution

# 3. Configurar env vars
heroku config:set SUPABASE_URL=https://...
heroku config:set SUPABASE_SERVICE_KEY=...

# 4. Deploy
git push heroku main

# 5. Ver logs
heroku logs --tail
```

### Opção 2: Docker + Kubernetes

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY modules/ ./modules/
CMD ["npm", "start"]
```

```bash
# Build image
docker build -t paperclip-evolution:2.0.0 .

# Push to registry (ECR, Docker Hub, etc)
docker push your-registry/paperclip-evolution:2.0.0

# Deploy via kubectl
kubectl apply -f k8s/deployment.yaml
```

### Opção 3: AWS Lambda + RDS

```javascript
// handler.js (Lambda)
import { tick } from './modules/bridge.mjs';

export const handler = async () => {
  await tick();
  return { statusCode: 200, body: 'OK' };
};
```

**CloudWatch Events**: Triggerar a cada 30 segundos

### Opção 4: Google Cloud Run

```bash
# 1. Build
gcloud builds submit --tag gcr.io/PROJECT-ID/paperclip-evolution

# 2. Deploy
gcloud run deploy paperclip-evolution \
  --image gcr.io/PROJECT-ID/paperclip-evolution \
  --set-env-vars SUPABASE_URL=...,SUPABASE_SERVICE_KEY=...
```

---

## 🔍 Verificação Pós-Deploy

### 1. Check Health
```javascript
// Dentro de 5 minutos, logs devem mostrar:
// [phase1] 📊 ...
// [phase2] 🤝 ...
// [phase7] 🗳️ ...
// etc
```

### 2. Query Database
```sql
-- Supabase SQL Editor
SELECT COUNT(*) FROM agent_teams;
SELECT COUNT(*) FROM team_decisions;
SELECT COUNT(*) FROM team_strategies;
```

### 3. Monitor Performance
```bash
# Ver logs em tempo real
heroku logs --tail
# ou
npm start 2>&1 | tee bridge.log
```

---

## 🛠️ Troubleshooting

### Erro: "Cannot find module 'supabase'"
```bash
npm install @supabase/supabase-js
```

### Erro: "Invalid service key"
- Verificar `.env.local`
- Regenerar chave em Supabase Dashboard
- Restart com nova chave

### Erro: "Migration failed"
- Verificar SQL syntax
- Verificar se tabelas já existem
- Executar uma migration de cada vez

### Lento demais?
- Check: CPU/Memory utilização
- Check: Database query times
- Aumentar node memory: `NODE_OPTIONS=--max-old-space-size=4096`

---

## 📊 Monitoramento em Produção

### Logs Essenciais
```bash
# Filter por erros
grep "^\[err\]" bridge.log

# Filter por fase específica
grep "^\[phase10\]" bridge.log

# Ver performance
grep "execution_time" bridge.log
```

### Alertas Recomendados
1. Error rate > 5%
2. Tick duration > 1000ms
3. Database connection lost
4. Memory usage > 80%

### Dashboard (Future)
```
Métricas a trackar:
- Ticks completados
- Funções por fase
- Taxa de sucesso de experimentos
- Estratégias ativas
- Performance média de times
```

---

## 🔄 Atualizações

### Como Atualizar
```bash
git pull origin main
npm install
npm run db:migrate
npm start
```

### Sem Downtime (Future)
```bash
# 1. Deploy nova versão em parallel
# 2. Health check
# 3. Switch traffic
# 4. Kill old version
```

---

## 🗑️ Clean Up

### Resetar Database (CUIDADO!)
```bash
npm run db:reset
# ou via Supabase Dashboard: Delete all data
```

### Parar Bridge
```bash
# Local
Ctrl+C

# Heroku
heroku ps:stop web
```

---

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: igor@labnex.com.br

---

**Última atualização**: 2026-04-13  
**Versão**: 2.0.0
