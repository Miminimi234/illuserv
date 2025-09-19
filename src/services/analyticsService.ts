import { logger } from '../utils/logger';

export interface UserSession {
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
    country?: string;
    city?: string;
    createdAt: Date;
    lastActivity: Date;
    isActive: boolean;
    totalPageViews: number;
    totalApiCalls: number;
}

export interface PageView {
    sessionId: string;
    pagePath: string;
    pageTitle?: string;
    referrer?: string;
    viewDuration?: number;
    createdAt: Date;
}

export interface ApiCall {
    sessionId: string;
    endpoint: string;
    method: string;
    responseTime?: number;
    statusCode?: number;
    errorMessage?: string;
    createdAt: Date;
}

export interface FeatureUsage {
    sessionId: string;
    featureName: string;
    action: string;
    metadata?: any;
    createdAt: Date;
}

export class AnalyticsService {
    private static instance: AnalyticsService;
    private isRunning = false;
    private intervalId?: NodeJS.Timeout;
    private inMemoryData: {
        sessions: Map<string, UserSession>;
        pageViews: PageView[];
        apiCalls: ApiCall[];
        featureUsage: FeatureUsage[];
    } = {
        sessions: new Map(),
        pageViews: [],
        apiCalls: [],
        featureUsage: []
    };

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    private constructor() {
        // Initialize in-memory storage
        logger.info('✅ Analytics Service: Using in-memory storage');
    }

    // Track user session
    async trackSession(sessionId: string, ipAddress?: string, userAgent?: string): Promise<void> {
        try {
            const now = new Date();
            const existingSession = this.inMemoryData.sessions.get(sessionId);
            
            if (existingSession) {
                existingSession.lastActivity = now;
                existingSession.isActive = true;
            } else {
                const newSession: UserSession = {
                    sessionId,
                    ipAddress,
                    userAgent,
                    createdAt: now,
                    lastActivity: now,
                    isActive: true,
                    totalPageViews: 0,
                    totalApiCalls: 0
                };
                this.inMemoryData.sessions.set(sessionId, newSession);
            }
        } catch (error: any) {
            logger.error('Error tracking session:', error.message);
        }
    }

    // Track page view
    async trackPageView(sessionId: string, pagePath: string, pageTitle?: string, referrer?: string): Promise<void> {
        try {
            const pageView: PageView = {
                sessionId,
                pagePath,
                pageTitle,
                referrer,
                createdAt: new Date()
            };
            
            this.inMemoryData.pageViews.push(pageView);
            
            // Update session page view count
            const session = this.inMemoryData.sessions.get(sessionId);
            if (session) {
                session.totalPageViews++;
                session.lastActivity = new Date();
            }
        } catch (error: any) {
            logger.error('Error tracking page view:', error.message);
        }
    }

    // Track API call
    async trackApiCall(
        sessionId: string, 
        endpoint: string, 
        method: string, 
        responseTime?: number, 
        statusCode?: number, 
        errorMessage?: string
    ): Promise<void> {
        try {
            const apiCall: ApiCall = {
                sessionId,
                endpoint,
                method,
                responseTime,
                statusCode,
                errorMessage,
                createdAt: new Date()
            };
            
            this.inMemoryData.apiCalls.push(apiCall);
            
            // Update session API call count
            const session = this.inMemoryData.sessions.get(sessionId);
            if (session) {
                session.totalApiCalls++;
                session.lastActivity = new Date();
            }
        } catch (error: any) {
            logger.error('Error tracking API call:', error.message);
        }
    }

    // Track feature usage
    async trackFeatureUsage(sessionId: string, featureName: string, action: string, metadata?: any): Promise<void> {
        try {
            const featureUsage: FeatureUsage = {
                sessionId,
                featureName,
                action,
                metadata,
                createdAt: new Date()
            };
            
            this.inMemoryData.featureUsage.push(featureUsage);
        } catch (error: any) {
            logger.error('Error tracking feature usage:', error.message);
        }
    }

    // Get analytics data
    getAnalyticsData(): {
        totalSessions: number;
        activeSessions: number;
        totalPageViews: number;
        totalApiCalls: number;
        recentPageViews: PageView[];
        recentApiCalls: ApiCall[];
    } {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        const activeSessions = Array.from(this.inMemoryData.sessions.values())
            .filter(session => session.isActive && session.lastActivity > oneHourAgo).length;
        
        const recentPageViews = this.inMemoryData.pageViews
            .filter(pv => pv.createdAt > oneHourAgo)
            .slice(-50); // Last 50 page views
        
        const recentApiCalls = this.inMemoryData.apiCalls
            .filter(ac => ac.createdAt > oneHourAgo)
            .slice(-50); // Last 50 API calls
        
        return {
            totalSessions: this.inMemoryData.sessions.size,
            activeSessions,
            totalPageViews: this.inMemoryData.pageViews.length,
            totalApiCalls: this.inMemoryData.apiCalls.length,
            recentPageViews,
            recentApiCalls
        };
    }

    // Start the analytics service
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Analytics service is already running');
            return;
        }

        this.isRunning = true;
        logger.info('✅ Analytics Service: Started with in-memory storage');
        
        // Set global status
        (globalThis as any).analyticsServiceStatus = 'running';
    }

    // Stop the analytics service
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }

        logger.info('✅ Analytics Service: Stopped');
        (globalThis as any).analyticsServiceStatus = 'stopped';
    }

    // Clean up old data (keep only last 24 hours)
    private cleanupOldData(): void {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Clean up old page views
        this.inMemoryData.pageViews = this.inMemoryData.pageViews
            .filter(pv => pv.createdAt > oneDayAgo);
        
        // Clean up old API calls
        this.inMemoryData.apiCalls = this.inMemoryData.apiCalls
            .filter(ac => ac.createdAt > oneDayAgo);
        
        // Clean up old feature usage
        this.inMemoryData.featureUsage = this.inMemoryData.featureUsage
            .filter(fu => fu.createdAt > oneDayAgo);
        
        // Mark old sessions as inactive
        for (const session of this.inMemoryData.sessions.values()) {
            if (session.lastActivity < oneDayAgo) {
                session.isActive = false;
            }
        }
    }
}