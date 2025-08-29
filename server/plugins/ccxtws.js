import ccxt from 'ccxt';
import { userExchangesSchema } from "~/server/models/userExchanges.schema";

/**
 * CCXT WebSocket Wrapper
 * Provides WebSocket streaming capabilities for supported exchanges
 */
class CCXTWS {
    constructor() {
        this.wsInstances = new Map(); // Store WebSocket instances per user/exchange
        this.subscriptions = new Map(); // Track active subscriptions
        this.activeWatchers = new Map(); // Track active watch loops with unique IDs
    }

    /**
     * Initialize WebSocket instance for an exchange
     */
    async initWebSocketInstance(userID, exchange) {
        const key = `${userID}:${exchange}`;
        
        // Check if we already have a WebSocket instance
        if (this.wsInstances.has(key)) {
            return this.wsInstances.get(key);
        }

        // Get API keys
        const apiKeys = await this.getApiKeys(userID, exchange);
        
        // Check if exchange supports WebSocket via CCXT Pro
        if (!ccxt.pro || !ccxt.pro[exchange]) {
            console.log(`[CCXTWS] ${exchange} not available in CCXT Pro`);
            return null;
        }

        try {
            // Create WebSocket-enabled instance using CCXT Pro
            const ExchangeClass = ccxt.pro[exchange];
            const instance = new ExchangeClass({
                ...apiKeys,
                enableRateLimit: true,
                options: {
                    defaultType: 'spot', // or 'future' for futures trading
                }
            });

            await instance.loadMarkets();
            
            this.wsInstances.set(key, instance);
            console.log(`[CCXTWS] WebSocket instance created for ${exchange} using CCXT Pro`);
            
            return instance;
        } catch (error) {
            console.error(`[CCXTWS] Failed to create WebSocket instance for ${exchange}:`, error);
            return null;
        }
    }

    /**
     * Get API keys for user/exchange
     */
    async getApiKeys(userID, exchange) {
        const userExchanges = await userExchangesSchema.findOne({ userID, exchange });
        
        if (!userExchanges) {
            return {};
        }

        const keys = {};
        for (const apiKey of userExchanges.apiKeys) {
            keys[apiKey.key] = apiKey.value;
        }
        
        return keys;
    }

    /**
     * Check if exchange supports WebSocket
     */
    supportsWebSocket(exchange) {
        // Check if CCXT Pro has this exchange
        return !!(ccxt.pro && ccxt.pro[exchange]);
    }

    /**
     * Watch OHLCV candles via WebSocket
     */
    async watchOHLCV(userID, exchange, symbol, timeframe, callback) {
        const instance = await this.initWebSocketInstance(userID, exchange);
        
        if (!instance) {
            throw new Error(`WebSocket not supported for ${exchange}`);
        }

        console.log(`[CCXTWS] Checking watchOHLCV support for ${exchange}:`, {
            hasWatchOHLCV: instance.has?.watchOHLCV || false,
            hasWatch: typeof instance.watchOHLCV === 'function'
        });

        // Check if exchange has watchOHLCV method
        if (typeof instance.watchOHLCV !== 'function') {
            throw new Error(`${exchange} does not support watchOHLCV`);
        }

        const subscriptionKey = `${exchange}:${symbol}:${timeframe}`;
        
        // If watcher already exists, just ensure subscription is active and return
        if (this.activeWatchers.has(subscriptionKey)) {
            console.log(`[CCXTWS] OHLCV watcher already running for ${subscriptionKey}, reusing it`);
            this.subscriptions.set(subscriptionKey, true);
            return;
        }
        
        // Create unique watcher ID for new watcher
        const watcherId = `${subscriptionKey}:${Date.now()}`;
        this.activeWatchers.set(subscriptionKey, watcherId);
        this.subscriptions.set(subscriptionKey, true);
        
        try {
            console.log(`[CCXTWS] Starting OHLCV stream ${watcherId} for ${symbol} on ${exchange} with timeframe ${timeframe}`);
            
            let lastCandleTime = 0;
            
            // Start watching OHLCV data
            while (this.subscriptions.has(subscriptionKey) && this.activeWatchers.get(subscriptionKey) === watcherId) {
                try {
                    const ohlcv = await instance.watchOHLCV(symbol, timeframe, null, 100);
                    
                    if (ohlcv && ohlcv.length > 0) {
                        // Get the latest candle
                        const latestCandle = ohlcv[ohlcv.length - 1];
                        
                        // Only emit if this is a new or updated candle
                        if (latestCandle[0] >= lastCandleTime) {
                            lastCandleTime = latestCandle[0];
                            
                            // Format candle data
                            const formattedCandle = {
                                time: latestCandle[0] / 1000, // Convert to seconds
                                open: latestCandle[1],
                                high: latestCandle[2],
                                low: latestCandle[3],
                                close: latestCandle[4],
                                volume: latestCandle[5]
                            };
                            
                            // Call the callback with formatted data
                            if (callback) {
                                callback(formattedCandle);
                            }
                        }
                    }
                } catch (innerError) {
                    console.error(`[CCXTWS] Inner error in watchOHLCV:`, innerError.message);
                    // Small delay only on error
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            console.log(`[CCXTWS] Stopped watching OHLCV for ${symbol} (${watcherId})`);
        } catch (error) {
            console.error(`[CCXTWS] Error watching OHLCV for ${symbol}:`, error.message);
            throw error;
        }
    }

    /**
     * Watch ticker via WebSocket
     */
    async watchTicker(userID, exchange, symbol, callback) {
        const instance = await this.initWebSocketInstance(userID, exchange);
        
        if (!instance) {
            throw new Error(`WebSocket not supported for ${exchange}`);
        }

        console.log(`[CCXTWS] Checking watchTicker support for ${exchange}:`, {
            hasWatchTicker: instance.has?.watchTicker || false,
            hasWatch: typeof instance.watchTicker === 'function'
        });

        if (typeof instance.watchTicker !== 'function') {
            throw new Error(`${exchange} does not support watchTicker`);
        }

        const subscriptionKey = `${exchange}:${symbol}:ticker`;
        
        // If watcher already exists, just ensure subscription is active and return
        if (this.activeWatchers.has(subscriptionKey)) {
            console.log(`[CCXTWS] Ticker watcher already running for ${subscriptionKey}, reusing it`);
            this.subscriptions.set(subscriptionKey, true);
            return;
        }
        
        // Create unique watcher ID for new watcher
        const watcherId = `${subscriptionKey}:${Date.now()}`;
        this.activeWatchers.set(subscriptionKey, watcherId);
        this.subscriptions.set(subscriptionKey, true);
        
        try {
            console.log(`[CCXTWS] Starting ticker stream ${watcherId} for ${symbol} on ${exchange}`);
            
            let lastTickerTime = 0;
            
            // Start watching ticker data
            while (this.subscriptions.has(subscriptionKey) && this.activeWatchers.get(subscriptionKey) === watcherId) {
                try {
                    const ticker = await instance.watchTicker(symbol);
                    
                    if (ticker) {
                        // Only emit if ticker has updated
                        if (!ticker.timestamp || ticker.timestamp > lastTickerTime) {
                            lastTickerTime = ticker.timestamp || Date.now();
                            
                            // Format ticker data to match our existing structure
                            const formattedTicker = {
                                last: ticker.last || 0,
                                change: ticker.percentage || 0,
                                low: ticker.low || 0,
                                high: ticker.high || 0,
                                baseVolume: ticker.baseVolume || 0,
                                quoteVolume: ticker.quoteVolume || 0,
                                bid: ticker.bid || 0,
                                ask: ticker.ask || 0,
                                timestamp: ticker.timestamp || Date.now()
                            };
                            
                            if (callback) {
                                callback(formattedTicker);
                            }
                        }
                    }
                } catch (innerError) {
                    console.error(`[CCXTWS] Inner error in watchTicker:`, innerError.message);
                    // Small delay only on error
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            console.log(`[CCXTWS] Stopped watching ticker for ${symbol} (${watcherId})`);
        } catch (error) {
            console.error(`[CCXTWS] Error watching ticker for ${symbol}:`, error.message);
            throw error;
        }
    }

    /**
     * Watch order book via WebSocket
     */
    async watchOrderBook(userID, exchange, symbol, callback) {
        const instance = await this.initWebSocketInstance(userID, exchange);
        
        if (!instance) {
            throw new Error(`WebSocket not supported for ${exchange}`);
        }

        if (typeof instance.watchOrderBook !== 'function') {
            throw new Error(`${exchange} does not support watchOrderBook`);
        }

        const subscriptionKey = `${exchange}:${symbol}:orderbook`;
        
        // If watcher already exists, just ensure subscription is active and return
        if (this.activeWatchers.has(subscriptionKey)) {
            console.log(`[CCXTWS] Order book watcher already running for ${subscriptionKey}, reusing it`);
            this.subscriptions.set(subscriptionKey, true);
            return;
        }
        
        // Create unique watcher ID for new watcher
        const watcherId = `${subscriptionKey}:${Date.now()}`;
        this.activeWatchers.set(subscriptionKey, watcherId);
        this.subscriptions.set(subscriptionKey, true);
        
        try {
            console.log(`[CCXTWS] Starting order book stream ${watcherId} for ${symbol} on ${exchange}`);
            
            while (this.subscriptions.has(subscriptionKey) && this.activeWatchers.get(subscriptionKey) === watcherId) {
                const orderBook = await instance.watchOrderBook(symbol);
                
                if (callback) {
                    callback(orderBook);
                }
                
                if (!this.subscriptions.has(subscriptionKey) || this.activeWatchers.get(subscriptionKey) !== watcherId) {
                    break;
                }
            }
            console.log(`[CCXTWS] Stopped watching order book for ${symbol} (${watcherId})`);
        } catch (error) {
            console.error(`[CCXTWS] Error watching order book for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Watch trades via WebSocket
     */
    async watchTrades(userID, exchange, symbol, callback) {
        const instance = await this.initWebSocketInstance(userID, exchange);
        
        if (!instance) {
            throw new Error(`WebSocket not supported for ${exchange}`);
        }

        if (typeof instance.watchTrades !== 'function') {
            throw new Error(`${exchange} does not support watchTrades`);
        }

        const subscriptionKey = `${exchange}:${symbol}:trades`;
        
        try {
            console.log(`[CCXTWS] Starting trades stream for ${symbol} on ${exchange}`);
            
            while (true) {
                const trades = await instance.watchTrades(symbol);
                
                if (callback && trades.length > 0) {
                    callback(trades);
                }
                
                if (!this.subscriptions.has(subscriptionKey)) {
                    break;
                }
            }
        } catch (error) {
            console.error(`[CCXTWS] Error watching trades for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Subscribe to a stream
     */
    subscribe(subscriptionKey) {
        this.subscriptions.set(subscriptionKey, true);
    }

    /**
     * Unsubscribe from a stream
     */
    unsubscribe(subscriptionKey) {
        this.subscriptions.delete(subscriptionKey);
        // IMPORTANT: Also remove from activeWatchers so new subscriptions can start fresh
        this.activeWatchers.delete(subscriptionKey);
    }

    /**
     * Close WebSocket connection
     */
    async close(userID, exchange) {
        const key = `${userID}:${exchange}`;
        const instance = this.wsInstances.get(key);
        
        if (instance && instance.close) {
            await instance.close();
            this.wsInstances.delete(key);
            
            // Remove all subscriptions and watchers for this instance
            for (const [subKey] of this.subscriptions) {
                if (subKey.startsWith(`${exchange}:`)) {
                    this.subscriptions.delete(subKey);
                    this.activeWatchers.delete(subKey);
                }
            }
            
            console.log(`[CCXTWS] Closed WebSocket connection for ${exchange}`);
        }
    }

    /**
     * Close all WebSocket connections
     */
    async closeAll() {
        for (const [key, instance] of this.wsInstances) {
            if (instance && instance.close) {
                await instance.close();
            }
        }
        
        this.wsInstances.clear();
        this.subscriptions.clear();
        this.activeWatchers.clear();
        
        console.log('[CCXTWS] All WebSocket connections closed');
    }
}

// Create singleton instance
const ccxtwsInstance = new CCXTWS();

// Export as Nitro plugin
export default defineNitroPlugin((nitroApp) => {
  // Make CCXTWS available to other plugins and API routes
  nitroApp.ccxtws = ccxtwsInstance;
  
  // Clean up on shutdown
  nitroApp.hooks.hook('close', async () => {
    await ccxtwsInstance.closeAll();
  });
  
  console.log('[CCXTWS] WebSocket wrapper initialized');
});