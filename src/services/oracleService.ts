import { logger } from '../utils/logger';
import { getFirebaseDatabase } from '../config/firebase';
import { grokService } from './grokService';

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
}

export class OracleService {
  private static instance: OracleService;
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastAgentIndex = 0;
  private sessionId: string;
  private readonly agents = ['analyzer', 'predictor', 'quantum-eraser', 'retrocausal'];
  private readonly MESSAGE_INTERVAL = 2000; // 2 seconds
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

    logger.info('✅ Oracle service started - generating messages every 2 seconds');
  }

  public stopOracle(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    logger.info('🛑 Oracle service stopped');
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      lastAgentIndex: this.lastAgentIndex,
      sessionId: this.sessionId,
      messageCount: 0 // Will be updated from session
    };
  }

  private async initializeSession(): Promise<void> {
    try {
      const db = getFirebaseDatabase();
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

      // Determine next agent
      const nextIndex = (this.lastAgentIndex + 1) % this.agents.length;
      const nextAgent = this.agents[nextIndex];
      this.lastAgentIndex = nextIndex;

      logger.debug(`🎯 Oracle generating message for: ${nextAgent}`);

      // Get recent messages for context
      const recentMessages = await this.getRecentMessages(5);
      
      // Generate contextual response using Grok service
      const newMessage = await this.generateContextualResponse(nextAgent, recentMessages);
      
      // Save message to Firebase
      await this.saveMessage(newMessage);
      
      // Update session
      await this.updateSession(newMessage);

      logger.debug(`✅ Oracle message generated: ${newMessage.message.substring(0, 50)}...`);

    } catch (error) {
      logger.error('Error generating Oracle message:', error);
    }
  }

  private async generateContextualResponse(agent: string, recentMessages: OracleMessage[]): Promise<OracleMessage> {
    try {
      // Build context from recent messages
      const context = recentMessages.slice(-3).map(msg => `${msg.agent}: ${msg.message}`).join('\n');
      
      // Create mock token for oracle conversation
      const mockToken = {
        name: 'Oracle Market',
        symbol: 'ORACLE',
        mint: 'oracle-conversation',
        status: 'active',
        marketcap: null,
        price_usd: null,
        volume_24h: null,
        liquidity: null
      };

      // Use Grok service to generate response
      const response = await grokService.generateCompanionResponse(
        mockToken,
        context || 'Continue the oracle conversation',
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
      await db.ref(`oracle-messages/${message.id}`).set(message);
    } catch (error) {
      logger.error('Error saving Oracle message:', error);
    }
  }

  private async getRecentMessages(limit: number): Promise<OracleMessage[]> {
    try {
      const db = getFirebaseDatabase();
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
      const sessionRef = db.ref(`oracle-session/${this.sessionId}`);
      
      await sessionRef.update({
        lastAgentIndex: this.lastAgentIndex,
        messageCount: ((await this.getCurrentSession())?.messageCount || 0) + 1,
        lastMessageTime: message.timestamp,
        updatedAt: Date.now()
      });
    } catch (error) {
      logger.error('Error updating session:', error);
    }
  }

  // Public method to get recent messages for API endpoints
  public async getMessages(limit: number = 20): Promise<OracleMessage[]> {
    try {
      const db = getFirebaseDatabase();
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

  // Public method to clear all messages
  public async clearMessages(): Promise<void> {
    try {
      const db = getFirebaseDatabase();
      await db.ref('oracle-messages').remove();
      
      // Reset session
      await db.ref(`oracle-session/${this.sessionId}`).update({
        messageCount: 0,
        lastMessageTime: Date.now(),
        updatedAt: Date.now()
      });
      
      logger.info('🗑️ Oracle messages cleared');
    } catch (error) {
      logger.error('Error clearing messages:', error);
    }
  }
}

// Export singleton instance
export const oracleService = OracleService.getInstance();
