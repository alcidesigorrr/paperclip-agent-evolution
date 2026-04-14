# Phase 13: Trend Detection - Technical Architecture

## 📐 Data Model

```sql
CREATE TABLE market_trends (
  id UUID PRIMARY KEY,
  trend_name TEXT,
  source TEXT, -- 'twitter', 'google_trends', 'news_api'
  relevance_score FLOAT [0-1],
  volume_change_pct FLOAT,
  discovered_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE trend_opportunities (
  id UUID PRIMARY KEY,
  trend_id UUID FK,
  opportunity_type TEXT, -- 'content', 'campaign'
  suggested_action TEXT,
  expected_engagement_lift FLOAT,
  time_to_execute INT,
  urgency_level TEXT
);

CREATE TABLE trend_reactions (
  id UUID PRIMARY KEY,
  opportunity_id UUID FK,
  agent_id TEXT,
  decision TEXT, -- 'accepted', 'declined', 'modified'
  execution_time INT,
  actual_engagement_lift FLOAT
);

CREATE TABLE trend_success_patterns (
  id UUID PRIMARY KEY,
  pattern_name TEXT UNIQUE,
  trend_category TEXT,
  successful_exploitations INT,
  avg_engagement_lift FLOAT,
  confidence FLOAT
);
```

## 🔄 Workflow

### 1. Detecção (a cada 240 ticks ~2h)
```
detectMarketTrends()
├─ Poll Twitter trends
├─ Poll Google Trends
├─ Poll news APIs
├─ Score relevância (0-1)
├─ Criar trend_opportunities
└─ Notificar agentes urgentes
```

### 2. Reação (imediato)
```
exploitTrendOpportunity()
├─ Agente recebe oportunidade
├─ Decide em <30 min
├─ Se YES: executa em <2h
├─ Mede engagement pós execução
└─ Registra resultado
```

### 3. Aprendizado (a cada 900 ticks ~7.5h)
```
analyzeAndLearnTrendPatterns()
├─ Query exploitações bem-sucedidas
├─ Agrupa por trend_category
├─ Calcula avg_engagement_lift
├─ Salva padrão com confiança
└─ Próximas detecções favorecem padrões conhecidos
```

## 🚀 Integration

- **Input**: Real-time social/news feeds
- **Output**: Opportunities + quick reactions
- **Speed**: Trend to publication < 2h
- **Feedback**: Engagement medido após 7-14 dias

## ⚡ Performance

- detectMarketTrends: 2-3s (3 API calls)
- exploitTrendOpportunity: 50ms
- analyzeAndLearnTrendPatterns: 300ms
- Monthly storage: ~30MB
