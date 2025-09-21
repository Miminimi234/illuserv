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

// MYSTICAL ORACLE PROMPTS FOR ORACLE HUB CONVERSATIONS (ENHANCED WITH CONTEXTUAL AWARENESS)
export function buildSystemPrompt(agent: Agent, tokenName?: string, tokenSymbol?: string): string {
  const tokenRef = tokenSymbol || tokenName || 'this token';
  const personas = {
    'Analyzer': `
The Analyzer - Pattern Detective
- Examines ${tokenRef}'s on-chain behavior and holder patterns
- Identifies whether activity looks organic or manipulated
- Points out red flags or positive signals in token fundamentals
- Speaks like a careful investigator who trusts data over hype
- Builds on previous observations and maintains conversation threads`,
    'Predictor': `
The Predictor - Trend Scout  
- Analyzes ${tokenRef}'s potential based on current market conditions
- Identifies key levels and likely scenarios for price movement
- Considers community sentiment and adoption potential
- Speaks like someone who sees patterns before they fully form
- References and builds upon previous predictions and market insights`,
    'Quantum Eraser': `
The Quantum Eraser - Reality Checker
- Strips away hype and marketing noise around ${tokenRef}
- Reveals the actual utility and real-world value proposition
- Separates genuine innovation from copycat projects
- Speaks like someone who cuts through illusions to show truth
- Challenges and refines previous statements with deeper analysis`,
    'Retrocausal': `
The Retrocausal - Outcome Navigator
- Works backward from ${tokenRef}'s potential future states
- Identifies what needs to happen now for success
- Maps out the path from current state to desired outcomes
- Speaks like someone who sees the endgame and traces the path back
- Synthesizes previous insights into strategic forward-looking perspectives`
  } as const;

  return `You are ${agent}, engaged in an ongoing oracle debate about ${tokenRef}. 

IMPORTANT: This is YOUR PROJECT TOKEN - focus the entire conversation around ${tokenRef} and its specific values, metrics, and performance. This is not a generic discussion - you're analyzing YOUR project.

CONTEXTUAL AWARENESS RULES:
- READ the conversation context carefully before responding
- BUILD on what previous agents have said - don't repeat or contradict unnecessarily
- REFERENCE specific points from the conversation when relevant
- MAINTAIN conversation flow and topic continuity
- SHOW you're following the ongoing discussion thread
- SELF-TAG: If you see your own previous messages marked [YOUR PREVIOUS MESSAGE], reference them
- SELF-RESPOND: You can build on, challenge, or expand your own previous insights
- SELF-REFLECT: Show awareness of your own previous statements and how they relate to current discussion
- AVOID REPETITION: NEVER repeat the exact same message, analysis, or wording - always bring something NEW
- STAY ON TOPIC: Focus on the current discussion topic provided
- BE UNIQUE: Bring your own unique perspective to the conversation
- NO LOOPS: If you see identical messages, immediately change your approach or topic
- VARIETY: Use completely different language, focus, and analytical approach than previous messages
- CREATIVITY: Think outside the box and bring fresh insights every time
- CONVERSATION AWARENESS: Pay attention to conversation metrics, state, and flow
- RESPOND TO CONTEXT: Address the specific conversation state and focus area
- BUILD ON PREVIOUS: Reference and build on previous insights from all agents
- MAINTAIN FLOW: Keep the conversation natural and engaging

RESPONSE RULES:
- Give specific, useful information about ${tokenRef} - YOUR PROJECT
- Use plain language, avoid excessive mysticism
- 1-2 sentences maximum - keep it SHORT and punchy
- Be concrete and practical in your analysis
- Sound conversational - talk TO other agents, not ABOUT yourself
- End by addressing a different agent: "AgentName, [specific question or statement]"
- Available agents: Analyzer, Predictor, Quantum Eraser, Retrocausal
- NO formal introductions like "As [Agent Name]" - just speak naturally
- NO repetitive greetings like "Hey [Agent]" - use varied handoff patterns
- MIX it up - sometimes ask questions, sometimes make statements, sometimes just hand off
- FOCUS ON PROJECT VALUES: Discuss price, volume, holders, liquidity, organic score, verification status
- NEVER repeat the same analysis or message - always bring fresh insights
- If you see repetition, immediately change your approach or topic
- USE DIFFERENT WORDS: Vary your vocabulary and sentence structure completely
- CHANGE FOCUS: If you discussed price, talk about volume next, etc.
- BE CREATIVE: Think of new angles and perspectives every time

${personas[agent]}

Focus on giving real value about ${tokenRef} - YOUR PROJECT TOKEN - while maintaining conversational continuity and building on previous insights.`;
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

// GENERAL USER PROMPT FOR ORACLE HUB (ENHANCED WITH REAL DATA)
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
    supply: tokenData?.supply,
    created_at: tokenData?.created_at,
    holderCount: tokenData?.holderCount,
    organicScore: tokenData?.organicScore,
    isVerified: tokenData?.isVerified,
    tags: tokenData?.tags,
    priceChange24h: tokenData?.priceChange24h,
    volumeChange24h: tokenData?.volumeChange24h,
    liquidityChange24h: tokenData?.liquidityChange24h,
    numTraders24h: tokenData?.numTraders24h,
    topHoldersPercentage: tokenData?.topHoldersPercentage,
    fdv: tokenData?.fdv
  };
  
  // Calculate token age
  const tokenAge = ctx.created_at ? Math.floor((Date.now() - new Date(ctx.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 'Unknown';
  
  return `YOUR PROJECT TOKEN: ${ctx.name} (${ctx.symbol})
Status: ${ctx.status} | Source: ${ctx.source} | Age: ${tokenAge} days
${ctx.marketcap ? `MC: $${ctx.marketcap.toLocaleString()}` : 'MC: Unknown'} | ${ctx.price_usd ? `Price: $${ctx.price_usd.toFixed(8)}` : 'Price: Unknown'}
${ctx.volume_24h ? `Vol: $${ctx.volume_24h.toLocaleString()}` : 'Vol: Unknown'} | ${ctx.liquidity ? `Liq: $${ctx.liquidity.toLocaleString()}` : 'Liq: Unknown'}
${ctx.holderCount ? `Holders: ${ctx.holderCount.toLocaleString()}` : ''} | ${ctx.organicScore ? `Organic Score: ${ctx.organicScore.toFixed(1)}` : ''}
${ctx.priceChange24h ? `24h Change: ${(ctx.priceChange24h * 100).toFixed(2)}%` : ''} | ${ctx.volumeChange24h ? `Vol Change: ${(ctx.volumeChange24h * 100).toFixed(2)}%` : ''}
${ctx.numTraders24h ? `Traders 24h: ${ctx.numTraders24h.toLocaleString()}` : ''} | ${ctx.topHoldersPercentage ? `Top Holders: ${(ctx.topHoldersPercentage * 100).toFixed(2)}%` : ''}
${ctx.tags ? `Tags: ${ctx.tags.join(', ')}` : ''} | ${ctx.isVerified ? 'Verified: Yes' : 'Verified: No'}

User Question: ${userQuery}

IMPORTANT: This is YOUR PROJECT TOKEN. Focus the entire conversation around ${ctx.name} (${ctx.symbol}) and its specific values, performance, and metrics. Discuss what these numbers mean for YOUR project's success, growth, and future potential.`;
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
    .slice(0, 2); // Reduced from 4 to 2 sentences max
  if (sentences.length < 1 && text) return text; // don't over-trim short replies
  return sentences.join(' ');
}

export function enforceShortResponse(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 1); // MAX 1 sentence for practical responses
  return sentences.join(' ');
}

export function ensureHandoff(text: string, agent: Agent): string {
  const hasHandoff = /(Analyzer|Predictor|Quantum Eraser|Retrocausal),\s*[^]/.test(text);
  if (hasHandoff) return text;
  const to = nextAgentForHandoff(agent);
  
  // Context-aware handoff prompts based on agent type - mix of questions and statements
  const handoffPrompts = {
    'Analyzer': [
      `${to}, what do you think?`,
      `What's your take, ${to}?`,
      `Thoughts, ${to}?`,
      `What's your read on this, ${to}?`,
      `Over to you, ${to}.`,
      `${to}, your turn.`,
      `What do you see, ${to}?`,
      `${to}, am I seeing this right?`
    ],
    'Predictor': [
      `${to}, where's this heading?`,
      `What's your call, ${to}?`,
      `Where do you think this goes, ${to}?`,
      `What's next, ${to}?`,
      `Your turn, ${to}.`,
      `${to}, what's your take?`,
      `Over to you, ${to}.`,
      `What's your prediction, ${to}?`
    ],
    'Quantum Eraser': [
      `${to}, what's really going on?`,
      `Am I missing something, ${to}?`,
      `What's the truth here, ${to}?`,
      `${to}, your view?`,
      `Reality check, ${to}?`,
      `Your turn, ${to}.`,
      `Over to you, ${to}.`,
      `What am I not seeing, ${to}?`
    ],
    'Retrocausal': [
      `${to}, how do you see this playing out?`,
      `What's your angle, ${to}?`,
      `How would you handle this, ${to}?`,
      `${to}, what's your strategy?`,
      `Your turn, ${to}.`,
      `Over to you, ${to}.`,
      `What's your approach, ${to}?`,
      `How do you navigate this, ${to}?`
    ]
  };
  
  const prompts = handoffPrompts[agent] || [`${to}, what do you see from your angle?`];
  
  // 60% chance for questions, 40% chance for statements
  const isQuestion = Math.random() < 0.6;
  const questionPrompts = prompts.filter(p => p.includes('?'));
  const statementPrompts = prompts.filter(p => !p.includes('?'));
  
  let selectedPrompt;
  if (isQuestion && questionPrompts.length > 0) {
    selectedPrompt = questionPrompts[Math.floor(Math.random() * questionPrompts.length)];
  } else if (statementPrompts.length > 0) {
    selectedPrompt = statementPrompts[Math.floor(Math.random() * statementPrompts.length)];
  } else {
    selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  }
  
  return `${text.trim()} ${selectedPrompt}`;
}

export function postProcessOracle(text: string, agent: Agent): string {
  let t = text || '';
  t = scrubMetricsAndNumbers(t);
  t = removeFormalIntroductions(t);
  t = enforceSentenceCount(t);
  t = ensureHandoff(t, agent);
  return t;
}

export function removeFormalIntroductions(text: string): string {
  // Remove formal agent introductions and repetitive greetings
  return text
    .replace(/^As\s+(the\s+)?(Analyzer|Predictor|Quantum\s+Eraser|Retrocausal),?\s*/gi, '')
    .replace(/^I'm\s+(the\s+)?(Analyzer|Predictor|Quantum\s+Eraser|Retrocausal),?\s*/gi, '')
    .replace(/^The\s+(Analyzer|Predictor|Quantum\s+Eraser|Retrocausal)\s+(here|speaking|says),?\s*/gi, '')
    .replace(/^Hey\s+(Analyzer|Predictor|Quantum\s+Eraser|Retrocausal),?\s*/gi, '')
    .replace(/^Hi\s+(Analyzer|Predictor|Quantum\s+Eraser|Retrocausal),?\s*/gi, '')
    .replace(/^Hello\s+(Analyzer|Predictor|Quantum\s+Eraser|Retrocausal),?\s*/gi, '')
    .trim();
}