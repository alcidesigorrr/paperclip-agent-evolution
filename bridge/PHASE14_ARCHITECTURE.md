# Phase 14: Positioning - Technical Architecture

## 📐 Data Model

```sql
CREATE TABLE market_positioning (
  id UUID PRIMARY KEY,
  unique_value_proposition TEXT,
  primary_positioning TEXT,
  competitive_advantages TEXT[],
  customer_pain_points TEXT[],
  market_perception_score FLOAT,
  last_updated_at TIMESTAMP
);

CREATE TABLE messaging_pillars (
  id UUID PRIMARY KEY,
  positioning_id UUID FK,
  pillar_name TEXT,
  pillar_description TEXT,
  supporting_points TEXT[],
  recommended_tone TEXT,
  effectiveness_score FLOAT
);

CREATE TABLE brand_alignment (
  id UUID PRIMARY KEY,
  positioning_id UUID FK,
  content_piece_id TEXT,
  pillar_id UUID FK,
  alignment_score FLOAT [0-1]
);

CREATE TABLE positioning_performance (
  id UUID PRIMARY KEY,
  positioning_id UUID FK,
  brand_awareness_lift FLOAT,
  consideration_lift FLOAT,
  preference_lift FLOAT,
  market_share_change FLOAT,
  brand_value_estimate FLOAT,
  measured_at TIMESTAMP
);
```

## 🔄 Workflow

### 1. Definição
```
defineMarketPositioning(uvp, positioning)
├─ Define UVP único
├─ Define primary_positioning
├─ Cria 3-5 messaging_pillars
├─ Registra competitive_advantages
└─ Salva em DB
```

### 2. Medição
```
measurePositioningPerformance(positioningId)
├─ Survey brand awareness
├─ Measure consideration
├─ Track preference
├─ Estimate brand value
└─ Salva metrics
```

### 3. Alignment Check (automático)
```
Cada conteúdo publicado:
├─ Score vs cada pillar
├─ Check tone consistency
└─ Log alignment_score
```

## ⚡ Performance

- defineMarketPositioning: 100ms
- measurePositioningPerformance: 200ms
- Monthly storage: ~5MB
