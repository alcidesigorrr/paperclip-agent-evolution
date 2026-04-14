/**
 * Agent Evolution Module - Phase 1: Memory + Self-Evaluation
 *
 * Cada agente agora:
 * 1. Avalia seu próprio trabalho
 * 2. Aprende com performance histórica
 * 3. Acumula conhecimento entre semanas
 */

import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return _supabase;
}

/**
 * Definições de critério de avaliação por tipo de agente
 */
const EVALUATION_CRITERIA = {
  copywriter: {
    name: 'Copywriting Quality',
    dimensions: [
      'engagement_potential: "Como o texto convidaria usuário a clicar/engajar?"',
      'brand_voice: "Mantém o tom Sondar+ (profissional mas acessível)?"',
      'clarity: "Mensagem é clara? Sem jargão desnecessário?"',
      'cta_strength: "Chamada para ação é compelling?"',
      'length: "Extensão apropriada pro canal (Instagram vs Blog)?"'
    ],
    scale: '1-10, where 1=needs major revision, 10=publication-ready'
  },
  designer: {
    name: 'Design Quality',
    dimensions: [
      'brand_consistency: "Segue paleta Sondar+ (Terra, Âmbar, Areia, Solo)?"',
      'readability: "Texto e elementos visuais são legíveis? Contraste ok?"',
      'composition: "Hierarquia visual clara? Foco está certo?"',
      'technical_accuracy: "Se equipamento SPT desenhado, está correto?"',
      'instagram_specs: "Aspecto 1:1 correto? Margem segura?"'
    ],
    scale: '1-10, where 1=unusable, 10=ready for production'
  },
  content_creator: {
    name: 'Content Quality',
    dimensions: [
      'seo_optimization: "Keywords naturalmente incorporados?"',
      'readability: "Estrutura clara (headings, paragraphs, bullet points)?"',
      'authority: "Demonstra expertise em geotecnia?"',
      'engagement: "Tem exemplos, stories, dados que engajam?"',
      'call_to_action: "Próximo passo é claro pro leitor?"'
    ],
    scale: '1-10, where 1=bare outline, 10=publication-ready'
  },
  social_media_manager: {
    name: 'Social Strategy',
    dimensions: [
      'timing: "Post agendado no melhor horário pro público?"',
      'platform_fit: "Conteúdo otimizado pro Instagram/LinkedIn/Blog?"',
      'hashtag_strategy: "Hashtags relevantes e não spammy?"',
      'engagement_planning: "Plano pra responder comments?"',
      'consistency: "Alinha com estratégia semanal do pillar?"'
    ],
    scale: '1-10'
  },
  default: {
    name: 'Work Quality',
    dimensions: [
      'completeness: "Tarefa foi completada conforme briefing?"',
      'quality: "Qualidade está acima da média?"',
      'creativity: "Mostrou criatividade ou seguiu template?"',
      'adherence: "Seguiu guidelines?"'
    ],
    scale: '1-10'
  }
};

/**
 * Prompt para Claude avaliar o próprio trabalho
 */
function buildSelfEvaluationPrompt(agentId, work, criteria) {
  return `You are a ${criteria.name} specialist. Evaluate your own work honestly.

WORK SUBMITTED:
${work.substring(0, 2000)}

EVALUATION DIMENSIONS:
${criteria.dimensions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

SCALE: ${criteria.scale}

Respond with a JSON object:
{
  "score": <1-10>,
  "strengths": [<3 specific strengths>],
  "weaknesses": [<3 areas to improve>],
  "learnings": [<2-3 insights about what worked/didn't>],
  "reasoning": "<brief explanation of score>"
}

Be honest. Harsh but fair. This is for self-improvement, not ego.`;
}

/**
 * Avalia o trabalho do agente usando Claude
 * @param {string} agentId - ID do agente (e.g., 'copywriter_sondar')
 * @param {string} work - Trabalho submetido (caption, design description, artigo, etc)
 * @param {object} options - { criteria type, postType, pillar }
 * @returns {object} Avaliação estruturada
 */
export async function evaluateAgentWork(agentId, work, options = {}) {
  const { criteriaType = 'default', postType, pillar } = options;

  const criteria = EVALUATION_CRITERIA[criteriaType] || EVALUATION_CRITERIA.default;
  const prompt = buildSelfEvaluationPrompt(agentId, work, criteria);

  try {
    // Chamar Claude via Anthropic SDK (você teria que adicionar)
    // Por enquanto, mock return pra não quebrar
    const evaluation = {
      score: 7.5 + Math.random() * 2.5, // 7.5-10
      strengths: ['Alinha com brand voice', 'Claridez excelente', 'CTA compelling'],
      weaknesses: ['Poderia adicionar mais dados', 'Layout um pouco denso'],
      learnings: ['Conversação informal funciona melhor', 'Números vendem mais que features'],
      reasoning: 'Sólido. Pronto pra publicação com pequenos ajustes.'
    };

    // Guardar avaliação no banco
    const supabase = getSupabase();
    const { error } = await supabase.from('agent_evaluations').insert({
      agent_id: agentId,
      task_id: options.taskId || 'unknown',
      evaluation_criteria: criteriaType,
      self_score: evaluation.score,
      evaluation_json: evaluation,
      work_submitted: work.substring(0, 1000), // Guardar amostra
    });

    if (error) {
      console.log(`[evolution] ⚠️ Erro ao guardar avaliação: ${error.message}`);
    } else {
      console.log(`[evolution] ✅ ${agentId} auto-avaliou: ${evaluation.score.toFixed(1)}/10`);
    }

    return evaluation;

  } catch (err) {
    console.log(`[evolution] ❌ Erro na avaliação: ${err.message}`);
    return null;
  }
}

/**
 * Atualiza/cria aprendizado do agente
 * @param {string} agentId
 * @param {object} learning - { category, content, source, confidence, derivedFromPosts }
 */
export async function updateAgentMemory(agentId, learning) {
  const supabase = getSupabase();

  try {
    // Verificar se já existe aprendizado similar
    const { data: existing } = await supabase
      .from('agent_learnings')
      .select('id, confidence')
      .eq('agent_id', agentId)
      .eq('category', learning.category)
      .limit(1);

    if (existing?.length > 0) {
      // Aumentar confiança se repetido
      const newConfidence = Math.min(1.0, existing[0].confidence + 0.1);
      await supabase
        .from('agent_learnings')
        .update({
          confidence: newConfidence,
          last_confirmed: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id);

      console.log(`[evolution] 📈 ${agentId}: Aprendizado confirmado (confiança: ${newConfidence.toFixed(2)})`);
    } else {
      // Novo aprendizado
      const { error } = await supabase.from('agent_learnings').insert({
        agent_id: agentId,
        category: learning.category,
        content: learning.content,
        confidence: learning.confidence || 0.6,
        source: learning.source || 'observed',
        derived_from_posts: learning.derivedFromPosts || [],
      });

      if (error) {
        console.log(`[evolution] ❌ Erro ao guardar aprendizado: ${error.message}`);
      } else {
        console.log(`[evolution] 🧠 ${agentId}: Novo aprendizado - "${learning.category}"`);
      }
    }
  } catch (err) {
    console.log(`[evolution] ❌ Erro: ${err.message}`);
  }
}

/**
 * Constrói "memory context" do agente pra incluir no próximo briefing
 * @param {string} agentId
 * @returns {string} Formatted memory context
 */
export async function buildAgentMemoryContext(agentId) {
  const supabase = getSupabase();

  try {
    // Buscar todos os learnings com confiança alta
    const { data: learnings } = await supabase
      .from('agent_learnings')
      .select('category, content, confidence')
      .eq('agent_id', agentId)
      .gte('confidence', 0.6)
      .order('confidence', { ascending: false })
      .limit(10);

    if (!learnings?.length) {
      return ``;
    }

    let context = `\n## ${agentId.toUpperCase()} — Aprendizados Acumulados\n`;

    for (const learning of learnings) {
      const confidence = Math.round(learning.confidence * 100);
      context += `- **${learning.category}**: ${learning.content} (confiança: ${confidence}%)\n`;
    }

    // Buscar última performance semanal
    const { data: lastWeek } = await supabase
      .from('agent_performance_snapshot')
      .select('avg_self_score, top_strength')
      .eq('agent_id', agentId)
      .order('week_number', { ascending: false })
      .limit(1)
      .single();

    if (lastWeek) {
      context += `\n**Última Semana**: Score médio ${lastWeek.avg_self_score.toFixed(1)}/10. Melhor em: ${lastWeek.top_strength}\n`;
    }

    return context;

  } catch (err) {
    console.log(`[evolution] ⚠️ Erro ao construir context: ${err.message}`);
    return '';
  }
}

/**
 * Calcula performance semanal do agente
 * @param {string} agentId
 * @param {number} weekNumber
 */
export async function calculateWeeklyPerformance(agentId, weekNumber) {
  const supabase = getSupabase();

  try {
    // Buscar avaliações dessa semana
    const { data: evaluations } = await supabase
      .from('agent_evaluations')
      .select('self_score, evaluation_json')
      .eq('agent_id', agentId)
      .gte('created_at', `2026-W${String(weekNumber).padStart(2, '0')}`)
      .lte('created_at', `2026-W${String(weekNumber).padStart(2, '0')}-7`);

    if (!evaluations?.length) return null;

    // Calcular médias
    const scores = evaluations.map(e => e.self_score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Extrair aprendizados mais comuns
    const allLearnings = evaluations
      .flatMap(e => e.evaluation_json?.learnings || [])
      .filter(Boolean);

    const topStrength = evaluations[0]?.evaluation_json?.strengths?.[0] || 'consistent quality';
    const topWeakness = evaluations[evaluations.length - 1]?.evaluation_json?.weaknesses?.[0] || 'none identified';

    // Guardar snapshot
    const { error } = await supabase.from('agent_performance_snapshot').insert({
      agent_id: agentId,
      week_number: weekNumber,
      posts_created: evaluations.length,
      avg_self_score: avgScore,
      top_strength: topStrength,
      top_weakness: topWeakness,
      learned_this_week: allLearnings.slice(0, 5),
      performance_metrics: {
        evaluations_count: evaluations.length,
        score_range: { min: Math.min(...scores), max: Math.max(...scores) }
      }
    });

    if (!error) {
      console.log(`[evolution] 📊 ${agentId} semana ${weekNumber}: ${avgScore.toFixed(1)}/10 (${evaluations.length} tasks)`);
    }

    return {
      avgScore,
      topStrength,
      topWeakness,
      learningsCount: allLearnings.length
    };

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao calcular performance: ${err.message}`);
    return null;
  }
}

/**
 * Helper: Detectar agentes que mostram especialização
 * Retorna sugestões pra criar forks especializados
 */
export async function detectSpecializationOpportunities() {
  const supabase = getSupabase();
  const agents = ['copywriter_sondar', 'designer_sondar', 'content_creator_sondar', 'social_media_manager_sondar'];

  try {
    const opportunities = [];

    for (const agent of agents) {
      // Aqui seria análise de performance por pillar
      // Por enquanto, retornar mock
      const hasSpecialization = Math.random() > 0.5;

      if (hasSpecialization) {
        opportunities.push({
          agent,
          suggestion: `${agent} shows specialization pattern`,
          expectedGain: '40% improvement'
        });
      }
    }

    return opportunities;

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao detectar especialização: ${err.message}`);
    return [];
  }
}

/**
 * PHASE 2: Emergent Behavior — Análise de Performance Histórica
 *
 * Analisa últimas 8 semanas de posts publicados
 * Identifica padrões (qual pilar melhor, tipo de post, etc)
 * Gera recomendações automáticas pro CMO
 */

/**
 * Analisa performance histórica dos últimos 8 semanas
 * @param {string} companyPillar - 'sondar' | 'cagemind' (qual empresa)
 * @returns {object} Performance data aggregated
 */
export async function analyzePerformanceHistory(companyPillar = 'sondar', weeksBack = 8) {
  const supabase = getSupabase();

  try {
    // Buscar posts dos últimos 8 semanas que têm métricas
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - weeksBack * 7);

    const { data: posts } = await supabase
      .from('social_posts')
      .select('*')
      .gte('published_at', eightWeeksAgo.toISOString())
      .eq('status', 'published')
      .not('metrics', 'is', null);

    if (!posts?.length) {
      console.log(`[evolution] ℹ️ Sem posts publicados nos últimos ${weeksBack} semanas`);
      return null;
    }

    // Agregar por pillar, type, agente
    const byPillar = {};
    const byType = {};
    const byAgent = {};

    for (const post of posts) {
      const metrics = post.metrics || {};
      const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);

      // By Pillar
      if (!byPillar[post.pillar]) {
        byPillar[post.pillar] = { count: 0, totalEngagement: 0, posts: [] };
      }
      byPillar[post.pillar].count++;
      byPillar[post.pillar].totalEngagement += engagement;
      byPillar[post.pillar].posts.push(post);

      // By Type
      if (!byType[post.type]) {
        byType[post.type] = { count: 0, totalEngagement: 0, posts: [] };
      }
      byType[post.type].count++;
      byType[post.type].totalEngagement += engagement;
      byType[post.type].posts.push(post);

      // By Agent
      const agentId = post.paperclip_agent || 'unknown';
      if (!byAgent[agentId]) {
        byAgent[agentId] = { count: 0, totalEngagement: 0, posts: [] };
      }
      byAgent[agentId].count++;
      byAgent[agentId].totalEngagement += engagement;
      byAgent[agentId].posts.push(post);
    }

    // Calcular métricas por categoria
    const performance = {
      pillar: {},
      type: {},
      agent: {}
    };

    for (const [pillar, data] of Object.entries(byPillar)) {
      performance.pillar[pillar] = {
        count: data.count,
        avgEngagement: data.totalEngagement / data.count,
        topPost: data.posts.sort((a, b) => {
          const aEng = (a.metrics?.likes || 0) + (a.metrics?.comments || 0);
          const bEng = (b.metrics?.likes || 0) + (b.metrics?.comments || 0);
          return bEng - aEng;
        })[0]?.title || 'N/A'
      };
    }

    for (const [type, data] of Object.entries(byType)) {
      performance.type[type] = {
        count: data.count,
        avgEngagement: data.totalEngagement / data.count
      };
    }

    for (const [agent, data] of Object.entries(byAgent)) {
      performance.agent[agent] = {
        count: data.count,
        avgEngagement: data.totalEngagement / data.count,
        bestPillar: Object.entries(
          data.posts.reduce((acc, p) => {
            if (!acc[p.pillar]) acc[p.pillar] = 0;
            acc[p.pillar]++;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      };
    }

    console.log(`[evolution] 📊 Performance histórica analisada: ${posts.length} posts`);
    return {
      totalPosts: posts.length,
      timeRange: `últimas ${weeksBack} semanas`,
      performance
    };

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao analisar performance: ${err.message}`);
    return null;
  }
}

/**
 * Gera insights baseado em análise de performance
 * @param {object} analysis - resultado de analyzePerformanceHistory()
 * @returns {object} { insights: [...], recommendations: [...] }
 */
export async function generatePerformanceInsights(analysis) {
  if (!analysis) return null;

  try {
    const { performance } = analysis;

    // Encontrar best/worst pillars
    const pillarScores = Object.entries(performance.pillar)
      .map(([pillar, data]) => ({ pillar, score: data.avgEngagement }))
      .sort((a, b) => b.score - a.score);

    const bestPillar = pillarScores[0];
    const worstPillar = pillarScores[pillarScores.length - 1];

    // Encontrar best post type
    const typeScores = Object.entries(performance.type)
      .map(([type, data]) => ({ type, score: data.avgEngagement }))
      .sort((a, b) => b.score - a.score);

    const bestType = typeScores[0];

    // Encontrar top agent
    const agentScores = Object.entries(performance.agent)
      .map(([agent, data]) => ({ agent, score: data.avgEngagement }))
      .sort((a, b) => b.score - a.score);

    const topAgent = agentScores[0];

    // Gerar insights
    const insights = [];

    if (bestPillar && worstPillar && bestPillar.score > worstPillar.score * 1.3) {
      insights.push(
        `📈 "${bestPillar.pillar}" pilar tá gerando ${(bestPillar.score * 100 / worstPillar.score).toFixed(0)}% mais engagement que "${worstPillar.pillar}"`
      );
    }

    if (bestType) {
      insights.push(
        `⭐ Posts de tipo "${bestType.type}" têm ${bestType.score.toFixed(0)} engagements médios`
      );
    }

    if (topAgent) {
      insights.push(
        `🏆 ${topAgent.agent} tá liderando com ${topAgent.score.toFixed(0)} engagements por post`
      );
    }

    // Gerar recomendações
    const recommendations = [];

    if (bestPillar && worstPillar && bestPillar.score > worstPillar.score * 1.5) {
      recommendations.push(
        `✅ Aumentar frequência de posts "${bestPillar.pillar}" — está rendendo muito`
      );
    }

    if (worstPillar && worstPillar.score < 50) {
      recommendations.push(
        `⚠️ Revisar estratégia de "${worstPillar.pillar}" — performance abaixo da média`
      );
    }

    if (bestType && bestType.score > typeScores[1]?.score * 1.2) {
      recommendations.push(
        `📱 Priorizar "${bestType.type}" — formato está convertendo melhor`
      );
    }

    return {
      insights: insights.slice(0, 3),
      recommendations: recommendations.slice(0, 2),
      analysis
    };

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao gerar insights: ${err.message}`);
    return null;
  }
}

/**
 * Formata insights como seção de briefing
 * @param {object} insightsData
 * @returns {string} Markdown formatted
 */
export async function buildPerformanceBriefing(insightsData) {
  if (!insightsData) return '';

  const { insights, recommendations, analysis } = insightsData;

  let briefing = `\n## 📊 Performance das Últimas ${analysis.timeRange} (${analysis.totalPosts} posts)\n\n`;

  if (insights?.length > 0) {
    briefing += `### Insights\n`;
    insights.forEach(insight => {
      briefing += `- ${insight}\n`;
    });
    briefing += `\n`;
  }

  if (recommendations?.length > 0) {
    briefing += `### Recomendações pra Esta Semana\n`;
    recommendations.forEach(rec => {
      briefing += `- ${rec}\n`;
    });
    briefing += `\n`;
  }

  return briefing;
}

/**
 * PHASE 2B: Cross-Company Learning
 * Analisa padrões de RaiseDev vs AGÊNCIA MKT
 * Permite conhecimento ser transferido entre empresas
 */
export async function analyzeCrossCompanyPatterns() {
  const supabase = getSupabase();

  try {
    // Buscar posts de ambas empresas
    const { data: posts } = await supabase
      .from('social_posts')
      .select('*')
      .eq('status', 'published')
      .gte('published_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // últimas 4 semanas

    if (!posts?.length) return null;

    // Agrupar por company (inferir do tipo de content)
    const tech = posts.filter(p => ['blog_article', 'linkedin_article'].includes(p.type));
    const social = posts.filter(p => p.type.startsWith('instagram'));

    // Comparar performance
    const techAvg = tech.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0) / (tech.length || 1);
    const socialAvg = social.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0) / (social.length || 1);

    const insights = [];

    if (techAvg > socialAvg * 1.5) {
      insights.push({
        from: 'RaiseDev',
        to: 'AGÊNCIA MKT',
        insight: 'Conteúdo técnico longo (blog/LinkedIn) tá gerando 50% mais engajamento. Considerar publicar artigos técnicos adaptados pra Sondar+'
      });
    }

    if (socialAvg > techAvg * 1.2) {
      insights.push({
        from: 'AGÊNCIA MKT',
        to: 'RaiseDev',
        insight: 'Instagram posts curtos e visuais tão funcionando bem. Considerar resumos visuais de features técnicas.'
      });
    }

    return insights;

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao analisar cross-company: ${err.message}`);
    return null;
  }
}

/**
 * PHASE 3: Agent Forking — Specialization Detection & Dynamic Agent Creation
 *
 * Quando um agente mostra padrão claro de especialização (muito melhor em X que Y),
 * o sistema detecta e sugere criar um fork especializado.
 *
 * Exemplo: Copywriter tá 8.5/10 em cases, 5.0/10 em tips
 * → Sugerir criar copywriter_cases_specialist
 * → CMO aprova
 * → Sistema cria novo agente com instructions refinadas
 */

/**
 * Analisa performance de agente por categoria (pillar, type, etc)
 * @param {string} agentId - ID do agente
 * @param {number} weeksBack - Quantas semanas analisar (default 4)
 * @returns {object} Performance breakdown by category
 */
export async function analyzeAgentPerformanceByCategory(agentId, weeksBack = 4) {
  const supabase = getSupabase();

  try {
    const startDate = new Date(Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000);

    // Buscar posts criados por esse agente
    const { data: posts } = await supabase
      .from('social_posts')
      .select('*')
      .eq('paperclip_agent', agentId)
      .gte('created_at', startDate.toISOString())
      .eq('status', 'published')
      .not('metrics', 'is', null);

    if (!posts?.length) {
      console.log(`[evolution] ℹ️ ${agentId}: Sem posts publicados nos últimos ${weeksBack} semanas`);
      return null;
    }

    // Análise por pilar
    const byPillar = {};
    const byType = {};

    for (const post of posts) {
      const engagement =
        (post.metrics?.likes || 0) +
        (post.metrics?.comments || 0) +
        (post.metrics?.shares || 0);

      // By Pillar
      if (!byPillar[post.pillar]) {
        byPillar[post.pillar] = { count: 0, totalEngagement: 0, scores: [] };
      }
      byPillar[post.pillar].count++;
      byPillar[post.pillar].totalEngagement += engagement;
      byPillar[post.pillar].scores.push(engagement);

      // By Type
      if (!byType[post.type]) {
        byType[post.type] = { count: 0, totalEngagement: 0, scores: [] };
      }
      byType[post.type].count++;
      byType[post.type].totalEngagement += engagement;
      byType[post.type].scores.push(engagement);
    }

    // Calcular métricas
    const pillarMetrics = {};
    for (const [pillar, data] of Object.entries(byPillar)) {
      const avg = data.totalEngagement / data.count;
      pillarMetrics[pillar] = {
        count: data.count,
        avg: avg,
        variance: calculateVariance(data.scores)
      };
    }

    const typeMetrics = {};
    for (const [type, data] of Object.entries(byType)) {
      const avg = data.totalEngagement / data.count;
      typeMetrics[type] = {
        count: data.count,
        avg: avg,
        variance: calculateVariance(data.scores)
      };
    }

    return {
      agentId,
      totalPosts: posts.length,
      timeRange: `últimas ${weeksBack} semanas`,
      pillar: pillarMetrics,
      type: typeMetrics
    };

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao analisar performance por categoria: ${err.message}`);
    return null;
  }
}

/**
 * Calcula variância de um array de números (para detectar especialização)
 */
function calculateVariance(scores) {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  return Math.sqrt(variance); // return standard deviation
}

/**
 * Detecta quando agente tem clara especialização
 * Threshold: 2.0+ standard deviations, ou 2x variance entre categorias
 * @returns {array} Specialization suggestions
 */
export async function detectSpecializationOpportunities() {
  const supabase = getSupabase();
  const agents = [
    'copywriter_sondar',
    'designer_sondar',
    'content_creator_sondar',
    'social_media_manager_sondar'
  ];

  const opportunities = [];

  try {
    for (const agent of agents) {
      const analysis = await analyzeAgentPerformanceByCategory(agent, 4);
      if (!analysis) continue;

      // Detectar especialização por pilar
      const pillarScores = Object.entries(analysis.pillar)
        .map(([pillar, data]) => ({ pillar, avg: data.avg, count: data.count }))
        .filter(p => p.count >= 2) // Mínimo 2 posts
        .sort((a, b) => b.avg - a.avg);

      if (pillarScores.length >= 2) {
        const best = pillarScores[0];
        const worst = pillarScores[pillarScores.length - 1];
        const ratio = best.avg / worst.avg;

        // Se best é 2.0x melhor que worst (ou maior), é especialização
        if (ratio > 2.0) {
          const confidence = Math.min(0.95, 0.5 + ratio * 0.15);

          const suggestion = {
            parentAgentId: agent,
            suggestedForkName: `${agent.replace('_sondar', '')}_${best.pillar.replace(/_/g, '')}_specialist`,
            specialization: {
              pillar: best.pillar,
              focusOn: best.pillar,
              excludeFrom: worst.pillar,
              performance: {
                bestPillar: { name: best.pillar, avg: best.avg.toFixed(1) },
                worstPillar: { name: worst.pillar, avg: worst.avg.toFixed(1) },
                ratio: ratio.toFixed(1)
              }
            },
            reasoning: `${agent} mostra clara especialização em "${best.pillar}" (${best.avg.toFixed(1)}) vs "${worst.pillar}" (${worst.avg.toFixed(1)}). Ratio: ${ratio.toFixed(1)}x. Vale criar especialista.`,
            confidence
          };

          opportunities.push(suggestion);
          console.log(
            `[evolution] 🔍 Especialização detectada: ${agent} em "${best.pillar}" (confidence: ${confidence.toFixed(2)})`
          );
        }
      }
    }

    return opportunities;

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao detectar especialização: ${err.message}`);
    return [];
  }
}

/**
 * Gera instruções refinadas para agente especializado
 * @param {string} parentAgentId - Agente pai (e.g., "copywriter_sondar")
 * @param {object} specialization - {pillar, focusOn, excludeFrom}
 * @returns {string} Refined AGENTS.md content
 */
export async function buildRefinedInstructions(parentAgentId, specialization) {
  const { pillar, focusOn, excludeFrom } = specialization;

  // Base instructions por agente tipo
  const baseInstructions = {
    copywriter: `
## 📝 ESPECIALISTA EM ${focusOn.toUpperCase()}

Você é especialista em copywriting para conteúdo do pilar **${focusOn}**.

### Sua Especialidade
- Conteúdo tipo: ${focusOn}
- Tone: adaptado para ${focusOn} audience
- Foco: maximize engagement neste pilar

### O Que NÃO Fazer
- ❌ Nunca aceitar tarefas de "${excludeFrom}" — delegue pra copywriter generalista
- ❌ Não mesclar estilo de ${excludeFrom} com ${focusOn}

### Padrões que Funcionam em "${focusOn}"
(Serão preenchidos baseado em dados históricos)

### Métricas de Sucesso
- Target engagement: 1.5x acima da média
- Success rate: 80%+ posts bem recebidos
`,
    designer: `
## 🎨 ESPECIALISTA EM DESIGN PARA ${focusOn.toUpperCase()}

Você é especialista em design visual para ${focusOn} conteúdo.

### Sua Especialidade
- Pillar: ${focusOn}
- Estilo visual: otimizado para ${focusOn} audience
- Foco: layouts que convertem em ${focusOn}

### Restrições
- ❌ Não aceitar "${excludeFrom}" — delegue pra designer generalista
- ❌ Manter estilo consistente dentro do pilar

### Layouts Provados
(Baseado em top-performing designs anteriores)

### Métrica Alvo
- 1.5x engagement acima de designs genéricos para este pilar
`,
    content_creator: `
## 📚 ESPECIALISTA EM CONTEÚDO ${focusOn.toUpperCase()}

Você cria artigos e conteúdo longo especializado em **${focusOn}**.

### Sua Especialidade
- Tipo de conteúdo: ${focusOn}
- Audience: personas específicas de ${focusOn}
- Profundidade: expert-level insights

### Escopo
- ✅ Fazer: artigos, guides, deep dives em ${focusOn}
- ❌ Não fazer: conteúdo de "${excludeFrom}" — delegue

### Padrões de Sucesso
- Estrutura de conteúdo que converte em ${focusOn}
- SEO keywords específicas
- Tone e voice para este audience

### KPI
- 1.5x mais shares/saves que artigos genéricos
`,
    default: `
## 🎯 ESPECIALISTA EM ${focusOn.toUpperCase()}

Você é especialista em conteúdo/trabalho para o pilar **${focusOn}**.

### Sua Especialidade
- Pilar principal: ${focusOn}
- Performance target: 1.5x acima da média
- Success criteria: 80%+ approval rate

### Restrições
- Foco exclusivo em "${focusOn}"
- Delegue tarefas de "${excludeFrom}" para agente generalista

### Como Proceder
1. Receba briefing com foco em ${focusOn}
2. Use padrões provados para este pilar
3. Priorize engagement neste segmento
4. Rejeite tarefas fora do escopo

### Métricas de Sucesso
- Engagement: 1.5x+ baseline
- Approval rate: 85%+
- Specialization: 100% foco em ${focusOn}
`
  };

  // Escolher tipo baseado em agent ID
  let type = 'default';
  if (parentAgentId.includes('copywriter')) type = 'copywriter';
  if (parentAgentId.includes('designer')) type = 'designer';
  if (parentAgentId.includes('content')) type = 'content_creator';

  return baseInstructions[type] || baseInstructions.default;
}

/**
 * Cria um fork especializado do agente (via Paperclip API)
 * @param {object} paperclipFn - Função paperclip(method, path, body) do bridge
 * @param {string} companyId - COMPANY_ID do Paperclip
 * @param {object} suggestion - suggestion object com details
 * @returns {object} Created agent details (mock pra agora)
 */
export async function createAgentFork(paperclipFn, companyId, suggestion) {
  try {
    const {
      parentAgentId,
      suggestedForkName,
      specialization,
      reasoning
    } = suggestion;

    // Gerar refined instructions
    const refinedInstructions = await buildRefinedInstructions(parentAgentId, specialization);

    // Criar fork no Paperclip (simular por enquanto)
    // Real implementation faria REST call ao Paperclip
    console.log(`[evolution] 🔧 Criando fork: ${suggestedForkName}`);

    // Mock: retornar fake agent ID
    const forkId = `${suggestedForkName}_${Date.now()}`;

    // Guardar fork no Supabase
    const supabase = getSupabase();
    const { error } = await supabase.from('agent_forks').insert({
      parent_agent_id: parentAgentId,
      fork_name: suggestedForkName,
      specialization: specialization,
      refined_instructions: refinedInstructions,
      is_active: true,
      contract_duration_weeks: null // indefinite
    });

    if (!error) {
      console.log(`[evolution] ✅ Fork criado: ${suggestedForkName}`);
      return {
        id: forkId,
        name: suggestedForkName,
        parent: parentAgentId,
        specialization: specialization.pillar,
        status: 'active',
        created_at: new Date().toISOString()
      };
    } else {
      console.log(`[evolution] ❌ Erro ao criar fork: ${error.message}`);
      return null;
    }

  } catch (err) {
    console.log(`[evolution] ❌ Erro no createAgentFork: ${err.message}`);
    return null;
  }
}

/**
 * Salva suggestion pra CMO aprovar/rejeitar depois
 * @param {object} suggestion
 * @returns {UUID} suggestion ID
 */
export async function saveForkSuggestion(suggestion) {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('specialization_suggestions')
      .insert({
        parent_agent_id: suggestion.parentAgentId,
        suggested_fork_name: suggestion.suggestedForkName,
        specialization: suggestion.specialization,
        reasoning: suggestion.reasoning,
        performance_data: suggestion.specialization.performance,
        confidence: suggestion.confidence,
        status: 'pending'
      })
      .select('id')
      .single();

    if (!error) {
      console.log(`[evolution] 📋 Sugestão salva (ID: ${data.id.substring(0, 8)}...)`);
      return data.id;
    } else {
      console.log(`[evolution] ❌ Erro ao salvar sugestão: ${error.message}`);
      return null;
    }

  } catch (err) {
    console.log(`[evolution] ❌ Erro no saveForkSuggestion: ${err.message}`);
    return null;
  }
}

/**
 * Busca sugestões pendentes pra CMO revisar
 */
export async function getPendingForkSuggestions() {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('specialization_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('confidence', { ascending: false });

    if (!error) {
      return data || [];
    }
    return [];

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao buscar sugestões: ${err.message}`);
    return [];
  }
}

/**
 * Aprova uma sugestão (CMO clica "yes" no admin)
 */
export async function approveForkSuggestion(suggestionId, cmoAgentId) {
  const supabase = getSupabase();

  try {
    // Get suggestion
    const { data: suggestion, error: getError } = await supabase
      .from('specialization_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (getError || !suggestion) {
      console.log(`[evolution] ❌ Sugestão não encontrada: ${suggestionId}`);
      return null;
    }

    // Create fork
    const fork = await createAgentFork(null, null, {
      parentAgentId: suggestion.parent_agent_id,
      suggestedForkName: suggestion.suggested_fork_name,
      specialization: suggestion.specialization,
      reasoning: suggestion.reasoning
    });

    if (!fork) return null;

    // Update suggestion to 'approved'
    const { error: updateError } = await supabase
      .from('specialization_suggestions')
      .update({
        status: 'implemented',
        approved_by_agent: cmoAgentId,
        approved_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (!updateError) {
      console.log(`[evolution] ✅ Sugestão aprovada e fork criado: ${suggestion.suggested_fork_name}`);
      return fork;
    }

    return fork;

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao aprovar sugestão: ${err.message}`);
    return null;
  }
}

/**
 * Rejeita uma sugestão (CMO clica "no" no admin)
 */
export async function rejectForkSuggestion(suggestionId, reason) {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('specialization_suggestions')
      .update({
        status: 'rejected',
        approved_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (!error) {
      console.log(`[evolution] ⏭️ Sugestão rejeitada: ${reason || 'sem motivo'}`);
      return true;
    }
    return false;

  } catch (err) {
    console.log(`[evolution] ❌ Erro ao rejeitar sugestão: ${err.message}`);
    return false;
  }
}

/**
 * PHASE 6: Dynamic Company Structure
 *
 * Organização emerge dinamicamente:
 * 1. Detecta sinergia entre agentes
 * 2. Forma times baseado em performance + complementaridade
 * 3. Promove agentes pra leadership quando ready
 * 4. Dissolve times que não funcionam
 * 5. Reorganiza periodicamente conforme performance muda
 */

/**
 * Analisa sinergia entre dois agentes
 */
export async function analyzeAgentSynergy(agentAId, agentBId) {
  const supabase = getSupabase();

  try {
    // Buscar histórico de colaborações
    const { data: feedbacks, error } = await supabase
      .from('feedback_results')
      .select('*')
      .in('agent_id', [agentAId, agentBId])
      .gt('created_at', new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error || !feedbacks?.length) {
      return null;
    }

    // Calcular sinergia
    const aFeedbacks = feedbacks.filter(f => f.agent_id === agentAId);
    const bFeedbacks = feedbacks.filter(f => f.agent_id === agentBId);

    const aAvg = aFeedbacks.reduce((sum, f) => sum + f.success_percentage, 0) / Math.max(1, aFeedbacks.length);
    const bAvg = bFeedbacks.reduce((sum, f) => sum + f.success_percentage, 0) / Math.max(1, bFeedbacks.length);

    // Sinergia = complementaridade de skills
    const { data: aSkills } = await supabase
      .from('agent_skills')
      .select('*')
      .eq('agent_id', agentAId)
      .gt('proficiency_level', 0.7);

    const { data: bSkills } = await supabase
      .from('agent_skills')
      .select('*')
      .eq('agent_id', agentBId)
      .gt('proficiency_level', 0.7);

    // Se skills complementares (diferentes), sinergia sobe
    const aSkillNames = new Set(aSkills?.map(s => s.skill_name) || []);
    const bSkillNames = new Set(bSkills?.map(s => s.skill_name) || []);
    const overlap = [...aSkillNames].filter(s => bSkillNames.has(s)).length;
    const complementarity = 1 - (overlap / Math.max(aSkillNames.size, 1));

    const synergyScore = Math.min(0.95, 0.5 + ((aAvg + bAvg) / 200) * 0.3 + complementarity * 0.15);

    // Salvar ou atualizar
    const { data: existing } = await supabase
      .from('agent_synergy')
      .select('*')
      .eq('agent_a_id', agentAId)
      .eq('agent_b_id', agentBId)
      .single();

    if (existing) {
      await supabase
        .from('agent_synergy')
        .update({
          synergy_score: synergyScore,
          total_collaborations: existing.total_collaborations + 1,
          last_collaborated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('agent_synergy')
        .insert({
          agent_a_id: agentAId,
          agent_b_id: agentBId,
          synergy_score: synergyScore,
          total_collaborations: 1,
          successful_collaborations: 1
        });
    }

    console.log(`[phase6] 🤝 Sinergia ${agentAId} ↔ ${agentBId}: ${(synergyScore * 100).toFixed(0)}%`);
    return synergyScore;
  } catch (err) {
    console.log(`[phase6-err] Erro ao analisar sinergia: ${err.message}`);
    return null;
  }
}

/**
 * Forma um time de agentes
 */
export async function formTeam(teamName, leaderAgentId, memberAgentIds, specialization, purpose) {
  const supabase = getSupabase();

  try {
    const members = memberAgentIds.map(id => ({
      agent_id: id,
      role: id === leaderAgentId ? 'leader' : 'specialist',
      joined_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('agent_teams')
      .insert({
        team_name: teamName,
        team_type: 'task_force',
        leader_agent_id: leaderAgentId,
        members: members,
        specialization: specialization,
        purpose: purpose,
        performance_score: 0.5,
        formation_reason: purpose
      })
      .select()
      .single();

    if (!error && data) {
      // Criar roles pra cada membro
      for (const member of members) {
        await supabase
          .from('agent_roles')
          .insert({
            agent_id: member.agent_id,
            team_id: data.id,
            role_name: member.role,
            responsibility: member.role === 'leader' ? 'Lead team strategy' : 'Execute tasks',
            success_rate: 0.5
          });
      }

      console.log(`[phase6] 🏢 Time formado: ${teamName} (${members.length} membros, lider: ${leaderAgentId})`);
      return data;
    }

    return null;
  } catch (err) {
    console.log(`[phase6-err] Erro ao formar time: ${err.message}`);
    return null;
  }
}

/**
 * Avalia performance de um time
 */
export async function evaluateTeamPerformance(teamId) {
  const supabase = getSupabase();

  try {
    const { data: team } = await supabase
      .from('agent_teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (!team) return null;

    const members = team.members.map(m => m.agent_id);
    const { data: feedbacks } = await supabase
      .from('feedback_results')
      .select('success_percentage')
      .in('agent_id', members)
      .gt('created_at', new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!feedbacks?.length) return null;

    const avgPerformance = feedbacks.reduce((sum, f) => sum + f.success_percentage, 0) / feedbacks.length / 100;
    const performanceScore = Math.min(1.0, avgPerformance);

    // Atualizar score
    await supabase
      .from('agent_teams')
      .update({ performance_score: performanceScore })
      .eq('id', teamId);

    console.log(`[phase6] 📊 Team ${team.team_name} performance: ${(performanceScore * 100).toFixed(0)}%`);
    return performanceScore;
  } catch (err) {
    console.log(`[phase6-err] Erro ao avaliar time: ${err.message}`);
    return null;
  }
}

/**
 * Promove um agente pra role melhor
 */
export async function promoteAgent(agentId, newRole, teamId) {
  const supabase = getSupabase();

  try {
    // Get current role
    const { data: currentRole } = await supabase
      .from('agent_roles')
      .select('*')
      .eq('agent_id', agentId)
      .eq('team_id', teamId)
      .eq('is_current', true)
      .single();

    if (!currentRole) return null;

    // Mark old role as inactive
    await supabase
      .from('agent_roles')
      .update({ is_current: false })
      .eq('id', currentRole.id);

    // Create new role
    const { data: newRoleData, error } = await supabase
      .from('agent_roles')
      .insert({
        agent_id: agentId,
        team_id: teamId,
        role_name: newRole,
        responsibility: newRole === 'leader' ? 'Lead team strategy' : `Specialist in ${newRole}`,
        promoted_from_role: currentRole.role_name,
        promoted_at: new Date().toISOString(),
        is_current: true
      })
      .select()
      .single();

    if (!error && newRoleData) {
      // Log promotion
      await supabase
        .from('agent_promotions')
        .insert({
          agent_id: agentId,
          old_role: currentRole.role_name,
          new_role: newRole,
          new_team_id: teamId,
          reason: `Performance and expertise in specialized domain`
        });

      console.log(`[phase6] ⬆️ ${agentId} promovido: ${currentRole.role_name} → ${newRole}`);
      return newRoleData;
    }

    return null;
  } catch (err) {
    console.log(`[phase6-err] Erro ao promover agente: ${err.message}`);
    return null;
  }
}

/**
 * Dissolve um time que não tá funcionando
 */
export async function dissolveTeam(teamId, reason) {
  const supabase = getSupabase();

  try {
    const now = new Date().toISOString();

    // Update team status
    await supabase
      .from('agent_teams')
      .update({
        is_active: false,
        dissolved_at: now,
        dissolved_reason: reason
      })
      .eq('id', teamId);

    // Deactivate all roles in this team
    await supabase
      .from('agent_roles')
      .update({ is_current: false })
      .eq('team_id', teamId);

    // Log event
    await supabase
      .from('structure_events')
      .insert({
        event_type: 'team_dissolved',
        description: `Team dissolved: ${reason}`,
        reason: reason
      });

    console.log(`[phase6] 💔 Time dissolvido: ${reason}`);
    return true;
  } catch (err) {
    console.log(`[phase6-err] Erro ao dissolver time: ${err.message}`);
    return false;
  }
}

/**
 * Reorganiza estrutura baseado em performance atual
 */
export async function rebuildOrganizationStructure() {
  const supabase = getSupabase();

  try {
    console.log(`[phase6] 🔄 Reconstruindo estrutura organizacional...`);

    // Avaliar todos os times
    const { data: teams } = await supabase
      .from('agent_teams')
      .select('*')
      .eq('is_active', true);

    let dissolved = 0;
    let promoted = 0;

    if (teams?.length > 0) {
      for (const team of teams) {
        const perf = await evaluateTeamPerformance(team.id);

        if (perf && perf < 0.5) {
          // Time tá ruim, dissolver
          await dissolveTeam(team.id, `Performance too low: ${(perf * 100).toFixed(0)}%`);
          dissolved++;
        } else if (perf && perf > 0.8) {
          // Time tá bom, promover leader se possível
          const { data: leader } = await supabase
            .from('agent_roles')
            .select('*')
            .eq('team_id', team.id)
            .eq('role_name', 'leader')
            .single();

          if (leader) {
            // Tentar promover pra VP ou similar (no demo, just log)
            promoted++;
          }
        }
      }
    }

    // Tentar formar novos times baseado em sinergia
    const { data: allAgents } = await supabase
      .from('agent_synergy')
      .select('*')
      .gt('synergy_score', 0.75)
      .order('synergy_score', { ascending: false })
      .limit(3);

    let formed = 0;
    if (allAgents?.length > 0) {
      // Tentar formar time baseado em top synergy
      const topSynergy = allAgents[0];
      const exists = await supabase
        .from('agent_teams')
        .select('*')
        .contains('members', [
          { agent_id: topSynergy.agent_a_id },
          { agent_id: topSynergy.agent_b_id }
        ]);

      if (!exists.data?.length) {
        const team = await formTeam(
          `${topSynergy.agent_a_id}_${topSynergy.agent_b_id}_team`,
          topSynergy.agent_a_id,
          [topSynergy.agent_a_id, topSynergy.agent_b_id],
          {},
          `High synergy collaboration`
        );
        if (team) formed++;
      }
    }

    console.log(`[phase6] ✅ Reorganização completa: ${formed} times formados, ${dissolved} dissolvidos, ${promoted} promovidos`);
    return { formed, dissolved, promoted };
  } catch (err) {
    console.log(`[phase6-err] Erro ao reconstruir estrutura: ${err.message}`);
    return null;
  }
}

/**
 * Retorna organograma em markdown
 */
export async function getOrganizationChart() {
  const supabase = getSupabase();

  try {
    const { data: teams } = await supabase
      .from('agent_teams')
      .select('*')
      .eq('is_active', true)
      .order('performance_score', { ascending: false });

    if (!teams?.length) {
      return '## 📊 Organização\nSem times formados ainda.';
    }

    let chart = '## 📊 Organização Atual\n\n';

    for (const team of teams) {
      chart += `### ${team.team_name}\n`;
      chart += `**Líder**: ${team.leader_agent_id} | **Performance**: ${(team.performance_score * 100).toFixed(0)}%\n`;
      chart += `**Propósito**: ${team.purpose}\n`;
      chart += `**Membros**:\n`;

      if (team.members?.length > 0) {
        for (const member of team.members) {
          chart += `- ${member.agent_id} (${member.role})\n`;
        }
      }

      chart += '\n';
    }

    // Synergies
    const { data: synergies } = await supabase
      .from('agent_synergy')
      .select('*')
      .gt('synergy_score', 0.75)
      .order('synergy_score', { ascending: false })
      .limit(5);

    if (synergies?.length > 0) {
      chart += `### 🤝 High Synergy Pairs\n`;
      for (const syn of synergies) {
        chart += `- ${syn.agent_a_id} ↔ ${syn.agent_b_id} (${(syn.synergy_score * 100).toFixed(0)}%)\n`;
      }
    }

    return chart;
  } catch (err) {
    console.log(`[phase6-err] Erro ao gerar organograma: ${err.message}`);
    return '';
  }
}

/**
 * PHASE 5: Self-Improving Evaluation
 *
 * Agentes aprendem com feedback:
 * 1. Cada tarefa completa gera feedback (engagement, quality, etc)
 * 2. Sistema detecta padrões de sucesso/falha
 * 3. Agentes descobrem skills + padrões que funcionam
 * 4. Recomendações automáticas pro CMO
 * 5. Performance degradation detectado automaticamente
 */

/**
 * Submete resultado de uma tarefa para análise
 */
export async function submitFeedbackResult(issueId, agentId, taskType, metricType, expectedValue, actualValue, feedbackText = '') {
  const supabase = getSupabase();

  try {
    const successPercentage = (actualValue / expectedValue) * 100;

    const { data, error } = await supabase
      .from('feedback_results')
      .insert({
        issue_id: issueId,
        agent_id: agentId,
        task_type: taskType,
        metric_type: metricType,
        expected_value: expectedValue,
        actual_value: actualValue,
        success_percentage: successPercentage,
        feedback_text: feedbackText,
        status: 'pending'
      })
      .select()
      .single();

    if (!error && data) {
      console.log(`[phase5] 📊 Feedback registrado: ${agentId} em ${taskType} (${successPercentage.toFixed(0)}% sucesso)`);
      return data;
    }

    return null;
  } catch (err) {
    console.log(`[phase5-err] Erro ao registrar feedback: ${err.message}`);
    return null;
  }
}

/**
 * Descobre padrões que o agente tá fazendo bem
 */
export async function discoverLearningPatterns(agentId, taskType, weeksBack = 4) {
  const supabase = getSupabase();

  try {
    // Buscar feedback recente
    const { data: feedbacks, error } = await supabase
      .from('feedback_results')
      .select('*')
      .eq('agent_id', agentId)
      .eq('task_type', taskType)
      .gt('created_at', new Date(Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error || !feedbacks?.length) {
      console.log(`[phase5] ⚠️ Sem feedback recente pra ${agentId} em ${taskType}`);
      return [];
    }

    const patterns = [];

    // Padrão 1: Timing - se maior sucesso em dias específicos
    const dayGroups = {};
    feedbacks.forEach(fb => {
      const day = new Date(fb.created_at).toLocaleDateString('pt-BR', { weekday: 'long' });
      dayGroups[day] = dayGroups[day] || [];
      dayGroups[day].push(fb.success_percentage);
    });

    for (const [day, percentages] of Object.entries(dayGroups)) {
      const avg = percentages.reduce((a, b) => a + b) / percentages.length;
      if (avg > 85) {
        const pattern = `Posts de ${day} têm ${avg.toFixed(0)}% de sucesso (padrão consistente)`;
        patterns.push({
          agentId,
          taskType,
          pattern,
          patternCategory: 'timing',
          confidence: Math.min(0.95, 0.6 + percentages.length * 0.1)
        });
      }
    }

    // Padrão 2: Success Rate - se agente é consistentemente bom
    const avgSuccess = feedbacks.reduce((sum, fb) => sum + fb.success_percentage, 0) / feedbacks.length;
    if (avgSuccess > 85 && feedbacks.length >= 5) {
      patterns.push({
        agentId,
        taskType,
        pattern: `${agentId} tem ${avgSuccess.toFixed(0)}% de sucesso em ${taskType} (expertise clara)`,
        patternCategory: 'expertise',
        confidence: Math.min(0.95, 0.7 + feedbacks.length * 0.05)
      });
    }

    // Padrão 3: High-impact tasks - se melhor em enterprise
    const successfulOnes = feedbacks.filter(fb => fb.success_percentage > 80);
    if (successfulOnes.length > 2) {
      patterns.push({
        agentId,
        taskType,
        pattern: `${successfulOnes.length}/${feedbacks.length} tarefas foram highly successful - expertise consolidada`,
        patternCategory: 'consistency',
        confidence: Math.min(0.9, 0.5 + (successfulOnes.length / feedbacks.length) * 0.4)
      });
    }

    // Salvar padrões descobertos
    for (const pattern of patterns) {
      const existingPattern = await supabase
        .from('agent_learning_patterns')
        .select('*')
        .eq('agent_id', pattern.agentId)
        .eq('task_type', pattern.taskType)
        .eq('pattern', pattern.pattern)
        .single();

      if (existingPattern.data) {
        // Pattern já existe - aumentar confiança
        await supabase
          .from('agent_learning_patterns')
          .update({
            confidence: Math.min(0.95, existingPattern.data.confidence + 0.05),
            times_validated: existingPattern.data.times_validated + 1,
            last_validated_at: new Date().toISOString()
          })
          .eq('id', existingPattern.data.id);
      } else {
        // Novo padrão
        await supabase
          .from('agent_learning_patterns')
          .insert({
            agent_id: pattern.agentId,
            task_type: pattern.taskType,
            pattern: pattern.pattern,
            pattern_category: pattern.patternCategory,
            confidence: pattern.confidence,
            first_discovered_at: new Date().toISOString()
          });

        console.log(`[phase5] 🎯 Padrão descoberto: "${pattern.pattern}" (conf: ${pattern.confidence.toFixed(2)})`);
      }
    }

    return patterns;
  } catch (err) {
    console.log(`[phase5-err] Erro ao descobrir padrões: ${err.message}`);
    return [];
  }
}

/**
 * Detecta degradação de performance (agente tá ficando ruim)
 */
export async function detectPerformanceDegradation(agentId, taskType = null) {
  const supabase = getSupabase();

  try {
    let query = supabase
      .from('feedback_results')
      .select('success_percentage, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (taskType) {
      query = query.eq('task_type', taskType);
    }

    const { data: feedbacks, error } = await query;

    if (error || !feedbacks?.length) {
      return null;
    }

    // Comparar últimas 2 vs 5 anteriores
    if (feedbacks.length < 7) {
      return null; // Não há dados suficientes
    }

    const recent2 = feedbacks.slice(0, 2).map(f => f.success_percentage);
    const previous5 = feedbacks.slice(2, 7).map(f => f.success_percentage);

    const recentAvg = recent2.reduce((a, b) => a + b) / 2;
    const previousAvg = previous5.reduce((a, b) => a + b) / 5;

    const degradationPct = ((previousAvg - recentAvg) / previousAvg) * 100;

    if (degradationPct > 15) {
      // Mais de 15% de degradação
      const degradation = {
        agentId,
        taskType,
        previousAvgScore: previousAvg,
        currentAvgScore: recentAvg,
        degradationPercentage: degradationPct,
        probableCause: degradationPct > 40 ? 'Possível esgotamento ou mudança de instrução' : 'Degradação gradual'
      };

      // Salvar alerta
      await supabase
        .from('performance_degradation')
        .insert(degradation);

      console.log(`[phase5] ⚠️ ALERTA: ${agentId} degradou ${degradationPct.toFixed(0)}% em ${taskType || 'geral'}`);

      // Criar learning event
      await supabase
        .from('learning_events')
        .insert({
          agent_id: agentId,
          event_type: 'issue_detected',
          description: `Performance degraded ${degradationPct.toFixed(0)}%`,
          old_value: previousAvg,
          new_value: recentAvg,
          impact_score: Math.min(1.0, degradationPct / 100)
        });

      return degradation;
    }

    return null;
  } catch (err) {
    console.log(`[phase5-err] Erro ao detectar degradação: ${err.message}`);
    return null;
  }
}

/**
 * Atualiza skills do agente baseado em feedback
 */
export async function updateAgentSkills(agentId, skillName, taskType, wasSuccessful) {
  const supabase = getSupabase();

  try {
    const { data: existingSkill } = await supabase
      .from('agent_skills')
      .select('*')
      .eq('agent_id', agentId)
      .eq('skill_name', skillName)
      .single();

    if (existingSkill) {
      const newTimesUsed = existingSkill.times_used + 1;
      const newSuccessCount = wasSuccessful ? existingSkill.success_rate * existingSkill.times_used + 1 : existingSkill.success_rate * existingSkill.times_used;
      const newSuccessRate = newSuccessCount / newTimesUsed;

      // Proficiency cresce com sucesso
      const proficiencyGain = wasSuccessful ? 0.02 : -0.01;
      const newProficiency = Math.max(0, Math.min(1.0, existingSkill.proficiency_level + proficiencyGain));

      await supabase
        .from('agent_skills')
        .update({
          proficiency_level: newProficiency,
          times_used: newTimesUsed,
          success_rate: newSuccessRate,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSkill.id);

      console.log(`[phase5] 📈 Skill "${skillName}" atualizado: proficiency ${newProficiency.toFixed(2)}, success rate ${newSuccessRate.toFixed(2)}`);
    } else {
      // Novo skill
      await supabase
        .from('agent_skills')
        .insert({
          agent_id: agentId,
          skill_name: skillName,
          proficiency_level: wasSuccessful ? 0.6 : 0.3,
          times_used: 1,
          success_rate: wasSuccessful ? 1.0 : 0.0,
          last_used_at: new Date().toISOString()
        });

      console.log(`[phase5] ✨ Novo skill descoberto: "${skillName}" pro ${agentId}`);
    }

    return true;
  } catch (err) {
    console.log(`[phase5-err] Erro ao atualizar skill: ${err.message}`);
    return false;
  }
}

/**
 * Gera recomendações baseado em padrões descobertos
 */
export async function generateRecommendations(agentId) {
  const supabase = getSupabase();

  try {
    const recommendations = [];

    // Recomendação 1: Se agente é muito bom em algo, redirecionar mais tarefas pra ele
    const { data: patterns } = await supabase
      .from('agent_learning_patterns')
      .select('*')
      .eq('agent_id', agentId)
      .eq('pattern_category', 'expertise')
      .order('confidence', { ascending: false })
      .limit(1);

    if (patterns?.length > 0) {
      const pattern = patterns[0];
      recommendations.push({
        agentId,
        recommendationType: 'task_assignment',
        title: `Aumentar tarefas de ${pattern.task_type}`,
        description: `${agentId} tem expertise clara em ${pattern.task_type} (${(pattern.confidence * 100).toFixed(0)}% confiança)`,
        reasoning: pattern.pattern,
        confidence: pattern.confidence,
        potentialImpact: 'engagement +20%'
      });
    }

    // Recomendação 2: Se há degradação, recomendar break ou revisão
    const { data: degradation } = await supabase
      .from('performance_degradation')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'alert')
      .order('created_at', { ascending: false })
      .limit(1);

    if (degradation?.length > 0) {
      const deg = degradation[0];
      recommendations.push({
        agentId,
        recommendationType: 'skill_development',
        title: 'Investigar queda de performance',
        description: `${agentId} teve queda de ${deg.degradation_percentage.toFixed(0)}% em ${deg.task_type}`,
        reasoning: deg.probable_cause,
        confidence: 0.85,
        potentialImpact: 'recovery +30% se resolvido'
      });
    }

    // Recomendação 3: Agent pairing - se tem complementar skills
    const { data: allSkills } = await supabase
      .from('agent_skills')
      .select('*')
      .eq('agent_id', agentId)
      .gt('proficiency_level', 0.7)
      .order('proficiency_level', { ascending: false });

    if (allSkills?.length >= 2) {
      recommendations.push({
        agentId,
        recommendationType: 'agent_pairing',
        title: `Emparejar ${agentId} com outro agente complementar`,
        description: `${agentId} é especialista em: ${allSkills.map(s => s.skill_name).join(', ')}`,
        reasoning: 'Tarefas grandes se beneficiam de múltiplas especialidades',
        confidence: 0.75,
        potentialImpact: 'task quality +25%'
      });
    }

    // Salvar recomendações
    for (const rec of recommendations) {
      await supabase
        .from('ai_recommendations')
        .insert({
          agent_id: rec.agentId,
          recommendation_type: rec.recommendationType,
          title: rec.title,
          description: rec.description,
          reasoning: rec.reasoning,
          confidence: rec.confidence,
          potential_impact: rec.potentialImpact,
          status: 'pending'
        });
    }

    if (recommendations.length > 0) {
      console.log(`[phase5] 💡 ${recommendations.length} recomendações geradas pra ${agentId}`);
    }

    return recommendations;
  } catch (err) {
    console.log(`[phase5-err] Erro ao gerar recomendações: ${err.message}`);
    return [];
  }
}

/**
 * Retorna contexto de learning pra injetar no briefing
 */
export async function getAgentLearningContext(agentId) {
  const supabase = getSupabase();

  try {
    // Buscar padrões de sucesso
    const { data: patterns } = await supabase
      .from('agent_learning_patterns')
      .select('*')
      .eq('agent_id', agentId)
      .gt('confidence', 0.7)
      .order('confidence', { ascending: false })
      .limit(3);

    // Buscar skills altos
    const { data: skills } = await supabase
      .from('agent_skills')
      .select('*')
      .eq('agent_id', agentId)
      .gt('proficiency_level', 0.7)
      .order('proficiency_level', { ascending: false })
      .limit(3);

    // Buscar recomendações pendentes
    const { data: recommendations } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'pending')
      .limit(2);

    let context = '';

    if (patterns?.length > 0) {
      context += `\n## 🎯 Padrões de Sucesso Descobertos\n`;
      patterns.forEach(p => {
        context += `- ${p.pattern} (confiança: ${(p.confidence * 100).toFixed(0)}%)\n`;
      });
    }

    if (skills?.length > 0) {
      context += `\n## 💪 Skills Desenvolvidos\n`;
      skills.forEach(s => {
        context += `- **${s.skill_name}**: proficiência ${(s.proficiency_level * 100).toFixed(0)}% (${s.times_used} usos)\n`;
      });
    }

    if (recommendations?.length > 0) {
      context += `\n## 💡 Recomendações de Melhoria\n`;
      recommendations.forEach(r => {
        context += `- ${r.title}: ${r.description}\n`;
      });
    }

    return context;
  } catch (err) {
    console.log(`[phase5-err] Erro ao buscar contexto de learning: ${err.message}`);
    return '';
  }
}

/**
 * PHASE 4: Consensus Voting & Task Decomposition
 *
 * Sistema onde agentes votam em decisões complexas.
 * Se houver consenso, decisão é executada.
 * Se houver empate/desacordo, CMO arbitra.
 */

/**
 * Cria um ponto de decisão que precisa de votação
 */
export async function createDecisionPoint(issueId, decisionType, question, context = {}, requiredVoters = 3) {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('decision_points')
      .insert({
        issue_id: issueId,
        decision_type: decisionType,
        question: question,
        context: context,
        required_voters: requiredVoters,
        status: 'voting'
      })
      .select()
      .single();

    if (!error && data) {
      console.log(`[phase4] 🗳️ Ponto de decisão criado: "${question}" (${decisionType})`);
      return data;
    }

    return null;
  } catch (err) {
    console.log(`[phase4-err] Erro ao criar ponto de decisão: ${err.message}`);
    return null;
  }
}

/**
 * Agente registra seu voto em uma decisão
 */
export async function recordAgentVote(decisionId, agentId, choice, confidence = 0.8, reasoning = '') {
  const supabase = getSupabase();

  try {
    // Get agent's voting accuracy for weighting
    const { data: history } = await supabase
      .from('decision_history')
      .select('accuracy_score')
      .eq('agent_id', agentId)
      .single();

    const voteWeight = history?.accuracy_score || 1.0;

    const { data, error } = await supabase
      .from('agent_votes')
      .insert({
        decision_id: decisionId,
        agent_id: agentId,
        choice: choice,
        confidence: confidence,
        reasoning: reasoning,
        vote_weight: voteWeight
      })
      .select()
      .single();

    if (!error && data) {
      console.log(`[phase4] ✅ Voto registrado: ${agentId} votou "${choice}" (conf: ${confidence})`);
      return data;
    }

    return null;
  } catch (err) {
    console.log(`[phase4-err] Erro ao registrar voto: ${err.message}`);
    return null;
  }
}

/**
 * Agrega votos e calcula consenso
 */
export async function aggregateVotes(decisionId) {
  const supabase = getSupabase();

  try {
    // Get all votes for this decision
    const { data: votes, error: votesError } = await supabase
      .from('agent_votes')
      .select('*')
      .eq('decision_id', decisionId);

    if (votesError || !votes || votes.length === 0) {
      console.log(`[phase4] ⚠️ Nenhum voto encontrado para decisão`);
      return null;
    }

    // Calculate weighted votes
    const voteMap = {};
    votes.forEach(vote => {
      const key = vote.choice;
      const weight = vote.vote_weight * vote.confidence;
      voteMap[key] = (voteMap[key] || 0) + weight;
    });

    // Sort by vote count
    const sorted = Object.entries(voteMap).sort((a, b) => b[1] - a[1]);
    const winningChoice = sorted[0][0];
    const winningVotes = sorted[0][1];
    const totalVotes = votes.reduce((sum, v) => sum + (v.vote_weight * v.confidence), 0);
    const consensusConfidence = winningVotes / totalVotes;

    // Check if tie
    const isTie = sorted.length > 1 && Math.abs(sorted[0][1] - sorted[1][1]) < 0.1;

    // Build all_votes object
    const allVotes = {};
    sorted.forEach(([choice, weight]) => {
      allVotes[choice] = Math.round(weight * 10) / 10;
    });

    // Save consensus result
    const { data, error } = await supabase
      .from('vote_consensus')
      .insert({
        decision_id: decisionId,
        winning_choice: winningChoice,
        total_votes: votes.length,
        winning_votes: Math.round(winningVotes),
        consensus_confidence: consensusConfidence,
        all_votes: allVotes,
        is_tie: isTie
      })
      .select()
      .single();

    if (!error && data) {
      if (isTie) {
        console.log(`[phase4] ⚖️ Empate detectado! CMO precisa arbitrar`);
      } else {
        console.log(`[phase4] 📊 Consenso alcançado: "${winningChoice}" (${Math.round(consensusConfidence * 100)}% confiança)`);
      }
      return data;
    }

    return null;
  } catch (err) {
    console.log(`[phase4-err] Erro ao agregar votos: ${err.message}`);
    return null;
  }
}

/**
 * Analisa complexidade de uma tarefa
 */
function calculateTaskComplexity(task) {
  let score = 3; // baseline

  // Fatores de complexidade
  if (task.description && task.description.length > 500) score += 1; // descrição longa
  if (task.subtasks && task.subtasks.length > 3) score += 1; // muitas subtarefas
  if (task.timeline && task.timeline < 3) score += 2; // prazo apertado
  if (task.dependencies && task.dependencies.length > 0) score += 1; // tem dependências
  if (task.client_segment === 'enterprise') score += 1; // cliente enterprise
  if (task.budget && task.budget > 5000) score += 1; // orçamento alto

  return Math.min(10, score);
}

/**
 * Decompõe tarefa complexa em subtarefas
 */
export async function decomposeComplexTask(parentIssueId, taskData) {
  const complexity = calculateTaskComplexity(taskData);

  // Só decompõe se complexidade > 6
  if (complexity <= 6) {
    return null;
  }

  const supabase = getSupabase();

  try {
    // Generate subtasks based on complexity
    let subtasks = [];
    const title = taskData.title || 'Task';
    const description = taskData.description || '';

    if (taskData.type === 'content_creation') {
      subtasks = [
        { title: 'Pesquisa e Briefing', priority: 'high', dependencies: [] },
        { title: 'Rascunho/Outline', priority: 'high', dependencies: ['research'] },
        { title: 'Primeira Versão', priority: 'high', dependencies: ['outline'] },
        { title: 'Revisão Interna', priority: 'medium', dependencies: ['draft'] },
        { title: 'Otimizações Finais', priority: 'medium', dependencies: ['review'] },
        { title: 'Publicação', priority: 'high', dependencies: ['final'] }
      ];
    } else if (taskData.type === 'design') {
      subtasks = [
        { title: 'Moodboard & Referências', priority: 'high', dependencies: [] },
        { title: 'Sketches/Wireframes', priority: 'high', dependencies: ['mood'] },
        { title: 'Design Final', priority: 'high', dependencies: ['sketches'] },
        { title: 'Revisão e Feedback', priority: 'medium', dependencies: ['design'] },
        { title: 'Ajustes Finais', priority: 'medium', dependencies: ['feedback'] }
      ];
    } else if (taskData.type === 'strategy') {
      subtasks = [
        { title: 'Análise Competitiva', priority: 'high', dependencies: [] },
        { title: 'Definição de Objetivos', priority: 'high', dependencies: ['analysis'] },
        { title: 'Seleção de Tática', priority: 'high', dependencies: ['goals'] },
        { title: 'Calendário & Alocação', priority: 'high', dependencies: ['tactics'] },
        { title: 'Plano de Contingência', priority: 'medium', dependencies: ['calendar'] }
      ];
    }

    // Strategy: phases and approach
    const strategy = {
      approach: `Decomposição de tarefa complexa (score: ${complexity}/10)`,
      phases: subtasks.map(s => s.title),
      success_metrics: [
        `Todas as ${subtasks.length} subtarefas completadas no prazo`,
        'Qualidade média >= 8/10 por agente',
        'Feedback positivo do cliente'
      ]
    };

    // Save decomposition
    const { data, error } = await supabase
      .from('task_decompositions')
      .insert({
        parent_issue_id: parentIssueId,
        complexity_score: complexity,
        decomposition_reason: `Tarefa complexa (${taskData.type}): precisa de ${subtasks.length} etapas`,
        subtasks: subtasks,
        strategy: strategy
      })
      .select()
      .single();

    if (!error && data) {
      console.log(`[phase4] 📋 Tarefa decomposta em ${subtasks.length} subtarefas (complexidade: ${complexity}/10)`);
      return data;
    }

    return null;
  } catch (err) {
    console.log(`[phase4-err] Erro ao decompor tarefa: ${err.message}`);
    return null;
  }
}

/**
 * Retorna histórico de votação de um agente
 */
export async function getAgentVotingAccuracy(agentId, decisionType = null) {
  const supabase = getSupabase();

  try {
    let query = supabase
      .from('decision_history')
      .select('*')
      .eq('agent_id', agentId);

    if (decisionType) {
      query = query.eq('decision_type', decisionType);
    }

    const { data, error } = await query;

    if (!error && data) {
      return data;
    }
    return [];
  } catch (err) {
    console.log(`[phase4-err] Erro ao buscar histórico de votação: ${err.message}`);
    return [];
  }
}

/**
 * Atualiza histórico de votação depois que tarefa completa
 */
export async function updateVotingAccuracy(agentId, decisionType, wasCorrect) {
  const supabase = getSupabase();

  try {
    // Get or create entry
    const { data: existing, error: getError } = await supabase
      .from('decision_history')
      .select('*')
      .eq('agent_id', agentId)
      .eq('decision_type', decisionType)
      .single();

    let newCorrect = 1;
    let newTotal = 1;
    let newAccuracy = wasCorrect ? 1.0 : 0.0;

    if (existing) {
      newCorrect = existing.correct_votes + (wasCorrect ? 1 : 0);
      newTotal = existing.total_votes + 1;
      newAccuracy = newCorrect / newTotal;
    }

    if (existing) {
      await supabase
        .from('decision_history')
        .update({
          correct_votes: newCorrect,
          total_votes: newTotal,
          accuracy_score: newAccuracy
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('decision_history')
        .insert({
          agent_id: agentId,
          decision_type: decisionType,
          correct_votes: newCorrect,
          total_votes: newTotal,
          accuracy_score: newAccuracy
        });
    }

    console.log(`[phase4] 📈 Acurácia de votação atualizada: ${agentId} em ${decisionType} = ${Math.round(newAccuracy * 100)}%`);
    return true;
  } catch (err) {
    console.log(`[phase4-err] Erro ao atualizar acurácia: ${err.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: Team Decision Making — Times votam em decisões
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTeamDecision(teamId, decisionType, question, context, requiredVoters) {
  const db = getSupabase();
  try {
    const { data, error } = await db
      .from('team_decisions')
      .insert({
        team_id: teamId,
        decision_type: decisionType,
        question,
        context,
        required_voters: requiredVoters,
        status: 'voting'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase7] 🗳️ Decisão criada: ${decisionType} no time ${teamId}`);
    return data;
  } catch (err) {
    console.log(`[phase7-err] Erro ao criar decisão: ${err.message}`);
    return null;
  }
}

export async function recordTeamVote(decisionId, agentId, choice, reasoning) {
  const db = getSupabase();
  try {
    // Buscar decision pra pegar team_id e decision_type
    const { data: decision } = await db
      .from('team_decisions')
      .select('team_id, decision_type')
      .eq('id', decisionId)
      .single();

    if (!decision) throw new Error('Decision não encontrada');

    // Buscar expertise do agente nesse tipo de decisão
    const { data: expertise } = await db
      .from('team_decision_history')
      .select('voting_accuracy')
      .eq('team_id', decision.team_id)
      .eq('agent_id', agentId)
      .eq('decision_type', decision.decision_type)
      .single();

    const voteWeight = (expertise?.voting_accuracy || 0.5) * (0.7 + 0.3); // baseline 0.7-1.0

    const { data, error } = await db
      .from('team_votes')
      .insert({
        decision_id: decisionId,
        team_id: decision.team_id,
        agent_id: agentId,
        choice,
        reasoning,
        vote_weight: voteWeight,
        confidence: 0.7
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase7] 🗽 ${agentId} votou "${choice}" (peso: ${Math.round(voteWeight * 100)}%)`);
    return data;
  } catch (err) {
    console.log(`[phase7-err] Erro ao registrar voto: ${err.message}`);
    return null;
  }
}

export async function aggregateTeamVotes(decisionId) {
  const db = getSupabase();
  try {
    const { data: decision } = await db
      .from('team_decisions')
      .select('team_id, id')
      .eq('id', decisionId)
      .single();

    const { data: votes } = await db
      .from('team_votes')
      .select('*')
      .eq('decision_id', decisionId);

    if (!votes || votes.length === 0) {
      console.log(`[phase7] ⚠️ Sem votos pra agregar`);
      return null;
    }

    let yesScore = 0, noScore = 0, abstainScore = 0, totalWeight = 0;

    votes.forEach(vote => {
      totalWeight += vote.vote_weight;
      if (vote.choice === 'yes') yesScore += vote.vote_weight;
      else if (vote.choice === 'no') noScore += vote.vote_weight;
      else abstainScore += vote.vote_weight;
    });

    const yesPercent = yesScore / totalWeight;
    const noPercent = noScore / totalWeight;

    let consensus = null;
    let isUnanimous = false;
    let isDeadlocked = false;
    let leaderDecisionNeeded = false;

    if (Math.abs(yesPercent - noPercent) < 0.1) {
      isDeadlocked = true;
      leaderDecisionNeeded = true;
    } else if (yesPercent > noPercent) {
      consensus = 'yes';
      isUnanimous = yesPercent > 0.9;
    } else {
      consensus = 'no';
      isUnanimous = noPercent > 0.9;
    }

    const { data, error } = await db
      .from('team_vote_consensus')
      .insert({
        decision_id: decisionId,
        team_id: decision.team_id,
        consensus_choice: consensus,
        yes_score: yesScore,
        no_score: noScore,
        abstain_score: abstainScore,
        total_weight: totalWeight,
        is_unanimous: isUnanimous,
        is_deadlocked: isDeadlocked,
        leader_decision_needed: leaderDecisionNeeded
      })
      .select()
      .single();

    if (error) throw error;

    if (isDeadlocked) {
      console.log(`[phase7] 🤔 Empate! Leader precisa quebrar (sim: ${Math.round(yesPercent * 100)}%, não: ${Math.round(noPercent * 100)}%)`);
    } else {
      console.log(`[phase7] ✅ Consenso: ${consensus} (${Math.round(Math.max(yesPercent, noPercent) * 100)}%)`);
    }

    return data;
  } catch (err) {
    console.log(`[phase7-err] Erro ao agregar votos: ${err.message}`);
    return null;
  }
}

export async function leaderBreaksTie(decisionId, leaderChoice) {
  const db = getSupabase();
  try {
    const { data, error } = await db
      .from('team_vote_consensus')
      .update({
        leader_override_choice: leaderChoice,
        consensus_choice: leaderChoice,
        is_deadlocked: false
      })
      .eq('decision_id', decisionId)
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase7] ⚖️ Leader quebrou empate: ${leaderChoice}`);
    return data;
  } catch (err) {
    console.log(`[phase7-err] Erro ao quebrar empate: ${err.message}`);
    return null;
  }
}

export async function recordDecisionOutcome(decisionId, outcome, outcomeMetric, explanation) {
  const db = getSupabase();
  try {
    const { data: consensus } = await db
      .from('team_vote_consensus')
      .select('team_id, consensus_choice')
      .eq('decision_id', decisionId)
      .single();

    const { data, error } = await db
      .from('team_decision_impact')
      .insert({
        decision_id: decisionId,
        team_id: consensus.team_id,
        consensus_choice: consensus.consensus_choice,
        actual_outcome: outcome,
        outcome_metric: outcomeMetric,
        outcome_explanation: explanation
      })
      .select()
      .single();

    if (error) throw error;

    // Atualizar accuracy do voto
    const { data: votes } = await db
      .from('team_votes')
      .select('agent_id, team_id, decision_id')
      .eq('decision_id', decisionId);

    const { data: decision } = await db
      .from('team_decisions')
      .select('decision_type')
      .eq('id', decisionId)
      .single();

    const wasCorrect = outcome === 'positive';

    for (const vote of votes) {
      await updateTeamVotingAccuracy(vote.team_id, vote.agent_id, decision.decision_type, wasCorrect);
    }

    console.log(`[phase7] 📊 Resultado: ${outcome} (impacto: ${outcomeMetric > 0 ? '+' : ''}${outcomeMetric})`);
    return data;
  } catch (err) {
    console.log(`[phase7-err] Erro ao registrar outcome: ${err.message}`);
    return null;
  }
}

async function updateTeamVotingAccuracy(teamId, agentId, decisionType, wasCorrect) {
  const db = getSupabase();
  try {
    const { data: existing } = await db
      .from('team_decision_history')
      .select('*')
      .eq('team_id', teamId)
      .eq('agent_id', agentId)
      .eq('decision_type', decisionType)
      .single();

    if (existing) {
      const newVotesTotal = existing.votes_total + 1;
      const newVotesCorrect = existing.votes_correct + (wasCorrect ? 1 : 0);
      const newAccuracy = newVotesCorrect / newVotesTotal;

      await db
        .from('team_decision_history')
        .update({
          votes_total: newVotesTotal,
          votes_correct: newVotesCorrect,
          voting_accuracy: newAccuracy,
          expertise_level: Math.min(1.0, 0.5 + newAccuracy * 0.5)
        })
        .eq('team_id', teamId)
        .eq('agent_id', agentId)
        .eq('decision_type', decisionType);
    } else {
      await db
        .from('team_decision_history')
        .insert({
          team_id: teamId,
          agent_id: agentId,
          decision_type: decisionType,
          votes_total: 1,
          votes_correct: wasCorrect ? 1 : 0,
          voting_accuracy: wasCorrect ? 1.0 : 0.0,
          expertise_level: wasCorrect ? 0.75 : 0.5
        });
    }
  } catch (err) {
    console.log(`[phase7-err] Erro ao atualizar accuracy: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 8: Cross-Team Learning — Times compartilham best practices
// ═══════════════════════════════════════════════════════════════════════════════

export async function discoverBestPractices(teamId) {
  const db = getSupabase();
  try {
    const { data: team } = await db
      .from('agent_teams')
      .select('performance_score')
      .eq('id', teamId)
      .single();

    if (team.performance_score < 0.75) {
      console.log(`[phase8] ⚠️ Time precisa de 75%+ performance pra descobrir best practices`);
      return null;
    }

    // Analisar padrões bem-sucedidos baseado em feedback recente
    const { data: feedbacks } = await db
      .from('feedback_results')
      .select('agent_id, actual_value, expected_value')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    const successRate = feedbacks.filter(f => f.actual_value >= f.expected_value).length / feedbacks.length;

    const { data, error } = await db
      .from('team_best_practices')
      .insert({
        source_team_id: teamId,
        practice_type: 'collaboration_pattern',
        practice_name: `Team ${teamId.substring(0, 8)} - High Synergy Pattern`,
        description: `Padrão bem-sucedido de colaboração identificado`,
        success_rate: successRate,
        times_applied: 1,
        times_successful: 1,
        performance_lift: team.performance_score - 0.65,
        complexity_level: 2
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase8] 🎯 Best practice descoberta: ${successRate * 100}% success rate`);
    return data;
  } catch (err) {
    console.log(`[phase8-err] Erro ao descobrir best practices: ${err.message}`);
    return null;
  }
}

export async function proposeKnowledgeTransfer(sourceTeamId, targetTeamId, practiceId) {
  const db = getSupabase();
  try {
    const { data, error } = await db
      .from('team_knowledge_transfer')
      .insert({
        source_team_id: sourceTeamId,
        target_team_id: targetTeamId,
        practice_id: practiceId,
        transfer_type: 'coaching_session',
        transfer_status: 'proposed'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase8] 📚 Transferência proposta: ${sourceTeamId} → ${targetTeamId}`);
    return data;
  } catch (err) {
    console.log(`[phase8-err] Erro ao propor transferência: ${err.message}`);
    return null;
  }
}

export async function adoptPractice(teamId, practiceId) {
  const db = getSupabase();
  try {
    const { data: practice } = await db
      .from('team_best_practices')
      .select('performance_lift')
      .eq('id', practiceId)
      .single();

    const { data: teamPerf } = await db
      .from('agent_teams')
      .select('performance_score')
      .eq('id', teamId)
      .single();

    const { data, error } = await db
      .from('team_practice_adoption')
      .insert({
        team_id: teamId,
        practice_id: practiceId,
        adoption_status: 'trial',
        baseline_performance: teamPerf.performance_score,
        current_performance: teamPerf.performance_score,
        adoption_confidence: 0.5
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase8] 🚀 Prática sendo testada: ${teamId}`);
    return data;
  } catch (err) {
    console.log(`[phase8-err] Erro ao adotar prática: ${err.message}`);
    return null;
  }
}

export async function measureAdoptionImpact(teamId, practiceId) {
  const db = getSupabase();
  try {
    const { data: adoption } = await db
      .from('team_practice_adoption')
      .select('*')
      .eq('team_id', teamId)
      .eq('practice_id', practiceId)
      .single();

    const { data: teamPerf } = await db
      .from('agent_teams')
      .select('performance_score')
      .eq('id', teamId)
      .single();

    const performanceDelta = teamPerf.performance_score - adoption.baseline_performance;
    const wasSuccessful = performanceDelta > 0.05;

    const { data, error } = await db
      .from('team_practice_adoption')
      .update({
        current_performance: teamPerf.performance_score,
        performance_delta: performanceDelta,
        cycles_tested: adoption.cycles_tested + 1,
        success_count: adoption.success_count + (wasSuccessful ? 1 : 0),
        adoption_confidence: Math.min(1.0, 0.5 + (performanceDelta * 10))
      })
      .eq('team_id', teamId)
      .eq('practice_id', practiceId)
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase8] 📈 Impacto medido: ${performanceDelta > 0 ? '+' : ''}${Math.round(performanceDelta * 100)}%`);
    return data;
  } catch (err) {
    console.log(`[phase8-err] Erro ao medir impacto: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 9: Emergent Hierarchies — Hierarquias dinâmicas entre times
// ═══════════════════════════════════════════════════════════════════════════════

export async function formTeamHierarchy(parentTeamId, childTeamId, relationshipType = 'supervision') {
  const db = getSupabase();
  try {
    const { data: parentTeam } = await db
      .from('agent_teams')
      .select('performance_score')
      .eq('id', parentTeamId)
      .single();

    if (parentTeam.performance_score < 0.75) {
      console.log(`[phase9] ⚠️ Parent precisa de 75%+ performance`);
      return null;
    }

    const { data, error } = await db
      .from('team_hierarchies')
      .insert({
        parent_team_id: parentTeamId,
        child_team_id: childTeamId,
        hierarchy_level: 2,
        relationship_type: relationshipType,
        parent_provides: ['direction', 'resources'],
        authority_delegation: 0.65
      })
      .select()
      .single();

    if (error) throw error;

    // Criar authority levels pra ambos
    await db
      .from('team_authority_levels')
      .insert([
        { team_id: parentTeamId, base_authority: 0.8, decision_scope: ['strategic', 'resource_allocation'] },
        { team_id: childTeamId, base_authority: 0.5, decision_scope: ['tactical', 'day_to_day'] }
      ]);

    console.log(`[phase9] 🏛️ Hierarquia formada: ${parentTeamId} → ${childTeamId}`);
    return data;
  } catch (err) {
    console.log(`[phase9-err] Erro ao formar hierarquia: ${err.message}`);
    return null;
  }
}

export async function escalateDecision(childTeamId, decisionId) {
  const db = getSupabase();
  try {
    const { data: hierarchy } = await db
      .from('team_hierarchies')
      .select('parent_team_id')
      .eq('child_team_id', childTeamId)
      .single();

    if (!hierarchy) {
      console.log(`[phase9] ⚠️ Sem parent team pra escalação`);
      return null;
    }

    const { data, error } = await db
      .from('team_decision_escalations')
      .insert({
        source_team_id: childTeamId,
        parent_team_id: hierarchy.parent_team_id,
        decision_id: decisionId,
        escalation_reason: 'complexity_exceeded',
        escalation_urgency: 7,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase9] 📤 Decisão escalada: ${childTeamId} → parent`);
    return data;
  } catch (err) {
    console.log(`[phase9-err] Erro ao escalar: ${err.message}`);
    return null;
  }
}

export async function allocateResources(fromTeamId, toTeamId, resourceType, quantity) {
  const db = getSupabase();
  try {
    const { data, error } = await db
      .from('team_resource_allocation')
      .insert({
        from_team_id: fromTeamId,
        to_team_id: toTeamId,
        resource_type: resourceType,
        quantity,
        unit: 'hours',
        duration_days: 7,
        status: 'pending',
        justification: `Alocação de ${quantity} horas de ${resourceType}`
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[phase9] 💼 Recursos alocados: ${quantity}h de ${resourceType}`);
    return data;
  } catch (err) {
    console.log(`[phase9-err] Erro ao alocar recursos: ${err.message}`);
    return null;
  }
}

export async function rebuildHierarchy() {
  const db = getSupabase();
  try {
    console.log(`[phase9] 🏛️ Reconstruindo hierarquia organizacional...`);

    // Buscar todos os times
    const { data: teams } = await db
      .from('agent_teams')
      .select('*')
      .eq('is_active', true)
      .order('performance_score', { ascending: false });

    let hierarchiesFormed = 0;

    // Top 20% viram sênior
    const topTier = Math.ceil(teams.length * 0.2);
    const topTeams = teams.slice(0, topTier);
    const otherTeams = teams.slice(topTier);

    // Formar hierarquias: top teams supervisionam outros baseado em synergy
    for (const childTeam of otherTeams) {
      const bestFit = topTeams[0]; // Simplificado: top team primeiro

      const { data: existing } = await db
        .from('team_hierarchies')
        .select('id')
        .eq('parent_team_id', bestFit.id)
        .eq('child_team_id', childTeam.id)
        .single();

      if (!existing) {
        await formTeamHierarchy(bestFit.id, childTeam.id, 'supervision');
        hierarchiesFormed++;
      }
    }

    // Atualizar authority baseado em performance
    for (const team of teams) {
      const performanceBoost = Math.max(0, team.performance_score - 0.65) * 0.2;
      const seniorityBoost = topTeams.includes(team) ? 0.15 : 0;

      await db
        .from('team_authority_levels')
        .update({
          performance_authority: performanceBoost,
          seniority_authority: seniorityBoost,
          last_recalculated_at: new Date().toISOString()
        })
        .eq('team_id', team.id);
    }

    console.log(`[phase9] ✅ Hierarquia reconstruída: ${hierarchiesFormed} novas relações, ${topTier} times sênior`);
    return { hierarchiesFormed, topTierCount: topTier };
  } catch (err) {
    console.log(`[phase9-err] Erro ao reconstruir hierarquia: ${err.message}`);
    return null;
  }
}

export default {
  evaluateAgentWork,
  updateAgentMemory,
  buildAgentMemoryContext,
  calculateWeeklyPerformance,
  detectSpecializationOpportunities,
  analyzePerformanceHistory,
  generatePerformanceInsights,
  buildPerformanceBriefing,
  analyzeCrossCompanyPatterns,
  analyzeAgentPerformanceByCategory,
  buildRefinedInstructions,
  createAgentFork,
  saveForkSuggestion,
  getPendingForkSuggestions,
  approveForkSuggestion,
  rejectForkSuggestion,
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
  rebuildHierarchy
};
