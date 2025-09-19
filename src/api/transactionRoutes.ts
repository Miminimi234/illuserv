import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Mock transaction data
const mockTransactions = [
    {
        signature: '5J7X8C9D2E1F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7',
        slot: 123456789,
        timestamp: new Date().toISOString(),
        type: 'buy',
        amount: 1000,
        price: 0.001,
        volume: 1.0
    },
    {
        signature: '4I6X7B8C1D0E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7',
        slot: 123456788,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: 'sell',
        amount: 500,
        price: 0.002,
        volume: 1.0
    }
];

// GET /transactions/:tokenMint - Get transactions for a specific token
router.get('/:tokenMint', async (req: Request, res: Response) => {
    try {
        const { tokenMint } = req.params;
        const limit = parseInt(req.query.limit as string) || 20;
        
        if (!tokenMint) {
            return res.status(400).json({
                error: 'Token mint address is required'
            });
        }

        // Return mock transaction data
        const paginatedTransactions = mockTransactions.slice(0, limit);
        
        return res.json({
            total: mockTransactions.length,
            items: paginatedTransactions
        });
        
    } catch (error) {
        logger.error('Error fetching transactions:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// GET /transactions - Get all transactions
router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        
        const paginatedTransactions = mockTransactions.slice(offset, offset + limit);
        
        return res.json({
            total: mockTransactions.length,
            items: paginatedTransactions
        });
        
    } catch (error) {
        logger.error('Error fetching transactions:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router;
