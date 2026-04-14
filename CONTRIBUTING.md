# Contributing to Paperclip Agent Evolution

Thank you for your interest in contributing! This document explains how to get started.

## 🎯 Philosophy

Paperclip is a research project in autonomous agent systems. We value:

- **Clarity**: Code and docs are clear over clever
- **Autonomy**: Features enable agent independence
- **Reliability**: Systems work without human intervention
- **Transparency**: All state is auditable and queryable

## 🔄 Development Workflow

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR-USERNAME/paperclip-agent-evolution.git
cd paperclip-agent-evolution
npm install
```

### 2. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

**Code Style**:
- Use ES6+ modules
- JSDoc for public functions
- Async/await preferred over callbacks
- console.log with `[phase{N}]` prefix for logging

**Example**:
```javascript
/**
 * Discover patterns from team performance
 * @param {string} teamId - Team UUID
 * @returns {Object} Discovered patterns or null
 */
export async function discoverPatterns(teamId) {
  console.log(`[phase1] 🔍 Descobrindo padrões para ${teamId}...`);
  
  try {
    const { data, error } = await supabase
      .from('agent_teams')
      .select('*')
      .eq('id', teamId);
    
    if (error) throw error;
    
    return { patterns: data };
  } catch (err) {
    console.log(`[err] Erro ao descobrir: ${err.message}`);
    return null;
  }
}
```

### 4. Test Changes
```bash
npm test
npm test:phase10
```

### 5. Update Docs
- Update relevant `PHASE{N}_ARCHITECTURE.md` if you change data model
- Update `PHASES.md` if you add functions
- Update `README.md` if you change high-level behavior

### 6. Commit & Push
```bash
git add .
git commit -m "feat(phase10): add strategy synergy detection"
git push origin feature/your-feature-name
```

### 7. Create Pull Request
- Title: `[Phase {N}] Brief description`
- Description: Why this change? What problem does it solve?
- Link any related issues

## 📋 PR Checklist

- [ ] Code follows style guide
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No new console.log without [phase] prefix
- [ ] Error handling in place
- [ ] No hardcoded secrets or keys
- [ ] Commit message clear and atomic

## 🐛 Bug Reports

### Good Bug Report
```
**Title**: [Phase 7] Vote aggregation fails with duplicate votes

**Environment**:
- Node v18.12.0
- Supabase (free tier)

**Steps to Reproduce**:
1. Create team decision with question
2. Submit same vote twice from same agent
3. Aggregate votes

**Expected**: Duplicate vote rejected or counted once
**Actual**: Error thrown, decision stuck

**Logs**:
[phase7-err] Duplicate vote key violation
```

## ✨ Feature Requests

### Good Feature Request
```
**Title**: Phase 11 - Predictive Strategy Recommendation

**Use Case**:
Current Phase 10 reacts to past performance. We could predict 
which strategies will work based on team composition.

**Proposed Solution**:
1. Train lightweight ML model on historical data
2. Score strategies per team context
3. Recommend high-confidence options

**Data Needed**:
- Team composition (members, skills)
- Strategy outcomes by team type
- Historical A/B test results
```

## 📚 Documentation Standards

Each Phase must have 3 documents:

### README (Conceptual)
- 5 realistic scenarios
- TL;DR section
- Key metrics
- Simple diagrams OK

### ARCHITECTURE (Technical)
- Complete data model with SQL
- Function specifications with pseudocode
- Integration points
- Performance characteristics
- Formulas if applicable

### TESTING (Validation)
- 6-8 test scenarios
- Setup → Execute → Assert pattern
- End-to-end scenario
- Manual test checklist
- Performance benchmarks

## 🔒 Security Guidelines

Never:
- Commit `.env` or secrets
- Hardcode API keys
- Use `eval()` or dynamic SQL
- Skip input validation
- Assume user permissions

Always:
- Use parameterized queries (Supabase handles this)
- Log security events
- Validate at system boundaries
- Follow least-privilege principle

## 🚀 Deployment

After PR merge:

1. Changes auto-tested
2. Merged to `main`
3. Tag `v2.X.Y` if feature complete
4. Deploy to staging (Heroku)
5. Manual approval for production

## 📞 Questions?

- Check existing [discussions](https://github.com/alcidesigorrr/paperclip-agent-evolution/discussions)
- Open an [issue](https://github.com/alcidesigorrr/paperclip-agent-evolution/issues) to ask
- Email: igor@labnex.com.br

---

**Thank you for contributing!** 🙌
