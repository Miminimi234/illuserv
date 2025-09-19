import dotenv from 'dotenv';
import { server } from './app';
import { AnalyticsService } from './services/analyticsService';
import { jupiterService } from './services/jupiterService';
import { jupiterWebSocketService } from './services/jupiterWebSocketService';
import { oracleService } from './services/oracleService';
import { logger } from './utils/logger';

dotenv.config();

const PORT = process.env.PORT || 8080;

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Don't exit, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit, just log the error
});

// Graceful shutdown function
let isShuttingDown = false;
const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
        logger.info('Shutdown already in progress, ignoring signal:', signal);
        return;
    }
    
    isShuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    try {
        // Stop services
        jupiterService.stop();
        jupiterWebSocketService.stop();
        oracleService.stopOracle();
        
        // Close HTTP server
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        
        // Force exit after 10 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
        
    } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Remove duplicate handlers - they're already defined above

// Start the server
const startServer = async () => {
    try {
        // Start HTTP server immediately for healthcheck
        server.listen(PORT, () => {
            logger.info(`🚀 HTTP Server started on port ${PORT}`);
            logger.info(`📊 API available at http://localhost:${PORT}`);
            logger.info(`🔐 Admin Dashboard: http://localhost:${PORT}/admin-dashboard`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔑 Admin Key configured: ${process.env.ADMIN_KEY ? 'YES' : 'NO'}`);
        });

        // Start Jupiter services immediately (independent of database)
        const startJupiterServices = async () => {
            try {
                logger.info('🔍 Starting Jupiter services (independent of database)...');
                
                // Start Jupiter service
                try {
                    logger.info('🔍 Starting Jupiter service...');
                    await jupiterService.start();
                    (globalThis as any).jupiterServiceStatus = 'running';
                    logger.info('✅ Jupiter Service: Fetching fresh tokens every 4 seconds');
                } catch (error) {
                    (globalThis as any).jupiterServiceStatus = 'failed';
                    logger.error('❌ Failed to start Jupiter service:', error);
                }
                
                // Start Jupiter WebSocket service
                try {
                    logger.info('🔍 Starting Jupiter WebSocket service...');
                    jupiterWebSocketService.start(8081);
                    (globalThis as any).jupiterWebSocketStatus = 'running';
                    logger.info('✅ Jupiter WebSocket Service: Real-time token updates on port 8081');
                } catch (error) {
                    (globalThis as any).jupiterWebSocketStatus = 'failed';
                    logger.error('❌ Failed to start Jupiter WebSocket service:', error);
                }
            } catch (error) {
                logger.error('❌ Error starting Jupiter services:', error);
            }
        };

        // Initialize basic services
        const initializeServices = async () => {
            try {
                console.log('🔄 Starting service initialization...');
                logger.info('🔄 Starting service initialization...');
                
                // Start analytics service (if available)
                try {
                    logger.info('🔍 Starting Analytics service...');
                    const analyticsService = AnalyticsService.getInstance();
                    await analyticsService.start();
                    logger.info('✅ Analytics Service: Tracking user activity and system metrics');
                } catch (error) {
                    logger.error('❌ Failed to start Analytics service:', error);
                }

                // Start Oracle service
                try {
                    logger.info('🔮 Starting Oracle service...');
                    await oracleService.startOracle();
                    logger.info('✅ Oracle Service: Generating mystical messages every 2 seconds');
                } catch (error) {
                    logger.error('❌ Failed to start Oracle service:', error);
                }
                
                // Admin dashboard is now embedded in the route
                logger.info('✅ Admin Dashboard: Embedded route ready');
                
                logger.info('🚀 API Server started successfully!');
                logger.info('📊 All endpoints available for use');
                logger.info('🔥 Jupiter tokens: /api/tokens/jupiter');
                logger.info('🔍 Jupiter status: /api/tokens/jupiter/status');
                logger.info('🌐 Jupiter WebSocket: ws://localhost:8081/jupiter-tokens');

            } catch (error) {
                logger.error('❌ Critical error initializing services:', error);
                logger.error('❌ Service initialization failed - check logs above for specific errors');
                // Don't exit, just log the error and continue with basic server functionality
            }
        };

        // Start Jupiter services immediately (independent of database)
        startJupiterServices().catch(error => {
            logger.error('❌ Error starting Jupiter services:', error);
        });

        // Start services in background
        initializeServices();

    } catch (error) {
        logger.error('Error starting server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();
