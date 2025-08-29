import { Server } from 'socket.io';
import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async';

let io = null;
const priceSubscriptions = new Map(); // Track subscriptions per symbol
const priceIntervals = new Map(); // Track intervals per symbol
const wsStreams = new Map(); // Track WebSocket streams for exchanges that support it

export default defineNitroPlugin((nitroApp) => {
  // Initialize Socket.IO on first HTML render
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    if (!io) {
      try {
        // Get the Node.js server instance
        const server = event.node.res.socket?.server;
        
        if (server) {
          console.log('[WebSocket] Initializing Socket.IO server...');
          
          io = new Server(server, {
            cors: {
              origin: true,
              credentials: true
            },
            path: '/socket.io/',
            serveClient: true,
            transports: ['polling', 'websocket']
          });

          // Helper function to start ticker polling (fallback)
          const startTickerPolling = (subscriptionKey, userID, exchange, symbol) => {
            if (!priceIntervals.has(subscriptionKey)) {
              console.log(`[WebSocket] Using HTTP polling for ticker ${exchange}`);
              
              const interval = setIntervalAsync(async () => {
                try {
                  const response = await $fetch('/api/v1/fetchTicker', {
                    query: { userID, exchange, symbol }
                  });
                  
                  if (response.data) {
                    const subscribers = priceSubscriptions.get(subscriptionKey);
                    if (subscribers) {
                      subscribers.forEach(socketId => {
                        io.to(socketId).emit('ticker:update', {
                          symbol,
                          exchange,
                          ticker: response.data,
                          streaming: false
                        });
                      });
                    }
                  }
                } catch (error) {
                  console.error(`[WebSocket] Error fetching ticker for ${subscriptionKey}:`, error.message);
                }
              }, 100); // Poll every 100ms for faster updates
              
              priceIntervals.set(subscriptionKey, interval);
            }
          };
          
          // Helper function to start polling (fallback for non-WebSocket exchanges)
          const startPolling = (subscriptionKey, userID, exchange, symbol, timeframe) => {
            if (!priceIntervals.has(subscriptionKey)) {
              console.log(`[WebSocket] Using HTTP polling for ${exchange}`);
              
              const interval = setIntervalAsync(async () => {
                try {
                  const candleData = await $fetch('/api/v1/fetchOHLCVLivePrice', {
                    query: { userID, exchange, symbol, timeframe }
                  });
                  
                  if (candleData && candleData.length > 0) {
                    const latestCandle = candleData[candleData.length - 1];
                    
                    // Emit to all subscribers
                    const subscribers = priceSubscriptions.get(subscriptionKey);
                    if (subscribers) {
                      subscribers.forEach(socketId => {
                        io.to(socketId).emit('chart:update', {
                          symbol,
                          exchange,
                          timeframe,
                          candle: latestCandle,
                          streaming: false // Indicate this is polling data
                        });
                      });
                    }
                  }
                } catch (error) {
                  console.error(`[WebSocket] Error fetching price for ${subscriptionKey}:`, error.message);
                }
              }, 100); // Poll every 100ms for faster updates
              
              priceIntervals.set(subscriptionKey, interval);
            }
          };

          // Helper function to start order book polling (fallback)
          const startOrderBookPolling = (subscriptionKey, userID, exchange, symbol) => {
            if (!priceIntervals.has(subscriptionKey)) {
              console.log(`[WebSocket] Using HTTP polling for order book ${exchange}`);
              
              const interval = setIntervalAsync(async () => {
                try {
                  const response = await $fetch('/api/v1/fetchOrderBook', {
                    query: { userID, exchange, symbol }
                  });
                  
                  if (response.data) {
                    const subscribers = priceSubscriptions.get(subscriptionKey);
                    if (subscribers) {
                      const formattedOrderBook = {
                        bids: response.data.bids.slice(0, 20),
                        asks: response.data.asks.slice(0, 20),
                        timestamp: response.data.timestamp || Date.now()
                      };
                      
                      subscribers.forEach(socketId => {
                        io.to(socketId).emit('orderbook:update', {
                          symbol,
                          exchange,
                          orderBook: formattedOrderBook,
                          streaming: false
                        });
                      });
                    }
                  }
                } catch (error) {
                  console.error(`[WebSocket] Error fetching order book for ${subscriptionKey}:`, error.message);
                }
              }, 100); // Poll every 100ms for fast updates
              
              priceIntervals.set(subscriptionKey, interval);
            }
          };

          io.on('connection', (socket) => {
            console.log('[WebSocket] Client connected:', socket.id);
            
            // Handle request for initial chart data
            socket.on('chart:load', async (data) => {
              const { userID, exchange, symbol, timeframe, limit = 1000 } = data;
              console.log(`[WebSocket] Loading chart data for ${symbol} on ${exchange}`);
              
              try {
                // Calculate time range
                const currentTimestamp = Date.now();
                const duration = await nitroApp.ccxtw.parseTimeframe(userID, exchange, timeframe) * 1000;
                const fromTimestamp = currentTimestamp - (duration * limit);
                
                // Fetch historical data
                const response = await $fetch('/api/v1/fetchOHLCV', {
                  query: {
                    userID,
                    exchange,
                    symbol,
                    timeframe,
                    dateFrom: fromTimestamp,
                    limit
                  }
                });
                
                // Send initial data to client
                socket.emit('chart:data', {
                  symbol,
                  exchange,
                  timeframe,
                  candles: response
                });
                
              } catch (error) {
                console.error('[WebSocket] Error loading chart data:', error);
                socket.emit('chart:error', {
                  message: 'Failed to load chart data',
                  error: error.message
                });
              }
            });
            
            // Handle subscription to live price updates
            socket.on('chart:subscribe', async (data) => {
              const { userID, exchange, symbol, timeframe } = data;
              const subscriptionKey = `${exchange}:${symbol}:${timeframe}`;
              
              console.log(`[WebSocket] Client ${socket.id} subscribing to ${subscriptionKey}`);
              
              // Add socket to subscription list
              if (!priceSubscriptions.has(subscriptionKey)) {
                priceSubscriptions.set(subscriptionKey, new Set());
              }
              priceSubscriptions.get(subscriptionKey).add(socket.id);
              
              // Store subscription info on socket for cleanup
              socket.data.subscriptions = socket.data.subscriptions || [];
              socket.data.subscriptions.push({ subscriptionKey, userID, exchange, symbol, timeframe });
              
              // Check if exchange supports WebSocket streaming
              const supportsWS = nitroApp.ccxtws && nitroApp.ccxtws.supportsWebSocket(exchange);
              
              if (supportsWS) {
                if (!wsStreams.has(subscriptionKey)) {
                  console.log(`[WebSocket] Starting NEW WebSocket stream for ${exchange}`);
                
                try {
                  // Mark this subscription as active
                  nitroApp.ccxtws.subscribe(subscriptionKey);
                  wsStreams.set(subscriptionKey, true);
                  
                  // Start watching OHLCV via WebSocket
                  nitroApp.ccxtws.watchOHLCV(userID, exchange, symbol, timeframe, (candle) => {
                    // Emit to all subscribers
                    const subscribers = priceSubscriptions.get(subscriptionKey);
                    if (subscribers) {
                      subscribers.forEach(socketId => {
                        io.to(socketId).emit('chart:update', {
                          symbol,
                          exchange,
                          timeframe,
                          candle,
                          streaming: true // Indicate this is real-time streaming data
                        });
                      });
                    }
                  }).catch(error => {
                    console.error(`[WebSocket] Failed to start WebSocket stream, falling back to polling:`, error.message);
                    wsStreams.delete(subscriptionKey);
                    nitroApp.ccxtws.unsubscribe(subscriptionKey);
                    
                    // Fall back to polling
                    startPolling(subscriptionKey, userID, exchange, symbol, timeframe);
                  });
                  
                  } catch (error) {
                    console.error(`[WebSocket] Error setting up WebSocket stream:`, error);
                    wsStreams.delete(subscriptionKey);
                    // Fall back to polling
                    startPolling(subscriptionKey, userID, exchange, symbol, timeframe);
                  }
                } else {
                  console.log(`[WebSocket] Chart stream already running for ${subscriptionKey}`);
                }
              } else if (!priceIntervals.has(subscriptionKey)) {
                // Use polling for exchanges that don't support WebSocket
                startPolling(subscriptionKey, userID, exchange, symbol, timeframe);
              }
              
              socket.emit('chart:subscribed', { subscriptionKey });
            });
            
            // Handle ticker subscription
            socket.on('ticker:subscribe', async (data) => {
              const { userID, exchange, symbol } = data;
              const subscriptionKey = `${exchange}:${symbol}:ticker`;
              
              console.log(`[WebSocket] Client ${socket.id} subscribing to ticker ${subscriptionKey}`);
              
              // Add socket to subscription list
              if (!priceSubscriptions.has(subscriptionKey)) {
                priceSubscriptions.set(subscriptionKey, new Set());
              }
              priceSubscriptions.get(subscriptionKey).add(socket.id);
              
              // Store subscription info
              socket.data.subscriptions = socket.data.subscriptions || [];
              socket.data.subscriptions.push({ subscriptionKey, userID, exchange, symbol, type: 'ticker' });
              
              // Check if exchange supports WebSocket
              const supportsWS = nitroApp.ccxtws && nitroApp.ccxtws.supportsWebSocket(exchange);
              
              if (supportsWS) {
                // ALWAYS start a fresh ticker stream to ensure callback is current
                // Stop existing stream if any
                if (wsStreams.has(subscriptionKey)) {
                  console.log(`[WebSocket] Stopping existing ticker stream for ${subscriptionKey} to restart with fresh callback`);
                  if (nitroApp.ccxtws) {
                    nitroApp.ccxtws.unsubscribe(subscriptionKey);
                  }
                  wsStreams.delete(subscriptionKey);
                }
                
                console.log(`[WebSocket] Starting WebSocket ticker stream for ${exchange}`);
                wsStreams.set(subscriptionKey, true);
                
                try {
                  nitroApp.ccxtws.subscribe(subscriptionKey);
                  
                  // Start watching ticker via WebSocket
                  nitroApp.ccxtws.watchTicker(userID, exchange, symbol, (ticker) => {
                    const subscribers = priceSubscriptions.get(subscriptionKey);
                    if (subscribers) {
                      subscribers.forEach(socketId => {
                        io.to(socketId).emit('ticker:update', {
                          symbol,
                          exchange,
                          ticker,
                          streaming: true
                        });
                      });
                    }
                  }).catch(error => {
                    console.error(`[WebSocket] Failed to start ticker stream, falling back to polling:`, error.message);
                    wsStreams.delete(subscriptionKey);
                    nitroApp.ccxtws.unsubscribe(subscriptionKey);
                    
                    // Fall back to polling
                    startTickerPolling(subscriptionKey, userID, exchange, symbol);
                  });
                  
                } catch (error) {
                  console.error(`[WebSocket] Error setting up ticker stream:`, error);
                  wsStreams.delete(subscriptionKey);
                  startTickerPolling(subscriptionKey, userID, exchange, symbol);
                }
              } else if (!priceIntervals.has(subscriptionKey)) {
                // Use polling for unsupported exchanges
                startTickerPolling(subscriptionKey, userID, exchange, symbol);
              }
              
              socket.emit('ticker:subscribed', { subscriptionKey });
            });
            
            // Handle order book subscription
            socket.on('orderbook:subscribe', async (data) => {
              const { userID, exchange, symbol } = data;
              const subscriptionKey = `${exchange}:${symbol}:orderbook`;
              
              console.log(`[WebSocket] Client ${socket.id} subscribing to order book ${subscriptionKey}`);
              
              // Add socket to subscription list
              if (!priceSubscriptions.has(subscriptionKey)) {
                priceSubscriptions.set(subscriptionKey, new Set());
              }
              priceSubscriptions.get(subscriptionKey).add(socket.id);
              
              // Store subscription info
              socket.data.subscriptions = socket.data.subscriptions || [];
              socket.data.subscriptions.push({ subscriptionKey, userID, exchange, symbol, type: 'orderbook' });
              
              // Check if exchange supports WebSocket
              const supportsWS = nitroApp.ccxtws && nitroApp.ccxtws.supportsWebSocket(exchange);
              
              if (supportsWS) {
                if (!wsStreams.has(subscriptionKey)) {
                  console.log(`[WebSocket] Starting NEW WebSocket order book stream for ${exchange}`);
                
                try {
                  nitroApp.ccxtws.subscribe(subscriptionKey);
                  wsStreams.set(subscriptionKey, true);
                  
                  // Start watching order book via WebSocket
                  nitroApp.ccxtws.watchOrderBook(userID, exchange, symbol, (orderBook) => {
                    const subscribers = priceSubscriptions.get(subscriptionKey);
                    if (subscribers) {
                      // Format order book data
                      const formattedOrderBook = {
                        bids: orderBook.bids.slice(0, 20), // Top 20 bids
                        asks: orderBook.asks.slice(0, 20), // Top 20 asks
                        timestamp: orderBook.timestamp || Date.now()
                      };
                      
                      subscribers.forEach(socketId => {
                        io.to(socketId).emit('orderbook:update', {
                          symbol,
                          exchange,
                          orderBook: formattedOrderBook,
                          streaming: true
                        });
                      });
                    }
                  }).catch(error => {
                    console.error(`[WebSocket] Failed to start order book stream, falling back to polling:`, error.message);
                    wsStreams.delete(subscriptionKey);
                    nitroApp.ccxtws.unsubscribe(subscriptionKey);
                    
                    // Fall back to polling
                    startOrderBookPolling(subscriptionKey, userID, exchange, symbol);
                  });
                  
                  } catch (error) {
                    console.error(`[WebSocket] Error setting up order book stream:`, error);
                    wsStreams.delete(subscriptionKey);
                    startOrderBookPolling(subscriptionKey, userID, exchange, symbol);
                  }
                } else {
                  console.log(`[WebSocket] Order book stream already running for ${subscriptionKey}`);
                }
              } else if (!priceIntervals.has(subscriptionKey)) {
                // Use polling for unsupported exchanges
                startOrderBookPolling(subscriptionKey, userID, exchange, symbol);
              }
              
              socket.emit('orderbook:subscribed', { subscriptionKey });
            });
            
            // Handle order book unsubscription
            socket.on('orderbook:unsubscribe', (data) => {
              const { exchange, symbol } = data;
              const subscriptionKey = `${exchange}:${symbol}:orderbook`;
              
              console.log(`[WebSocket] Client ${socket.id} unsubscribing from order book ${subscriptionKey}`);
              
              const subscribers = priceSubscriptions.get(subscriptionKey);
              if (subscribers) {
                subscribers.delete(socket.id);
                
                if (subscribers.size === 0) {
                  // Stop WebSocket or polling
                  if (wsStreams.has(subscriptionKey)) {
                    if (nitroApp.ccxtws) {
                      nitroApp.ccxtws.unsubscribe(subscriptionKey);
                    }
                    wsStreams.delete(subscriptionKey);
                    console.log(`[WebSocket] Stopped order book stream for ${subscriptionKey}`);
                  }
                  
                  const interval = priceIntervals.get(subscriptionKey);
                  if (interval) {
                    clearIntervalAsync(interval);
                    priceIntervals.delete(subscriptionKey);
                  }
                  
                  priceSubscriptions.delete(subscriptionKey);
                }
              }
              
              if (socket.data.subscriptions) {
                socket.data.subscriptions = socket.data.subscriptions.filter(
                  sub => sub.subscriptionKey !== subscriptionKey
                );
              }
            });
            
            // Handle ticker unsubscription
            socket.on('ticker:unsubscribe', (data) => {
              const { exchange, symbol } = data;
              const subscriptionKey = `${exchange}:${symbol}:ticker`;
              
              console.log(`[WebSocket] Client ${socket.id} unsubscribing from ticker ${subscriptionKey}`);
              
              const subscribers = priceSubscriptions.get(subscriptionKey);
              if (subscribers) {
                subscribers.delete(socket.id);
                
                if (subscribers.size === 0) {
                  // Stop WebSocket streaming if active - same as chart behavior
                  if (wsStreams.has(subscriptionKey)) {
                    if (nitroApp.ccxtws) {
                      nitroApp.ccxtws.unsubscribe(subscriptionKey);
                    }
                    wsStreams.delete(subscriptionKey);
                    console.log(`[WebSocket] Stopped ticker WebSocket stream for ${subscriptionKey}`);
                  }
                  
                  // Stop polling if active
                  const interval = priceIntervals.get(subscriptionKey);
                  if (interval) {
                    clearIntervalAsync(interval);
                    priceIntervals.delete(subscriptionKey);
                  }
                  
                  priceSubscriptions.delete(subscriptionKey);
                }
              }
              
              if (socket.data.subscriptions) {
                socket.data.subscriptions = socket.data.subscriptions.filter(
                  sub => sub.subscriptionKey !== subscriptionKey
                );
              }
            });
            
            // Handle unsubscription
            socket.on('chart:unsubscribe', (data) => {
              const { exchange, symbol, timeframe } = data;
              const subscriptionKey = `${exchange}:${symbol}:${timeframe}`;
              
              console.log(`[WebSocket] Client ${socket.id} unsubscribing from ${subscriptionKey}`);
              
              const subscribers = priceSubscriptions.get(subscriptionKey);
              if (subscribers) {
                subscribers.delete(socket.id);
                
                // Stop streaming/polling if no more subscribers
                if (subscribers.size === 0) {
                  // Stop WebSocket streaming if active
                  if (wsStreams.has(subscriptionKey)) {
                    if (nitroApp.ccxtws) {
                      nitroApp.ccxtws.unsubscribe(subscriptionKey);
                    }
                    wsStreams.delete(subscriptionKey);
                    console.log(`[WebSocket] Stopped WebSocket stream for ${subscriptionKey}`);
                  }
                  
                  // Stop polling if active
                  const interval = priceIntervals.get(subscriptionKey);
                  if (interval) {
                    clearIntervalAsync(interval);
                    priceIntervals.delete(subscriptionKey);
                    console.log(`[WebSocket] Stopped polling for ${subscriptionKey}`);
                  }
                  
                  priceSubscriptions.delete(subscriptionKey);
                }
              }
              
              // Remove from socket data
              if (socket.data.subscriptions) {
                socket.data.subscriptions = socket.data.subscriptions.filter(
                  sub => sub.subscriptionKey !== subscriptionKey
                );
              }
            });

            socket.on('disconnect', () => {
              console.log('[WebSocket] Client disconnected:', socket.id);
              
              // Clean up subscriptions
              if (socket.data.subscriptions) {
                socket.data.subscriptions.forEach(({ subscriptionKey }) => {
                  const subscribers = priceSubscriptions.get(subscriptionKey);
                  if (subscribers) {
                    subscribers.delete(socket.id);
                    
                    // Stop streaming/polling if no more subscribers
                    if (subscribers.size === 0) {
                      // Stop WebSocket streaming if active
                      if (wsStreams.has(subscriptionKey)) {
                        if (nitroApp.ccxtws) {
                          nitroApp.ccxtws.unsubscribe(subscriptionKey);
                        }
                        wsStreams.delete(subscriptionKey);
                      }
                      
                      // Stop polling if active
                      const interval = priceIntervals.get(subscriptionKey);
                      if (interval) {
                        clearIntervalAsync(interval);
                        priceIntervals.delete(subscriptionKey);
                      }
                      
                      priceSubscriptions.delete(subscriptionKey);
                    }
                  }
                });
              }
            });
          });

          console.log('[WebSocket] Socket.IO server initialized successfully');
          
          // Make io available globally
          global.__io = io;
          nitroApp.io = io;
        }
      } catch (error) {
        console.error('[WebSocket] Failed to initialize Socket.IO:', error);
      }
    }
  });
});