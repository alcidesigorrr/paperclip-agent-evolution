# Phase 11: Creative Generation & Ideation - Technical Architecture

## 📐 Data Model

```sql
-- Ideias geradas (humanas ou IA)
CREATE TABLE creative_ideas (
  id UUID PRIMARY KEY,
  source_type TEXT ('human_input', 'ai_generated', 'hybrid'),
  topic TEXT,
  idea_description TEXT,
  theme TEXT,
  suggested_format TEXT, -- 'carousel', 'video', 'article', 'static_image'
  ai_confidence FLOAT [0-1],
  human_approval BOOLEAN,
  created_by TEXT, -- 'Igor', 'System', agent_id
  created_at TIMESTAMP
);

-- Votes dos agentes
CREATE TABLE idea_feedback (
  id UUID PRIMARY KEY,
  idea_id UUID FK,
  agent_id TEXT,
  vote TEXT ('like', 'dislike', 'neutral'),
  reasoning TEXT,
  predicted_engagement FLOAT,
  actual_engagement FLOAT,
  created_at TIMESTAMP
);

-- Performance após execução
CREATE TABLE idea_performance (
  id UUID PRIMARY KEY,
  idea_id UUID FK UNIQUE,
  executed_count INT,
  avg_engagement FLOAT,
  engagement_variance FLOAT,
  roi_estimate FLOAT,
  last_measured_at TIMESTAMP
);

-- Brainstorm sessions com Claude
CREATE TABLE ai_brainstorms (
  id UUID PRIMARY KEY,
  topic TEXT,
  num_ideas_generated INT,
  ideas_selected INT,
  total_engagement FLOAT,
  ai_model_used TEXT, -- 'claude-opus-4-1'
  api_cost FLOAT,
  created_at TIMESTAMP
);

-- Padrões descobertos
CREATE TABLE creative_patterns (
  id UUID PRIMARY KEY,
  pattern_name TEXT UNIQUE,
  pattern_description TEXT,
  successful_ideas_count INT,
  avg_engagement FLOAT,
  topics_where_works TEXT[],
  formats_where_works TEXT[],
  confidence FLOAT [0-1],
  discovered_at TIMESTAMP
);
```

## 🔄 Workflow

### 1. Geração de Ideias
```javascript
generateCreativeIdeas(topic, constraints) {
  1. Chama Claude API com prompt criativo
  2. Claude retorna 10 ideias em JSON
  3. Score cada ideia por brand fit
  4. Salva todas em creative_ideas table
  5. Cria ai_brainstorms record
}
```

**Prompt Claude:**
```
Brainstorm 20 ideias criativas para: {topic}
Constraints: {constraints}
Return JSON: [
  { title, description, format, target_audience, estimated_engagement_lift }
]
Foco em ideias ORIGINAIS que não foram exploradas.
```

### 2. Votação de Agentes
```javascript
recordIdeaFeedback(ideaId, agentId, vote, reasoning) {
  1. Cada agente vota: like/dislike/neutral
  2. Salva vote com reasoning
  3. Agente também prediz engagement
}
```

### 3. Execução e Medição
```javascript
executeAndMeasureIdea(ideaId) {
  1. Ideia entra no pipeline de produção
  2. Copywriter redige + Designer layout + Social publica
  3. Aguarda 7 dias
  4. Mede engagement real (likes, shares, comments)
  5. Salva em idea_performance
  6. Se overperformou, descobre padrão
}
```

### 4. Descoberta de Padrões
```javascript
improveAIIdeation() {
  1. Query ideias bem-sucedidas (>60% engagement)
  2. Agrupa por tema e formato
  3. Calcula engagement médio por grupo
  4. Salva padrões com confiança
  5. Atualiza prompt do Claude com esses padrões
}
```

## 📊 Orchestration

| Função | Interval | O que faz |
|--------|----------|----------|
| `generateCreativeContent()` | 480 ticks (~4h) | Gera 5 ideias, agentes votam, top 2 executadas |
| `optimizeCreativePatterns()` | 720 ticks (~6h) | Analisa performance, descobre padrões, melhora AI |

## 🚀 Integration Points

- **Input**: Topics/constraints via Igor ou sistema
- **Output**: Creative posts no social media
- **Feedback**: Engagement metrics após 7 dias
- **Learning**: Padrões de sucesso melhoram prompts

## 💾 Storage Requirements

- creative_ideas: ~100KB por ideia (description + metadata)
- idea_feedback: ~50KB por vote
- idea_performance: ~20KB por ideia
- creative_patterns: ~30KB por padrão

**Monthly**: ~100-150 ideias × 4 agentes = 20-25MB

## ⚡ Performance

- generateCreativeIdeas: 3-5s (Claude API call)
- recordIdeaFeedback: 50ms
- executeAndMeasureIdea: 100ms (+ 7 dias para medição)
- improveAIIdeation: 500ms

## 🔐 Security

- Claude API key em env var
- Sem PII em prompts
- Rate limit: 10 brainstorms/dia
- Validate all idea_description input

## 📈 Scaling

- Cada brainstorm: 10 ideias
- Cada ideia: 4 votes (um por agente)
- Período de análise: 7 dias
- Padrões descobre automaticamente

**Capacity**: 2,000+ ideias/mês sem problemas
