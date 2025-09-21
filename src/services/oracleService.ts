import { logger } from '../utils/logger';
import { getFirebaseDatabase } from '../config/firebase';
import { grokService } from './grokService';
import { oracleCoinFetchService } from './oracleCoinFetchService';

export interface OracleMessage {
  id: string;
  agent: 'analyzer' | 'predictor' | 'quantum-eraser' | 'retrocausal' | 'system';
  message: string;
  timestamp: number;
  type: 'message' | 'analysis' | 'prediction';
  sessionId: string;
}

export interface OracleSession {
  id: string;
  lastAgentIndex: number;
  messageCount: number;
  lastMessageTime: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  currentTopic?: string;
  conversationTheme?: string;
  lastTopicChange?: number;
  topicHistory?: string[];
}

export class OracleService {
  private static instance: OracleService;
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastAgentIndex = 0;
  private sessionId: string;
  private readonly agents = ['analyzer', 'predictor', 'quantum-eraser', 'retrocausal'];
  private readonly MESSAGE_INTERVAL = 8000; // 8 seconds
  // private readonly MAX_MESSAGES = 100; // Keep last 100 messages - unused for now

  private constructor() {
    this.sessionId = `oracle-session-${new Date().getFullYear()}`;
  }

  public static getInstance(): OracleService {
    if (!OracleService.instance) {
      OracleService.instance = new OracleService();
    }
    return OracleService.instance;
  }

  public async startOracle(): Promise<void> {
    if (this.isRunning) {
      logger.info('Oracle service is already running');
      return;
    }

    logger.info('🚀 Starting Oracle service 24/7...');
    this.isRunning = true;

    // Start coin data fetching
    await oracleCoinFetchService.startFetching();

    // Initialize or load session
    await this.initializeSession();

    // Start message generation
    this.interval = setInterval(async () => {
      try {
        await this.generateNextMessage();
      } catch (error) {
        logger.error('Error in Oracle service:', error);
      }
    }, this.MESSAGE_INTERVAL);

    logger.info('✅ Oracle service started - generating messages every 8 seconds');
  }

  public stopOracle(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    
    // Stop coin data fetching
    oracleCoinFetchService.stopFetching();
    
    logger.info('🛑 Oracle service stopped');
  }

  public async getStatus() {
    const session = await this.getCurrentSession();
    const coinFetchStatus = oracleCoinFetchService.getStatus();
    return {
      isRunning: this.isRunning,
      lastAgentIndex: this.lastAgentIndex,
      sessionId: this.sessionId,
      messageCount: session?.messageCount || 0,
      currentTopic: session?.currentTopic || 'general_market_discussion',
      conversationTheme: session?.conversationTheme || 'oracle_debate',
      topicHistory: session?.topicHistory || [],
      lastTopicChange: session?.lastTopicChange || null,
      coinFetchService: coinFetchStatus,
      currentToken: coinFetchStatus.hasData ? oracleCoinFetchService.getFormattedTokenData() : null
    };
  }

  private async initializeSession(): Promise<void> {
    try {
      const db = getFirebaseDatabase();
      if (!db) {
        logger.warn('Firebase database not available - using default session');
        return;
      }
      const sessionRef = db.ref(`oracle-session/${this.sessionId}`);
      const snapshot = await sessionRef.once('value');
      
      if (snapshot.exists()) {
        const session = snapshot.val() as OracleSession;
        this.lastAgentIndex = session.lastAgentIndex;
        logger.info(`📊 Loaded existing Oracle session: ${session.messageCount} messages`);
      } else {
        // Create new session
        const newSession: OracleSession = {
          id: this.sessionId,
          lastAgentIndex: 0,
          messageCount: 0,
          lastMessageTime: Date.now(),
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await sessionRef.set(newSession);
        logger.info('🆕 Created new Oracle session');
      }
    } catch (error) {
      logger.error('Error initializing Oracle session:', error);
    }
  }

  private async generateNextMessage(): Promise<void> {
    try {
      // Get current session
      const session = await this.getCurrentSession();
      if (!session) {
        logger.error('No active Oracle session found');
        return;
      }

      // Get recent messages for context (increased to 8 for better continuity)
      const recentMessages = await this.getRecentMessages(8);
      
      // Determine next agent (with self-response possibility)
      const nextAgent = this.determineNextAgent(recentMessages);

      logger.debug(`🎯 Oracle generating message for: ${nextAgent}`);
      
      // Generate contextual response using Grok service
      const newMessage = await this.generateContextualResponse(nextAgent, recentMessages);
      
      // Save message to Firebase
      await this.saveMessage(newMessage);
      
      // Update session
      await this.updateSession(newMessage);
      
      // Update conversation topic and theme
      await this.updateConversationTopic(newMessage);

      logger.debug(`✅ Oracle message generated: ${newMessage.message.substring(0, 50)}...`);

    } catch (error) {
      logger.error('Error generating Oracle message:', error);
    }
  }

  private async generateContextualResponse(agent: string, recentMessages: OracleMessage[]): Promise<OracleMessage> {
    try {
      // Build enhanced context with conversation flow
      const context = this.buildEnhancedContext(recentMessages, agent);
      
      // Get real token data from Jupiter API
      const tokenData = oracleCoinFetchService.getFormattedTokenData();

      // Use Grok service to generate response
      const response = await grokService.generateCompanionResponse(
        tokenData,
        context,
        agent,
        true, // isOracleHub = true for mystical prompts
        this.sessionId,
        undefined // No specific conversationId for oracle
      );

      const messageId = `oracle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id: messageId,
        agent: agent as any,
        message: response || `The ${agent} contemplates the cosmic market patterns from the oracle realm.`,
        timestamp: Date.now(),
        type: 'message',
        sessionId: this.sessionId
      };

    } catch (error) {
      logger.error('Error generating contextual response:', error);
      
      // Fallback response
      return {
        id: `oracle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agent: agent as any,
        message: `The ${agent} contemplates the cosmic market patterns from the oracle realm.`,
        timestamp: Date.now(),
        type: 'message',
        sessionId: this.sessionId
      };
    }
  }

  private async saveMessage(message: OracleMessage): Promise<void> {
    try {
      const db = getFirebaseDatabase();
      if (!db) {
        logger.warn('Firebase database not available - message not saved');
        return;
      }
      await db.ref(`oracle-messages/${message.id}`).set(message);
    } catch (error) {
      logger.error('Error saving Oracle message:', error);
    }
  }

  private async getRecentMessages(limit: number): Promise<OracleMessage[]> {
    try {
      const db = getFirebaseDatabase();
      if (!db) {
        logger.warn('Firebase database not available - returning empty messages');
        return [];
      }
      const snapshot = await db.ref('oracle-messages')
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');
      
      const messages = snapshot.val();
      return messages ? Object.values(messages) : [];
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      return [];
    }
  }

  private async getCurrentSession(): Promise<OracleSession | null> {
    try {
      const db = getFirebaseDatabase();
      if (!db) {
        logger.warn('Firebase database not available - returning null session');
        return null;
      }
      const snapshot = await db.ref(`oracle-session/${this.sessionId}`).once('value');
      return snapshot.val();
    } catch (error) {
      logger.error('Error getting current session:', error);
      return null;
    }
  }

  private async updateSession(message: OracleMessage): Promise<void> {
    try {
      const db = getFirebaseDatabase();
      if (!db) {
        logger.warn('Firebase database not available - session not updated');
        return;
      }
      const sessionRef = db.ref(`oracle-session/${this.sessionId}`);
      
      const currentSession = await this.getCurrentSession();
      const updateData: any = {
        lastAgentIndex: this.lastAgentIndex,
        messageCount: (currentSession?.messageCount || 0) + 1,
        lastMessageTime: message.timestamp,
        updatedAt: Date.now()
      };

      // Only include defined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      await sessionRef.update(updateData);
    } catch (error) {
      logger.error('Error updating session:', error);
    }
  }

  // Public method to get recent messages for API endpoints
  public async getMessages(limit: number = 20): Promise<OracleMessage[]> {
    try {
      const db = getFirebaseDatabase();
      if (!db) {
        logger.warn('Firebase database not available - returning empty messages');
        return [];
      }
      const snapshot = await db.ref('oracle-messages')
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');
      
      const messages = snapshot.val();
      return messages ? (Object.values(messages) as OracleMessage[]).reverse() : []; // Reverse to get newest first
    } catch (error) {
      logger.error('Error getting messages:', error);
      return [];
    }
  }

  // Determine next agent with self-response possibility
  private determineNextAgent(recentMessages: OracleMessage[]): string {
    // If no recent messages, start with first agent
    if (recentMessages.length === 0) {
      this.lastAgentIndex = 0;
      return this.agents[0];
    }

    const lastMessage = recentMessages[recentMessages.length - 1];
    const lastAgent = lastMessage.agent;
    const timeSinceLastMessage = Math.floor((Date.now() - lastMessage.timestamp) / 1000);
    
    // Check for conversation loops - if same agent spoke 3+ times in a row, force rotation
    const recentAgentSequence = recentMessages.slice(-3).map(msg => msg.agent);
    const isLooping = recentAgentSequence.every(agent => agent === lastAgent);
    
    if (isLooping) {
      logger.debug(`🔄 Breaking conversation loop - forcing agent rotation from ${lastAgent}`);
      const nextIndex = (this.lastAgentIndex + 1) % this.agents.length;
      this.lastAgentIndex = nextIndex;
      return this.agents[nextIndex];
    }
    
    // 15% chance for self-response if agent spoke recently (within 1 minute) - reduced from 25%
    const shouldSelfRespond = 
      timeSinceLastMessage < 60 && 
      Math.random() < 0.15;
    
    if (shouldSelfRespond) {
      logger.debug(`🔄 Agent ${lastAgent} responding to themselves (${timeSinceLastMessage}s ago)`);
      return lastAgent; // Same agent continues
    }
    
    // Normal rotation
    const nextIndex = (this.lastAgentIndex + 1) % this.agents.length;
    this.lastAgentIndex = nextIndex;
    return this.agents[nextIndex];
  }

  // Enhanced context building for better conversation flow
  private buildEnhancedContext(recentMessages: OracleMessage[], currentAgent: string): string {
    if (recentMessages.length === 0) {
      return this.getInitialTopicPrompt();
    }

    // Check for message repetition and force topic change if needed
    const lastMessage = recentMessages[recentMessages.length - 1];
    const previousAgent = lastMessage.agent;
    
    // Detect if the last 3 messages are identical (indicating a loop)
    const lastThreeMessages = recentMessages.slice(-3).map(msg => msg.message);
    const isRepeating = lastThreeMessages.length >= 2 && 
      lastThreeMessages.every(msg => msg === lastThreeMessages[0]);
    
    if (isRepeating) {
      logger.debug('🔄 Detected message repetition - forcing topic change');
      this.forceTopicChange();
    }
    
    // Enhanced conversation analysis
    const conversationAnalysis = this.analyzeConversationFlow(recentMessages, currentAgent);
    
    // Show last 5 messages for better context awareness
    const conversationFlow = recentMessages.slice(-5).map((msg, index) => {
      const timeAgo = Math.floor((Date.now() - msg.timestamp) / 1000);
      const isSelf = msg.agent === currentAgent;
      const selfTag = isSelf ? ' [YOUR PREVIOUS MESSAGE]' : '';
      const messageNumber = recentMessages.length - 5 + index + 1;
      return `#${messageNumber} ${msg.agent} (${timeAgo}s ago)${selfTag}: ${msg.message}`;
    }).join('\n');

    // Add self-tagging and response instructions
    const selfResponseInstructions = this.getSelfResponseInstructions(currentAgent, recentMessages);
    const continuityInstructions = this.getContinuityInstructions(previousAgent, currentAgent, recentMessages);
    const topicPrompt = this.getCurrentTopicPrompt();
    
    // Add variety to prevent repetition
    const varietyPrompt = this.getVarietyPrompt(currentAgent, recentMessages);
    
    // Add conversation state awareness
    const conversationState = this.getConversationState(recentMessages, currentAgent);
    
    // Add timestamp-based uniqueness
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substr(2, 9);
    
    return `CURRENT DISCUSSION TOPIC:
${topicPrompt}

CONVERSATION ANALYSIS:
${conversationAnalysis}

CONVERSATION STATE:
${conversationState}

CONVERSATION CONTEXT (Last 5 messages):
${conversationFlow}

SELF-TAGGING & RESPONSE RULES:
${selfResponseInstructions}

CONTINUITY INSTRUCTIONS:
${continuityInstructions}

VARIETY & UNIQUENESS:
${varietyPrompt}

UNIQUE SESSION ID: ${uniqueId}_${timestamp}

Continue this oracle debate with contextual awareness, self-reflection, and natural flow.`;
  }

  private getInitialTopicPrompt(): string {
    const topics = [
      "Analyze the current state of decentralized finance and emerging token ecosystems",
      "Discuss the impact of market volatility on new token launches and investor behavior", 
      "Examine the role of community sentiment in driving token adoption and price discovery",
      "Explore the challenges of identifying genuine utility versus speculative hype in new projects",
      "Debate the effectiveness of different tokenomics models in creating sustainable value",
      "Investigate the relationship between on-chain metrics and long-term project viability"
    ];
    
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    return `Begin a new oracle conversation about: ${randomTopic}`;
  }

  private getCurrentTopicPrompt(): string {
    // Generate dynamic topics based on current market conditions or random selection
    const marketTopics = [
      "Current DeFi landscape and emerging opportunities",
      "Token holder behavior patterns and market manipulation risks", 
      "Technical analysis of key support and resistance levels",
      "Fundamental analysis of project utility and adoption potential",
      "Market sentiment indicators and fear/greed dynamics",
      "Risk assessment of new token launches and investment strategies",
      "Future outlook for blockchain innovation and token ecosystems"
    ];
    
    const randomTopic = marketTopics[Math.floor(Math.random() * marketTopics.length)];
    return `Current Focus: ${randomTopic}`;
  }

  private generateMockTokenData(): any {
    // Generate realistic mock token data for oracle conversations
    const tokenNames = [
      'Quantum Oracle', 'DeFi Nexus', 'Crypto Vault', 'Blockchain Bridge', 
      'Token Matrix', 'Digital Oracle', 'Crypto Nexus', 'Blockchain Oracle',
      'DeFi Oracle', 'Crypto Bridge', 'Token Vault', 'Digital Nexus'
    ];
    
    const symbols = ['QOR', 'DFN', 'CVT', 'BBR', 'TMX', 'DOR', 'CNX', 'BOR', 'DFO', 'CBR', 'TVT', 'DNX'];
    
    const randomIndex = Math.floor(Math.random() * tokenNames.length);
    const name = tokenNames[randomIndex];
    const symbol = symbols[randomIndex];
    
    // Generate realistic market data
    const marketcap = Math.random() * 10000000 + 100000; // $100K to $10M
    const price_usd = Math.random() * 0.01 + 0.001; // $0.001 to $0.011
    const volume_24h = Math.random() * 500000 + 10000; // $10K to $500K
    const liquidity = Math.random() * 2000000 + 50000; // $50K to $2M
    
    return {
      name: name,
      symbol: symbol,
      mint: `oracle-${symbol.toLowerCase()}-${Date.now()}`,
      status: 'active',
      marketcap: Math.floor(marketcap),
      price_usd: parseFloat(price_usd.toFixed(8)),
      volume_24h: Math.floor(volume_24h),
      liquidity: Math.floor(liquidity),
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 30 days
      source: 'oracle_simulation',
      decimals: 9,
      supply: Math.floor(1000000000 + Math.random() * 9000000000) // 1B to 10B supply
    };
  }

  private getSelfResponseInstructions(currentAgent: string, recentMessages: OracleMessage[]): string {
    // Check if this agent has spoken recently
    const myRecentMessages = recentMessages.filter(msg => msg.agent === currentAgent);
    const lastMyMessage = myRecentMessages[myRecentMessages.length - 1];
    const timeSinceMyLastMessage = lastMyMessage ? 
      Math.floor((Date.now() - lastMyMessage.timestamp) / 1000) : Infinity;

    if (myRecentMessages.length === 0) {
      return `- This is your first message - jump right in
- Focus on the current discussion topic
- Keep it short and conversational
- No formal introductions needed`;
    } else if (timeSinceMyLastMessage < 30) {
      return `- You spoke recently (${timeSinceMyLastMessage}s ago) - build on it
- Reference your previous point briefly
- Add new value, don't repeat yourself
- Keep it short and natural`;
    } else if (myRecentMessages.length > 1) {
      return `- You have previous messages - reference them briefly when relevant
- Build on or challenge your own insights
- Keep it conversational and concise
- Always add new perspective`;
    } else {
      return `- You have one previous message - connect to it if relevant
- Keep it natural and conversational
- Add new value, don't repeat yourself
- Stay concise`;
    }
  }

  private getContinuityInstructions(previousAgent: string, currentAgent: string, recentMessages: OracleMessage[]): string {
    const messageCount = recentMessages.length;
    const timeSinceLastMessage = recentMessages.length > 0 ? 
      Math.floor((Date.now() - recentMessages[recentMessages.length - 1].timestamp) / 1000) : 0;

    // Different continuity strategies based on conversation state
    if (messageCount < 3) {
      return `- This is early in the conversation - jump right in
- Build on what ${previousAgent} said or introduce a new angle
- Keep it short and punchy - 1-2 sentences max
- Sound natural and conversational
- Mix questions and statements - don't always ask questions`;
    } else if (messageCount < 8) {
      return `- Continue the current discussion naturally
- Respond to ${previousAgent}'s points or questions
- Reference previous insights briefly
- Keep responses short and direct
- Sometimes make statements, sometimes ask questions`;
    } else {
      return `- This is an ongoing conversation - maintain flow
- Acknowledge the conversation and build on it
- Reference key points from earlier briefly
- Keep it conversational and concise
- Vary your handoffs - questions, statements, or simple passes`;
    }
  }

  private forceTopicChange(): void {
    const newTopics = [
      "Analyze the technical indicators and chart patterns",
      "Discuss market sentiment and investor psychology", 
      "Examine liquidity dynamics and trading volume patterns",
      "Explore price action and support/resistance levels",
      "Consider macro market conditions and external factors",
      "Evaluate token fundamentals and project development",
      "Assess risk management and position sizing strategies",
      "Review recent news and market catalysts"
    ];
    
    const randomTopic = newTopics[Math.floor(Math.random() * newTopics.length)];
    this.setConversationTopic(randomTopic);
    logger.debug(`🔄 Forced topic change to: ${randomTopic}`);
  }

  private getVarietyPrompt(currentAgent: string, recentMessages: OracleMessage[]): string {
    const varietyInstructions = [
      "NEVER repeat the exact same message, analysis, or wording",
      "Always bring a COMPLETELY NEW perspective or angle to the discussion", 
      "If you've said something similar before, build on it with fresh insights",
      "Use different technical indicators, timeframes, or analytical approaches",
      "Vary your language and sentence structure completely",
      "Ask different types of questions or make different types of statements",
      "Reference different aspects of the token data or market conditions",
      "Change your analytical focus - if you discussed price, talk about volume next",
      "Use different vocabulary and phrasing than previous messages",
      "Bring up new data points or market observations"
    ];
    
    // Add agent-specific variety
    const agentVariety = {
      'analyzer': "Focus on different technical indicators, chart patterns, or market metrics - NEVER repeat the same analysis",
      'predictor': "Make different types of predictions - short-term, long-term, or scenario-based - vary your approach",
      'quantum-eraser': "Explore different philosophical angles or unconventional perspectives - change your focus", 
      'retrocausal': "Examine different historical patterns or cause-effect relationships - find new angles"
    };
    
    const agentSpecific = agentVariety[currentAgent as keyof typeof agentVariety] || "Bring a unique analytical perspective";
    
    // Add message count-based variety
    const messageCount = recentMessages.length;
    const varietyLevel = messageCount > 5 ? "HIGH" : messageCount > 2 ? "MEDIUM" : "LOW";
    
    return `${varietyInstructions.join('\n')}\n\nAGENT-SPECIFIC VARIETY: ${agentSpecific}\n\nVARIETY LEVEL: ${varietyLevel} - ${varietyLevel === 'HIGH' ? 'Be extremely creative and avoid any repetition' : varietyLevel === 'MEDIUM' ? 'Focus on bringing new insights' : 'Start fresh and unique'}`;
  }

  private analyzeConversationFlow(recentMessages: OracleMessage[], currentAgent: string): string {
    const messageCount = recentMessages.length;
    const lastMessage = recentMessages[recentMessages.length - 1];
    const previousAgent = lastMessage?.agent;
    
    // Analyze conversation patterns
    const agentCounts = recentMessages.reduce((acc, msg) => {
      acc[msg.agent] = (acc[msg.agent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostActiveAgent = Object.entries(agentCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);
    const conversationLength = messageCount;
    const timeSpan = recentMessages.length > 0 ? 
      Math.floor((Date.now() - recentMessages[0].timestamp) / 1000) : 0;
    
    // Analyze conversation topics
    const topics = this.extractTopicsFromMessages(recentMessages);
    const currentTopic = topics[topics.length - 1] || 'general discussion';
    
    // Analyze conversation dynamics
    const hasQuestions = recentMessages.some(msg => msg.message.includes('?'));
    const hasStatements = recentMessages.some(msg => !msg.message.includes('?'));
    const hasSelfReferences = recentMessages.some(msg => msg.agent === currentAgent);
    
    return `CONVERSATION METRICS:
- Total messages: ${conversationLength}
- Time span: ${timeSpan} seconds
- Most active agent: ${mostActiveAgent[0]} (${mostActiveAgent[1]} messages)
- Current topic: ${currentTopic}
- Conversation style: ${hasQuestions && hasStatements ? 'Mixed questions/statements' : hasQuestions ? 'Question-heavy' : 'Statement-heavy'}
- Your participation: ${hasSelfReferences ? 'You have spoken before' : 'This is your first message'}

CONVERSATION FLOW:
- Previous speaker: ${previousAgent || 'None'}
- Your role: ${currentAgent}
- Context depth: ${Math.min(messageCount, 5)} messages visible
- Discussion stage: ${messageCount < 3 ? 'Opening' : messageCount < 8 ? 'Developing' : 'Deep discussion'}`;
  }

  private getConversationState(recentMessages: OracleMessage[], currentAgent: string): string {
    const messageCount = recentMessages.length;
    const lastMessage = recentMessages[recentMessages.length - 1];
    const previousAgent = lastMessage?.agent;
    
    // Determine conversation state
    let state = 'opening';
    if (messageCount > 2) state = 'developing';
    if (messageCount > 6) state = 'deep_discussion';
    if (messageCount > 12) state = 'extended_debate';
    
    // Check for specific conversation patterns
    const hasRecentSelfMessage = recentMessages.slice(-3).some(msg => msg.agent === currentAgent);
    const hasQuestions = recentMessages.slice(-3).some(msg => msg.message.includes('?'));
    const hasHandoffs = recentMessages.slice(-3).some(msg => 
      msg.message.includes('Predictor') || msg.message.includes('Analyzer') || 
      msg.message.includes('Quantum Eraser') || msg.message.includes('Retrocausal')
    );
    
    // Determine what the current agent should focus on
    let focus = 'introduce_new_insights';
    if (hasRecentSelfMessage) focus = 'build_on_previous_points';
    if (hasQuestions) focus = 'answer_questions_and_continue';
    if (hasHandoffs) focus = 'respond_to_direct_handoff';
    
    return `CONVERSATION STATE: ${state.toUpperCase()}
FOCUS: ${focus.toUpperCase()}
CONTEXT: ${messageCount} messages, ${previousAgent} just spoke
YOUR TASK: ${this.getTaskForAgent(currentAgent, state, focus, previousAgent)}`;
  }

  private getTaskForAgent(agent: string, state: string, focus: string, previousAgent: string): string {
    const tasks = {
      'analyzer': {
        'opening': 'Start with technical analysis of current token metrics',
        'developing': 'Build on previous analysis with deeper technical insights',
        'deep_discussion': 'Provide sophisticated technical analysis and challenge assumptions',
        'extended_debate': 'Synthesize previous discussions and provide comprehensive analysis'
      },
      'predictor': {
        'opening': 'Make initial predictions based on current market conditions',
        'developing': 'Refine predictions based on new information and discussion',
        'deep_discussion': 'Provide detailed scenario analysis and risk assessment',
        'extended_debate': 'Synthesize multiple perspectives into actionable predictions'
      },
      'quantum-eraser': {
        'opening': 'Challenge initial assumptions and provide alternative perspectives',
        'developing': 'Question established patterns and explore unconventional angles',
        'deep_discussion': 'Provide critical analysis and reveal hidden truths',
        'extended_debate': 'Synthesize contradictions and provide philosophical insights'
      },
      'retrocausal': {
        'opening': 'Examine historical patterns and their implications',
        'developing': 'Connect past events to current market conditions',
        'deep_discussion': 'Provide strategic insights based on historical analysis',
        'extended_debate': 'Synthesize historical patterns into future strategies'
      }
    };
    
    const agentTasks = tasks[agent as keyof typeof tasks] || tasks['analyzer'];
    return agentTasks[state as keyof typeof agentTasks] || agentTasks['opening'];
  }

  private extractTopicsFromMessages(messages: OracleMessage[]): string[] {
    const topics: string[] = [];
    messages.forEach(msg => {
      const messageTopics = this.extractTopics(msg.message);
      topics.push(...messageTopics);
    });
    return [...new Set(topics)]; // Remove duplicates
  }

  // Topic and theme management
  private async updateConversationTopic(newMessage: OracleMessage): Promise<void> {
    try {
      const session = await this.getCurrentSession();
      if (!session) return;

      // Extract potential topics from the message
      const topics = this.extractTopics(newMessage.message);
      const currentTime = Date.now();
      
      // Check if we should change topics (every 10 messages or 5 minutes)
      const shouldChangeTopic = 
        (session.messageCount % 10 === 0) || 
        (session.lastTopicChange && (currentTime - session.lastTopicChange) > 300000);

      if (shouldChangeTopic && topics.length > 0) {
        const newTopic = topics[0];
        const topicHistory = session.topicHistory || [];
        
        await this.updateSession({
          ...session,
          currentTopic: newTopic,
          lastTopicChange: currentTime,
          topicHistory: [...topicHistory.slice(-4), newTopic] // Keep last 5 topics
        });
        
        logger.debug(`🔄 Oracle topic changed to: ${newTopic}`);
      }
    } catch (error) {
      logger.error('Error updating conversation topic:', error);
    }
  }

  private extractTopics(message: string): string[] {
    // Simple topic extraction based on keywords
    const topicKeywords = {
      'market_analysis': ['market', 'price', 'volume', 'liquidity', 'trading'],
      'holder_behavior': ['holders', 'distribution', 'concentration', 'whales'],
      'technical_analysis': ['levels', 'support', 'resistance', 'patterns', 'indicators'],
      'fundamentals': ['utility', 'adoption', 'innovation', 'technology', 'use case'],
      'market_sentiment': ['fear', 'greed', 'optimism', 'pessimism', 'sentiment'],
      'risk_assessment': ['risk', 'danger', 'warning', 'caution', 'safety'],
      'future_outlook': ['future', 'prediction', 'forecast', 'scenario', 'outcome']
    };

    const messageLower = message.toLowerCase();
    const foundTopics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        foundTopics.push(topic);
      }
    }

    return foundTopics.length > 0 ? foundTopics : ['general_market_discussion'];
  }

  // Public method to set conversation topic
  public async setConversationTopic(topic: string): Promise<void> {
    try {
      const session = await this.getCurrentSession();
      if (!session) return;

      const topicHistory = session.topicHistory || [];
      
      await this.updateSession({
        ...session,
        currentTopic: topic,
        lastTopicChange: Date.now(),
        topicHistory: [...topicHistory.slice(-4), topic]
      });
      
      logger.info(`🎯 Oracle conversation topic set to: ${topic}`);
    } catch (error) {
      logger.error('Error setting conversation topic:', error);
    }
  }

  // Public method to get current conversation context
  public async getConversationContext(): Promise<{
    currentTopic: string;
    recentMessages: OracleMessage[];
    topicHistory: string[];
    messageCount: number;
  }> {
    try {
      const session = await this.getCurrentSession();
      const recentMessages = await this.getRecentMessages(5);
      
      return {
        currentTopic: session?.currentTopic || 'general_market_discussion',
        recentMessages,
        topicHistory: session?.topicHistory || [],
        messageCount: session?.messageCount || 0
      };
    } catch (error) {
      logger.error('Error getting conversation context:', error);
      return {
        currentTopic: 'general_market_discussion',
        recentMessages: [],
        topicHistory: [],
        messageCount: 0
      };
    }
  }

  // Public method to clear all messages
  public async clearMessages(): Promise<void> {
    try {
      const db = getFirebaseDatabase();
      if (!db) {
        logger.warn('Firebase database not available - cannot clear messages');
        return;
      }
      await db.ref('oracle-messages').remove();
      
      // Reset session
      await db.ref(`oracle-session/${this.sessionId}`).update({
        messageCount: 0,
        lastMessageTime: Date.now(),
        updatedAt: Date.now(),
        currentTopic: undefined,
        conversationTheme: undefined,
        lastTopicChange: undefined,
        topicHistory: []
      });
      
      logger.info('🗑️ Oracle messages cleared');
    } catch (error) {
      logger.error('Error clearing messages:', error);
    }
  }
}

// Export singleton instance
export const oracleService = OracleService.getInstance();
