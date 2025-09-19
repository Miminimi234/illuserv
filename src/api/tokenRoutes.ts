import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { jupiterService } from '../services/jupiterService';

const router = Router();

// Mock token data for demonstration
const mockTokens = [
    {
        id: 1,
        mint: 'So11111111111111111111111111111111111111112',
        name: 'Wrapped SOL',
        symbol: 'SOL',
        status: 'active',
        price_usd: 100.50,
        marketcap: 1000000000,
        volume_24h: 50000000,
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'USD Coin',
        symbol: 'USDC',
        status: 'active',
        price_usd: 1.00,
        marketcap: 500000000,
        volume_24h: 10000000,
        created_at: new Date().toISOString()
    }
];

// GET /tokens - Get all tokens
router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (limit < 1 || limit > 1000) {
            return res.status(400).json({
                error: 'Invalid limit. Must be between 1 and 1000.'
            });
        }

        const paginatedTokens = mockTokens.slice(offset, offset + limit);
        
        return res.json({
            total: mockTokens.length,
            items: paginatedTokens
        });
        
    } catch (error) {
        logger.error('Error fetching tokens:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// GET /tokens/fresh - Get fresh tokens (mock data)
router.get('/fresh', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (limit < 1 || limit > 1000) {
            return res.status(400).json({
                error: 'Invalid limit. Must be between 1 and 1000.'
            });
        }

        // Return mock fresh tokens
        const freshTokens = mockTokens.filter(token => token.status === 'fresh');
        const paginatedTokens = freshTokens.slice(offset, offset + limit);
        
        return res.json({
            total: freshTokens.length,
            items: paginatedTokens
        });
        
    } catch (error) {
        logger.error('Error fetching fresh tokens:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// GET /tokens/active - Get active tokens
router.get('/active', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (limit < 1 || limit > 1000) {
            return res.status(400).json({
                error: 'Invalid limit. Must be between 1 and 1000.'
            });
        }

        const activeTokens = mockTokens.filter(token => token.status === 'active');
        const paginatedTokens = activeTokens.slice(offset, offset + limit);
        
        return res.json({
            total: activeTokens.length,
            items: paginatedTokens
        });
        
    } catch (error) {
        logger.error('Error fetching active tokens:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// GET /tokens/:id - Get specific token
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.id);
        const token = mockTokens.find(t => t.id === tokenId);
        
        if (!token) {
            return res.status(404).json({
                error: 'Token not found'
            });
        }
        
        return res.json(token);
        
    } catch (error) {
        logger.error('Error fetching token:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// GET /tokens/status/:status - Get tokens by status
router.get('/status/:status', async (req: Request, res: Response) => {
    try {
        const status = req.params.status;
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (limit < 1 || limit > 1000) {
            return res.status(400).json({
                error: 'Invalid limit. Must be between 1 and 1000.'
            });
        }

        const filteredTokens = mockTokens.filter(token => token.status === status);
        const paginatedTokens = filteredTokens.slice(offset, offset + limit);
        
        return res.json({
            total: filteredTokens.length,
            items: paginatedTokens
        });
        
    } catch (error) {
        logger.error('Error fetching tokens by status:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// GET /tokens/search - Search tokens
router.get('/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        
        if (!query) {
            return res.status(400).json({
                error: 'Query parameter "q" is required'
            });
        }
        
        if (limit < 1 || limit > 1000) {
            return res.status(400).json({
                error: 'Invalid limit. Must be between 1 and 1000.'
            });
        }

        const searchResults = mockTokens.filter(token => 
            token.name.toLowerCase().includes(query.toLowerCase()) ||
            token.symbol.toLowerCase().includes(query.toLowerCase()) ||
            token.mint.toLowerCase().includes(query.toLowerCase())
        );
        
        const paginatedResults = searchResults.slice(offset, offset + limit);
        
        return res.json({
            total: searchResults.length,
            items: paginatedResults
        });
        
    } catch (error) {
        logger.error('Error searching tokens:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// GET /tokens/jupiter - Get latest Jupiter tokens
router.get('/jupiter', async (req: Request, res: Response) => {
    try {
        const tokens = await jupiterService.getLatestTokens();
        
        return res.json({
            total: tokens.length,
            items: tokens
        });
        
    } catch (error) {
        logger.error('Error fetching Jupiter tokens:', error);
        return res.status(500).json({
            error: 'Failed to fetch Jupiter tokens',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// GET /tokens/jupiter/status - Get Jupiter service status
router.get('/jupiter/status', (req: Request, res: Response) => {
    try {
        const status = jupiterService.getStatus();
        
        return res.json({
            service: 'jupiter',
            status: status.isRunning ? 'running' : 'stopped',
            fetchCount: status.fetchCount,
            errorCount: status.errorCount,
            uptime: process.uptime()
        });
        
    } catch (error) {
        logger.error('Error getting Jupiter service status:', error);
        return res.status(500).json({
            error: 'Failed to get Jupiter service status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;