import { WebSocketServer, WebSocket } from 'ws';
import { getFirebaseDatabase, FIREBASE_PATHS, initializeFirebase } from '../config/firebase';
import { logger } from '../utils/logger';

interface JupiterWebSocketMessage {
  type: 'tokens_update' | 'error' | 'status' | 'ping' | 'pong';
  data?: any;
  timestamp: string;
}

interface ClientConnection {
  ws: WebSocket;
  id: string;
  lastPing: number;
  isAlive: boolean;
}

export class JupiterWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private database: any;
  private firebaseListener: any = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private clientIdCounter = 0;

  constructor() {
    try {
      initializeFirebase();
      this.database = getFirebaseDatabase();
      logger.info('🌐 Jupiter WebSocket Service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Jupiter WebSocket Service:', error);
      throw error;
    }
  }

  /**
   * Start the WebSocket server
   */
  public start(port: number = 8081): void {
    if (this.wss) {
      logger.warn('⚠️ Jupiter WebSocket Service is already running');
      return;
    }

    this.wss = new WebSocketServer({ 
      port,
      path: '/jupiter-tokens'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleNewConnection(ws, req);
    });

    // Set up Firebase listener
    this.setupFirebaseListener();

    // Set up ping/pong mechanism
    this.setupPingPong();

    logger.info(`✅ Jupiter WebSocket Service started on port ${port}`);
  }

  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    if (!this.wss) {
      logger.warn('⚠️ Jupiter WebSocket Service is not running');
      return;
    }

    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close(1000, 'Server shutting down');
    });
    this.clients.clear();

    // Close WebSocket server
    this.wss.close();
    this.wss = null;

    // Remove Firebase listener
    if (this.firebaseListener) {
      this.firebaseListener();
      this.firebaseListener = null;
    }

    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    logger.info('🛑 Jupiter WebSocket Service stopped');
  }

  /**
   * Handle new client connection
   */
  private handleNewConnection(ws: WebSocket, req: any): void {
    const clientId = `client_${++this.clientIdCounter}_${Date.now()}`;
    const clientIP = req.socket.remoteAddress;

    const client: ClientConnection = {
      ws,
      id: clientId,
      lastPing: Date.now(),
      isAlive: true
    };

    this.clients.set(clientId, client);
    logger.info(`🔌 New client connected: ${clientId} from ${clientIP}`);

    // Send initial data
    this.sendInitialData(clientId);

    // Handle messages
    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    // Handle close
    ws.on('close', (code: number, reason: Buffer) => {
      this.handleClientDisconnect(clientId, code, reason.toString());
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      logger.error(`❌ WebSocket error for client ${clientId}:`, error);
      this.handleClientDisconnect(clientId, 1006, 'WebSocket error');
    });

    // Handle pong
    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
        client.lastPing = Date.now();
      }
    });
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(clientId: string, code: number, reason: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      logger.info(`🔌 Client disconnected: ${clientId} (${code}: ${reason})`);
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const message: JupiterWebSocketMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'ping':
          this.sendMessage(clientId, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;
        
        case 'status':
          this.sendStatus(clientId);
          break;
        
        default:
          logger.warn(`⚠️ Unknown message type from ${clientId}: ${message.type}`);
      }
    } catch (error) {
      logger.error(`❌ Error parsing message from ${clientId}:`, error);
    }
  }

  /**
   * Send message to specific client
   */
  private sendMessage(clientId: string, message: JupiterWebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`❌ Error sending message to ${clientId}:`, error);
        this.handleClientDisconnect(clientId, 1006, 'Send error');
      }
    }
  }

  /**
   * Broadcast message to all clients
   */
  private broadcast(message: JupiterWebSocketMessage): void {
    this.clients.forEach((_client, clientId) => {
      this.sendMessage(clientId, message);
    });
  }

  /**
   * Send initial data to new client
   */
  private async sendInitialData(clientId: string): Promise<void> {
    try {
      const snapshot = await this.database.ref(FIREBASE_PATHS.RECENT_TOKENS).once('value');
      const data = snapshot.val();

      if (data) {
        this.sendMessage(clientId, {
          type: 'tokens_update',
          data: data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error(`❌ Error sending initial data to ${clientId}:`, error);
      this.sendMessage(clientId, {
        type: 'error',
        data: { message: 'Failed to load initial data' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send status to client
   */
  private sendStatus(clientId: string): void {
    this.sendMessage(clientId, {
      type: 'status',
      data: {
        connectedClients: this.clients.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set up Firebase listener for real-time updates
   */
  private setupFirebaseListener(): void {
    try {
      this.firebaseListener = this.database.ref(FIREBASE_PATHS.RECENT_TOKENS).on('value', (snapshot: any) => {
        const data = snapshot.val();
        
        if (data) {
          this.broadcast({
            type: 'tokens_update',
            data: data,
            timestamp: new Date().toISOString()
          });
        }
      });

      logger.info('🔥 Firebase listener set up for real-time updates');
    } catch (error) {
      logger.error('❌ Error setting up Firebase listener:', error);
    }
  }

  /**
   * Set up ping/pong mechanism to keep connections alive
   */
  private setupPingPong(): void {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          logger.info(`💀 Terminating inactive client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Get service status
   */
  public getStatus(): { 
    isRunning: boolean; 
    connectedClients: number; 
    uptime: number 
  } {
    return {
      isRunning: this.wss !== null,
      connectedClients: this.clients.size,
      uptime: process.uptime()
    };
  }

  /**
   * Get connected clients info
   */
  public getClientsInfo(): Array<{ id: string; lastPing: number; isAlive: boolean }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      lastPing: client.lastPing,
      isAlive: client.isAlive
    }));
  }
}

// Export singleton instance
export const jupiterWebSocketService = new JupiterWebSocketService();
