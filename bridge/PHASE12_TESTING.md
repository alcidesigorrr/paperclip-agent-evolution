# Phase 12: Fact-Checking - Testing

## 🧪 Test Scenarios

### 1. Verificação Bem-Sucedida
**Setup**: Claim verdadeira
**Execute**: Verify "SPT is used in 50,000+ projects"
**Assert**: Verdict = APPROVED, confidence > 0.8

### 2. Claim Falsa
**Setup**: Claim falsa
**Execute**: Verify "SPT is 3x better than X"
**Assert**: Verdict = REJECTED, confidence < 0.6

### 3. Acurácia por Agente
**Setup**: 10 claims de um agente (7 verdadeiras, 3 falsas)
**Execute**: improveAgentAccuracy(agentId)
**Assert**: accuracy_rate = 0.7, recomendações geradas

### 4. Padrões de Erro
**Setup**: Múltiplos agentes fazendo claims similares falsas
**Execute**: Buscar common_claim_errors
**Assert**: Padrão identificado + severity correto

## ✅ Checklist

- [ ] Website search funciona
- [ ] Google Search integrado
- [ ] Fact-check API respondendo
- [ ] Veredictos consistentes
- [ ] Accuracy stats atualizadas
- [ ] Recomendações são úteis
- [ ] Zero false negatives (claims verdadeiras rejeitadas)

## 📊 Success Criteria

✅ Se accuracy_rate da maioria dos agentes > 0.8
✅ Se rejected claims < 2% do total
✅ Se system não falha em 7 dias

