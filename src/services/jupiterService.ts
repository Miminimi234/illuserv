import { getFirebaseDatabase, FIREBASE_PATHS, initializeFirebase } from '../config/firebase';
import { logger } from '../utils/logger';

// Jupiter API configuration
const JUPITER_API_URL = 'https://lite-api.jup.ag/tokens/v2/recent';
const TARGET_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const FETCH_INTERVAL = 4000; // 4 seconds

// Token data interface - matches Jupiter API response
interface JupiterToken {
  id: string;
  name: string;
  symbol: string;
  icon?: string;
  decimals?: number;
  dev?: string;
  circSupply?: number;
  totalSupply?: number;
  tokenProgram?: string;
  launchpad?: string;
  firstPool?: {
    id: string;
    createdAt: string;
  };
  holderCount?: number;
  audit?: {
    isSus?: boolean;
    mintAuthorityDisabled?: boolean;
    freezeAuthorityDisabled?: boolean;
    devBalancePercentage?: number;
    topHoldersPercentage?: number;
    devMigrations?: number;
    blockaidHoneypot?: boolean;
    blockaidRugpull?: boolean;
  };
  organicScore?: number;
  organicScoreLabel?: string;
  tags?: string[];
  fdv?: number;
  mcap?: number;
  usdPrice?: number;
  priceBlockId?: number;
  liquidity?: number;
  stats5m?: {
    priceChange?: number;
    holderChange?: number;
    liquidityChange?: number;
    buyVolume?: number;
    sellVolume?: number;
    buyOrganicVolume?: number;
    sellOrganicVolume?: number;
    numBuys?: number;
    numSells?: number;
    numTraders?: number;
    numNetBuyers?: number;
  };
  stats1h?: {
    priceChange?: number;
    holderChange?: number;
    liquidityChange?: number;
    buyVolume?: number;
    sellVolume?: number;
    buyOrganicVolume?: number;
    sellOrganicVolume?: number;
    numBuys?: number;
    numSells?: number;
    numTraders?: number;
    numNetBuyers?: number;
  };
  stats6h?: {
    priceChange?: number;
    holderChange?: number;
    liquidityChange?: number;
    buyVolume?: number;
    sellVolume?: number;
    buyOrganicVolume?: number;
    sellOrganicVolume?: number;
    numBuys?: number;
    numSells?: number;
    numTraders?: number;
    numNetBuyers?: number;
  };
  stats24h?: {
    priceChange?: number;
    holderChange?: number;
    liquidityChange?: number;
    buyVolume?: number;
    sellVolume?: number;
    buyOrganicVolume?: number;
    sellOrganicVolume?: number;
    numBuys?: number;
    numSells?: number;
    numTraders?: number;
    numNetBuyers?: number;
  };
  bondingCurve?: number;
  updatedAt?: string;
  twitter?: string;
  website?: string;
  telegram?: string;
  metaLaunchpad?: string;
  partnerConfig?: string;
}

interface TransformedToken {
  // Basic token info
  id: string;
  name: string;
  symbol: string;
  imageUrl: string;
  decimals: number;
  dev: string;
  circSupply: number;
  totalSupply: number;
  tokenProgram: string;
  launchpad?: string;
  metaLaunchpad?: string;
  partnerConfig?: string;
  
  // Pool info
  firstPoolId?: string;
  firstPoolCreatedAt: string;
  
  // Holder info
  holderCount: number;
  
  // Audit info
  audit: {
    isSus?: boolean;
    mintAuthorityDisabled?: boolean;
    freezeAuthorityDisabled?: boolean;
    devBalancePercentage?: number;
    topHoldersPercentage?: number;
    devMigrations?: number;
    blockaidHoneypot?: boolean;
    blockaidRugpull?: boolean;
  };
  
  // Organic score
  organicScore: number;
  organicScoreLabel: string;
  tags: string[];
  
  // Price and market data
  fdv: number;
  marketCap: number;
  price: number;
  priceBlockId?: number;
  liquidity: number;
  bondingCurve?: number;
  
  // Social links
  twitter?: string;
  website?: string;
  telegram?: string;
  
  // Trading stats (24h)
  stats24h: {
    priceChange?: number;
    holderChange?: number;
    liquidityChange?: number;
    buyVolume?: number;
    sellVolume?: number;
    buyOrganicVolume?: number;
    sellOrganicVolume?: number;
    numBuys?: number;
    numSells?: number;
    numTraders?: number;
    numNetBuyers?: number;
  };
  
  // Trading stats (1h)
  stats1h: {
    priceChange?: number;
    holderChange?: number;
    liquidityChange?: number;
    buyVolume?: number;
    sellVolume?: number;
    buyOrganicVolume?: number;
    sellOrganicVolume?: number;
    numBuys?: number;
    numSells?: number;
    numTraders?: number;
    numNetBuyers?: number;
  };
  
  // Trading stats (6h)
  stats6h: {
    priceChange?: number;
    holderChange?: number;
    liquidityChange?: number;
    buyVolume?: number;
    sellVolume?: number;
    buyOrganicVolume?: number;
    sellOrganicVolume?: number;
    numBuys?: number;
    numSells?: number;
    numTraders?: number;
    numNetBuyers?: number;
  };
  
  // Trading stats (5m)
  stats5m: {
    priceChange?: number;
    holderChange?: number;
    liquidityChange?: number;
    buyVolume?: number;
    sellVolume?: number;
    buyOrganicVolume?: number;
    sellOrganicVolume?: number;
    numBuys?: number;
    numSells?: number;
    numTraders?: number;
    numNetBuyers?: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  filterReason: 'token_program' | 'bonk_ending';
  lastUpdated: string;
}

interface JupiterServiceMetadata {
  last_fetch: string;
  fetch_count: number;
  error_count: number;
  status: 'active' | 'error' | 'stopped';
}

export class JupiterService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private fetchCount: number = 0;
  private errorCount: number = 0;
  private database: any;

  constructor() {
    try {
      initializeFirebase();
      this.database = getFirebaseDatabase();
      logger.info('🚀 Jupiter Service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Jupiter Service:', error);
      throw error;
    }
  }

  /**
   * Start the Jupiter service
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠️ Jupiter Service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔍 Starting Jupiter Service...');

    try {
      // Initial fetch
      logger.info('🔍 Performing initial fetch...');
      await this.fetchAndStoreTokens();
      logger.info('✅ Initial fetch completed successfully');

      // Set up interval
      this.intervalId = setInterval(async () => {
        await this.fetchAndStoreTokens();
      }, FETCH_INTERVAL);

      logger.info(`✅ Jupiter Service started - fetching every ${FETCH_INTERVAL}ms`);
    } catch (error) {
      logger.error('❌ Failed to start Jupiter Service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the Jupiter service
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.warn('⚠️ Jupiter Service is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('🛑 Jupiter Service stopped');
  }

  /**
   * Fetch tokens from Jupiter API and store in Firebase
   */
  private async fetchAndStoreTokens(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Fetch from Jupiter API
      const response = await fetch(JUPITER_API_URL, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Solana-Token-Tracker/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as JupiterToken[];
      const fetchTime = Date.now() - startTime;

      // Transform and filter tokens (fetch all tokens Jupiter provides)
      const transformedTokens = this.transformAndFilterTokens(data);
      
      // Store in Firebase
      await this.storeTokensInFirebase(transformedTokens);

      // Update metadata
      this.fetchCount++;
      await this.updateMetadata(fetchTime, transformedTokens.length);

      logger.info(`✅ Fetched ${transformedTokens.length} tokens in ${fetchTime}ms (Total: ${this.fetchCount})`);

    } catch (error) {
      this.errorCount++;
      logger.error('❌ Error fetching Jupiter tokens:', error);
      
      // Update error metadata
      await this.updateErrorMetadata();
    }
  }

  /**
   * Transform and filter Jupiter tokens
   */
  private transformAndFilterTokens(tokens: JupiterToken[]): TransformedToken[] {
    const now = new Date().toISOString();
    
    return tokens
      .map((token: JupiterToken) => ({
        // Basic token info
        id: token.id || '',
        name: token.name || '',
        symbol: token.symbol || '',
        imageUrl: token.icon || '',
        decimals: token.decimals || 6,
        dev: token.dev || '',
        circSupply: token.circSupply || 0,
        totalSupply: token.totalSupply || 0,
        tokenProgram: token.tokenProgram || '',
        ...(token.launchpad && { launchpad: token.launchpad }),
        ...(token.metaLaunchpad && { metaLaunchpad: token.metaLaunchpad }),
        ...(token.partnerConfig && { partnerConfig: token.partnerConfig }),
        
        // Pool info
        ...(token.firstPool?.id && { firstPoolId: token.firstPool.id }),
        firstPoolCreatedAt: token.firstPool?.createdAt || now,
        
        // Holder info
        holderCount: token.holderCount || 0,
        
        // Audit info
        audit: {
          ...(token.audit?.isSus !== undefined && { isSus: token.audit.isSus }),
          ...(token.audit?.mintAuthorityDisabled !== undefined && { mintAuthorityDisabled: token.audit.mintAuthorityDisabled }),
          ...(token.audit?.freezeAuthorityDisabled !== undefined && { freezeAuthorityDisabled: token.audit.freezeAuthorityDisabled }),
          ...(typeof token.audit?.devBalancePercentage === 'number' && { devBalancePercentage: token.audit.devBalancePercentage }),
          ...(typeof token.audit?.topHoldersPercentage === 'number' && { topHoldersPercentage: token.audit.topHoldersPercentage }),
          ...(typeof token.audit?.devMigrations === 'number' && { devMigrations: token.audit.devMigrations }),
          ...(token.audit?.blockaidHoneypot !== undefined && { blockaidHoneypot: token.audit.blockaidHoneypot }),
          ...(token.audit?.blockaidRugpull !== undefined && { blockaidRugpull: token.audit.blockaidRugpull }),
        },
        
        // Organic score
        organicScore: token.organicScore || 0,
        organicScoreLabel: token.organicScoreLabel || 'low',
        tags: token.tags || [],
        
        // Price and market data
        fdv: token.fdv || 0,
        marketCap: token.mcap || token.fdv || 0,
        price: token.usdPrice || 0,
        liquidity: token.liquidity || 0,
        ...(typeof token.priceBlockId === 'number' && { priceBlockId: token.priceBlockId }),
        ...(typeof token.bondingCurve === 'number' && { bondingCurve: token.bondingCurve }),
        
        // Social links
        ...(token.twitter && { twitter: token.twitter }),
        ...(token.website && { website: token.website }),
        ...(token.telegram && { telegram: token.telegram }),
        
        // Trading stats (24h)
        stats24h: {
          ...(typeof token.stats24h?.priceChange === 'number' && { priceChange: token.stats24h.priceChange }),
          ...(typeof token.stats24h?.holderChange === 'number' && { holderChange: token.stats24h.holderChange }),
          ...(typeof token.stats24h?.liquidityChange === 'number' && { liquidityChange: token.stats24h.liquidityChange }),
          ...(typeof token.stats24h?.buyVolume === 'number' && { buyVolume: token.stats24h.buyVolume }),
          ...(typeof token.stats24h?.sellVolume === 'number' && { sellVolume: token.stats24h.sellVolume }),
          ...(typeof token.stats24h?.buyOrganicVolume === 'number' && { buyOrganicVolume: token.stats24h.buyOrganicVolume }),
          ...(typeof token.stats24h?.sellOrganicVolume === 'number' && { sellOrganicVolume: token.stats24h.sellOrganicVolume }),
          ...(typeof token.stats24h?.numBuys === 'number' && { numBuys: token.stats24h.numBuys }),
          ...(typeof token.stats24h?.numSells === 'number' && { numSells: token.stats24h.numSells }),
          ...(typeof token.stats24h?.numTraders === 'number' && { numTraders: token.stats24h.numTraders }),
          ...(typeof token.stats24h?.numNetBuyers === 'number' && { numNetBuyers: token.stats24h.numNetBuyers }),
        },
        
        // Trading stats (1h)
        stats1h: {
          ...(typeof token.stats1h?.priceChange === 'number' && { priceChange: token.stats1h.priceChange }),
          ...(typeof token.stats1h?.holderChange === 'number' && { holderChange: token.stats1h.holderChange }),
          ...(typeof token.stats1h?.liquidityChange === 'number' && { liquidityChange: token.stats1h.liquidityChange }),
          ...(typeof token.stats1h?.buyVolume === 'number' && { buyVolume: token.stats1h.buyVolume }),
          ...(typeof token.stats1h?.sellVolume === 'number' && { sellVolume: token.stats1h.sellVolume }),
          ...(typeof token.stats1h?.buyOrganicVolume === 'number' && { buyOrganicVolume: token.stats1h.buyOrganicVolume }),
          ...(typeof token.stats1h?.sellOrganicVolume === 'number' && { sellOrganicVolume: token.stats1h.sellOrganicVolume }),
          ...(typeof token.stats1h?.numBuys === 'number' && { numBuys: token.stats1h.numBuys }),
          ...(typeof token.stats1h?.numSells === 'number' && { numSells: token.stats1h.numSells }),
          ...(typeof token.stats1h?.numTraders === 'number' && { numTraders: token.stats1h.numTraders }),
          ...(typeof token.stats1h?.numNetBuyers === 'number' && { numNetBuyers: token.stats1h.numNetBuyers }),
        },
        
        // Trading stats (6h)
        stats6h: {
          ...(typeof token.stats6h?.priceChange === 'number' && { priceChange: token.stats6h.priceChange }),
          ...(typeof token.stats6h?.holderChange === 'number' && { holderChange: token.stats6h.holderChange }),
          ...(typeof token.stats6h?.liquidityChange === 'number' && { liquidityChange: token.stats6h.liquidityChange }),
          ...(typeof token.stats6h?.buyVolume === 'number' && { buyVolume: token.stats6h.buyVolume }),
          ...(typeof token.stats6h?.sellVolume === 'number' && { sellVolume: token.stats6h.sellVolume }),
          ...(typeof token.stats6h?.buyOrganicVolume === 'number' && { buyOrganicVolume: token.stats6h.buyOrganicVolume }),
          ...(typeof token.stats6h?.sellOrganicVolume === 'number' && { sellOrganicVolume: token.stats6h.sellOrganicVolume }),
          ...(typeof token.stats6h?.numBuys === 'number' && { numBuys: token.stats6h.numBuys }),
          ...(typeof token.stats6h?.numSells === 'number' && { numSells: token.stats6h.numSells }),
          ...(typeof token.stats6h?.numTraders === 'number' && { numTraders: token.stats6h.numTraders }),
          ...(typeof token.stats6h?.numNetBuyers === 'number' && { numNetBuyers: token.stats6h.numNetBuyers }),
        },
        
        // Trading stats (5m)
        stats5m: {
          ...(typeof token.stats5m?.priceChange === 'number' && { priceChange: token.stats5m.priceChange }),
          ...(typeof token.stats5m?.holderChange === 'number' && { holderChange: token.stats5m.holderChange }),
          ...(typeof token.stats5m?.liquidityChange === 'number' && { liquidityChange: token.stats5m.liquidityChange }),
          ...(typeof token.stats5m?.buyVolume === 'number' && { buyVolume: token.stats5m.buyVolume }),
          ...(typeof token.stats5m?.sellVolume === 'number' && { sellVolume: token.stats5m.sellVolume }),
          ...(typeof token.stats5m?.buyOrganicVolume === 'number' && { buyOrganicVolume: token.stats5m.buyOrganicVolume }),
          ...(typeof token.stats5m?.sellOrganicVolume === 'number' && { sellOrganicVolume: token.stats5m.sellOrganicVolume }),
          ...(typeof token.stats5m?.numBuys === 'number' && { numBuys: token.stats5m.numBuys }),
          ...(typeof token.stats5m?.numSells === 'number' && { numSells: token.stats5m.numSells }),
          ...(typeof token.stats5m?.numTraders === 'number' && { numTraders: token.stats5m.numTraders }),
          ...(typeof token.stats5m?.numNetBuyers === 'number' && { numNetBuyers: token.stats5m.numNetBuyers }),
        },
        
        // Metadata
        createdAt: token.firstPool?.createdAt || now,
        updatedAt: token.updatedAt || now,
        filterReason: this.getFilterReason(token),
        lastUpdated: now
      }))
      .filter((token: TransformedToken) => 
        token.tokenProgram === TARGET_TOKEN_PROGRAM || 
        token.id.toLowerCase().endsWith('bonk')
      );
  }

  /**
   * Determine why a token was filtered
   */
  private getFilterReason(token: JupiterToken): 'token_program' | 'bonk_ending' {
    if (token.tokenProgram === TARGET_TOKEN_PROGRAM) {
      return 'token_program';
    }
    if (token.id.toLowerCase().endsWith('bonk')) {
      return 'bonk_ending';
    }
    return 'token_program'; // Default fallback
  }

  /**
   * Store tokens in Firebase Realtime Database
   */
  private async storeTokensInFirebase(tokens: TransformedToken[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Create tokens object with IDs as keys and validate data
      const tokensObject: { [key: string]: TransformedToken } = {};
      tokens.forEach(token => {
        // Ensure all required fields are present and valid
        const validatedToken: TransformedToken = {
          // Basic token info
          id: token.id || '',
          name: token.name || '',
          symbol: token.symbol || '',
          imageUrl: token.imageUrl || '',
          decimals: typeof token.decimals === 'number' ? token.decimals : 6,
          dev: token.dev || '',
          circSupply: typeof token.circSupply === 'number' ? token.circSupply : 0,
          totalSupply: typeof token.totalSupply === 'number' ? token.totalSupply : 0,
          tokenProgram: token.tokenProgram || '',
          ...(token.launchpad && { launchpad: token.launchpad }),
          ...(token.metaLaunchpad && { metaLaunchpad: token.metaLaunchpad }),
          ...(token.partnerConfig && { partnerConfig: token.partnerConfig }),
          
          // Pool info
          ...(token.firstPoolId && { firstPoolId: token.firstPoolId }),
          firstPoolCreatedAt: token.firstPoolCreatedAt || now,
          
          // Holder info
          holderCount: typeof token.holderCount === 'number' ? token.holderCount : 0,
          
          // Audit info
          audit: {
            ...(token.audit?.isSus !== undefined && { isSus: token.audit.isSus }),
            ...(token.audit?.mintAuthorityDisabled !== undefined && { mintAuthorityDisabled: token.audit.mintAuthorityDisabled }),
            ...(token.audit?.freezeAuthorityDisabled !== undefined && { freezeAuthorityDisabled: token.audit.freezeAuthorityDisabled }),
            ...(typeof token.audit?.devBalancePercentage === 'number' && { devBalancePercentage: token.audit.devBalancePercentage }),
            ...(typeof token.audit?.topHoldersPercentage === 'number' && { topHoldersPercentage: token.audit.topHoldersPercentage }),
            ...(typeof token.audit?.devMigrations === 'number' && { devMigrations: token.audit.devMigrations }),
            ...(token.audit?.blockaidHoneypot !== undefined && { blockaidHoneypot: token.audit.blockaidHoneypot }),
            ...(token.audit?.blockaidRugpull !== undefined && { blockaidRugpull: token.audit.blockaidRugpull }),
          },
          
          // Organic score
          organicScore: typeof token.organicScore === 'number' ? token.organicScore : 0,
          organicScoreLabel: token.organicScoreLabel || 'low',
          tags: Array.isArray(token.tags) ? token.tags : [],
          
          // Price and market data
          fdv: typeof token.fdv === 'number' ? token.fdv : 0,
          marketCap: typeof token.marketCap === 'number' ? token.marketCap : 0,
          price: typeof token.price === 'number' ? token.price : 0,
          liquidity: typeof token.liquidity === 'number' ? token.liquidity : 0,
          ...(typeof token.priceBlockId === 'number' && { priceBlockId: token.priceBlockId }),
          ...(typeof token.bondingCurve === 'number' && { bondingCurve: token.bondingCurve }),
          
          // Social links
          ...(token.twitter && { twitter: token.twitter }),
          ...(token.website && { website: token.website }),
          ...(token.telegram && { telegram: token.telegram }),
          
          // Trading stats (24h)
          stats24h: {
            ...(typeof token.stats24h?.priceChange === 'number' && { priceChange: token.stats24h.priceChange }),
            ...(typeof token.stats24h?.holderChange === 'number' && { holderChange: token.stats24h.holderChange }),
            ...(typeof token.stats24h?.liquidityChange === 'number' && { liquidityChange: token.stats24h.liquidityChange }),
            ...(typeof token.stats24h?.buyVolume === 'number' && { buyVolume: token.stats24h.buyVolume }),
            ...(typeof token.stats24h?.sellVolume === 'number' && { sellVolume: token.stats24h.sellVolume }),
            ...(typeof token.stats24h?.buyOrganicVolume === 'number' && { buyOrganicVolume: token.stats24h.buyOrganicVolume }),
            ...(typeof token.stats24h?.sellOrganicVolume === 'number' && { sellOrganicVolume: token.stats24h.sellOrganicVolume }),
            ...(typeof token.stats24h?.numBuys === 'number' && { numBuys: token.stats24h.numBuys }),
            ...(typeof token.stats24h?.numSells === 'number' && { numSells: token.stats24h.numSells }),
            ...(typeof token.stats24h?.numTraders === 'number' && { numTraders: token.stats24h.numTraders }),
            ...(typeof token.stats24h?.numNetBuyers === 'number' && { numNetBuyers: token.stats24h.numNetBuyers }),
          },
          
          // Trading stats (1h)
          stats1h: {
            ...(typeof token.stats1h?.priceChange === 'number' && { priceChange: token.stats1h.priceChange }),
            ...(typeof token.stats1h?.holderChange === 'number' && { holderChange: token.stats1h.holderChange }),
            ...(typeof token.stats1h?.liquidityChange === 'number' && { liquidityChange: token.stats1h.liquidityChange }),
            ...(typeof token.stats1h?.buyVolume === 'number' && { buyVolume: token.stats1h.buyVolume }),
            ...(typeof token.stats1h?.sellVolume === 'number' && { sellVolume: token.stats1h.sellVolume }),
            ...(typeof token.stats1h?.buyOrganicVolume === 'number' && { buyOrganicVolume: token.stats1h.buyOrganicVolume }),
            ...(typeof token.stats1h?.sellOrganicVolume === 'number' && { sellOrganicVolume: token.stats1h.sellOrganicVolume }),
            ...(typeof token.stats1h?.numBuys === 'number' && { numBuys: token.stats1h.numBuys }),
            ...(typeof token.stats1h?.numSells === 'number' && { numSells: token.stats1h.numSells }),
            ...(typeof token.stats1h?.numTraders === 'number' && { numTraders: token.stats1h.numTraders }),
            ...(typeof token.stats1h?.numNetBuyers === 'number' && { numNetBuyers: token.stats1h.numNetBuyers }),
          },
          
          // Trading stats (6h)
          stats6h: {
            ...(typeof token.stats6h?.priceChange === 'number' && { priceChange: token.stats6h.priceChange }),
            ...(typeof token.stats6h?.holderChange === 'number' && { holderChange: token.stats6h.holderChange }),
            ...(typeof token.stats6h?.liquidityChange === 'number' && { liquidityChange: token.stats6h.liquidityChange }),
            ...(typeof token.stats6h?.buyVolume === 'number' && { buyVolume: token.stats6h.buyVolume }),
            ...(typeof token.stats6h?.sellVolume === 'number' && { sellVolume: token.stats6h.sellVolume }),
            ...(typeof token.stats6h?.buyOrganicVolume === 'number' && { buyOrganicVolume: token.stats6h.buyOrganicVolume }),
            ...(typeof token.stats6h?.sellOrganicVolume === 'number' && { sellOrganicVolume: token.stats6h.sellOrganicVolume }),
            ...(typeof token.stats6h?.numBuys === 'number' && { numBuys: token.stats6h.numBuys }),
            ...(typeof token.stats6h?.numSells === 'number' && { numSells: token.stats6h.numSells }),
            ...(typeof token.stats6h?.numTraders === 'number' && { numTraders: token.stats6h.numTraders }),
            ...(typeof token.stats6h?.numNetBuyers === 'number' && { numNetBuyers: token.stats6h.numNetBuyers }),
          },
          
          // Trading stats (5m)
          stats5m: {
            ...(typeof token.stats5m?.priceChange === 'number' && { priceChange: token.stats5m.priceChange }),
            ...(typeof token.stats5m?.holderChange === 'number' && { holderChange: token.stats5m.holderChange }),
            ...(typeof token.stats5m?.liquidityChange === 'number' && { liquidityChange: token.stats5m.liquidityChange }),
            ...(typeof token.stats5m?.buyVolume === 'number' && { buyVolume: token.stats5m.buyVolume }),
            ...(typeof token.stats5m?.sellVolume === 'number' && { sellVolume: token.stats5m.sellVolume }),
            ...(typeof token.stats5m?.buyOrganicVolume === 'number' && { buyOrganicVolume: token.stats5m.buyOrganicVolume }),
            ...(typeof token.stats5m?.sellOrganicVolume === 'number' && { sellOrganicVolume: token.stats5m.sellOrganicVolume }),
            ...(typeof token.stats5m?.numBuys === 'number' && { numBuys: token.stats5m.numBuys }),
            ...(typeof token.stats5m?.numSells === 'number' && { numSells: token.stats5m.numSells }),
            ...(typeof token.stats5m?.numTraders === 'number' && { numTraders: token.stats5m.numTraders }),
            ...(typeof token.stats5m?.numNetBuyers === 'number' && { numNetBuyers: token.stats5m.numNetBuyers }),
          },
          
          // Metadata
          createdAt: token.createdAt || now,
          updatedAt: token.updatedAt || now,
          filterReason: token.filterReason || 'token_program',
          lastUpdated: token.lastUpdated || now
        };
        
        // Only store if ID is valid
        if (validatedToken.id) {
          tokensObject[validatedToken.id] = validatedToken;
        }
      });

      // Store in Firebase
      await this.database.ref(FIREBASE_PATHS.RECENT_TOKENS).set({
        timestamp: now,
        total_count: tokens.length,
        filtered_count: Object.keys(tokensObject).length,
        tokens: tokensObject
      });

      logger.debug(`📊 Stored ${Object.keys(tokensObject).length} tokens in Firebase with comprehensive data`);
    } catch (error) {
      logger.error('❌ Error storing tokens in Firebase:', error);
      throw error;
    }
  }

  /**
   * Update service metadata
   */
  private async updateMetadata(_fetchTime: number, _tokenCount: number): Promise<void> {
    try {
      const metadata: JupiterServiceMetadata = {
        last_fetch: new Date().toISOString(),
        fetch_count: this.fetchCount,
        error_count: this.errorCount,
        status: 'active'
      };

      await this.database.ref(FIREBASE_PATHS.METADATA).set(metadata);
    } catch (error) {
      logger.error('❌ Error updating metadata:', error);
    }
  }

  /**
   * Update error metadata
   */
  private async updateErrorMetadata(): Promise<void> {
    try {
      const metadata: JupiterServiceMetadata = {
        last_fetch: new Date().toISOString(),
        fetch_count: this.fetchCount,
        error_count: this.errorCount,
        status: this.errorCount > 10 ? 'error' : 'active'
      };

      await this.database.ref(FIREBASE_PATHS.METADATA).set(metadata);
    } catch (error) {
      logger.error('❌ Error updating error metadata:', error);
    }
  }

  /**
   * Get service status
   */
  public getStatus(): { isRunning: boolean; fetchCount: number; errorCount: number } {
    return {
      isRunning: this.isRunning,
      fetchCount: this.fetchCount,
      errorCount: this.errorCount
    };
  }

  /**
   * Get latest tokens from Firebase
   */
  public async getLatestTokens(): Promise<TransformedToken[]> {
    try {
      const snapshot = await this.database.ref(FIREBASE_PATHS.RECENT_TOKENS).once('value');
      const data = snapshot.val();
      
      if (!data || !data.tokens) {
        return [];
      }

      return Object.values(data.tokens) as TransformedToken[];
    } catch (error) {
      logger.error('❌ Error getting latest tokens:', error);
      return [];
    }
  }
}

// Export singleton instance
export const jupiterService = new JupiterService();
