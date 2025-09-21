import axios from 'axios';
import { logger } from '../utils/logger';

export interface JupiterTokenData {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  circSupply: number;
  totalSupply: number;
  tokenProgram: string;
  firstPool: {
    id: string;
    createdAt: string;
  };
  holderCount: number;
  audit: {
    mintAuthorityDisabled: boolean;
    freezeAuthorityDisabled: boolean;
    topHoldersPercentage: number;
  };
  organicScore: number;
  organicScoreLabel: string;
  isVerified: boolean;
  tags: string[];
  fdv: number;
  mcap: number;
  usdPrice: number;
  priceBlockId: number;
  liquidity: number;
  stats5m: {
    priceChange: number;
    liquidityChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
    buyOrganicVolume: number;
    sellOrganicVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
    numOrganicBuyers: number;
    numNetBuyers: number;
  };
  stats1h: {
    priceChange: number;
    liquidityChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
    buyOrganicVolume: number;
    sellOrganicVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
    numOrganicBuyers: number;
    numNetBuyers: number;
  };
  stats6h: {
    priceChange: number;
    liquidityChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
    buyOrganicVolume: number;
    sellOrganicVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
    numOrganicBuyers: number;
    numNetBuyers: number;
  };
  stats24h: {
    priceChange: number;
    liquidityChange: number;
    volumeChange: number;
    buyVolume: number;
    sellVolume: number;
    buyOrganicVolume: number;
    sellOrganicVolume: number;
    numBuys: number;
    numSells: number;
    numTraders: number;
    numOrganicBuyers: number;
    numNetBuyers: number;
  };
  ctLikes: number;
  smartCtLikes: number;
  updatedAt: string;
}

export interface ProcessedTokenData {
  name: string;
  symbol: string;
  mint: string;
  status: string;
  marketcap: number;
  price_usd: number;
  volume_24h: number;
  liquidity: number;
  created_at: string;
  source: string;
  decimals: number;
  supply: number;
  holderCount: number;
  organicScore: number;
  isVerified: boolean;
  tags: string[];
  priceChange24h: number;
  volumeChange24h: number;
  liquidityChange24h: number;
  numTraders24h: number;
  topHoldersPercentage: number;
  fdv: number;
  rawData: JupiterTokenData;
}

export class OracleCoinFetchService {
  private static instance: OracleCoinFetchService;
  private contractAddress: string;
  private currentTokenData: ProcessedTokenData | null = null;
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly FETCH_INTERVAL = 8000; // 8 seconds
  private readonly API_URL = 'https://lite-api.jup.ag/tokens/v2/search';

  private constructor() {
    this.contractAddress = process.env.ILLUSIO_CONTRACT || 'GvbeE3xrQMHzCBoikm4816VQsrUZAC7owbJma5Ffpump';
    
    if (!this.contractAddress) {
      logger.warn('ILLUSIO_CONTRACT not set; Oracle coin fetch service will be disabled');
    } else {
      logger.info(`🎯 Oracle tracking token: ${this.contractAddress}`);
    }
  }

  public static getInstance(): OracleCoinFetchService {
    if (!OracleCoinFetchService.instance) {
      OracleCoinFetchService.instance = new OracleCoinFetchService();
    }
    return OracleCoinFetchService.instance;
  }

  public async startFetching(): Promise<void> {
    if (this.isRunning) {
      logger.info('Oracle coin fetch service is already running');
      return;
    }

    if (!this.contractAddress) {
      logger.warn('Cannot start Oracle coin fetch service - ILLUSIO_CONTRACT not set');
      return;
    }

    logger.info(`🚀 Starting Oracle coin fetch service for contract: ${this.contractAddress}`);
    this.isRunning = true;

    // Fetch initial data
    await this.fetchTokenData();

    // Start regular fetching
    this.interval = setInterval(async () => {
      try {
        await this.fetchTokenData();
      } catch (error) {
        logger.error('Error in Oracle coin fetch service:', error);
      }
    }, this.FETCH_INTERVAL);

    logger.info('✅ Oracle coin fetch service started - fetching data every 8 seconds');
  }

  public stopFetching(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    logger.info('🛑 Oracle coin fetch service stopped');
  }

  public getCurrentTokenData(): ProcessedTokenData | null {
    return this.currentTokenData;
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      contractAddress: this.contractAddress,
      hasData: this.currentTokenData !== null,
      lastFetch: this.currentTokenData?.rawData?.updatedAt || null
    };
  }

  private async fetchTokenData(): Promise<void> {
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${this.API_URL}?query=${this.contractAddress}`,
        headers: { 
          'Accept': 'application/json'
        }
      };

      const response = await axios.request(config);
      const data = response.data;

      if (data && data.length > 0) {
        const tokenData = data[0] as JupiterTokenData;
        this.currentTokenData = this.processTokenData(tokenData);
        logger.debug(`📊 Fetched token data for ${tokenData.name} (${tokenData.symbol})`);
      } else {
        logger.warn(`No token data found for contract: ${this.contractAddress}`);
      }
    } catch (error) {
      logger.error('Error fetching token data from Jupiter API:', error);
    }
  }

  private processTokenData(jupiterData: JupiterTokenData): ProcessedTokenData {
    return {
      name: jupiterData.name,
      symbol: jupiterData.symbol,
      mint: jupiterData.id,
      status: 'active',
      marketcap: jupiterData.mcap,
      price_usd: jupiterData.usdPrice,
      volume_24h: jupiterData.stats24h.buyVolume + jupiterData.stats24h.sellVolume,
      liquidity: jupiterData.liquidity,
      created_at: jupiterData.firstPool.createdAt,
      source: 'jupiter_api',
      decimals: jupiterData.decimals,
      supply: jupiterData.circSupply,
      holderCount: jupiterData.holderCount,
      organicScore: jupiterData.organicScore,
      isVerified: jupiterData.isVerified,
      tags: jupiterData.tags,
      priceChange24h: jupiterData.stats24h.priceChange,
      volumeChange24h: jupiterData.stats24h.volumeChange,
      liquidityChange24h: jupiterData.stats24h.liquidityChange,
      numTraders24h: jupiterData.stats24h.numTraders,
      topHoldersPercentage: jupiterData.audit.topHoldersPercentage,
      fdv: jupiterData.fdv,
      rawData: jupiterData
    };
  }

  // Method to get formatted token data for oracle prompts
  public getFormattedTokenData(): any {
    if (!this.currentTokenData) {
      return this.getFallbackTokenData();
    }

    const data = this.currentTokenData;
    return {
      name: data.name,
      symbol: data.symbol,
      mint: data.mint,
      status: data.status,
      marketcap: data.marketcap,
      price_usd: data.price_usd,
      volume_24h: data.volume_24h,
      liquidity: data.liquidity,
      created_at: data.created_at,
      source: data.source,
      decimals: data.decimals,
      supply: data.supply,
      holderCount: data.holderCount,
      organicScore: data.organicScore,
      isVerified: data.isVerified,
      tags: data.tags,
      priceChange24h: data.priceChange24h,
      volumeChange24h: data.volumeChange24h,
      liquidityChange24h: data.liquidityChange24h,
      numTraders24h: data.numTraders24h,
      topHoldersPercentage: data.topHoldersPercentage,
      fdv: data.fdv
    };
  }

  private getFallbackTokenData(): any {
    // Fallback to mock data if no real data is available
    return {
      name: 'Oracle Market',
      symbol: 'ORACLE',
      mint: 'oracle-conversation',
      status: 'active',
      marketcap: null,
      price_usd: null,
      volume_24h: null,
      liquidity: null,
      created_at: new Date().toISOString(),
      source: 'fallback',
      decimals: 9,
      supply: 1000000000
    };
  }
}

// Export singleton instance
export const oracleCoinFetchService = OracleCoinFetchService.getInstance();
