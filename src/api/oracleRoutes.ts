import { Router } from 'express';
import { oracleService } from '../services/oracleService';
import { logger } from '../utils/logger';

const router = Router();

// Get recent Oracle messages
router.get('/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const messages = await oracleService.getMessages(limit);
    
    res.json({
      success: true,
      messages,
      count: messages.length
    });
  } catch (error) {
    logger.error('Error getting Oracle messages:', error);
    res.status(500).json({ error: 'Failed to get Oracle messages' });
  }
});

// Get Oracle service status
router.get('/status', (_req, res) => {
  try {
    const status = oracleService.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error getting Oracle status:', error);
    res.status(500).json({ error: 'Failed to get Oracle status' });
  }
});

// Start Oracle service
router.post('/start', async (_req, res) => {
  try {
    await oracleService.startOracle();
    res.json({
      success: true,
      message: 'Oracle service started'
    });
  } catch (error) {
    logger.error('Error starting Oracle service:', error);
    res.status(500).json({ error: 'Failed to start Oracle service' });
  }
});

// Stop Oracle service
router.post('/stop', (_req, res) => {
  try {
    oracleService.stopOracle();
    res.json({
      success: true,
      message: 'Oracle service stopped'
    });
  } catch (error) {
    logger.error('Error stopping Oracle service:', error);
    res.status(500).json({ error: 'Failed to stop Oracle service' });
  }
});

// Clear all Oracle messages
router.delete('/messages', async (_req, res) => {
  try {
    await oracleService.clearMessages();
    res.json({
      success: true,
      message: 'Oracle messages cleared'
    });
  } catch (error) {
    logger.error('Error clearing Oracle messages:', error);
    res.status(500).json({ error: 'Failed to clear Oracle messages' });
  }
});

export default router;
