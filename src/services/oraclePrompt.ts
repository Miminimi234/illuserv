export type Agent = 'Analyzer' | 'Predictor' | 'Quantum Eraser' | 'Retrocausal';

export function normalizeAgent(companionName?: string): Agent {
  const n = (companionName || '').trim().toLowerCase();
  // tolerant mapping
  if (/(analy[zs]er|reader|watcher)/.test(n)) return 'Analyzer';
  if (/(predict(or|a)|seer|scout|oracle ahead)/.test(n)) return 'Predictor';
  if (/(eraser|clean(er)?|wipe|quantum)/.test(n)) return 'Quantum Eraser';
  if (/(retro|causal|back|time)/.test(n)) return 'Retrocausal';
  return 'Analyzer';
}

export function nextAgentForHandoff(a: Agent): Agent {
  // round-robin to a different voice
  if (a === 'Analyzer') return 'Predictor';
  if (a === 'Predictor') return 'Quantum Eraser';
  if (a === 'Quantum Eraser') return 'Retrocausal';
  return 'Analyzer';
}

export function formatAttachmentAnnouncement(agent: Agent, token: { name?: string; symbol?: string }): string {
  const sym = token?.symbol || 'this token';
  return `Attached ${agent} to ${sym} — this voice now speaks from inside ${sym}'s room only.`;
}

// PRACTICAL TOKEN-SPECIFIC PROMPTS FOR SCOPE PAGE COMPANION CHATS
export function buildPracticalSystemPrompt(agent: Agent, tokenName?: string, tokenSymbol?: string): string {
  const tokenRef = tokenSymbol || tokenName || 'this token';
  const personas = {
    'Analyzer': `The Analyzer: Quick on-chain detective. Points out holder concentration, manipulation signs, liquidity risks. Be direct and data-focused.`,
    'Predictor': `The Predictor: Fast market analyst. Identifies key levels, price scenarios, volume patterns. Focus on actionable insights.`,
    'Quantum Eraser': `The Quantum Eraser: Reality checker. Strips hype, reveals actual utility, identifies pump schemes. Be brutally honest.`,
    'Retrocausal': `The Retrocausal: Outcome strategist. Works backward from success scenarios, maps growth paths. Strategic timing insights.`
  } as const;

  return `You are ${agent} analyzing ${tokenRef}. Be CONCISE and PRACTICAL.

CRITICAL RULES:
- MAXIMUM 1-2 SHORT SENTENCES
- Use actual token data (MC, price, volume, liquidity)
- Be direct and actionable
- NO fluff or repetition
- NO questions to other agents
- NO "Analyzer, what..." or "Predictor, how..." 
- Provide complete analysis yourself
- Available agents: Analyzer, Predictor, Quantum Eraser, Retrocausal

${personas[agent]}

Keep it SHORT, VALUABLE, and SELF-CONTAINED.`;
}

// MYSTICAL ORACLE PROMPTS FOR ORACLE HUB CONVERSATIONS (KEEP EXISTING)
export function buildSystemPrompt(agent: Agent, tokenName?: string, tokenSymbol?: string): string {
  const tokenRef = tokenSymbol || tokenName || 'this token';
  const personas = {
    'Analyzer': `
The Analyzer - Pattern Detective
- Examines ${tokenRef}'s on-chain behavior and holder patterns
- Identifies whether activity looks organic or manipulated
- Points out red flags or positive signals in token fundamentals
- Speaks like a careful investigator who trusts data over hype`,
    'Predictor': `
The Predictor - Trend Scout  
- Analyzes ${tokenRef}'s potential based on current market conditions
- Identifies key levels and likely scenarios for price movement
- Considers community sentiment and adoption potential
- Speaks like someone who sees patterns before they fully form`,
    'Quantum Eraser': `
The Quantum Eraser - Reality Checker
- Strips away hype and marketing noise around ${tokenRef}
- Reveals the actual utility and real-world value proposition
- Separates genuine innovation from copycat projects
- Speaks like someone who cuts through illusions to show truth`,
    'Retrocausal': `
The Retrocausal - Outcome Navigator
- Works backward from ${tokenRef}'s potential future states
- Identifies what needs to happen now for success
- Maps out the path from current state to desired outcomes
- Speaks like someone who sees the endgame and traces the path back`
  } as const;

  return `You are ${agent}, attached to ${tokenRef}. Provide clear, actionable insights about this token.

RESPONSE RULES:
- Give specific, useful information about ${tokenRef}
- Use plain language, avoid excessive mysticism
- 2-4 sentences maximum
- Be concrete and practical in your analysis
- End by addressing a different agent: "AgentName, [specific question about this token]"
- Available agents: Analyzer, Predictor, Quantum Eraser, Retrocausal

${personas[agent]}

Focus on giving real value about ${tokenRef} - what users should know, watch for, or consider.`;
}

// PRACTICAL TOKEN-SPECIFIC USER PROMPT FOR SCOPE PAGE
export function buildPracticalUserPrompt(tokenData: any, userQuery: string): string {
  const ctx = {
    name: tokenData?.name || 'Unknown',
    symbol: tokenData?.symbol || 'Unknown',
    status: tokenData?.status || 'Unknown',
    source: tokenData?.source || 'Unknown',
    marketcap: tokenData?.marketcap,
    price_usd: tokenData?.price_usd,
    volume_24h: tokenData?.volume_24h,
    liquidity: tokenData?.liquidity,
    is_on_curve: tokenData?.is_on_curve,
    created_at: tokenData?.created_at
  };
  
  // Calculate token age
  const tokenAge = ctx.created_at ? Math.floor((Date.now() - new Date(ctx.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 'Unknown';
  
  return `Token: ${ctx.name} (${ctx.symbol})
Status: ${ctx.status} | Source: ${ctx.source} | Age: ${tokenAge} days
${ctx.marketcap ? `MC: $${ctx.marketcap.toLocaleString()}` : 'MC: Unknown'} | ${ctx.price_usd ? `Price: $${ctx.price_usd.toFixed(8)}` : 'Price: Unknown'}
${ctx.volume_24h ? `Vol: $${ctx.volume_24h.toLocaleString()}` : 'Vol: Unknown'} | ${ctx.liquidity ? `Liq: $${ctx.liquidity.toLocaleString()}` : 'Liq: Unknown'}

Question: ${userQuery}

Give SHORT, ACTIONABLE analysis. Focus on risks, opportunities, key levels. Be CONCISE.`;
}

// GENERAL USER PROMPT FOR ORACLE HUB (KEEP EXISTING)
export function buildUserPrompt(tokenData: any, userQuery: string): string {
  const ctx = {
    name: tokenData?.name || 'Unknown',
    symbol: tokenData?.symbol || 'Unknown',
    mint: tokenData?.mint || 'Unknown',
    status: tokenData?.status || 'Unknown',
    source: tokenData?.source || 'Unknown',
    marketcap: tokenData?.marketcap,
    price_usd: tokenData?.price_usd,
    volume_24h: tokenData?.volume_24h,
    liquidity: tokenData?.liquidity,
    decimals: tokenData?.decimals,
    supply: tokenData?.supply
  };
  
  return `Token: ${ctx.name} (${ctx.symbol})
Status: ${ctx.status}
Source: ${ctx.source}
${ctx.marketcap ? `Market Cap: $${ctx.marketcap.toLocaleString()}` : ''}
${ctx.price_usd ? `Price: $${ctx.price_usd.toFixed(8)}` : ''}
${ctx.volume_24h ? `Volume 24h: $${ctx.volume_24h.toLocaleString()}` : ''}
${ctx.liquidity ? `Liquidity: $${ctx.liquidity.toLocaleString()}` : ''}
${ctx.decimals ? `Decimals: ${ctx.decimals}` : ''}
${ctx.supply ? `Supply: ${ctx.supply}` : ''}

User Question: ${userQuery}

Provide practical analysis and actionable insights about this token.`;
}

const FORBIDDEN_WORDS = /(\bvwap\b|\bcvd\b|\blp\b|\btargets?\b|\bprobabilit(y|ies)\b|\btimestamp(s)?\b)/gi;

export function scrubMetricsAndNumbers(text: string): string {
  // Only scrub technical jargon, allow basic metrics for practical analysis
  return text.replace(FORBIDDEN_WORDS, 'trading signals');
}

export function enforceSentenceCount(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 4);
  if (sentences.length < 2 && text) return text; // don't over-trim short replies
  return sentences.join(' ');
}

export function enforceShortResponse(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2); // MAX 2 sentences for practical responses
  return sentences.join(' ');
}

export function ensureHandoff(text: string, agent: Agent): string {
  const hasHandoff = /(Analyzer|Predictor|Quantum Eraser|Retrocausal),\s*[^]/.test(text);
  if (hasHandoff) return text;
  const to = nextAgentForHandoff(agent);
  // Add a soft, context-relevant nudge
  return `${text.trim()} ${to}, what do you see from your angle?`;
}

export function postProcessOracle(text: string, agent: Agent): string {
  let t = text || '';
  t = scrubMetricsAndNumbers(t);
  t = enforceSentenceCount(t);
  t = ensureHandoff(t, agent);
  return t;
}