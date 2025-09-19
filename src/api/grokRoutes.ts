import { Router } from 'express';
import { grokService } from '../services/grokService';
import { logger } from '../utils/logger';

const router = Router();

// Analyze a specific token
router.post('/analyze/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    
    // Create mock token data since we don't have database
    const mockToken = {
      name: 'Mock Token',
      symbol: 'MOCK',
      mint: mint,
      status: 'active',
      marketcap: null,
      price_usd: null,
      volume_24h: null,
      liquidity: null
    };

    const analysis = await grokService.analyzeToken(mockToken);
    
    if (!analysis) {
      return res.status(500).json({ error: 'Failed to generate analysis' });
    }

    return res.json({ 
      mint,
      analysis,
      token: {
        name: mockToken.name,
        symbol: mockToken.symbol,
        mint: mockToken.mint,
        status: mockToken.status
      }
    });
  } catch (error) {
    logger.error('Token analysis error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat with companion about a token
router.post('/chat/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const { message, userMessage, companionName, sessionId, conversationId } = req.body;
    const actualMessage = message || userMessage;
    
    if (!actualMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create mock token data since we don't have database
    const mockToken = {
      name: 'Mock Token',
      symbol: 'MOCK',
      mint: mint,
      status: 'active',
      marketcap: null,
      price_usd: null,
      volume_24h: null,
      liquidity: null
    };

    const response = await grokService.generateCompanionResponse(
      mockToken, 
      actualMessage, 
      companionName, 
      false, // isOracleHub
      sessionId, 
      conversationId
    );
    
    if (!response) {
      return res.status(500).json({ error: 'Failed to generate response' });
    }

    return res.json({ 
      mint,
      userMessage: actualMessage,
      companionResponse: response,
      token: {
        name: mockToken.name,
        symbol: mockToken.symbol,
        mint: mockToken.mint,
        status: mockToken.status
      },
      sessionId,
      conversationId
    });
  } catch (error) {
    logger.error('Companion chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// General chat (not token-specific)
router.post('/chat', async (req, res) => {
  try {
    const { message, userMessage } = req.body;
    const actualMessage = message || userMessage;
    
    if (!actualMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await grokService.chatCompletion([
      {
        role: 'system',
        content: 'You are a helpful Solana trading companion. Provide insights and advice about Solana tokens and DeFi.'
      },
      {
        role: 'user',
        content: actualMessage
      }
    ]);
    
    if (!response) {
      return res.status(500).json({ error: 'Failed to generate response' });
    }

    return     res.json({ 
      userMessage: actualMessage,
      companionResponse: response
    });
  } catch (error) {
    logger.error('General chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Oracle Hub conversation endpoint
router.post('/oracle/conversation', async (req, res) => {
  try {
    const { agent, context, sessionId, conversationId } = req.body;
    
    if (!agent) {
      return res.status(400).json({ error: 'Agent is required' });
    }

    // Create a mock token for the oracle conversation
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

    // Use mystical Oracle Hub prompts for general oracle conversation
    const response = await grokService.generateCompanionResponse(
      mockToken, 
      context || 'Continue the oracle conversation',
      agent,
      true,  // isOracleHub = true for mystical prompts
      sessionId,
      conversationId
    );
    
    if (!response) {
      return res.status(500).json({ error: 'Failed to generate oracle response' });
    }

    return res.json({ 
      agent,
      oracleResponse: response,
      context: context || 'oracle conversation',
      sessionId,
      conversationId
    });
  } catch (error) {
    logger.error('Oracle conversation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Retrocausality analysis endpoint
router.post('/retrocausality/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    
    // Create mock token data since we don't have database
    const mockToken = {
      name: 'Mock Token',
      symbol: 'MOCK',
      mint: mint,
      status: 'active',
      marketcap: null,
      price_usd: null,
      volume_24h: null,
      liquidity: null
    };

    // Mock holders data
    const holdersData = [
      { owner: 'mock-owner-1', amount: 1000000 },
      { owner: 'mock-owner-2', amount: 500000 },
      { owner: 'mock-owner-3', amount: 250000 }
    ];
    
    // Mock transaction data
    const transactionsData = {
      count: 0,
      volume: 0,
      recentActivity: 'No transaction data available'
    };

    const analysis = await grokService.analyzeRetrocausality(mockToken, holdersData, transactionsData);
    
    if (!analysis) {
      return res.status(500).json({ error: 'Failed to generate retrocausality analysis' });
    }

    return res.json({ 
      mint,
      analysis,
      timestamp: new Date().toISOString(),
      token: {
        name: mockToken.name,
        symbol: mockToken.symbol,
        mint: mockToken.mint,
        status: mockToken.status
      }
    });
  } catch (error) {
    logger.error('Retrocausality analysis error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Forecast endpoint
router.post('/forecast/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const { timeframe, tokenData, marketData } = req.body;

    logger.info(`Generating AI forecast for ${mint} (${timeframe})`);

    // Prepare context for AI
    const context = {
      token: {
        mint: mint,
        name: tokenData.name || tokenData.symbol || 'Unknown',
        marketcap: tokenData.marketcap,
        liquidity: tokenData.liquidity,
        volume24h: tokenData.volume_24h,
        price: tokenData.price_usd,
        age: tokenData.created_at ? Math.floor((Date.now() - new Date(tokenData.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        status: tokenData.status,
        isOnCurve: tokenData.is_on_curve
      },
      market: marketData ? {
        price: marketData.usdPrice,
        marketCap: marketData.marketCap,
        liquidity: marketData.liquidity,
        volume: marketData.volume,
        priceChange: marketData.priceChange
      } : null,
      timeframe: timeframe
    };

    // Create AI prompt for forecasting
    const prompt = `You are a quantum financial analyst specializing in Solana token predictions. Analyze this token and provide accurate forecasts based on its actual characteristics.

TOKEN DATA:
- Name: ${context.token.name}
- Mint: ${mint}
- Market Cap: $${context.token.marketcap || 'Unknown'}
- Liquidity: $${context.token.liquidity || 'Unknown'}
- 24h Volume: $${context.token.volume24h || 'Unknown'}
- Price: $${context.token.price || 'Unknown'}
- Age: ${context.token.age} days
- Status: ${context.token.status}
- On Curve: ${context.token.isOnCurve}

MARKET DATA:
${context.market ? `
- Current Price: $${context.market.price}
- Market Cap: $${context.market.marketCap}
- Liquidity: $${context.market.liquidity}
- Price Change: ${context.market.priceChange}%
- Buy Volume: $${context.market.volume.buy}
- Sell Volume: $${context.market.volume.sell}
` : 'No live market data available'}

TIMEFRAME: ${timeframe}

ANALYSIS INSTRUCTIONS:
Based on the token data above, analyze and provide realistic forecasts:

1. TOKEN AGE ANALYSIS:
   - New tokens (0-7 days): High volatility, wide price swings
   - Young tokens (1-4 weeks): Moderate volatility, trending behavior
   - Mature tokens (1+ months): Lower volatility, stable patterns

2. LIQUIDITY ANALYSIS:
   - Low liquidity (<$10K): Very high volatility (±20-50%)
   - Medium liquidity ($10K-$100K): High volatility (±10-25%)
   - High liquidity (>$100K): Lower volatility (±5-15%)

3. MARKET CAP ANALYSIS:
   - Micro cap (<$1M): High volatility, pump potential
   - Small cap ($1M-$10M): Moderate volatility
   - Mid cap ($10M-$100M): Lower volatility
   - Large cap (>$100M): Stable, institutional behavior

4. VOLUME ANALYSIS:
   - High volume relative to market cap: Active trading, momentum
   - Low volume: Illiquid, potential for large moves

Provide a JSON response with these exact fields based on your analysis:
{
  "price10mMove": "±X.X%",
  "price1hMove": "±X.X%", 
  "expectedRange": "±X%",
  "upProbability": 50-90,
  "confidence": 60-95,
  "reasoning": "Specific analysis based on token characteristics"
}

Make realistic predictions based on the actual token data. Consider:
- Volatility increases with lower liquidity
- Newer tokens are more volatile
- Higher market caps tend to be more stable
- Volume patterns indicate momentum
- Status (fresh/active) affects behavior

Be specific in your reasoning about why you chose these values.`;

    // Call Grok AI
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer REPLACE_WITH_YOUR_ACTUAL_GROK_API_KEY`, // Hardcoded API key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: 'You are a quantum financial analyst. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!grokResponse.ok) {
      throw new Error(`Grok API error: ${grokResponse.status}`);
    }

    const grokData = await grokResponse.json() as any;
    const aiResponse = grokData.choices[0].message.content;

    // Parse AI response
    let forecastData;
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        forecastData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      logger.error('Failed to parse AI response:', aiResponse);
      // Intelligent fallback based on token characteristics
      const liquidity = parseFloat(context.token.liquidity) || 0;
      const marketcap = parseFloat(context.token.marketcap) || 0;
      const age = context.token.age || 0;
      
      // Calculate volatility based on liquidity and age
      let volatility = 5; // Base volatility
      
      if (liquidity < 10000) volatility = 25; // Very low liquidity = high volatility
      else if (liquidity < 100000) volatility = 15; // Medium liquidity
      else volatility = 8; // High liquidity = lower volatility
      
      // Adjust for age
      if (age < 7) volatility *= 1.5; // New tokens are more volatile
      else if (age > 30) volatility *= 0.7; // Mature tokens are less volatile
      
      // Calculate up probability based on market cap and status
      let upProbability = 50;
      if (marketcap < 1000000) upProbability = 65; // Micro caps have pump potential
      if (context.token.status === 'fresh') upProbability += 10; // Fresh tokens trending up
      
      forecastData = {
        price10mMove: `±${(volatility * 0.3).toFixed(1)}%`,
        price1hMove: `±${volatility.toFixed(1)}%`,
        expectedRange: `±${(volatility * 2).toFixed(1)}%`,
        upProbability: Math.min(85, upProbability),
        confidence: Math.max(60, 85 - volatility),
        reasoning: `AI parsing failed. Calculated based on liquidity: $${liquidity.toLocaleString()}, age: ${age} days, market cap: $${marketcap.toLocaleString()}`
      };
    }

    // Validate and sanitize response
    const response = {
      price10mMove: forecastData.price10mMove || "±0.5%",
      price1hMove: forecastData.price1hMove || "±2.1%",
      expectedRange: forecastData.expectedRange || "±8%",
      upProbability: Math.max(0, Math.min(100, forecastData.upProbability || 50)),
      confidence: Math.max(0, Math.min(100, forecastData.confidence || 60)),
      reasoning: forecastData.reasoning || "AI-generated forecast",
      timestamp: new Date().toISOString(),
      mint: mint,
      timeframe: timeframe
    };

    logger.info(`AI forecast generated for ${mint}:`, response);

    return res.json(response);

  } catch (error) {
    logger.error('AI forecast error:', error);
    
    // Intelligent fallback based on available token data
    const { tokenData } = req.body;
    const liquidity = parseFloat(tokenData?.liquidity) || 0;
    const marketcap = parseFloat(tokenData?.marketcap) || 0;
    const age = tokenData?.created_at ? Math.floor((Date.now() - new Date(tokenData.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    // Calculate volatility based on token characteristics
    let volatility = 8; // Default volatility
    
    if (liquidity < 10000) volatility = 30; // Very low liquidity = very high volatility
    else if (liquidity < 50000) volatility = 20; // Low liquidity = high volatility  
    else if (liquidity < 200000) volatility = 12; // Medium liquidity = moderate volatility
    else volatility = 6; // High liquidity = lower volatility
    
    // Adjust for age
    if (age < 3) volatility *= 2; // Very new tokens are extremely volatile
    else if (age < 14) volatility *= 1.3; // New tokens are more volatile
    else if (age > 60) volatility *= 0.6; // Old tokens are less volatile
    
    // Calculate up probability
    let upProbability = 50;
    if (marketcap < 500000) upProbability = 70; // Micro caps have high pump potential
    else if (marketcap < 2000000) upProbability = 60; // Small caps have moderate potential
    if (tokenData?.status === 'fresh') upProbability += 15; // Fresh tokens trending up
    
    const fallbackResponse = {
      price10mMove: `±${(volatility * 0.2).toFixed(1)}%`,
      price1hMove: `±${volatility.toFixed(1)}%`,
      expectedRange: `±${(volatility * 1.8).toFixed(1)}%`,
      upProbability: Math.min(90, upProbability),
      confidence: Math.max(50, 80 - volatility),
      reasoning: `AI service unavailable. Calculated volatility based on liquidity: $${liquidity.toLocaleString()}, age: ${age} days, market cap: $${marketcap.toLocaleString()}`,
      timestamp: new Date().toISOString(),
      mint: req.params.mint,
      timeframe: req.body.timeframe
    };

    return res.json(fallbackResponse);
  }
});

// Get conversation history for a session
router.get('/conversations/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const conversations = await grokService.getConversationHistory(sessionId);
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    logger.error('Error getting conversation history:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

// Get conversations for a specific token
router.get('/conversations/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const conversations = await grokService.getTokenConversations(mint);
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    logger.error('Error getting token conversations:', error);
    res.status(500).json({ error: 'Failed to get token conversations' });
  }
});

// Get specific conversation by ID
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await grokService.getConversationById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    logger.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Delete a conversation
router.delete('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const success = await grokService.deleteConversation(conversationId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete conversation' });
    }
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Test endpoint to verify Firebase conversation storage
router.post('/test-conversation', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Create a test conversation directly
    const testConversation = {
      id: `test_${sessionId}_${Date.now()}`,
      sessionId,
      tokenMint: 'test-token',
      companionName: 'Test Agent',
      messages: [
        {
          role: 'user',
          content: message || 'Test message',
          timestamp: Date.now() - 1000
        },
        {
          role: 'assistant',
          content: 'This is a test response to verify Firebase storage is working.',
          timestamp: Date.now()
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Save directly to Firebase
    const db = require('../config/firebase').getFirebaseDatabase();
    await db.ref(`conversations/${testConversation.id}`).set(testConversation);
    
    res.json({
      success: true,
      message: 'Test conversation saved to Firebase',
      conversationId: testConversation.id,
      data: testConversation
    });
  } catch (error) {
    logger.error('Test conversation error:', error);
    res.status(500).json({ error: 'Failed to save test conversation' });
  }
});

export default router;
