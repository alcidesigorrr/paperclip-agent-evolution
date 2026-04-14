# 🔄 Phase 3: Agent Forking — Specialization Detection & Dynamic Agents

## TL;DR

Seu sistema agora:
1. **Detecta quando agente é especialista** em um pilar (2x melhor em X que Y)
2. **Sugere criar fork especializado** (copywriter_cases_specialist)
3. **CMO aprova no admin** (simple yes/no)
4. **Sistema cria novo agente** com instruções refinadas
5. **Novo agente assume tarefas** desse pilar específico

**Resultado**: Agentes se especializam dinamicamente. Performance sobe. CMO não precisa gerenciar manualmente.

---

## Como Funciona

### Cenário: Copywriter Especialista em Cases

```
Semanas 1-4: Copywriter faz posts diversos
├─ 6 posts de "cases": avg 95 engagements
├─ 5 posts de "dicas": avg 45 engagements
├─ 4 posts de "educacional": avg 60 engagements
   ↓
Sistema detecta: 95 / 45 = 2.1x
   → Especialização clara em "cases"!
   ↓
Bridge.checkSpecializationOpportunities()
   ├─ Calcula variance por pillar
   ├─ Encontra 2.1x ratio (threshold: 2.0x)
   ├─ Gera sugestão com confidence 0.88
   ↓
Salva sugestão no banco
   └─ specialization_suggestions.status = 'pending'
   ↓
CMO vê no admin:
   "Copywriter_sondar mostra especialização em cases (88% confiança)"
   [Aprovar] [Rejeitar]
   ↓
CMO clica [Aprovar]
   ↓
Sistema cria fork:
   └─ copywriter_cases_specialist
   ├─ parent_agent_id: copywriter_sondar
   ├─ specialization: {pillar: "cases_resultados", ...}
   ├─ refined_instructions: "Você é especialista em cases..."
   └─ is_active: true
   ↓
Próximo briefing que sai pro CMO:
   "Delegar posts de 'cases' pro copywriter_cases_specialist
    Delegar posts de 'dicas' pro copywriter_sondar (generalista)"
```

---

## O Que Muda no Código

### Nova Tabela: `agent_forks`
```sql
agent_id | fork_name | specialization | refined_instructions | is_active
---------|-----------|----------------|----------------------|----------
copywriter_sondar | copywriter_cases_specialist | {pillar: "cases"} | "Você é especialista..." | true
designer_sondar | designer_instagram_specialist | {pillar: "instagram"} | "Design especializado..." | true
```

### Nova Tabela: `specialization_suggestions`
```sql
id | parent_agent_id | suggested_fork_name | specialization | status
---|-----------------|---------------------|----------------|--------
uuid | copywriter_sondar | copywriter_cases_specialist | {...} | pending
```

### Novas Funções
```javascript
detectSpecializationOpportunities()
  → Analisa últimas 4 semanas por agente
  → Calcula variance por pillar
  → Retorna sugestões (2.0x threshold)

analyzeAgentPerformanceByCategory(agentId, weeksBack)
  → Performance breakdown por pillar/type
  → Retorna avg, variance, count por categoria

buildRefinedInstructions(parentAgentId, specialization)
  → Gera AGENTS.md customizado pro fork
  → "Você é especialista em X, evite Y"

createAgentFork(suggestion)
  → Cria fork no Paperclip
  → Salva no agent_forks table
  → is_active = true

saveForkSuggestion(suggestion)
  → Salva sugestão pra CMO revisar
  → status = 'pending'

approveForkSuggestion(suggestionId)
  → CMO aprova
  → Cria fork
  → status = 'implemented'

rejectForkSuggestion(suggestionId)
  → CMO rejeita
  → status = 'rejected'
```

### Integração no Bridge
```javascript
// A cada 8 horas:
if (tickCount % 960 === 0) {
  await checkSpecializationOpportunities();
}

// checkSpecializationOpportunities():
const opportunities = await detectSpecializationOpportunities();
for (const opp of opportunities) {
  await saveForkSuggestion(opp);
}
```

---

## Exemplos de Forks Criados

### Exemplo 1: Copywriter Cases Specialist
```
parent: copywriter_sondar
fork: copywriter_cases_specialist
specialization: {
  pillar: "cases_resultados",
  focusOn: "cases_resultados",
  excludeFrom: "dicas_produtividade"
}

refined_instructions:
"## ESPECIALISTA EM CASES

Você é especialista em copywriting para **cases_resultados**.

Foco: maximizar engagement em posts de cases de sucesso
Tom: ROI-driven, números concretos, depoimentos

### Padrões Que Funcionam
- Before/after comparisons
- Números e métricas
- Depoimento de cliente
- CTA para case study

### Evitar
- ❌ Conteúdo de 'dicas_produtividade' — delegue
- ❌ Linguagem muito técnica

Target: 1.5x engagement acima de posts genéricos"
```

### Exemplo 2: Designer Instagram Specialist
```
parent: designer_sondar
fork: designer_instagram_specialist
specialization: {
  pillar: "instagram_post",  // tipo, não tipo_pilar
  focusOn: "instagram_post",
  excludeFrom: "instagram_carousel"
}

refined_instructions:
"## ESPECIALISTA EM INSTAGRAM POSTS

Você é especialista em design single-image Instagram posts.

Foco: layouts simples, impactantes, 1:1 quadrado

### Layouts Que Funcionam
- Hero image + text overlay
- Minimalist (lots of whitespace)
- Color blocking (paleta Sondar+)
- Bold typography

Target: 1.5x likes/comments vs carousels"
```

### Exemplo 3: Content Creator Technical Specialist
```
parent: content_creator_sondar
fork: content_creator_technical_specialist
specialization: {
  pillar: "educacional_tecnico",
  focusOn: "educacional_tecnico",
  excludeFrom: "dicas_produtividade"
}

refined_instructions:
"## ESPECIALISTA EM CONTEÚDO TÉCNICO

Você cria artigos técnicos profundos sobre **educacional_tecnico**.

Audiência: engenheiros, técnicos, especialistas
Profundidade: expert-level insights
Estrutura: teórica + prática

Padrões de Sucesso:
- Deep explanations de processos SPT
- Diagramas técnicos e explicações
- Metodologia e best practices
- Case studies técnicos

Evitar:
- ❌ Conteúdo superficial para 'dicas'
- ❌ Linguagem muito casual

Target: 2x shares/bookmarks vs artigos genéricos"
```

---

## Admin Panel Integration (Simples)

Quando CMO acessa admin, ver seção:

```
## 📋 Sugestões Pendentes de Especialização

Você tem 3 sugestões:

1. copywriter_cases_specialist (88% confiança)
   Parent: copywriter_sondar
   Razão: Performance em "cases" 2.1x melhor que "dicas"
   [Aprovar] [Rejeitar]

2. designer_instagram_specialist (82% confiança)
   Parent: designer_sondar
   Razão: Instagram posts 1.9x melhor que carousels
   [Aprovar] [Rejeitar]

3. content_creator_technical_specialist (75% confiança)
   Parent: content_creator_sondar
   Razão: Technical content 1.8x melhor que tips
   [Aprovar] [Rejeitar]
```

CMO clica [Aprovar] → Fork criado automaticamente.

---

## Dados Salvos

### agent_forks table:
```sql
SELECT * FROM agent_forks;

parent_agent_id    | fork_name                    | is_active | created_at
-------------------|------------------------------|-----------|-------------------
copywriter_sondar  | copywriter_cases_specialist  | true      | 2026-04-15...
designer_sondar    | designer_instagram_specialist| true      | 2026-04-16...
```

### specialization_suggestions table:
```sql
SELECT * FROM specialization_suggestions WHERE status='implemented';

parent_agent_id    | suggested_fork_name          | confidence | approved_at
-------------------|------------------------------|------------|-------------------
copywriter_sondar  | copywriter_cases_specialist  | 0.88       | 2026-04-15...
designer_sondar    | designer_instagram_specialist| 0.82       | 2026-04-16...
```

---

## Comportamento por Semana

### Semana 1-3 (Building data)
- Bridge analisa agents
- Precisa mínimo 4+ posts por categoria
- Sem sugestões (insuficiente data)

### Semana 4+
```
Logs:
[phase3] Checando oportunidades de especialização...
[phase3] ✅ Sugestão salva: copywriter_cases_specialist (conf: 0.88)
```

### Quando CMO aprova
```
Logs:
[evolution] 🔧 Criando fork: copywriter_cases_specialist
[evolution] ✅ Fork criado: copywriter_cases_specialist
```

### Próximo Briefing
```
## Agentes Disponíveis Esta Semana
- copywriter_sondar (generalista)
- copywriter_cases_specialist (especialista)
  └─ Melhor para: cases_resultados posts
     Performance esperada: 2.1x

Recomendação: Delegar cases pro especialista!
```

---

## Thresholds & Tuning

### Specialization Detection Threshold
```javascript
if (best.avg / worst.avg > 2.0) {
  → Considerar especialização
}
```

Ajustar baseado em:
- Variabilidade natural de performance
- Noise em seus dados
- Volatilidade de engagement

### Confidence Score
```
confidence = Math.min(0.95, 0.5 + ratio * 0.15)

Exemplo:
ratio = 2.1 → confidence = 0.5 + 0.315 = 0.815 (81%)
ratio = 3.0 → confidence = 0.5 + 0.450 = 0.95 (capped at 95%)
```

---

## Troubleshooting

**Q: "Nenhuma especialização detectada"**
A: Agentes não têm diff clara entre categorias.
   Ou não há dados suficientes (mínimo 2 posts por pilar).
   Check:
   ```sql
   SELECT agent_id, pillar, COUNT(*) 
   FROM social_posts 
   GROUP BY agent_id, pillar;
   ```

**Q: "Sugestão salvou mas nunca apareceu no admin"**
A: Admin panel não tá consultando `specialization_suggestions` table.
   Implementar endpoint que retorna pending suggestions.

**Q: "Fork foi criado mas não tá sendo usado"**
A: Admin panel / CMO workflow não tá roteando tarefas pro fork.
   Próxima etapa: modificar CMO agent prompt pra considerar forks disponíveis.

---

## Próximos Passos

### Implementar (Phase 3B):
1. Admin endpoint `/api/specialization-suggestions` 
   → Retorna pending suggestions
   
2. Admin UI form
   ```html
   <div class="suggestion">
     <h3>copywriter_cases_specialist</h3>
     <p>88% confiança — Cases 2.1x melhor</p>
     <button onclick="approveSuggestion(suggestionId)">Aprovar</button>
     <button onclick="rejectSuggestion(suggestionId)">Rejeitar</button>
   </div>
   ```

3. CMO agent prompt update
   → Incluir lista de forks disponíveis
   → Direcionar cases posts pro fork
   ```
   "Forks disponíveis:
   - copywriter_cases_specialist: especialista em cases
   Delegar posts de 'cases' pra este fork quando existir."
   ```

4. Agent routing logic
   → Quando criar issue, considerar forks disponíveis
   → Assign ao fork se apropriado

---

## Phases Futuras

```
Phase 1: ✅ Agent Memory
Phase 2: ✅ Emergent Behavior
Phase 3: ✅ Agent Forking (Specialization)
Phase 4: 🔜 Consensus Voting + Task Decomposition
Phase 5: 🔜 Self-Improving Evaluation
Phase 6: 🔜 Dynamic Company Structure
```

---

Tá pronto? Vamo testar Phase 3! 🚀
