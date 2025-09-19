import { logger } from '../utils/logger';
import { getFirebaseDatabase, initializeFirebase } from '../config/firebase';
import {
  normalizeAgent,
  buildSystemPrompt,
  buildUserPrompt,
  buildPracticalSystemPrompt,
  buildPracticalUserPrompt,
  postProcessOracle,
  enforceShortResponse,
} from './oraclePrompt';

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  sessionId: string;
  tokenMint?: string;
  companionName?: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

export class GrokService {
  private apiKey: string;
  private apiUrl: string;
  private responseCache: Map<string, { response: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 300000; // 5 minutes cache
  private firebaseInitialized: boolean = false;

  constructor() {
    this.apiKey = 'xai-jgZ2TssvSXVTpLYxHOMo5BgAx0LjNvPG6F4vng7aWLBk6MkBgmarouonK4Kg0mP6Kez0N2uijthE76xu'; // Hardcoded API key
    this.apiUrl = process.env.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
    
    if (!this.apiKey) {
      logger.warn('GROK_API_KEY not set; Grok service will be disabled');
    }

    // Initialize Firebase for conversation storage
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      initializeFirebase();
      this.firebaseInitialized = true;
      logger.info('🔥 Firebase initialized for Grok conversation storage');
    } catch (error) {
      logger.error('❌ Failed to initialize Firebase for Grok service:', error);
      this.firebaseInitialized = false;
    }
  }

  private getCacheKey(messages: GrokMessage[]): string {
    // Create a simple cache key from the last user message
    const userMessage = messages.find(m => m.role === 'user');
    return userMessage ? userMessage.content.slice(0, 100) : '';
  }

  private getCachedResponse(cacheKey: string): string | null {
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.response;
    }
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    return null;
  }

  private setCachedResponse(cacheKey: string, response: string): void {
    this.responseCache.set(cacheKey, { response, timestamp: Date.now() });
  }

  // Firebase conversation storage methods
  private async saveConversation(conversation: Conversation): Promise<void> {
    if (!this.firebaseInitialized) {
      logger.warn('Firebase not initialized, skipping conversation save');
      return;
    }

    try {
      const db = getFirebaseDatabase();
      await db.ref(`conversations/${conversation.id}`).set(conversation);
      logger.debug(`Saved conversation ${conversation.id} to Firebase`);
    } catch (error) {
      logger.error('Failed to save conversation to Firebase:', error);
    }
  }

  private async getConversation(conversationId: string): Promise<Conversation | null> {
    if (!this.firebaseInitialized) {
      logger.warn('Firebase not initialized, returning null conversation');
      return null;
    }

    try {
      const db = getFirebaseDatabase();
      const snapshot = await db.ref(`conversations/${conversationId}`).once('value');
      return snapshot.val();
    } catch (error) {
      logger.error('Failed to get conversation from Firebase:', error);
      return null;
    }
  }

  private async getConversationsBySession(sessionId: string): Promise<Conversation[]> {
    if (!this.firebaseInitialized) {
      logger.warn('Firebase not initialized, returning empty conversations');
      return [];
    }

    try {
      const db = getFirebaseDatabase();
      const snapshot = await db.ref('conversations')
        .orderByChild('sessionId')
        .equalTo(sessionId)
        .once('value');
      
      const conversations = snapshot.val();
      return conversations ? Object.values(conversations) : [];
    } catch (error) {
      logger.error('Failed to get conversations by session from Firebase:', error);
      return [];
    }
  }

  private async getConversationsByToken(tokenMint: string): Promise<Conversation[]> {
    if (!this.firebaseInitialized) {
      logger.warn('Firebase not initialized, returning empty conversations');
      return [];
    }

    try {
      const db = getFirebaseDatabase();
      const snapshot = await db.ref('conversations')
        .orderByChild('tokenMint')
        .equalTo(tokenMint)
        .once('value');
      
      const conversations = snapshot.val();
      return conversations ? Object.values(conversations) : [];
    } catch (error) {
      logger.error('Failed to get conversations by token from Firebase:', error);
      return [];
    }
  }

  private generateConversationId(sessionId: string, tokenMint?: string): string {
    const timestamp = Date.now();
    const tokenPart = tokenMint ? `_${tokenMint.slice(0, 8)}` : '';
    return `${sessionId}${tokenPart}_${timestamp}`;
  }


  async chatCompletion(messages: GrokMessage[], model: string = 'grok-3', temperature: number = 0.7): Promise<string | null> {
    if (!this.apiKey) {
      logger.warn('Grok API key not available');
      return null;
    }

    // Check cache first for speed
    const cacheKey = this.getCacheKey(messages);
    if (cacheKey) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        logger.debug('Returning cached response for faster performance');
        return cached;
      }
    }

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      logger.debug('Sending request to Grok API:', JSON.stringify({
        messages: messages.map(m => ({ role: m.role, content: m.content.slice(0, 100) + '...' })),
        model,
        temperature,
        max_tokens: 150
      }));

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages,
          model,
          stream: false,
          temperature,
          max_tokens: 500
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Grok API error: ${response.status} ${response.statusText}`, { 
          status: response.status, 
          statusText: response.statusText,
          errorBody: errorText 
        });
        return null;
      }

      const data = await response.json() as GrokResponse;
      
      if (data.choices && data.choices.length > 0) {
        const responseText = data.choices[0].message.content;
        
        // Check if response is empty or filtered
        if (!responseText || responseText.trim() === '') {
          logger.warn('Grok API returned empty response, likely due to content filtering');
          return null;
        }
        
        // Cache the response for future use
        if (cacheKey) {
          this.setCachedResponse(cacheKey, responseText);
        }
        
        return responseText;
      }

      logger.warn('Grok API returned no choices in response');
      return null;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        logger.error('Grok API request timed out after 10 seconds');
      } else {
        logger.error('Grok API request failed:', error);
      }
      
      // Return a quick fallback response instead of null to avoid empty responses
      return "Analysis in progress - API temporarily unavailable.";
    }
  }

  async analyzeToken(tokenData: any): Promise<string | null> {
    const systemMessage: GrokMessage = {
      role: 'system',
      content: `You are a Solana token analyst. Analyze the provided token data and give insights about:
      - Token fundamentals
      - Market potential
      - Risk assessment
      - Trading recommendations
      
      Keep responses concise and actionable.`
    };

    const userMessage: GrokMessage = {
      role: 'user',
      content: `Analyze this Solana token:
      
      Name: ${tokenData.name || 'Unknown'}
      Symbol: ${tokenData.symbol || 'Unknown'}
      Mint: ${tokenData.mint}
      Market Cap: $${tokenData.marketcap || 'Unknown'}
      Price: $${tokenData.price_usd || 'Unknown'}
      Volume 24h: $${tokenData.volume_24h || 'Unknown'}
      Liquidity: $${tokenData.liquidity || 'Unknown'}
      Status: ${tokenData.status || 'Unknown'}
      Source: ${tokenData.source || 'Unknown'}
      
      Provide a brief analysis and recommendation.`
    };

    return await this.chatCompletion([systemMessage, userMessage]);
  }

  async generateCompanionResponse(
    tokenData: any, 
    userQuery: string, 
    companionName?: string, 
    isOracleHub: boolean = false,
    sessionId?: string,
    conversationId?: string
  ): Promise<string | null> {
    const agent = normalizeAgent(companionName);
    
    // Determine if this is for Oracle Hub (mystical) or Scope page (practical)
    const isOracleConversation = isOracleHub || 
      tokenData?.name === 'Oracle Market' || 
      tokenData?.symbol === 'ORACLE' || 
      tokenData?.mint === 'oracle-conversation';
    
    const systemMessage: GrokMessage = {
      role: 'system',
      content: isOracleConversation 
        ? buildSystemPrompt(agent, tokenData?.name, tokenData?.symbol)  // Mystical Oracle Hub prompts
        : buildPracticalSystemPrompt(agent, tokenData?.name, tokenData?.symbol)  // Practical Scope page prompts
    };

    const userMessage: GrokMessage = {
      role: 'user',
      content: isOracleConversation 
        ? buildUserPrompt(tokenData, userQuery)  // General Oracle Hub context
        : buildPracticalUserPrompt(tokenData, userQuery)  // Detailed token analysis context
    };

    // Get conversation history if conversationId is provided
    let conversationHistory: ConversationMessage[] = [];
    if (conversationId) {
      const existingConversation = await this.getConversation(conversationId);
      if (existingConversation) {
        conversationHistory = existingConversation.messages;
      }
    }

    // Build messages array with conversation history
    const messages: GrokMessage[] = [
      systemMessage,
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      userMessage
    ];

    // Use lower temperature for more consistent, shorter responses
    const temperature = isOracleConversation ? 0.9 : 0.3;
    let response = await this.chatCompletion(messages, 'grok-3', temperature);
    
    if (!response) {
      // Quick fallback response instead of null
      return `${agent} is analyzing the data. Please try again in a moment.`;
    }

    // Post-process to enforce rules
    if (isOracleConversation) {
      // Oracle Hub: use full post-processing with agent questions
      response = postProcessOracle(response, agent);
    } else {
      // Scope page: enforce short responses WITHOUT agent questions
      response = enforceShortResponse(response);
      // NO postProcessOracle for companion chat - keep it self-contained
    }
    
    // Skip expensive retry logic for speed - just scrub words and move on
    const FORBIDDEN_WORDS = /(\bvwap\b|\bcvd\b|\blp\b|\btargets?\b|\bprobabilit(y|ies)\b|\btimestamp(s)?\b)/gi;
    if (FORBIDDEN_WORDS.test(response)) {
      // Just replace the words instead of making another API call
      response = response.replace(FORBIDDEN_WORDS, 'trading signals');
    }

    // Save conversation to Firebase if sessionId is provided
    if (sessionId) {
      const currentConversationId = conversationId || this.generateConversationId(sessionId, tokenData?.mint);
      const timestamp = Date.now();
      
      const conversationMessage: ConversationMessage = {
        role: 'assistant',
        content: response,
        timestamp
      };

      // Get or create conversation
      let conversation = await this.getConversation(currentConversationId);
      if (!conversation) {
        conversation = {
          id: currentConversationId,
          sessionId,
          tokenMint: tokenData?.mint,
          companionName: agent,
          messages: [],
          createdAt: timestamp,
          updatedAt: timestamp
        };
      }

      // Add user message and assistant response
      conversation.messages.push({
        role: 'user',
        content: userQuery,
        timestamp: timestamp - 1000 // Slightly before assistant response
      });
      conversation.messages.push(conversationMessage);
      conversation.updatedAt = timestamp;

      // Save to Firebase
      await this.saveConversation(conversation);
    }

    return response;
  }

  async analyzeRetrocausality(tokenData: any, holdersData: any[], transactionsData: any): Promise<string | null> {
    const systemMessage: GrokMessage = {
      role: 'system',
      content: `You are a quantum finance oracle specializing in retrocausality analysis. Analyze token data to determine future-echo delta and scenario bias. 

      Focus on:
      - Holder distribution and concentration
      - Market dynamics and liquidity patterns  
      - Volume and price momentum indicators
      
      Return ONLY a JSON object with this exact structure:
      {
        "futureEchoDelta": "Strong|Medium|Weak",
        "scenarioBias": "Bullish|Bearish|Neutral", 
        "confidence": number (0-100),
        "reasoning": "Brief explanation"
      }`
    };

    // Calculate key metrics from holders data
    const totalHolders = holdersData.length;
    const topHolderConcentration = holdersData.length > 0 ? holdersData[0]?.amount || 0 : 0;
    const avgHolderSize = holdersData.length > 0 ? holdersData.reduce((sum, h) => sum + (h.amount || 0), 0) / holdersData.length : 0;
    
    const userMessage: GrokMessage = {
      role: 'user',
      content: `Analyze this token for retrocausality patterns:

      TOKEN DATA:
      Name: ${tokenData.name || 'Unknown'}
      Symbol: ${tokenData.symbol || 'Unknown'}
      Market Cap: $${tokenData.marketcap || 'Unknown'}
      Price: $${tokenData.price_usd || 'Unknown'}
      Volume 24h: $${tokenData.latest_marketcap?.volume_24h || 'Unknown'}
      Liquidity: $${tokenData.liquidity || 'Unknown'}
      Status: ${tokenData.status || 'Unknown'}

      HOLDERS DATA:
      Total Holders: ${totalHolders}
      Top Holder Amount: ${topHolderConcentration}
      Average Holder Size: ${avgHolderSize}
      Holder Distribution: ${holdersData.slice(0, 10).map(h => `${h.owner?.slice(0, 8)}... (${h.amount})`).join(', ')}

      TRANSACTION DATA:
      Volume: $${transactionsData.volume}
      Activity: ${transactionsData.recentActivity}

      Provide retrocausality analysis focusing on future market direction and scenario bias.`
    };

    const response = await this.chatCompletion([systemMessage, userMessage], 'grok-3', 0.3);
    
    if (!response) {
      return null;
    }

    // Try to parse JSON response, fallback to structured text if needed
    try {
      const parsed = JSON.parse(response);
      return JSON.stringify(parsed);
    } catch {
      // If not valid JSON, return structured response
      return JSON.stringify({
        futureEchoDelta: "Weak",
        scenarioBias: "Neutral", 
        confidence: 50,
        reasoning: "Unable to parse AI response"
      });
    }
  }

  // Public methods for conversation management
  async getConversationHistory(sessionId: string): Promise<Conversation[]> {
    return await this.getConversationsBySession(sessionId);
  }

  async getTokenConversations(tokenMint: string): Promise<Conversation[]> {
    return await this.getConversationsByToken(tokenMint);
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    return await this.getConversation(conversationId);
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    if (!this.firebaseInitialized) {
      logger.warn('Firebase not initialized, cannot delete conversation');
      return false;
    }

    try {
      const db = getFirebaseDatabase();
      await db.ref(`conversations/${conversationId}`).remove();
      logger.debug(`Deleted conversation ${conversationId} from Firebase`);
      return true;
    } catch (error) {
      logger.error('Failed to delete conversation from Firebase:', error);
      return false;
    }
  }
}

export const grokService = new GrokService();

// Export the attachment announcement helper for UI
export { formatAttachmentAnnouncement } from './oraclePrompt';
