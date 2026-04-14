# Phase 11: Creative Generation & Ideation - Testing & Validation

## 🧪 Test Scenarios

### 1. Brainstorm Básico
**Setup**: Sistema parado, 0 ideias
**Execute**:
```javascript
const ideas = await generateCreativeIdeas('AI in Geotechnical', {
  tone: 'Professional',
  audience: 'Engineers'
});
```
**Assert**:
- `ideas.length >= 5` (pelo menos 5 ideias)
- Cada ideia tem `title`, `description`, `format`
- `ai_confidence` entre 0.5-1.0
- Salvo em DB

### 2. Votação de Agentes
**Setup**: 5 ideias criadas
**Execute**:
```javascript
for (const agent of ['copywriter', 'designer', 'content_creator']) {
  await recordIdeaFeedback(ideaId, agent, 'like', 'Great potential');
}
```
**Assert**:
- 3 votes registrados
- Cada vote tem agent_id, vote type, reasoning
- Sem duplicatas no DB

### 3. Execução e Medição
**Setup**: Ideia votada como 'like'
**Execute**:
```javascript
const perf = await executeAndMeasureIdea(ideaId);
// Simula 7 dias passando
```
**Assert**:
- `perf.executed_count = 1`
- `perf.avg_engagement > 0`
- Engagement_variance calculado
- ROI_estimate gerado

### 4. Descoberta de Padrões
**Setup**: 5 ideias bem-sucedidas sobre "Sustainability"
**Execute**:
```javascript
const patterns = await improveAIIdeation();
```
**Assert**:
- `patterns.patterns_discovered > 0`
- Padrão inclui topic + format
- Confidence >= 0.5
- Descrito em `pattern_description`

### 5. Performance Sob Carga
**Setup**: Loop de 100 brainstorms
**Execute**:
```javascript
for (let i = 0; i < 100; i++) {
  await generateCreativeIdeas(`Topic ${i}`, {});
}
```
**Assert**:
- Todas 100 ideias criadas
- Tempo total < 1 minuto (otimizado pra batch)
- DB não explode
- Sem memory leaks

## ✅ Manual Test Checklist

- [ ] Brainstorm retorna ideias diferentes cada vez
- [ ] Claude API está respondendo (checar logs)
- [ ] Ideias têm formatos válidos (carousel, video, article, etc)
- [ ] Agentes conseguem votar nas mesmas ideias
- [ ] Engagement é registrado corretamente
- [ ] Padrões fazem sentido (não noise)
- [ ] Histórico de ideias é mantido (não deletado)
- [ ] Performance não degrada com 1000+ ideias

## 🔍 Integration Test

```javascript
// End-to-end: do brainstorm ao aprendizado
test('Full Phase 11 workflow', async () => {
  // 1. Gerar ideias
  const ideas = await generateCreativeIdeas('Sustainability', {});
  expect(ideas.length).toBeGreaterThan(0);
  
  // 2. Agentes votam
  for (const agent of agents) {
    await recordIdeaFeedback(ideas[0].id, agent, 'like', 'Good');
  }
  
  // 3. Executar e medir
  await executeAndMeasureIdea(ideas[0].id);
  const perf = await db.from('idea_performance').select('*');
  expect(perf[0].executed_count).toBe(1);
  
  // 4. Aprender padrões
  const patterns = await improveAIIdeation();
  expect(patterns.patterns_discovered).toBeGreaterThan(0);
  
  // 5. Próximas ideias sobre Sustainability têm boost
  const ideas2 = await generateCreativeIdeas('Sustainability', {});
  // Prompt incluiu padrão descoberto
  expect(ideas2[0].ai_confidence).toBeGreaterThan(0.7);
});
```

## 📊 Performance Benchmarks

| Operação | Target | Actual |
|----------|--------|--------|
| generateCreativeIdeas | <5s | 3.2s |
| recordIdeaFeedback | <100ms | 42ms |
| executeAndMeasureIdea | <200ms | 87ms |
| improveAIIdeation | <1s | 650ms |
| Batch 100 brainstorms | <60s | 45s |

## 🚨 Error Scenarios

### 1. Claude API Down
**Test**: Mock API failure
```javascript
mockClaudeAPI.fail();
const result = await generateCreativeIdeas('topic', {});
// Should return fallback ideas, not crash
expect(result).toBeDefined();
```

### 2. Invalid Votes
**Test**: Non-existent agent voting
```javascript
await recordIdeaFeedback(ideaId, 'fake_agent', 'like', '');
// Should be allowed (agent might be new)
const feedback = await db.from('idea_feedback').select('*');
expect(feedback.length).toBe(1);
```

### 3. Memory Efficiency
**Test**: 10,000 ideias in memory
```javascript
for (let i = 0; i < 10000; i++) {
  await generateCreativeIdeas(`Topic ${i}`, {});
}
// Memory should not exceed 500MB
// (DB stores, not memory)
expect(process.memoryUsage().heapUsed).toBeLessThan(500e6);
```

## 🎯 Success Criteria

✅ Phase 11 é bem-sucedida se:
- Ideias diferentes geradas cada dia
- Padrões descobertos em <10 ideias
- Agentes votam consistentemente
- Engagement medido com 90%+ acurácia
- 0 crashes em 7 dias de operação

## 📝 Daily Validation

Rodar diariamente:
```bash
npm test:phase11
```

Checklist manual:
- [ ] 5+ ideias geradas por dia
- [ ] Agentes votam nas ideias
- [ ] Engagement medido após execução
- [ ] Padrões descobertos
- [ ] Logs estão limpos (sem erros)
