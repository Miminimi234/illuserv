import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { AnalyticsService } from '../services/analyticsService';

const router = Router();
const analyticsService = AnalyticsService.getInstance();

// Simple admin authentication middleware
const adminAuth = (req: Request, res: Response, next: any): void => {
    const adminKey = req.headers['x-admin-key'] as string;
    const expectedKey = process.env.ADMIN_KEY || 'admin123'; // Set this in your .env
    
    if (!adminKey || adminKey !== expectedKey) {
        res.status(401).json({ error: 'Unauthorized - Admin access required' });
        return;
    }
    
    next();
};

// Apply admin auth to all routes
router.use(adminAuth);

// Get analytics overview
router.get('/analytics', async (req: Request, res: Response) => {
    try {
        const timeRange = (req.query.range as string) || 'day';
        const analytics = await analyticsService.getAnalyticsData(timeRange as any);
        
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        logger.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics data' });
    }
});

// Get real-time metrics
router.get('/realtime', async (_req: Request, res: Response) => {
    try {
        const metrics = await analyticsService.getRealtimeMetrics();
        
        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        logger.error('Error getting real-time metrics:', error);
        res.status(500).json({ error: 'Failed to get real-time metrics' });
    }
});

// Get user sessions
router.get('/sessions', async (req: Request, res: Response) => {
    try {
        // Mock data since we don't have database
        const mockSessions = [
            {
                session_id: 'mock-session-1',
                ip_address: '127.0.0.1',
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                country: 'US',
                city: 'New York',
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                is_active: true,
                total_page_views: 15,
                total_api_calls: 8
            }
        ];
        
        res.json({
            success: true,
            data: mockSessions
        });
    } catch (error) {
        logger.error('Error getting sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// Get page views
router.get('/page-views', async (req: Request, res: Response) => {
    try {
        // Mock data since we don't have database
        const mockPageViews = [
            {
                page_path: '/',
                page_title: 'Illusio Home',
                referrer: 'https://google.com',
                view_duration: 45000,
                created_at: new Date().toISOString(),
                ip_address: '127.0.0.1',
                country: 'US',
                city: 'New York'
            }
        ];
        
        res.json({
            success: true,
            data: mockPageViews
        });
    } catch (error) {
        logger.error('Error getting page views:', error);
        res.status(500).json({ error: 'Failed to get page views' });
    }
});

// Get API calls
router.get('/api-calls', async (req: Request, res: Response) => {
    try {
        // Mock data since we don't have database
        const mockApiCalls = [
            {
                endpoint: '/api/tokens/jupiter',
                method: 'GET',
                response_time: 150,
                status_code: 200,
                error_message: null,
                created_at: new Date().toISOString(),
                ip_address: '127.0.0.1',
                country: 'US'
            }
        ];
        
        res.json({
            success: true,
            data: mockApiCalls
        });
    } catch (error) {
        logger.error('Error getting API calls:', error);
        res.status(500).json({ error: 'Failed to get API calls' });
    }
});

// Get feature usage
router.get('/feature-usage', async (req: Request, res: Response) => {
    try {
        // Mock data since we don't have database
        const mockFeatureUsage = [
            {
                feature_name: 'jupiter_tokens',
                action: 'fetch',
                metadata: { count: 100 },
                created_at: new Date().toISOString()
            }
        ];
        
        res.json({
            success: true,
            data: mockFeatureUsage
        });
    } catch (error) {
        logger.error('Error getting feature usage:', error);
        res.status(500).json({ error: 'Failed to get feature usage' });
    }
});

// Get system health
router.get('/health', async (_req: Request, res: Response) => {
    try {
        // Mock system health data since we don't have database
        const healthData = {
            database: 'disconnected',
            services: {
                jupiter: 'running',
                websocket: 'running',
                analytics: 'running'
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: healthData
        });
    } catch (error) {
        logger.error('Error getting system health:', error);
        res.status(500).json({ error: 'Failed to get system health' });
    }
});

// Get token statistics
router.get('/tokens/stats', async (_req: Request, res: Response) => {
    try {
        // Mock token statistics since we don't have database
        const tokenStats = {
            total_tokens: 0,
            fresh_tokens: 0,
            active_tokens: 0,
            curve_tokens: 0,
            tokens_by_source: {
                jupiter: 0,
                pump: 0,
                helius: 0
            },
            recent_tokens: []
        };
        
        res.json({
            success: true,
            data: tokenStats
        });
    } catch (error) {
        logger.error('Error getting token statistics:', error);
        res.status(500).json({ error: 'Failed to get token statistics' });
    }
});

// Get user activity summary
router.get('/users/activity', async (_req: Request, res: Response) => {
    try {
        // Mock user activity data since we don't have database
        const activityData = {
            total_sessions: 1,
            active_sessions: 1,
            total_page_views: 15,
            total_api_calls: 8,
            top_pages: ['/'],
            top_features: ['jupiter_tokens']
        };
        
        res.json({
            success: true,
            data: activityData
        });
    } catch (error) {
        logger.error('Error getting user activity:', error);
        res.status(500).json({ error: 'Failed to get user activity' });
    }
});

export default router;