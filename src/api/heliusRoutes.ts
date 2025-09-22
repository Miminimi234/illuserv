import express from 'express';
import { logger } from '../utils/logger';

const router = express.Router();

// Helius API proxy endpoint
router.get('/transactions', async (req, res) => {
  try {
    const { transactions } = req.query;
    const apiKey = process.env.HELIUS_API_KEY;
    
    if (!transactions) {
      return res.status(400).json({ error: 'transactions parameter is required' });
    }
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Helius API key not configured' });
    }
    
    logger.info('Helius proxy request', { 
      transactions, 
      apiKey: 'configured' 
    });
    
    // Forward request to Helius Transaction API
    const heliusUrl = `https://api.helius.dev/v0/transactions?api-key=${apiKey}&transactions=${transactions}`;
    
    const response = await fetch(heliusUrl);
    const data = await response.json();
    
    if (!response.ok) {
      logger.error('Helius API error', { 
        status: response.status, 
        statusText: response.statusText,
        data 
      });
      return res.status(response.status).json(data);
    }
    
    logger.info('Helius proxy success', { 
      transactionCount: Array.isArray(data) ? data.length : 1 
    });
    
    res.json(data);
    
  } catch (error) {
    logger.error('Helius proxy error', error);
    res.status(500).json({ 
      error: 'Failed to fetch transaction data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
