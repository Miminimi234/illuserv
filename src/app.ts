import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import tokenRoutes from './api/tokenRoutes';
import transactionRoutes from './api/transactionRoutes';
import grokRoutes from './api/grokRoutes';
import adminRoutes from './api/adminRoutes';
import analyticsRoutes from './api/analyticsRoutes';
import oracleRoutes from './api/oracleRoutes';
import adminDashboardRoute from './routes/adminDashboard';
import { WebSocketService } from './api/websocket';
import { logger } from './utils/logger';
import { AnalyticsService } from './services/analyticsService';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS middleware
const allowedOrigins = [
    'https://illusio.xyz', 
    'https://www.illusio.xyz', 
    'https://testillusio-production-3b58.up.railway.app',
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002', 
    'http://localhost:3003', 
    'http://localhost:3004', 
    'http://localhost:3005', 
    'http://localhost:3006', 
    'http://localhost:3007', 
    'http://localhost:3008', 
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3003',
    'http://127.0.0.1:3004',
    'http://127.0.0.1:3005',
    'http://127.0.0.1:3006',
    'http://127.0.0.1:3007',
    'http://127.0.0.1:3008',
    'http://127.0.0.1:8080'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check exact matches first
        if (allowedOrigins.indexOf(origin) !== -1) {
            logger.info(`CORS allowing origin: ${origin}`);
            return callback(null, true);
        }
        
        
        // Check for localhost variations
        if (origin && origin.match(/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/)) {
            logger.info(`CORS allowing local origin: ${origin}`);
            return callback(null, true);
        }
        
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'X-Admin-Key', 
        'X-Session-ID',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Cache-Control',
        'Pragma'
    ],
    exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Current-Page'
    ],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    preflightContinue: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Admin dashboard is now served via the embedded route in adminDashboard.ts

// Enhanced preflight request handling
app.options('*', (req, res) => {
    const origin = req.get('Origin');
    const method = req.get('Access-Control-Request-Method');
    const headers = req.get('Access-Control-Request-Headers');
    
    logger.info(`Preflight request for ${req.path}`, {
        origin,
        method,
        headers,
        userAgent: req.get('User-Agent')
    });
    
    // Set CORS headers for preflight response
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Admin-Key, X-Session-ID, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Cache-Control, Pragma');
        res.header('Access-Control-Max-Age', '86400'); // 24 hours
    }
    
    res.status(200).end();
});

// Additional CORS middleware to ensure headers are set on all responses
app.use((req, res, next) => {
    const origin = req.get('Origin');
    
    // Only set CORS headers if there's an origin (browser request)
    if (origin) {
        // Check if origin is allowed (same logic as CORS middleware)
        const allowedOrigins = [
            'https://illusio.xyz', 
            'https://www.illusio.xyz', 
            'https://testillusio-production-3b58.up.railway.app',
            'http://localhost:3000', 
            'http://localhost:3001', 
            'http://localhost:3002', 
            'http://localhost:3003', 
            'http://localhost:3004', 
            'http://localhost:3005', 
            'http://localhost:3006', 
            'http://localhost:3007', 
            'http://localhost:3008', 
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:3002',
            'http://127.0.0.1:3003',
            'http://127.0.0.1:3004',
            'http://127.0.0.1:3005',
            'http://127.0.0.1:3006',
            'http://127.0.0.1:3007',
            'http://127.0.0.1:3008',
            'http://127.0.0.1:8080'
        ];
        
        const isAllowed = allowedOrigins.includes(origin) || 
                        origin.match(/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/);
        
        if (isAllowed) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
        }
    }
    
    next();
});

// Analytics middleware
const analyticsService = AnalyticsService.getInstance();

app.use((req, res, next) => {
    const startTime = Date.now();
    const sessionId = req.headers['x-session-id'] as string || req.ip + '-' + Date.now();
    
    // Track session
    analyticsService.trackSession(sessionId, req.ip, req.get('User-Agent'));
    
    // Track API call
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        analyticsService.trackApiCall(
            sessionId,
            req.path,
            req.method,
            responseTime,
            res.statusCode,
            res.statusCode >= 400 ? 'Error' : undefined
        );
    });
    
    logger.info(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        referer: req.get('Referer')
    });
    next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
    // Get service status from global variables
    const serviceStatus = {
        http: 'running',
        analytics: 'initializing...',
        jupiterService: 'initializing...',
        jupiterWebSocket: 'initializing...'
    };

    // Try to get actual service status
    try {
        // Check if analytics service is available globally
        if (globalThis.analyticsServiceStatus) {
            serviceStatus.analytics = globalThis.analyticsServiceStatus;
        }
        if ((globalThis as any).jupiterServiceStatus) {
            serviceStatus.jupiterService = (globalThis as any).jupiterServiceStatus;
        }
        if ((globalThis as any).jupiterWebSocketStatus) {
            serviceStatus.jupiterWebSocket = (globalThis as any).jupiterWebSocketStatus;
        }
    } catch (error) {
        // Ignore errors, use default status
    }

    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 8080,
        services: serviceStatus
    });
});

// API routes
app.use('/api/tokens', tokenRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/grok', grokRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/oracle', oracleRoutes);

// Admin dashboard route
app.use('/admin-dashboard', adminDashboardRoute);

// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        message: 'Illusio API Server',
        version: '2.0.0',
        endpoints: {
            health: '/health',
            tokens: '/api/tokens',
            jupiter_tokens: '/api/tokens/jupiter',
            jupiter_status: '/api/tokens/jupiter/status',
            transactions: '/api/transactions',
            grok: '/api/grok',
            admin: '/api/admin',
            analytics: '/api/analytics',
            admin_dashboard: '/admin-dashboard'
        },
        features: {
            api_server: 'RESTful API server with multiple endpoints',
            jupiter_integration: 'Real-time Jupiter token data fetching and WebSocket updates',
            admin_dashboard: 'Built-in admin dashboard for system management',
            analytics: 'User activity and system metrics tracking',
            websocket: 'Real-time WebSocket support (main + Jupiter)'
        },
        documentation: 'API server for Illusio platform'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global error handler
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error:', error);
    
    // Don't leak error details in production
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message || 'Internal server error';
    
    res.status(error.status || 500).json({
        error: errorMessage,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Export both app and server
export { wsService };
export default app;
export { server };
