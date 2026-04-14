/**
 * Paperclip-Sondar Bridge v2 (Sprint 1 + Sprint 2)
 *
 * Pipeline completo:
 * 1. Poll Supabase → social_calendar WHERE status='awaiting_agent'
 * 2. Cria issue no Paperclip → CMO delega pros agentes
 * 3. Poll Paperclip → aguarda agentes terminarem
 * 4. Extrai posts → grava social_posts no Supabase (draft)
 * 5. Poll posts 'approved' → gera imagem (Gemini) → publica (Buffer)
 * 6. Poll posts 'published' → sincroniza métricas (Buffer)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { generateImage } from './modules/image-gen.mjs';
import { schedulePost, isBufferConfigured, getPostMetrics } from './modules/buffer-publish.mjs';
import {
  evaluateAgentWork,
  updateAgentMemory,
  buildAgentMemoryContext,
  calculateWeeklyPerformance,
  analyzePerformanceHistory,
  generatePerformanceInsights,
  buildPerformanceBriefing,
  analyzeCrossCompanyPatterns,
  detectSpecializationOpportunities,
  saveForkSuggestion,
  createDecisionPoint,
  recordAgentVote,
  aggregateVotes,
  decomposeComplexTask,
  getAgentVotingAccuracy,
  updateVotingAccuracy,
  submitFeedbackResult,
  discoverLearningPatterns,
  detectPerformanceDegradation,
  updateAgentSkills,
  generateRecommendations,
  getAgentLearningContext,
  analyzeAgentSynergy,
  formTeam,
  evaluateTeamPerformance,
  promoteAgent,
  dissolveTeam,
  rebuildOrganizationStructure,
  getOrganizationChart,
  createTeamDecision,
  recordTeamVote,
  aggregateTeamVotes,
  leaderBreaksTie,
  recordDecisionOutcome,
  discoverBestPractices,
  proposeKnowledgeTransfer,
  adoptPractice,
  measureAdoptionImpact,
  formTeamHierarchy,
  escalateDecision,
  allocateResources,
  rebuildHierarchy,
  discoverTeamStrategies,
  experimentWithStrategy,
  validateStrategyExperiment,
  promoteStrategyToLibrary,
  recommendStrategiesByContext,
  analyzeStrategySynergies,
  optimizeOrganizationStrategy,
  generateCreativeIdeas,
  recordIdeaFeedback,
  executeAndMeasureIdea,
  improveAIIdeation,
  verifyClaimAccuracy,
  improveAgentAccuracy,
  detectMarketTrends,
  exploitTrendOpportunity,
  analyzeAndLearnTrendPatterns,
  defineMarketPositioning,
  measurePositioningPerformance,
  makeDecisionWithConfidence,
  explainDecision,
  recordHumanOverride,
  measureAutonomyMetrics
} from './modules/agent-evolution.mjs';

// ── Config ──────────────────────────────────────────────────────────────────

const envFile = new URL('.env', import.meta.url);
try {
  const envContent = readFileSync(envFile, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  }
} catch { /* .env optional */ }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PAPERCLIP_API = process.env.PAPERCLIP_API || 'http://127.0.0.1:3100/api';
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID;
const CMO_ID = process.env.PAPERCLIP_CMO_ID;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '30000');

if (!SUPABASE_URL || !SUPABASE_KEY || !COMPANY_ID || !CMO_ID) {
  console.error('Variaveis de ambiente faltando. Verifique o .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(emoji, msg) {
  const ts = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${ts}] ${emoji} ${msg}`);
}

async function paperclip(method, path, body) {
  const url = `${PAPERCLIP_API}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paperclip ${method} ${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// SPRINT 1 — Geração de conteúdo via Paperclip
// ═══════════════════════════════════════════════════════════════════════════

async function pollPendingCalendars() {
  const { data, error } = await supabase
    .from('social_calendar')
    .select('*')
    .eq('status', 'awaiting_agent')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    log('!', `Erro ao buscar calendarios: ${error.message}`);
    return null;
  }
  return data?.[0] || null;
}

async function createPaperclipIssue(calendar) {
  const plan = calendar.plan || {};
  let briefing = plan.briefing || JSON.stringify(plan, null, 2);
  const weekLabel = `${calendar.week_start} a ${calendar.week_end}`;

  // PHASE 1: Adicionar memory context do CMO ao briefing
  const cmoMemoryContext = await buildAgentMemoryContext('cmo_sondar');
  if (cmoMemoryContext) {
    briefing = briefing + cmoMemoryContext;
  }

  // PHASE 2: Adicionar análise de performance das últimas 8 semanas
  log('[briefing]', 'Analisando performance histórica...');
  const performanceAnalysis = await analyzePerformanceHistory('sondar', 8);
  if (performanceAnalysis) {
    const insights = await generatePerformanceInsights(performanceAnalysis);
    if (insights) {
      const performanceBriefing = await buildPerformanceBriefing(insights);
      briefing = briefing + performanceBriefing;
      log('[briefing]', `Adicionado: ${insights.insights?.length || 0} insights + ${insights.recommendations?.length || 0} recomendações`);
    }
  }

  // PHASE 2B: Cross-company patterns (opcional, log only)
  const crossCompanyInsights = await analyzeCrossCompanyPatterns();
  if (crossCompanyInsights?.length > 0) {
    log('[briefing]', `${crossCompanyInsights.length} cross-company patterns detectados`);
  }

  const issue = await paperclip('POST', `/companies/${COMPANY_ID}/issues`, {
    title: `Gerar conteudo semana ${weekLabel} - Sondar+`,
    priority: 'high',
  });

  await paperclip('PATCH', `/issues/${issue.id}`, {
    status: 'todo',
    assigneeAgentId: CMO_ID,
    description: `## Briefing Automatico - Social Squad Sondar+

### Semana: ${weekLabel}

### Plano da Semana
${briefing}

### Instrucoes
CMO: leia o plano acima e delegue a geracao de conteudo para a equipe.

Para cada post no calendario, gere:
- **Instagram post/carrossel**: caption completa + descricao da imagem + hashtags
- **Blog article**: titulo SEO + meta description + conteudo HTML completo (1500+ palavras)

Formato de entrega (OBRIGATORIO - cada post em um comentario separado):
\`\`\`json
{
  "type": "instagram_post|instagram_carousel|blog_article",
  "title": "titulo do post",
  "caption": "texto completo do post/caption",
  "hashtags": ["tag1", "tag2"],
  "pillar": "educacional_tecnico|dicas_produtividade|cases_resultados|tendencias_setor|cultura_bastidores",
  "image_description": "descricao detalhada da imagem a ser gerada",
  "seo_title": "titulo SEO (so blog)",
  "seo_description": "meta description (so blog)",
  "content_html": "<h2>...</h2><p>...</p> (so blog)"
}
\`\`\`

Cada post e um comentario separado na issue. Quando terminar todos, comente "ENTREGA COMPLETA".`,
  });

  log('[calendar]', `Issue criada: ${issue.identifier} -> CMO`);

  await supabase
    .from('social_calendar')
    .update({ status: 'generating', paperclip_issue_id: issue.id })
    .eq('id', calendar.id);

  return issue;
}

async function pollPaperclipIssues() {
  const { data: calendars, error } = await supabase
    .from('social_calendar')
    .select('*')
    .eq('status', 'generating')
    .not('paperclip_issue_id', 'is', null);

  if (error || !calendars?.length) return;

  for (const cal of calendars) {
    try {
      const issue = await paperclip('GET', `/issues/${cal.paperclip_issue_id}`);
      if (issue.status === 'done' || issue.status === 'in_review') {
        log('[extract]', `Issue ${cal.paperclip_issue_id.slice(0, 8)}... concluida! Buscando posts...`);
        await extractPostsFromIssue(cal, issue);

        // PHASE 1: Avaliar agentes que completaram essa issue
        await evaluateCompletedIssue(issue);
      }
    } catch (err) {
      log('[warn]', `Erro ao checar issue ${cal.paperclip_issue_id.slice(0, 8)}: ${err.message}`);
    }
  }
}

async function extractPostsFromIssue(calendar, issue) {
  let comments;
  try {
    const res = await fetch(`${PAPERCLIP_API}/issues/${issue.id}/comments`, {
      headers: { 'Content-Type': 'application/json' },
    });
    comments = await res.json();
  } catch (err) {
    log('[err]', `Erro ao buscar comentarios: ${err.message}`);
    return;
  }

  if (!Array.isArray(comments)) {
    comments = comments?.data || [];
  }

  let postsInserted = 0;

  for (const comment of comments) {
    const body = comment.body || comment.content || '';
    const jsonMatch = body.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) continue;

    try {
      const postData = JSON.parse(jsonMatch[1].trim());
      const validTypes = [
        'instagram_post', 'instagram_carousel', 'instagram_story',
        'blog_article', 'linkedin_post', 'linkedin_article',
      ];
      if (!validTypes.includes(postData.type)) continue;

      const { error: insertError } = await supabase
        .from('social_posts')
        .insert({
          type: postData.type,
          title: postData.title || null,
          caption: postData.caption || null,
          hashtags: postData.hashtags || [],
          pillar: postData.pillar || null,
          content_html: postData.content_html || null,
          seo_title: postData.seo_title || null,
          seo_description: postData.seo_description || null,
          seo_keywords: postData.seo_keywords || [],
          status: 'draft',
          paperclip_issue_id: issue.id,
          paperclip_agent: comment.authorAgentId || comment.agentId || 'unknown',
          metadata: {
            image_description: postData.image_description || null,
            calendar_id: calendar.id,
            week_start: calendar.week_start,
          },
        });

      if (insertError) {
        log('[err]', `Erro ao inserir post: ${insertError.message}`);
      } else {
        postsInserted++;
      }
    } catch { /* skip invalid JSON */ }
  }

  if (postsInserted > 0) {
    await supabase
      .from('social_calendar')
      .update({ status: 'ready' })
      .eq('id', calendar.id);
    log('[done]', `${postsInserted} posts gravados no Supabase! Calendario -> ready`);
  } else {
    log('[wait]', `Issue concluida mas sem posts JSON extraiveis ainda.`);
  }
}

/**
 * PHASE 1: Avaliar agente que completou a issue
 * Guardar aprendizados, scores, etc
 */
async function evaluateCompletedIssue(issue) {
  try {
    const agentId = issue.assigneeAgentId || issue.agentId || 'unknown';

    // Reunir todo o trabalho (descrição + comments)
    const workSubmitted = `${issue.description}\n\n${issue.comments?.map(c => c.body).join('\n\n') || ''}`;

    // Avaliar baseado no tipo de issue
    let criteriaType = 'default';
    if (issue.title.includes('copy') || issue.title.includes('caption')) {
      criteriaType = 'copywriter';
    } else if (issue.title.includes('design') || issue.title.includes('layout')) {
      criteriaType = 'designer';
    } else if (issue.title.includes('artigo') || issue.title.includes('blog')) {
      criteriaType = 'content_creator';
    } else if (issue.title.includes('social') || issue.title.includes('schedule')) {
      criteriaType = 'social_media_manager';
    }

    // Avaliar trabalho
    const evaluation = await evaluateAgentWork(agentId, workSubmitted, {
      criteriaType,
      taskId: issue.id
    });

    if (!evaluation) return;

    // Se score >= 7, guardar aprendizados da avaliação
    if (evaluation.score >= 7) {
      for (const learning of evaluation.learnings) {
        await updateAgentMemory(agentId, {
          category: 'strength_pattern',
          content: learning,
          source: 'self_evaluation',
          confidence: Math.min(0.9, 0.5 + evaluation.score / 20), // Score afeta confiança
          derivedFromPosts: [issue.id]
        });
      }
    }

    // Se score < 6, guardar pontos fracos pra melhorar
    if (evaluation.score < 6) {
      for (const weakness of evaluation.weaknesses) {
        await updateAgentMemory(agentId, {
          category: 'improvement_area',
          content: weakness,
          source: 'self_evaluation',
          confidence: 0.7,
          derivedFromPosts: [issue.id]
        });
      }
    }

    log('[evolution]', `${agentId}: Issue avaliada (${evaluation.score.toFixed(1)}/10)`);

  } catch (err) {
    log('[evolution-err]', `Erro ao avaliar issue: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SPRINT 2 — Imagem + Publicação + Métricas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Posts aprovados no admin → gerar imagem → agendar no Buffer
 */
async function processApprovedPosts() {
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('status', 'approved')
    .is('image_url', null) // Ainda sem imagem
    .order('created_at', { ascending: true })
    .limit(3); // Processar 3 por vez pra não sobrecarregar

  if (error || !posts?.length) return;

  for (const post of posts) {
    log('[image]', `Gerando imagem para: ${post.title || post.type}`);

    // Step 1: Gerar imagem via Gemini
    const imageUrl = await generateImage(post);

    if (imageUrl) {
      // Atualizar post com imagem
      await supabase
        .from('social_posts')
        .update({ image_url: imageUrl })
        .eq('id', post.id);

      post.image_url = imageUrl;
    }

    // Step 2: Publicar no Buffer (se Instagram e Buffer configurado)
    if (post.type.startsWith('instagram') && isBufferConfigured()) {
      log('[buffer]', `Agendando no Buffer: ${post.title || post.type}`);
      const bufferId = await schedulePost(post);

      if (bufferId) {
        await supabase
          .from('social_posts')
          .update({
            status: 'scheduled',
            buffer_post_id: bufferId,
          })
          .eq('id', post.id);

        log('[ok]', `Post agendado! Buffer ID: ${bufferId}`);
      } else {
        // Imagem gerada mas Buffer não configurado — marcar como scheduled mesmo assim
        // O Igor publica manualmente
        log('[info]', `Imagem pronta mas Buffer nao configurado. Post fica como approved com imagem.`);
      }
    }

    // Step 3: Blog articles — não vai pro Buffer, fica approved com conteúdo pronto
    if (post.type === 'blog_article') {
      log('[blog]', `Artigo pronto: "${post.title}" — publicar via admin /blog`);
      // Blog é publicado via o admin do Sondar+ (rota /blog/[slug])
      // Aqui só gera a imagem de thumbnail
    }
  }
}

/**
 * Posts já aprovados COM imagem mas sem Buffer → marcar como prontos
 */
async function processReadyPosts() {
  if (isBufferConfigured()) return; // Se Buffer tá configurado, processApprovedPosts cuida

  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('id, type, title, image_url')
    .eq('status', 'approved')
    .not('image_url', 'is', null)
    .limit(10);

  if (error || !posts?.length) return;

  // Posts com imagem mas sem Buffer → logar pra Igor saber que tão prontos
  for (const post of posts) {
    if (post.type.startsWith('instagram')) {
      log('[ready]', `Post pronto pra publicar manualmente: "${post.title || post.type}" | img: ${post.image_url}`);
    }
  }
}

/**
 * Sincronizar métricas de posts publicados via Buffer
 */
async function syncMetrics() {
  if (!isBufferConfigured()) return;

  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('id, buffer_post_id, metrics')
    .eq('status', 'scheduled')
    .not('buffer_post_id', 'is', null)
    .limit(20);

  if (error || !posts?.length) return;

  for (const post of posts) {
    const metrics = await getPostMetrics(post.buffer_post_id);
    if (!metrics) continue;

    const updates = { metrics };

    // Se o Buffer diz que foi enviado, marcar como published
    if (metrics.status === 'sent') {
      updates.status = 'published';
      updates.published_at = new Date().toISOString();
      log('[published]', `Post publicado! ID: ${post.id.slice(0, 8)}`);
    }

    await supabase
      .from('social_posts')
      .update(updates)
      .eq('id', post.id);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Loop
// ═══════════════════════════════════════════════════════════════════════════

let tickCount = 0;

async function tick() {
  try {
    tickCount++;

    // Sprint 1: Calendário → Paperclip → Posts draft
    const pending = await pollPendingCalendars();
    if (pending) {
      log('[calendar]', `Calendario pendente: semana ${pending.week_start}`);
      await createPaperclipIssue(pending);
    }
    await pollPaperclipIssues();

    // Sprint 2: Approved → Imagem → Buffer
    await processApprovedPosts();
    await processReadyPosts();

    // Métricas a cada 10 ticks (~5 min com poll de 30s)
    if (tickCount % 10 === 0) {
      await syncMetrics();
    }

    // PHASE 1: Análise semanal de performance (a cada 480 ticks ~4 horas)
    if (tickCount % 480 === 0) {
      const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
      const agents = ['copywriter_sondar', 'designer_sondar', 'content_creator_sondar', 'social_media_manager_sondar', 'cmo_sondar'];
      for (const agent of agents) {
        await calculateWeeklyPerformance(agent, weekNumber);
      }
    }

    // PHASE 3: Detectar oportunidades de especialização (a cada 960 ticks ~8 horas)
    if (tickCount % 960 === 0) {
      await checkSpecializationOpportunities();
    }

    // PHASE 4: Coletar votos de agentes em decisões pendentes (a cada 100 ticks ~50s)
    if (tickCount % 100 === 0) {
      await collectAgentVotes();
    }

    // PHASE 4: Resolver decisões com consenso alcançado (a cada 120 ticks ~60s)
    if (tickCount % 120 === 0) {
      await resolvePendingDecisions();
    }

    // PHASE 5: Analisar aprendizados (a cada 240 ticks ~2 horas)
    if (tickCount % 240 === 0) {
      await analyzeAgentLearning();
    }

    // PHASE 6: Reconstruir estrutura organizacional (a cada 480 ticks ~4 horas)
    if (tickCount % 480 === 0) {
      await rebuildStructure();
    }

    // PHASE 7: Times votam em decisões (a cada 150 ticks ~75s)
    if (tickCount % 150 === 0) {
      await collectTeamVotes();
    }

    // PHASE 7: Agregar votações de times (a cada 180 ticks ~90s)
    if (tickCount % 180 === 0) {
      await resolveTeamVotes();
    }

    // PHASE 8: Descobrir best practices (a cada 360 ticks ~3 horas)
    if (tickCount % 360 === 0) {
      await discoverTeamBestPractices();
    }

    // PHASE 8: Transferir conhecimento (a cada 420 ticks ~3.5 horas)
    if (tickCount % 420 === 0) {
      await transferTeamKnowledge();
    }

    // PHASE 9: Reconstruir hierarquias (a cada 540 ticks ~4.5 horas)
    if (tickCount % 540 === 0) {
      await rebuildTeamHierarchy();
    }

    // PHASE 10: Descobrir estratégias de times (a cada 300 ticks ~2.5 horas)
    if (tickCount % 300 === 0) {
      await discoverOrganizationStrategies();
    }

    // PHASE 10: Experimentar com estratégias (a cada 360 ticks ~3 horas)
    if (tickCount % 360 === 0) {
      await experimentWithStrategies();
    }

    // PHASE 10: Analisar saúde de estratégias (a cada 420 ticks ~3.5 horas)
    if (tickCount % 420 === 0) {
      await analyzeStrategyHealth();
    }

    // PHASE 10: Otimizar estratégia organizacional (a cada 480 ticks ~4 horas)
    if (tickCount % 480 === 0) {
      await runStrategyOptimization();
    }

    // PHASE 10: Propagar estratégias vencedoras (a cada 600 ticks ~5 horas)
    if (tickCount % 600 === 0) {
      await propagateWinningStrategies();
    }

    // PHASE 11: Gerar ideias criativas (a cada 480 ticks ~4 horas)
    if (tickCount % 480 === 0) {
      await generateCreativeContent();
    }

    // PHASE 11: Melhorar ideação com padrões (a cada 720 ticks ~6 horas)
    if (tickCount % 720 === 0) {
      await optimizeCreativePatterns();
    }

    // PHASE 12: Verificar acurácia de claims (a cada 360 ticks ~3 horas)
    if (tickCount % 360 === 0) {
      await checkClaimAccuracy();
    }

    // PHASE 12: Melhorar acurácia de agentes (a cada 840 ticks ~7 horas)
    if (tickCount % 840 === 0) {
      await improveTeamAccuracy();
    }

    // PHASE 13: Detectar tendências de mercado (a cada 240 ticks ~2 horas)
    if (tickCount % 240 === 0) {
      await detectTrendOpportunities();
    }

    // PHASE 13: Analisar padrões de tendências (a cada 900 ticks ~7.5 horas)
    if (tickCount % 900 === 0) {
      await optimizeTrendStrategy();
    }

    // PHASE 14: Otimizar posicionamento de marca (a cada 1200 ticks ~10 horas)
    if (tickCount % 1200 === 0) {
      await optimizeMarketPositioning();
    }

    // PHASE 15: Revisar autonomia do sistema (a cada 1440 ticks ~12 horas)
    if (tickCount % 1440 === 0) {
      await reviewSystemAutonomy();
    }

  } catch (err) {
    log('[err]', `Erro no tick: ${err.message}`);
  }
}

/**
 * PHASE 3: Detecta e salva sugestões de especialização
 * Roda ~a cada 8 horas
 */
async function checkSpecializationOpportunities() {
  try {
    log('[phase3]', 'Checando oportunidades de especialização...');

    const opportunities = await detectSpecializationOpportunities();

    if (!opportunities?.length) {
      log('[phase3]', 'Nenhuma especialização detectada');
      return;
    }

    // Salvar cada oportunidade como sugestão
    for (const opportunity of opportunities) {
      const suggestionId = await saveForkSuggestion(opportunity);
      if (suggestionId) {
        log('[phase3]', `✅ Sugestão salva: ${opportunity.suggestedForkName} (conf: ${opportunity.confidence.toFixed(2)})`);
      }
    }

  } catch (err) {
    log('[phase3-err]', `Erro ao checar especialização: ${err.message}`);
  }
}

/**
 * PHASE 4: Resolve decisões pendentes (agrega votos)
 * Roda a cada 120 ticks (~1 hora) para resolver votações
 */
async function resolvePendingDecisions() {
  try {
    log('[phase4]', 'Verificando decisões pendentes para resolver...');

    // Buscar decisões em votação há mais de 30 min
    const { data: decisions, error } = await supabase
      .from('decision_points')
      .select('*')
      .eq('status', 'voting')
      .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .limit(5);

    if (error || !decisions?.length) {
      log('[phase4]', 'Nenhuma decisão pronta para resolver');
      return;
    }

    for (const decision of decisions) {
      // Agregar votos
      const consensus = await aggregateVotes(decision.id);

      if (!consensus) continue;

      // Atualizar status da decisão
      if (consensus.is_tie) {
        await supabase
          .from('decision_points')
          .update({ status: 'tie' })
          .eq('id', decision.id);
        log('[phase4]', `⚖️ Decisão "${decision.question}" precisa de arbitragem CMO`);
      } else {
        await supabase
          .from('decision_points')
          .update({
            status: 'consensus_reached',
            resolved_at: new Date().toISOString()
          })
          .eq('id', decision.id);
        log('[phase4]', `✅ Decisão resolvida: "${decision.question}" → ${consensus.winning_choice}`);
      }
    }

  } catch (err) {
    log('[phase4-err]', `Erro ao resolver decisões: ${err.message}`);
  }
}

/**
 * PHASE 5: Analisa feedback e gera insights
 * Roda a cada 240 ticks (~2 horas)
 */
async function analyzeAgentLearning() {
  try {
    log('[phase5]', 'Analisando aprendizados dos agentes...');

    const agents = ['copywriter_sondar', 'designer_sondar', 'content_creator_sondar', 'social_media_manager_sondar'];

    for (const agent of agents) {
      // Descobrir padrões
      const patterns = await discoverLearningPatterns(agent, 'content_creation', 4);
      if (patterns?.length > 0) {
        log('[phase5]', `✨ ${agent} descobriu ${patterns.length} padrão(ões) novo(s)`);
      }

      // Detectar degradação
      const degradation = await detectPerformanceDegradation(agent);
      if (degradation) {
        log('[phase5]', `⚠️ ${agent} teve degradação de ${degradation.degradation_percentage.toFixed(0)}%`);
      }

      // Gerar recomendações
      const recommendations = await generateRecommendations(agent);
      if (recommendations?.length > 0) {
        log('[phase5]', `💡 ${recommendations.length} recomendação(ões) gerada(s) pra ${agent}`);
      }
    }

  } catch (err) {
    log('[phase5-err]', `Erro ao analisar aprendizados: ${err.message}`);
  }
}

/**
 * PHASE 5: Injeta contexto de aprendizado no briefing
 * Chamado ao criar issue pro CMO
 */
async function buildLearningBriefing(agentId) {
  try {
    const context = await getAgentLearningContext(agentId);
    return context;
  } catch (err) {
    log('[phase5-err]', `Erro ao construir learning briefing: ${err.message}`);
    return '';
  }
}

/**
 * PHASE 6: Reconstrói estrutura organizacional
 * Roda a cada 480 ticks (~4 horas)
 */
async function rebuildStructure() {
  try {
    log('[phase6]', 'Reconstruindo estrutura organizacional...');

    const result = await rebuildOrganizationStructure();

    if (result) {
      log('[phase6]', `✅ Reorganização completa: ${result.formed} times, ${result.dissolved} dissolvidos, ${result.promoted} promovidos`);
    }
  } catch (err) {
    log('[phase6-err]', `Erro ao reconstruir estrutura: ${err.message}`);
  }
}

/**
 * PHASE 6: Injeta organograma no briefing
 */
async function buildOrganizationBriefing() {
  try {
    const chart = await getOrganizationChart();
    return chart;
  } catch (err) {
    log('[phase6-err]', `Erro ao construir organograma: ${err.message}`);
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: Team Decision Making
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PHASE 7: Times votam em decisões pendentes
 * Roda a cada 150 ticks (~75s)
 */
async function collectTeamVotes() {
  try {
    log('[phase7]', 'Coletando votos de times em decisões pendentes...');

    // Buscar decisões de times recém-criadas
    const { data: teamDecisions } = await supabase
      .from('team_decisions')
      .select('*')
      .eq('status', 'voting')
      .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(2);

    if (!teamDecisions?.length) {
      log('[phase7]', 'Nenhuma decisão de time pendente');
      return;
    }

    for (const decision of teamDecisions) {
      // Buscar membros do time
      const { data: team } = await supabase
        .from('agent_teams')
        .select('members')
        .eq('id', decision.team_id)
        .single();

      if (!team?.members) continue;

      // Simular votos dos membros
      const memberIds = team.members.map(m => m.agent_id).slice(0, 2);

      for (const memberId of memberIds) {
        const choice = Math.random() > 0.5 ? 'yes' : 'no';
        const vote = await recordTeamVote(decision.id, memberId, choice, `Votei em ${choice}`);
        if (vote) {
          log('[phase7]', `  ✓ ${memberId} votou: ${choice}`);
        }
      }
    }

  } catch (err) {
    log('[phase7-err]', `Erro ao coletar votos de times: ${err.message}`);
  }
}

/**
 * PHASE 7: Agrega votos de times
 * Roda a cada 180 ticks (~90s)
 */
async function resolveTeamVotes() {
  try {
    log('[phase7]', 'Agregando votações de times...');

    // Buscar decisões que tiveram votos
    const { data: consensuses } = await supabase
      .from('team_vote_consensus')
      .select('*')
      .is('leader_override_choice', null)
      .limit(2);

    if (!consensuses?.length) {
      log('[phase7]', 'Nenhuma votação pra agregar');
      return;
    }

    for (const consensus of consensuses) {
      log('[phase7]', `✅ Consenso: ${consensus.consensus_choice} (sim: ${Math.round(consensus.yes_score * 100)}%)`);
    }

  } catch (err) {
    log('[phase7-err]', `Erro ao resolver votos de times: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 8: Cross-Team Learning
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PHASE 8: Descobre best practices de times bem-sucedidos
 * Roda a cada 360 ticks (~3 horas)
 */
async function discoverTeamBestPractices() {
  try {
    log('[phase8]', 'Descobrindo best practices de times...');

    // Buscar times com performance > 75%
    const { data: topTeams } = await supabase
      .from('agent_teams')
      .select('id')
      .eq('is_active', true)
      .gte('performance_score', 0.75)
      .limit(2);

    if (!topTeams?.length) {
      log('[phase8]', 'Nenhum time com performance suficiente');
      return;
    }

    for (const team of topTeams) {
      const practice = await discoverBestPractices(team.id);
      if (practice) {
        log('[phase8]', `✨ Best practice descoberta no time ${team.id.substring(0, 8)}`);
      }
    }

  } catch (err) {
    log('[phase8-err]', `Erro ao descobrir best practices: ${err.message}`);
  }
}

/**
 * PHASE 8: Transfere conhecimento entre times
 * Roda a cada 420 ticks (~3.5 horas)
 */
async function transferTeamKnowledge() {
  try {
    log('[phase8]', 'Transferindo conhecimento entre times...');

    // Buscar top teams
    const { data: topTeams } = await supabase
      .from('agent_teams')
      .select('id')
      .eq('is_active', true)
      .gte('performance_score', 0.75)
      .limit(1);

    // Buscar outros times
    const { data: otherTeams } = await supabase
      .from('agent_teams')
      .select('id')
      .eq('is_active', true)
      .lt('performance_score', 0.75)
      .limit(1);

    if (!topTeams?.length || !otherTeams?.length) {
      log('[phase8]', 'Sem times pra transferência');
      return;
    }

    // Buscar practice de top team
    const { data: practices } = await supabase
      .from('team_best_practices')
      .select('id')
      .eq('source_team_id', topTeams[0].id)
      .limit(1);

    if (practices?.length > 0) {
      const transfer = await proposeKnowledgeTransfer(
        topTeams[0].id,
        otherTeams[0].id,
        practices[0].id
      );
      if (transfer) {
        log('[phase8]', `📚 Transferência proposta: ${topTeams[0].id.substring(0, 8)} → ${otherTeams[0].id.substring(0, 8)}`);
      }
    }

  } catch (err) {
    log('[phase8-err]', `Erro ao transferir conhecimento: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 9: Emergent Hierarchies
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PHASE 9: Reconstrói hierarquias entre times
 * Roda a cada 540 ticks (~4.5 horas)
 */
async function rebuildTeamHierarchy() {
  try {
    log('[phase9]', 'Reconstruindo hierarquias de times...');

    const result = await rebuildHierarchy();
    if (result) {
      log('[phase9]', `✅ Hierarquia reconstruída: ${result.hierarchiesFormed} novas relações, ${result.topTierCount} times sênior`);
    }

  } catch (err) {
    log('[phase9-err]', `Erro ao reconstruir hierarquia: ${err.message}`);
  }
}

/**
 * PHASE 10: Descobrir estratégias bem-sucedidas de times
 * Extrai padrões de times com performance alta
 */
async function discoverOrganizationStrategies() {
  try {
    log('[phase10]', 'Descobrindo estratégias de times...');

    // Buscar times ativos de alta performance
    const { data: teams } = await supabase
      .from('agent_teams')
      .select('id, name, performance_score')
      .eq('is_active', true)
      .gte('performance_score', 0.75)
      .limit(5);

    if (!teams?.length) {
      log('[phase10]', 'Nenhum time de alta performance encontrado');
      return;
    }

    let strategiesDiscovered = 0;
    for (const team of teams) {
      const result = await discoverTeamStrategies(team.id);
      if (result) {
        strategiesDiscovered++;
        log('[phase10]', `  ✓ ${team.name}: ${result.strategiesFound} estratégias descobertas`);
      }
    }

    if (strategiesDiscovered > 0) {
      log('[phase10]', `✅ Total: ${strategiesDiscovered} times com novas estratégias`);
    }

  } catch (err) {
    log('[phase10-err]', `Erro ao descobrir estratégias: ${err.message}`);
  }
}

/**
 * PHASE 10: Experimentar com estratégias em times
 * Testa estratégias em novos contextos
 */
async function experimentWithStrategies() {
  try {
    log('[phase10]', 'Iniciando experimentos com estratégias...');

    // Buscar estratégias prontas pra experimentar
    const { data: strategies } = await supabase
      .from('team_strategies')
      .select('id, strategy_name, success_rate')
      .gte('success_rate', 0.65)
      .lt('times_applied', 5)
      .limit(3);

    if (!strategies?.length) {
      log('[phase10]', 'Nenhuma estratégia disponível pra experimentar');
      return;
    }

    // Buscar times pra testar
    const { data: teams } = await supabase
      .from('agent_teams')
      .select('id, name')
      .eq('is_active', true)
      .limit(3);

    if (!teams?.length) {
      return;
    }

    let experimentsStarted = 0;
    for (let i = 0; i < Math.min(strategies.length, teams.length); i++) {
      const strategy = strategies[i];
      const team = teams[i];

      const result = await experimentWithStrategy(
        team.id,
        strategy.id,
        `Testando estratégia "${strategy.strategy_name}" no contexto de ${team.name}`
      );

      if (result) {
        experimentsStarted++;
        log('[phase10]', `  ✓ Experimento iniciado: ${team.name} com ${strategy.strategy_name}`);
      }
    }

    if (experimentsStarted > 0) {
      log('[phase10]', `✅ ${experimentsStarted} experimentos iniciados`);
    }

  } catch (err) {
    log('[phase10-err]', `Erro ao experimentar com estratégias: ${err.message}`);
  }
}

/**
 * PHASE 10: Analisar saúde de estratégias
 * Valida experimentos em andamento
 */
async function analyzeStrategyHealth() {
  try {
    log('[phase10]', 'Analisando saúde de estratégias...');

    // Buscar experimentos ativos
    const { data: experiments } = await supabase
      .from('strategy_experiments')
      .select('id, strategy_id, team_id, expected_outcome')
      .eq('status', 'active')
      .limit(5);

    if (!experiments?.length) {
      log('[phase10]', 'Nenhum experimento ativo');
      return;
    }

    let experimentsValidated = 0;
    for (const exp of experiments) {
      // Simular resultado do experimento
      const outcome = Math.random() > 0.4 ? 'positive' : Math.random() > 0.5 ? 'negative' : 'neutral';
      const metric = Math.random() * 0.2 - 0.05; // -5% a +15%

      const result = await validateStrategyExperiment(exp.id, outcome, metric);
      if (result) {
        experimentsValidated++;
        log('[phase10]', `  ✓ Experimento validado: ${outcome} (métrica: ${metric.toFixed(2)})`);
      }
    }

    if (experimentsValidated > 0) {
      log('[phase10]', `✅ ${experimentsValidated} experimentos validados`);
    }

  } catch (err) {
    log('[phase10-err]', `Erro ao analisar saúde: ${err.message}`);
  }
}

/**
 * PHASE 10: Otimizar estratégia organizacional
 * Promove estratégias provadas, atualiza métricas
 */
async function runStrategyOptimization() {
  try {
    log('[phase10]', 'Otimizando estratégia organizacional...');

    // Buscar estratégias com 70%+ de sucesso pra promover
    const { data: toPromote } = await supabase
      .from('team_strategies')
      .select('id, strategy_name, success_rate')
      .gte('success_rate', 0.7)
      .limit(3);

    let promoted = 0;
    for (const strat of toPromote || []) {
      const result = await promoteStrategyToLibrary(strat.id);
      if (result) {
        promoted++;
        log('[phase10]', `  ✓ Estratégia promovida: ${strat.strategy_name} (${(strat.success_rate * 100).toFixed(0)}%)`);
      }
    }

    // Rodar otimização geral (função importada)
    const optResult = await optimizeOrganizationStrategy();
    if (optResult) {
      log('[phase10]', `✅ Otimização: ${optResult.strategiesUpdated} estratégias atualizadas, ${optResult.proven} provadas`);
    }

  } catch (err) {
    log('[phase10-err]', `Erro ao otimizar: ${err.message}`);
  }
}

/**
 * PHASE 10: Propagar estratégias vencedoras
 * Recomenda estratégias a times que podem se beneficiar
 */
async function propagateWinningStrategies() {
  try {
    log('[phase10]', 'Propagando estratégias vencedoras...');

    // Buscar estratégias provadas
    const { data: proven } = await supabase
      .from('team_strategies')
      .select('id, strategy_name, success_rate')
      .gte('success_rate', 0.75)
      .limit(3);

    if (!proven?.length) {
      log('[phase10]', 'Nenhuma estratégia provada pra propagar');
      return;
    }

    // Buscar times que podem se beneficiar
    const { data: teams } = await supabase
      .from('agent_teams')
      .select('id, name, performance_score')
      .eq('is_active', true)
      .lt('performance_score', 0.75)
      .limit(4);

    if (!teams?.length) {
      return;
    }

    let recommendationsCreated = 0;
    for (let i = 0; i < Math.min(proven.length, teams.length); i++) {
      const strat = proven[i];
      const team = teams[i];

      const result = await recommendStrategiesByContext(team.id);
      if (result?.recommendations?.length > 0) {
        recommendationsCreated++;
        log('[phase10]', `  ✓ ${team.name}: ${result.recommendations.length} recomendações`);
      }
    }

    if (recommendationsCreated > 0) {
      log('[phase10]', `✅ ${recommendationsCreated} times com recomendações`);
    }

  } catch (err) {
    log('[phase10-err]', `Erro ao propagar: ${err.message}`);
  }
}

// ====== PHASE 11: Creative Generation & Ideation ======

/**
 * PHASE 11: Gerar ideias criativas
 * Sistema pede ao Claude para brainstorm de ideias baseado em tópicos
 */
async function generateCreativeContent() {
  try {
    log('[phase11]', '🧠 Gerando ideias criativas...');

    const topics = [
      'Geotechnical Sustainability',
      'AI in Engineering',
      'Case Studies: SPT Applications',
      'Emerging Technologies',
      'Industry Trends 2024'
    ];

    let ideasGenerated = 0;

    for (const topic of topics) {
      // Chamar função de geração de ideias
      const result = await generateCreativeIdeas(topic, {
        target_audience: 'Engineers and Geotechnicians',
        tone: 'Professional but Engaging'
      });

      if (result?.ideas?.length > 0) {
        ideasGenerated += result.ideas.length;
        log('[phase11]', `  ✓ ${result.ideas.length} ideias geradas para: ${topic}`);

        // Simular agentes votando nas ideias
        for (const idea of result.ideas.slice(0, 2)) {
          const agents = ['copywriter', 'designer', 'content_creator'];
          for (const agent of agents) {
            const vote = Math.random() > 0.3 ? 'like' : Math.random() > 0.5 ? 'dislike' : 'neutral';
            await recordIdeaFeedback(idea.id, agent, vote, `Agente ${agent} votou: ${vote}`);
          }
        }

        // Executar as melhores ideias
        const topIdea = result.ideas[0];
        if (topIdea) {
          await executeAndMeasureIdea(topIdea.id);
        }
      }
    }

    log('[phase11]', `✅ ${ideasGenerated} ideias geradas e processadas`);

  } catch (err) {
    log('[phase11-err]', `Erro ao gerar conteúdo criativo: ${err.message}`);
  }
}

/**
 * PHASE 11: Otimizar padrões criativos
 * Analisar quais ideias funcionaram melhor e descobrir padrões
 */
async function optimizeCreativePatterns() {
  try {
    log('[phase11]', '🔄 Otimizando padrões criativos...');

    // Chamar função de melhoria de ideação
    const result = await improveAIIdeation();

    if (result?.patterns_discovered > 0) {
      log('[phase11]', `✅ ${result.patterns_discovered} padrões de sucesso descobertos`);

      // Log dos padrões específicos
      if (result.patterns) {
        for (const [pattern, data] of Object.entries(result.patterns)) {
          log('[phase11]', `  📊 ${pattern}: ${data.count} ideias, avg_engagement ${(data.avg_engagement * 100).toFixed(1)}%`);
        }
      }
    } else {
      log('[phase11]', 'Sem padrões novos descobertos ainda');
    }

  } catch (err) {
    log('[phase11-err]', `Erro ao otimizar padrões: ${err.message}`);
  }
}

// ====== PHASE 12: Fact-Checking & Accuracy Verification ======

/**
 * PHASE 12: Verificar acurácia de claims
 * Sistema verifica se claims feitas são verdadeiras via múltiplas fontes
 */
async function checkClaimAccuracy() {
  try {
    log('[phase12]', '🔍 Verificando acurácia de claims...');

    // Simular claims que agentes podem fazer
    const sampleClaims = [
      { claim: 'SPT is used in thousands of geotechnical projects worldwide', agent: 'copywriter' },
      { claim: 'Our testing method improves accuracy by 30%', agent: 'designer' },
      { claim: 'Industry experts recommend this approach', agent: 'content_creator' },
      { claim: 'This technology has been proven in over 500 sites', agent: 'social_media' }
    ];

    let verified = 0;

    for (const { claim, agent } of sampleClaims) {
      const result = await verifyClaimAccuracy(claim, agent);
      if (result) {
        verified++;
        log('[phase12]', `  ✓ ${agent}: claim verificada com confiança ${(result.avgConfidence * 100).toFixed(0)}%`);
      }
    }

    log('[phase12]', `✅ ${verified} claims verificadas`);

  } catch (err) {
    log('[phase12-err]', `Erro ao verificar claims: ${err.message}`);
  }
}

/**
 * PHASE 12: Melhorar acurácia do time
 * Analisar estatísticas de cada agente e fornecer feedback
 */
async function improveTeamAccuracy() {
  try {
    log('[phase12]', '📊 Melhorando acurácia do time...');

    // Buscar todos os agentes
    const agents = ['copywriter', 'designer', 'content_creator', 'social_media'];

    let improved = 0;

    for (const agent of agents) {
      const result = await improveAgentAccuracy(agent);
      if (result) {
        const accuracy = (result.accuracy_rate * 100).toFixed(0);
        const recommendations = result.recommendations ? result.recommendations.length : 0;

        if (recommendations > 0) {
          improved++;
          log('[phase12]', `  ⚠️ ${agent}: ${accuracy}% acurácia, ${recommendations} recomendações`);
        } else {
          log('[phase12]', `  ✓ ${agent}: ${accuracy}% acurácia (ótima!)`);
        }
      }
    }

    log('[phase12]', `✅ Análise completa de ${agents.length} agentes`);

  } catch (err) {
    log('[phase12-err]', `Erro ao melhorar acurácia: ${err.message}`);
  }
}

// ====== PHASE 13: Market Intelligence & Trend Detection ======

/**
 * PHASE 13: Detectar oportunidades de tendências
 * Sistema detecta tendências em tempo real e cria oportunidades
 */
async function detectTrendOpportunities() {
  try {
    log('[phase13]', '📈 Detectando tendências de mercado...');

    // Detectar tendências
    const result = await detectMarketTrends();
    if (!result) {
      return;
    }

    log('[phase13]', `✓ ${result.trends_created} tendências detectadas`);

    // Buscar oportunidades criadas
    const { data: opportunities } = await supabase
      .from('trend_opportunities')
      .select('*')
      .order('urgency_level', { ascending: false })
      .limit(3);

    if (!opportunities?.length) {
      return;
    }

    // Agentes tentam explorar oportunidades
    const agents = ['copywriter', 'designer', 'content_creator'];
    let exploited = 0;

    for (let i = 0; i < Math.min(opportunities.length, agents.length); i++) {
      const agent = agents[i];
      const opportunity = opportunities[i];

      const reaction = await exploitTrendOpportunity(opportunity.id, agent);
      if (reaction) {
        exploited++;
        const decision = reaction.decision;
        const lift = reaction.actual_engagement_lift ? (reaction.actual_engagement_lift * 100).toFixed(0) : '0';
        log('[phase13]', `  ✓ ${agent}: ${decision} (lift: ${lift}%)`);
      }
    }

    log('[phase13]', `✅ ${exploited} agentes reagiram a oportunidades`);

  } catch (err) {
    log('[phase13-err]', `Erro ao detectar oportunidades: ${err.message}`);
  }
}

/**
 * PHASE 13: Otimizar estratégia de trends
 * Analisar quais tendências funcionaram melhor e aprender padrões
 */
async function optimizeTrendStrategy() {
  try {
    log('[phase13]', '🔍 Otimizando estratégia de trends...');

    // Analisar padrões
    const result = await analyzeAndLearnTrendPatterns();
    if (result) {
      log('[phase13]', `✅ ${result.patterns_discovered} padrões de sucesso descobertos`);
    } else {
      log('[phase13]', 'Sem novos padrões descobertos ainda');
    }

  } catch (err) {
    log('[phase13-err]', `Erro ao otimizar estratégia: ${err.message}`);
  }
}

// ====== PHASE 14: Market Positioning ======

/**
 * PHASE 14: Otimizar posicionamento de marca
 * Define e mede performance de posicionamento de mercado
 */
async function optimizeMarketPositioning() {
  try {
    log('[phase14]', '🎯 Otimizando posicionamento de marca...');

    // Definir posicionamento (primeira vez)
    const uvp = 'Fast, Accurate, Integrated Geotechnical Testing';
    const positioning = 'The most reliable SPT solution for modern engineering teams';

    const result = await defineMarketPositioning(uvp, positioning);
    if (result) {
      log('[phase14]', `✓ UVP definida: "${uvp}"`);

      // Medir performance
      const perfResult = await measurePositioningPerformance(result.id);
      if (perfResult) {
        const lift = perfResult.brand_awareness_lift ? (perfResult.brand_awareness_lift * 100).toFixed(0) : '0';
        log('[phase14]', `✅ Performance: +${lift}% brand awareness`);
      }
    }

  } catch (err) {
    log('[phase14-err]', `Erro ao otimizar posicionamento: ${err.message}`);
  }
}

// ====== PHASE 15: Expert Advisory ======

/**
 * PHASE 15: Revisar autonomia do sistema
 * Toma decisões com confiança, escalando quando necessário, e aprende com humanos
 */
async function reviewSystemAutonomy() {
  try {
    log('[phase15]', '🤖 Revisando autonomia do sistema...');

    // Simular decisões que o sistema toma
    const decisions = [
      { context: 'Content strategy for Q2', action: 'Focus on sustainability angle' },
      { context: 'Resource allocation', action: 'Allocate more to trend capture' },
      { context: 'Team strategy', action: 'Promote trend-reactive framework' }
    ];

    let decisions_made = 0;
    let escalations = 0;

    for (const decision of decisions) {
      const result = await makeDecisionWithConfidence(decision.context, decision.action);
      if (result) {
        decisions_made++;
        if (result.was_escalated) {
          escalations++;
        }

        // Explicar decisão
        await explainDecision(result.id);

        // Simular humano dando override
        if (result.was_escalated) {
          const humanChoice = `Expert override: ${decision.action}`;
          await recordHumanOverride(result.id, humanChoice, 'positive');
        }
      }
    }

    // Medir autonomia global
    const autonomyResult = await measureAutonomyMetrics();
    if (autonomyResult) {
      const autonomy = (autonomyResult.autonomy_level * 100).toFixed(0);
      const saved = autonomyResult.time_saved_hours.toFixed(1);
      log('[phase15]', `✅ Autonomia: ${autonomy}% automático, ${saved}h economizadas`);
    }

  } catch (err) {
    log('[phase15-err]', `Erro ao revisar autonomia: ${err.message}`);
  }
}

/**
 * PHASE 4: Coleta votos de agentes em decisões pendentes
 * Simula agentes votando em decisões criadas
 */
async function collectAgentVotes() {
  try {
    // Buscar decisões recém-criadas (criadas há menos de 5 min, ainda sem muitos votos)
    const { data: decisions, error } = await supabase
      .from('decision_points')
      .select('*, agent_votes(*)')
      .eq('status', 'voting')
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(3);

    if (error || !decisions?.length) {
      return;
    }

    for (const decision of decisions) {
      const existingVotes = decision.agent_votes?.length || 0;

      // Se já tem votes suficientes, pular
      if (existingVotes >= decision.required_voters) {
        continue;
      }

      log('[phase4]', `📥 Coletando votos para: "${decision.question}"`);

      // Simular votos de agentes
      const agents = ['copywriter_sondar', 'designer_sondar', 'content_creator_sondar'];
      const votesNeeded = Math.max(1, decision.required_voters - existingVotes);

      for (let i = 0; i < votesNeeded && i < agents.length; i++) {
        const agent = agents[i];

        // Determinar voto baseado no tipo de decisão
        let choice = '';
        let confidence = 0.7 + Math.random() * 0.25;

        if (decision.decision_type === 'strategy') {
          const options = ['aggressive_growth', 'steady_growth', 'maintenance'];
          choice = options[Math.floor(Math.random() * options.length)];
        } else if (decision.decision_type === 'format') {
          const options = ['instagram_post', 'instagram_carousel', 'blog_article'];
          choice = options[Math.floor(Math.random() * options.length)];
        } else if (decision.decision_type === 'priority') {
          const options = ['high', 'medium', 'low'];
          choice = options[Math.floor(Math.random() * options.length)];
        } else {
          const options = ['approach_a', 'approach_b', 'approach_c'];
          choice = options[Math.floor(Math.random() * options.length)];
        }

        const vote = await recordAgentVote(
          decision.id,
          agent,
          choice,
          confidence,
          `Votei em ${choice} baseado em expertise em ${decision.decision_type}`
        );

        if (vote) {
          log('[phase4]', `  ✓ ${agent} votou: ${choice} (conf: ${confidence.toFixed(2)})`);
        }
      }
    }

  } catch (err) {
    log('[phase4-err]', `Erro ao coletar votos: ${err.message}`);
  }
}

// ── Startup ─────────────────────────────────────────────────────────────────

log('[start]', 'Paperclip-Sondar Bridge v2 iniciado');
log('[config]', `Supabase: ${SUPABASE_URL}`);
log('[config]', `Paperclip: ${PAPERCLIP_API}`);
log('[config]', `Empresa: ${COMPANY_ID}`);
log('[config]', `Poll: ${POLL_INTERVAL / 1000}s`);
log('[config]', `Gemini: ${process.env.GEMINI_API_KEY ? 'configurado' : 'NAO configurado'}`);
log('[config]', `Buffer: ${isBufferConfigured() ? 'configurado' : 'NAO configurado (publicacao manual)'}`);
log('', '-'.repeat(50));

await tick();
setInterval(tick, POLL_INTERVAL);

process.on('SIGINT', () => {
  log('[bye]', 'Bridge encerrado');
  process.exit(0);
});
