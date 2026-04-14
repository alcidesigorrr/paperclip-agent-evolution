# Phase 2: Emergent Behavior — Technical Architecture

## System Design

```
┌──────────────────────────────────────────────────────────────┐
│  FLOW: Briefing Creation → Performance Analysis → Insights   │
└──────────────────────────────────────────────────────────────┘

WHEN: createPaperclipIssue(calendar) is called
   ↓
STEP 1: Build base briefing
   ├─ Use calendar.plan.briefing
   └─ Add placeholder text
   ↓
STEP 2: [PHASE 1] Inject CMO Memory Context
   ├─ Query agent_learnings (confidence > 0.6)
   └─ Format as markdown list
   ↓
STEP 3: [PHASE 2] ⭐ NEW: Analyze Performance History
   Bridge calls analyzePerformanceHistory('sondar', 8)
   ├─ Query social_posts WHERE published_at > NOW() - 8 weeks
   ├─ Filter: status='published' AND metrics NOT NULL
   ├─ Aggregate by:
   │  ├─ pillar: "cases", "dicas", "educacional", "tendencias"
   │  ├─ type: "instagram_post", "carousel", "blog_article"
   │  └─ agent: "copywriter", "designer", etc
   ├─ Calculate: count, totalEngagement, avgEngagement
   └─ Return: {totalPosts, timeRange, performance: {pillar, type, agent}}
   ↓
STEP 4: Generate Insights
   Bridge calls generatePerformanceInsights(analysis)
   ├─ Find best and worst pillars
   ├─ Find best post type
   ├─ Find top performing agent
   ├─ Compare ratios (best/worst)
   └─ Return: {insights: [...], recommendations: [...]}
   ↓
STEP 5: Format as Markdown Briefing
   Bridge calls buildPerformanceBriefing(insightsData)
   ├─ Create "## 📊 Performance" section
   ├─ Add insights as bullet list
   ├─ Add recommendations
   └─ Return: markdown string
   ↓
STEP 6: Inject into Briefing
   briefing = briefing + performanceBriefing
   ↓
STEP 7: Create Paperclip Issue with Full Briefing
   ├─ Include memory context (Phase 1)
   ├─ Include performance analysis (Phase 2)
   └─ CMO reads rich context before delegating
```

---

## Data Flow: analyzePerformanceHistory()

```javascript
async function analyzePerformanceHistory(companyPillar, weeksBack = 8) {
  // 1. Calculate date range
  const eightWeeksAgo = new Date(Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000);
  
  // 2. Query Supabase
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .gte('published_at', eightWeeksAgo.toISOString())
    .eq('status', 'published')
    .not('metrics', 'is', null);  // Only posts with engagement data
  
  // 3. Aggregate by pillar
  const byPillar = {};
  for (const post of posts) {
    const engagement = post.metrics.likes + post.metrics.comments + post.metrics.shares;
    if (!byPillar[post.pillar]) {
      byPillar[post.pillar] = { count: 0, totalEngagement: 0, posts: [] };
    }
    byPillar[post.pillar].count++;
    byPillar[post.pillar].totalEngagement += engagement;
    byPillar[post.pillar].posts.push(post);
  }
  
  // 4. Calculate metrics (same for type, agent)
  const performance = {
    pillar: {},
    type: {},
    agent: {}
  };
  
  for (const [pillar, data] of Object.entries(byPillar)) {
    performance.pillar[pillar] = {
      count: data.count,
      avgEngagement: data.totalEngagement / data.count,
      topPost: data.posts
        .sort((a, b) => (b.metrics.likes) - (a.metrics.likes))[0]?.title
    };
  }
  
  return {
    totalPosts: posts.length,
    timeRange: `últimas ${weeksBack} semanas`,
    performance
  };
}
```

---

## Data Flow: generatePerformanceInsights()

```javascript
async function generatePerformanceInsights(analysis) {
  const { performance } = analysis;
  const insights = [];
  const recommendations = [];
  
  // 1. Find best/worst pillars
  const pillarScores = Object.entries(performance.pillar)
    .map(([pillar, data]) => ({ pillar, score: data.avgEngagement }))
    .sort((a, b) => b.score - a.score);
  
  const bestPillar = pillarScores[0];  // { pillar: "cases", score: 145 }
  const worstPillar = pillarScores[pillarScores.length - 1];
  
  // 2. Calculate ratio
  if (bestPillar.score > worstPillar.score * 1.3) {  // 30% difference threshold
    insights.push(
      `📈 "${bestPillar.pillar}" pilar tá gerando ` +
      `${(bestPillar.score * 100 / worstPillar.score).toFixed(0)}% mais ` +
      `que "${worstPillar.pillar}"`
    );
  }
  
  // 3. Find best type
  const typeScores = Object.entries(performance.type)
    .map(([type, data]) => ({ type, score: data.avgEngagement }))
    .sort((a, b) => b.score - a.score);
  
  const bestType = typeScores[0];
  insights.push(`⭐ Posts de tipo "${bestType.type}" têm ${bestType.score.toFixed(0)} engagements`);
  
  // 4. Find top agent
  const agentScores = Object.entries(performance.agent)
    .map(([agent, data]) => ({ agent, score: data.avgEngagement }))
    .sort((a, b) => b.score - a.score);
  
  const topAgent = agentScores[0];
  insights.push(`🏆 ${topAgent.agent} liderando com ${topAgent.score.toFixed(0)} engagements/post`);
  
  // 5. Generate recommendations from insights
  if (bestPillar.score > worstPillar.score * 1.5) {  // 50% threshold for strong recommendation
    recommendations.push(`✅ Aumentar frequência de posts "${bestPillar.pillar}" — tá rendendo muito`);
  }
  
  if (worstPillar.score < 50) {  // Absolute threshold
    recommendations.push(`⚠️ Revisar estratégia de "${worstPillar.pillar}" — performance abaixo`);
  }
  
  if (bestType.score > typeScores[1]?.score * 1.2) {
    recommendations.push(`📱 Priorizar "${bestType.type}" — formato convertendo melhor`);
  }
  
  return {
    insights: insights.slice(0, 3),  // Top 3 insights
    recommendations: recommendations.slice(0, 2),  // Top 2 recommendations
    analysis
  };
}
```

---

## Data Flow: buildPerformanceBriefing()

```javascript
async function buildPerformanceBriefing(insightsData) {
  const { insights, recommendations, analysis } = insightsData;
  
  let briefing = `\n## 📊 Performance das Últimas ${analysis.timeRange} (${analysis.totalPosts} posts)\n\n`;
  
  if (insights?.length > 0) {
    briefing += `### Insights\n`;
    insights.forEach(insight => {
      briefing += `- ${insight}\n`;  // Markdown bullet
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

// Output example:
// "## 📊 Performance das Últimas 8 semanas (32 posts)
// 
// ### Insights
// - 📈 "cases_resultados" pilar tá gerando 145% mais que "dicas_produtividade"
// - ⭐ Posts de tipo "instagram_carousel" têm 95 engagements médios
// - 🏆 copywriter_sondar liderando com 98 engagements/post
// 
// ### Recomendações pra Esta Semana
// - ✅ Aumentar frequência de posts "cases" — tá rendendo muito
// - 📱 Priorizar "instagram_carousel" — formato convertendo melhor
// "
```

---

## Data Flow: analyzeCrossCompanyPatterns()

```javascript
async function analyzeCrossCompanyPatterns() {
  // 1. Get all published posts from last 30 days
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('status', 'published')
    .gte('published_at', 30_days_ago);
  
  // 2. Infer company from content type
  // (RaiseDev = tech content: blog_article, linkedin_article)
  // (AGÊNCIA MKT = social content: instagram_*)
  
  const tech = posts.filter(p => ['blog_article', 'linkedin_article'].includes(p.type));
  const social = posts.filter(p => p.type.startsWith('instagram'));
  
  // 3. Calculate averages
  const techAvg = tech.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0) / tech.length;
  const socialAvg = social.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0) / social.length;
  
  // 4. Generate transfer insights
  const insights = [];
  
  if (techAvg > socialAvg * 1.5) {
    insights.push({
      from: 'RaiseDev',
      to: 'AGÊNCIA MKT',
      insight: 'Conteúdo técnico longo (blog/LinkedIn) gerando 50% mais. ' +
               'Considerar publicar artigos técnicos adaptados pra Sondar+'
    });
  }
  
  if (socialAvg > techAvg * 1.2) {
    insights.push({
      from: 'AGÊNCIA MKT',
      to: 'RaiseDev',
      insight: 'Instagram posts curtos e visuais funcionando bem. ' +
               'Considerar resumos visuais de features técnicas.'
    });
  }
  
  return insights;
}
```

---

## Integration with Bridge

### 1. Import Statements
```javascript
import {
  analyzePerformanceHistory,
  generatePerformanceInsights,
  buildPerformanceBriefing,
  analyzeCrossCompanyPatterns
} from './modules/agent-evolution.mjs';
```

### 2. In createPaperclipIssue()
```javascript
async function createPaperclipIssue(calendar) {
  let briefing = calendar.plan.briefing || '';
  
  // Phase 1: Add memory context
  const cmoMemoryContext = await buildAgentMemoryContext('cmo_sondar');
  briefing += cmoMemoryContext;
  
  // Phase 2: Analyze performance
  log('[briefing]', 'Analisando performance histórica...');
  const performanceAnalysis = await analyzePerformanceHistory('sondar', 8);
  
  if (performanceAnalysis) {
    const insights = await generatePerformanceInsights(performanceAnalysis);
    if (insights) {
      const performanceBriefing = await buildPerformanceBriefing(insights);
      briefing += performanceBriefing;
      log('[briefing]', `Adicionado: ${insights.insights?.length || 0} insights + ${insights.recommendations?.length || 0} recomendações`);
    }
  }
  
  // Phase 2B: Detect cross-company patterns
  const crossCompanyInsights = await analyzeCrossCompanyPatterns();
  if (crossCompanyInsights?.length > 0) {
    log('[briefing]', `${crossCompanyInsights.length} cross-company patterns detectados`);
    // Phase 3 will persist these; for now just log
  }
  
  // Create issue with final briefing
  const issue = await paperclip('POST', `/companies/${COMPANY_ID}/issues`, {
    title: `Gerar conteúdo semana ${weekLabel} - Sondar+`,
    priority: 'high'
  });
  
  // Issue description includes full briefing
  await paperclip('PATCH', `/issues/${issue.id}`, {
    status: 'todo',
    assigneeAgentId: CMO_ID,
    description: `## Briefing Automatico\n${briefing}`  // ← Full context
  });
}
```

---

## Query Optimization

### Current Query Performance
```sql
-- Single query, indexed
SELECT * FROM social_posts
WHERE published_at >= NOW() - INTERVAL '8 weeks'
  AND status = 'published'
  AND metrics IS NOT NULL;

-- Index used: created_at, status, published_at
-- Expected: <100ms for 30-50 rows
```

### If Performance Degrades (100M+ posts)
```sql
-- Add covering index
CREATE INDEX idx_social_posts_analysis ON social_posts(
  status,
  published_at DESC,
  pillar,
  type,
  paperclip_agent
) INCLUDE (metrics);

-- Or partition by date
CREATE TABLE social_posts_2026_q1 PARTITION OF social_posts
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

---

## Thresholds & Tuning

### Insight Generation Thresholds
```javascript
// In generatePerformanceInsights():

// When to generate "gap insight"
if (best.score > worst.score * 1.3) {  // 30% difference
  → Generate gap insight
}

// When to recommend action
if (best.score > worst.score * 1.5) {  // 50% difference
  → Generate recommendation
}

// When to flag as problem
if (worst.score < 50) {  // Absolute threshold
  → Add improvement recommendation
}
```

### Tuning Guidelines
- **1.3x threshold**: Catches meaningful but not massive differences
- **1.5x threshold**: Only strong recommendations (high confidence)
- **50 engagement threshold**: Posts basically getting no engagement

Adjust based on:
- Average engagement rate of your posts
- Noise level in metrics
- CMO tolerance for recommendations

---

## Error Handling

### If no posts published
```javascript
if (!posts?.length) {
  console.log(`[evolution] ℹ️ Sem posts publicados nos últimos ${weeksBack} semanas`);
  return null;
}

// Briefing continues without performance section
briefing = briefing; // no change
```

### If metrics missing
```javascript
// Query explicitly filters: .not('metrics', 'is', null)
// → Only analyzes posts with engagement data
```

### If insights undefined
```javascript
if (!insights) {
  // generatePerformanceInsights() returned null
  // → Briefing created without performance section
}
```

---

## Metrics Included in Analysis

### Engagement Score
```javascript
const engagement = 
  post.metrics.likes +           // Primary metric
  post.metrics.comments +        // Interaction depth
  post.metrics.shares;           // Reach multiplier

// Does NOT include:
// - impressions (too noisy)
// - reach (sometimes inaccurate)
// - clicks (not always available)
```

### Why This Formula
- **Likes**: Indicates resonance
- **Comments**: Higher value (deeper engagement)
- **Shares**: Highest value (viral potential)
- Weighted equally for simplicity

Can be tuned:
```javascript
const engagement = 
  post.metrics.likes * 1 +
  post.metrics.comments * 2 +    // 2x weight
  post.metrics.shares * 4;        // 4x weight
```

---

## Future Enhancements (Phase 3+)

### Automatic Insight Persistence
```javascript
// Store insights for trending/comparison
CREATE TABLE performance_insights (
  id UUID,
  week_number INT,
  insights JSONB,
  created_at TIMESTAMP
);

await supabase.from('performance_insights').insert({
  week_number: getWeekNumber(),
  insights: {
    insights: [/* array */],
    recommendations: [/* array */]
  }
});
```

### Trend Detection
```javascript
// Compare this week vs last week
const thisWeek = analyzePerformanceHistory('sondar', 1);
const lastWeek = analyzePerformanceHistory('sondar', 1, offsetWeeks: 1);

const trend = (thisWeek - lastWeek) / lastWeek;  // +15%, -8%, etc

if (trend > 0.2) {
  insights.push(`📈 Momentum: cases_pillar crescendo +20% vs semana passada`);
}
```

### ML-Based Recommendation Ranking
Currently: Manual threshold-based
Future: Train model on "which recommendations CMO actually acted on"

---

## Testing Strategy

### Unit Tests
```javascript
test('analyzePerformanceHistory returns correct aggregations', async () => {
  // Mock posts with known metrics
  // Call analyzePerformanceHistory()
  // Assert pillar/type/agent aggregations are correct
});

test('generatePerformanceInsights creates threshold-based insights', async () => {
  // Mock analysis with known best/worst
  // Assert insight messages are correct
});
```

### Integration Tests
```javascript
test('Full briefing includes performance section', async () => {
  // Create test posts in Supabase
  // Call createPaperclipIssue()
  // Assert briefing includes "## 📊 Performance"
});
```

### Load Tests
```bash
# Simulate 100M posts in analytics DB
# Measure query time
# Target: <500ms for 8-week analysis
```

---

## Monitoring & Observability

### Key Logs
```
[briefing] Analisando performance histórica...
  → Start of Phase 2 analysis

[briefing] Adicionado: 3 insights + 2 recomendações
  → Successful analysis, X insights + Y recommendations

[briefing] Z cross-company patterns detectados
  → X patterns found for knowledge transfer

[evolution-err] Erro ao analisar performance: ...
  → Error occurred, briefing created without section
```

### Metrics to Monitor
- Analysis execution time (target: <500ms)
- Posts analyzed per briefing (should grow weekly)
- Insights generated (should increase as data accumulates)
- Recommendation accuracy (subjective, but trackable)

---

## Cost Analysis

### Database Reads
- 1 query per briefing creation (weekly)
- ~1 index scan for 30-100 posts
- Expected: <10 queries/week

### Compute
- Python/JavaScript aggregation (in-memory)
- No ML models (yet)
- Minimal CPU usage

### Total Cost
- Essentially free for < 10k posts/week
- ~$0.01/month at scale

---

## Known Limitations

1. ❌ Cross-company patterns not persisted (log-only)
   - **Fix in Phase 3:** Add performance_insights table

2. ❌ No trend detection (week-over-week comparisons)
   - **Fix in Phase 3:** Store weekly snapshots, calculate deltas

3. ❌ Hardcoded thresholds (1.3x, 1.5x, 50 engagement)
   - **Fix later:** Make configurable per Sondar+ org

4. ❌ Simple engagement formula (likes + comments + shares)
   - **Fix later:** Weight by post type, age, etc.

---

## Next Steps

- ✅ Phase 2 complete and integrated
- 🔜 Test with real data (1 week)
- 🔜 Adjust thresholds based on feedback
- 🔜 Phase 3: Agent Forking + Specialization
