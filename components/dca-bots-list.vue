<script setup>
import { ref, onMounted, onUnmounted, h, computed } from 'vue';
import { useAppStore } from '~/stores/app.store';
import { NButton, NCard, NDescriptions, NDescriptionsItem, NDataTable, NGrid, NGi, NStatistic, NText, useNotification } from 'naive-ui';
import { clearIntervalAsync, setIntervalAsync } from 'set-interval-async';

const notification = useNotification();
const app = useAppStore();

let userID = useCookie('userID');

let currentExchange = ref(app.getUserSelectedExchange);
let currentSymbol = ref(app.getUserSelectedMarket);

// ----- Open Orders Table -----
const openOrdersTablePagination = false;
const openOrdersTableColumns = [
  { title: "Symbol", key: "symbol" },
  { title: "Type", key: "type" },
  { title: "Side", key: "side" },
  { title: "Price", key: "price" },
  { title: "Amount", key: "amount" },
  { title: "Filled", key: "filled" },
  { title: "Remaining", key: "remaining" },
  {
    title: function (row) {
      return h(
          NButton,
          {
            strong: true,
            tertiary: true,
            size: "small",
            onClick: () => cancelAllOrders(row)
          },
          { default: () => "Cancel all" }
      );
    },
    key: "actions",
    render(row) {
      return h(
          NButton,
          {
            strong: true,
            tertiary: true,
            size: "small",
            onClick: () => cancelOrder(row)
          },
          { default: () => "Cancel Order" }
      );
    }
  },
];

const openOrdersTableData = ref([]);

// ----- Closed Orders Table -----
const closedOrdersTablePagination = false;
const closedOrdersTableColumns = [
  { title: "Symbol", key: "symbol" },
  { title: "Type", key: "type" },
  { title: "Side", key: "side" },
  { title: "Price", key: "price" },
  { title: "Amount", key: "amount" },
  { title: "Filled", key: "filled" },
  { title: "Remaining", key: "remaining" },
];

const closedOrdersTableData = ref([]);

// ----- Bots Table -----
const botsTablePagination = false;
const botsTableColumns = [
  {
    type: "expand",
    rowKey: (row) => row.id, // Add unique row key for expansion
    renderExpand: (row) => {
      console.log('Expanded bot data:', {
        symbol: row.symbol,
        currentPosition: row.currentPosition,
        avgEntryPrice: row.avgEntryPrice,
        targetPrice: row.targetPrice,
        unrealizedPnl: row.unrealizedPnl,
        totalCost: row.totalCost,
        activeDeal: row.activeDeal,
        filledOrders: row.activeDeal?.filledOrders
      });
      // Active Deal Section with enhanced details
      const activeDealContent = row.activeDeal && row.activeDeal.status !== 'START_NEW_DEAL'
          ? h(
              NDescriptions,
              { title: 'Active Deal Details', column: 3, bordered: true },
              {
                default: () => [
                  h(NDescriptionsItem, { label: 'Status' }, 
                    () => row.activeDeal.status
                  ),
                  h(NDescriptionsItem, { label: 'Safety Orders Filled' }, 
                    () => `${row.activeDeal.filledOrders ? row.activeDeal.filledOrders.length - 1 : 0} / ${row.maxSafetyOrdersCount}`
                  ),
                  h(NDescriptionsItem, { label: 'Current Position' }, 
                    () => row.currentPosition > 0 ? `${row.currentPosition.toFixed(8)} ${row.symbol.split('/')[0]}` : '0'
                  ),
                  h(NDescriptionsItem, { label: 'Start Condition' }, 
                    () => {
                      if (row.dealStartCondition === 'smartStart') {
                        return row.waitingForEntry ? '🔍 Smart Start (Waiting...)' : '✅ Smart Start';
                      }
                      return '⚡ Always';
                    }
                  ),
                  h(NDescriptionsItem, { label: 'Average Entry Price' }, 
                    () => row.avgEntryPrice > 0 ? `$${row.avgEntryPrice.toFixed(2)}` : 'N/A'
                  ),
                  h(NDescriptionsItem, { label: 'Target Price' }, 
                    () => row.targetPrice > 0 ? `$${row.targetPrice.toFixed(2)}` : 'N/A'
                  ),
                  h(NDescriptionsItem, { label: 'Unrealized P&L' }, 
                    () => row.currentPosition > 0 ? h('span', { 
                      style: { color: row.unrealizedPnl >= 0 ? 'green' : 'red' }
                    }, `$${row.unrealizedPnl.toFixed(2)}`) : 'N/A'
                  ),
                ]
              }
          )
          : h('p', 'No active deal')

      // Closed Deals Section with more details
      const closedDealsContent = row.closedDeals && row.closedDeals.length
          ? h(NDataTable, {
            columns: [
              { title: 'Deal #', key: 'dealNumber', width: 80 },
              { title: 'Status', key: 'status' },
              { title: 'Profit', key: 'profit', 
                render: (deal) => {
                  const profitNum = typeof deal.profit === 'string' ? parseFloat(deal.profit) : deal.profit || 0;
                  return h('span', { 
                    style: { color: profitNum >= 0 ? 'green' : 'red', fontWeight: 'bold' }
                  }, `$${profitNum.toFixed(2)}`)
                }
              },
              { title: 'Safety Orders', key: 'safetyOrdersUsed' },
              { title: 'Duration', key: 'duration' }
            ],
            data: row.closedDeals,
            bordered: true,
            size: 'small'
          })
          : h('p', 'No closed deals')

      // Logs Section: Show logs as an unordered list.
      const logsContent = row.logs && row.logs.length
          ? h(
              'ul',
              { style: { paddingLeft: '1rem' } },
              row.logs.map(log => h('li', log))
          )
          : h('p', 'No logs available')

      return h('div', { style: { padding: '1rem' } }, [
        h('h3', 'Active Deal'),
        activeDealContent,
        h('h3', { style: { marginTop: '1rem' } }, 'Closed Deals'),
        closedDealsContent,
        h('h3', { style: { marginTop: '1rem' } }, 'Logs'),
        logsContent
      ])
    }
  },
  { title: "Exchange", key: "exchange", width: 100 },
  { title: "Symbol", key: "symbol", width: 120 },
  { title: "Direction", key: "direction", width: 100,
    render(row) {
      if (row.direction === 'auto') {
        const detected = row.detectedDirection;
        return h('div', [
          h('div', { style: { fontWeight: 'bold', color: '#666' }}, 'AUTO'),
          detected && h('div', { 
            style: { 
              fontSize: '0.8em',
              color: detected === 'long' ? 'green' : 'red'
            }
          }, `(${detected.toUpperCase()})`)
        ]);
      }
      return h('span', { 
        style: { 
          color: row.direction === 'long' ? 'green' : 'red',
          fontWeight: 'bold' 
        }
      }, row.direction.toUpperCase());
    }
  },
  {
    title: "Status",
    key: "isRunning",
    width: 120,
    render(row) {
      const status = row.isRunning ? 'Running' : 'Stopped';
      let dealStatus = row.activeDeal?.status || 'IDLE';
      
      // Show waiting status if waiting for smart entry
      if (row.waitingForEntry) {
        const waitTime = row.waitStartTime ? Math.round((Date.now() - row.waitStartTime) / 1000) : 0;
        dealStatus = `⏳ WAITING (${waitTime}s)`;
      }
      
      return h('div', [
        h('div', { style: { fontWeight: 'bold', color: row.isRunning ? 'green' : 'gray' }}, status),
        h('div', { style: { fontSize: '0.8em', color: row.waitingForEntry ? '#ff9800' : '#666' }}, dealStatus)
      ]);
    }
  },
  { 
    title: "Active Deal", 
    key: "activeDealInfo",
    width: 150,
    render(row) {
      if (!row.activeDeal || row.activeDeal.status === 'START_NEW_DEAL') {
        return h('span', { style: { color: '#999' }}, 'Waiting...');
      }
      const filledOrders = row.activeDeal.filledOrders?.length || 0;
      const safetyFilled = Math.max(0, filledOrders - 1);
      return h('div', [
        h('div', `Safety: ${safetyFilled}/${row.maxSafetyOrdersCount}`),
        h('div', { style: { fontSize: '0.9em' }}, 
          row.currentPosition ? `Pos: ${row.currentPosition.toFixed(4)}` : ''
        )
      ]);
    }
  },
  { 
    title: "Total P&L", 
    key: "profit",
    width: 120,
    render(row) {
      const totalProfit = typeof row.profit === 'number' ? row.profit : 0;
      const unrealized = typeof row.unrealizedPnl === 'number' ? row.unrealizedPnl : 0;
      return h('div', [
        h('div', { 
          style: { 
            color: totalProfit >= 0 ? 'green' : 'red',
            fontWeight: 'bold' 
          }
        }, `$${totalProfit.toFixed(2)}`),
        (unrealized !== 0 && row.currentPosition > 0) && h('div', { 
          style: { 
            fontSize: '0.8em',
            color: unrealized >= 0 ? 'green' : 'red' 
          }
        }, `(${unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)})`)
      ]);
    }
  },
  {
    title: "Stats",
    key: "stats",
    width: 120,
    render(row) {
      const deals = row.closedDeals?.length || 0;
      const wins = row.closedDeals?.filter(d => d.profit > 0).length || 0;
      const winRate = deals > 0 ? (wins / deals * 100).toFixed(0) : 0;
      return h('div', { style: { fontSize: '0.9em' }}, [
        h('div', `Deals: ${deals}`),
        h('div', { 
          style: { color: winRate >= 50 ? 'green' : 'red' }
        }, `Win: ${winRate}%`)
      ]);
    }
  },
  {
    title: "Actions",
    key: "actions",
    width: 120,
    render(row) {
      return h('div', { style: { display: 'flex', gap: '8px' }}, [
        row.isRunning
          ? h(NButton, {
              size: 'small',
              type: 'error',
              onClick: () => stopBot(row.id)
            }, () => 'Stop')
          : h(NButton, {
              size: 'small',
              type: 'success',
              onClick: () => startBot(row.id)
            }, () => 'Start'),
        h(NButton, {
          size: 'small',
          quaternary: true,
          type: 'error',
          onClick: () => deleteBot(row.id)
        }, () => 'Delete')
      ]);
    }
  }
];

const botsTableData = ref([]);

// ----- Computed Stats -----
const activeBots = computed(() => {
  return botsTableData.value.filter(bot => bot.isRunning).length;
});

const totalProfit = computed(() => {
  return botsTableData.value.reduce((sum, bot) => sum + (bot.profit || 0), 0);
});

const totalUnrealized = computed(() => {
  return botsTableData.value.reduce((sum, bot) => sum + (bot.unrealizedPnl || 0), 0);
});

const totalDeals = computed(() => {
  return botsTableData.value.reduce((sum, bot) => sum + (bot.closedDeals?.length || 0), 0);
});

const overallWinRate = computed(() => {
  const allDeals = botsTableData.value.flatMap(bot => bot.closedDeals || []);
  if (allDeals.length === 0) return 0;
  const wins = allDeals.filter(deal => {
    const profit = typeof deal.profit === 'string' ? parseFloat(deal.profit) : deal.profit;
    return profit > 0;
  }).length;
  return (wins / allDeals.length) * 100;
});

const avgProfit = computed(() => {
  const allDeals = botsTableData.value.flatMap(bot => bot.closedDeals || []);
  if (allDeals.length === 0) return 0;
  const totalProfit = allDeals.reduce((sum, deal) => {
    const profit = typeof deal.profit === 'string' ? parseFloat(deal.profit) : (deal.profit || 0);
    return sum + profit;
  }, 0);
  return totalProfit / allDeals.length;
});

// ----- Polling Intervals -----
let ordersInterval = null;
let botsInterval = null;

onMounted(() => {
  // Fetch initial data
  fetchOrdersPooling();
  fetchBots();
  
  // Set up polling intervals
  ordersInterval = setIntervalAsync(fetchOrdersPooling, 500);
  // Poll bots less frequently (every 5 seconds)
  botsInterval = setIntervalAsync(fetchBots, 5000);
});

onUnmounted(() => {
  clearIntervalAsync(ordersInterval);
  clearIntervalAsync(botsInterval);
});

// ----- Order Actions -----
async function cancelOrder(row) {
  const data = {
    userID: userID.value,
    exchange: currentExchange.value,
    id: row.id,
    symbol: currentSymbol.value,
  };

  await $fetch('/api/v1/cancelOrder', {
    method: 'POST',
    body: data
  });

  const [base, quote] = row.symbol.split('/');
  console.log(`Cancelled ${data.exchange} limit ${row.side} order for ${row.amount} ${base} using ${quote} at price ${row.price}`);
  // notification.info({
  //   content: "Order Cancelled!",
  //   meta: `Cancelled ${data.exchange} limit ${row.side} order for ${row.amount} ${base} using ${quote} at price ${row.price}`,
  //   duration: 2500,
  // });
}

async function cancelAllOrders(row) {
  for (const order of openOrdersTableData.value) {
    await cancelOrder(order);
  }
}

// ----- Polling Functions -----
async function fetchOrdersPooling() {
  // Open Orders
  const openOrdersRes = await $fetch('/api/v1/fetchOpenOrders', {
    query: {
      userID: userID.value,
      exchange: currentExchange.value,
      symbol: currentSymbol.value,
    }
  });

  if (openOrdersRes.data) {
    openOrdersTableData.value = openOrdersRes.data.map(order => ({
      id: order.id,
      datetime: order.datetime,
      symbol: order.symbol,
      type: order.type,
      side: order.side,
      price: order.price,
      amount: order.amount,
      filled: order.filled,
      remaining: order.remaining,
      actions: '',
    }));
  }

  // Closed Orders
  const closedOrdersRes = await $fetch('/api/v1/fetchClosedOrders', {
    query: {
      userID: userID.value,
      exchange: currentExchange.value,
      symbol: currentSymbol.value,
    }
  });

  if (closedOrdersRes.data) {
    closedOrdersTableData.value = closedOrdersRes.data.map(order => ({
      datetime: order.datetime,
      symbol: order.symbol,
      type: order.type,
      side: order.side,
      price: order.price,
      amount: order.amount,
      filled: order.filled,
      remaining: order.remaining,
    }));
  }
}

async function fetchBots() {
  try {
    const botsRes = await $fetch('/api/v1/fetchBots', {
      query: {
        userID: userID.value
      }
    });

    if (!botsRes.data) return;

    // Find existing bot data to preserve unrealized P&L values
    const existingBotMap = {};
    botsTableData.value.forEach(bot => {
      existingBotMap[bot.id] = bot;
    });

    // Process bots data without async operations in map
    const processedBots = botsRes.data.map((bot, index) => {
      // Calculate current position from filled orders
      let currentPosition = 0;
      let totalCost = 0;
      let avgEntryPrice = 0;
      
      if (bot.activeDeal && bot.activeDeal.filledOrders && bot.activeDeal.filledOrders.length > 0) {
        // Count entry orders based on direction
        bot.activeDeal.filledOrders.forEach(order => {
          // For long: count buy orders, for short: count sell orders
          // Use detected direction for auto mode
          let actualDirection = bot.direction;
          if (bot.direction === 'auto' && bot.activeDeal.detectedDirection) {
            actualDirection = bot.activeDeal.detectedDirection;
          }
          const entryDirection = actualDirection === 'long' ? 'buy' : 'sell';
          if (order.side === entryDirection) {
            const amount = typeof order.amount === 'string' ? parseFloat(order.amount) : (order.amount || 0);
            const price = typeof order.price === 'string' ? parseFloat(order.price) : (order.price || 0);
            const cost = typeof order.cost === 'string' ? parseFloat(order.cost) : (amount * price);
            currentPosition += amount;
            totalCost += cost;
          }
        });
        
        if (currentPosition > 0 && totalCost > 0) {
          avgEntryPrice = totalCost / currentPosition;
        }
      }
      
      // Calculate target price if TP order exists
      let targetPrice = 0;
      if (bot.activeDeal && bot.activeDeal.takeProfitOrder && bot.activeDeal.takeProfitOrder.price) {
        targetPrice = typeof bot.activeDeal.takeProfitOrder.price === 'string' 
          ? parseFloat(bot.activeDeal.takeProfitOrder.price) 
          : bot.activeDeal.takeProfitOrder.price;
      }
      
      // Process closed deals for statistics
      let processedDeals = [];
      if (bot.closedDeals && bot.closedDeals.length > 0) {
        processedDeals = bot.closedDeals.map((deal, index) => ({
          dealNumber: index + 1,
          status: deal.status || 'CLOSED',
          profit: typeof deal.profit === 'string' ? parseFloat(deal.profit) : (deal.profit || 0),
          safetyOrdersUsed: deal.filledOrders ? Math.max(0, deal.filledOrders.length - 1) : 0,
          duration: 'N/A' // Could calculate from timestamps if available
        }));
      }
      
      // Debug last bot
      if (index === botsRes.data.length - 1) {
        console.log('Last bot ID:', bot._id);
      }
      
      return {
        id: bot._id,
        isRunning: bot.isRunning,
        exchange: bot.exchange,
        symbol: bot.symbol,
        direction: bot.direction,
        detectedDirection: bot.activeDeal?.detectedDirection || null,
        waitingForEntry: bot.activeDeal?.waitingForEntry || false,
        waitStartTime: bot.activeDeal?.waitStartTime || null,
        baseOrderAmount: bot.baseOrderAmount,
        baseOrderType: bot.baseOrderType,
        takeProfitOrderPercent: bot.takeProfitOrderPercent,
        safetyOrderAmount: bot.safetyOrderAmount,
        safetyOrderPercent: bot.safetyOrderPercent,
        maxSafetyOrdersCount: bot.maxSafetyOrdersCount,
        stopLossOrderPercent: bot.stopLossOrderPercent,
        leverage: bot.leverage,
        marketType: bot.marketType,
        dealStartCondition: bot.dealStartCondition,
        activeDeal: bot.activeDeal,
        closedDeals: processedDeals, // Use processed deals with extra stats
        logs: bot.logs,
        profit: typeof bot.profit === 'string' ? parseFloat(bot.profit) : (bot.profit || 0), // Ensure profit is a number
        // New calculated fields
        currentPosition,
        avgEntryPrice,
        targetPrice,
        totalCost, // Pass through the total cost we calculated
        // Preserve existing unrealizedPnl and currentPrice if available to prevent flashing
        unrealizedPnl: existingBotMap[bot._id]?.unrealizedPnl || 0,
        currentPrice: existingBotMap[bot._id]?.currentPrice || 0,
        needsPriceUpdate: currentPosition > 0 && bot.isRunning && bot.activeDeal.status !== 'START_NEW_DEAL' // Flag for price update
      };
    });
    
    // Update the table data first
    botsTableData.value = processedBots;
    
    // Then fetch prices for bots that need it (non-blocking)
    processedBots.forEach(async (bot, index) => {
      if (bot.needsPriceUpdate && bot.currentPosition > 0) {
        try {
          const tickerRes = await $fetch('/api/v1/fetchTicker', {
            query: {
              userID: userID.value,
              exchange: bot.exchange,
              symbol: bot.symbol
            }
          });
          
          if (tickerRes.data && tickerRes.data.last) {
            const currentPrice = parseFloat(tickerRes.data.last);
            // Use the totalCost we calculated from actual filled orders
            const currentValue = bot.currentPosition * currentPrice;
            // totalCost should be what we actually paid (from filled orders)
            const totalCost = bot.totalCost || (bot.avgEntryPrice * bot.currentPosition);
            
            // Calculate PnL based on direction (use detected direction for auto mode)
            let actualDirection = bot.direction;
            if (bot.direction === 'auto' && bot.detectedDirection) {
              actualDirection = bot.detectedDirection;
            }
            
            let unrealizedPnl;
            if (actualDirection === 'long') {
              // Long: profit when price goes up
              unrealizedPnl = currentValue - totalCost;
            } else {
              // Short: profit when price goes down (we sold at totalCost, can buy back at currentValue)
              unrealizedPnl = totalCost - currentValue;
            }
            
            console.log(`Bot ${bot.symbol} (${bot.direction}) P&L: CurrentPrice=${currentPrice}, CurrentValue=${currentValue}, TotalCost=${totalCost}, UnrealizedPnL=${unrealizedPnl}`);
            
            // Update the specific bot in the array
            if (botsTableData.value[index] && botsTableData.value[index].id === bot.id) {
              botsTableData.value[index].currentPrice = currentPrice;
              botsTableData.value[index].unrealizedPnl = unrealizedPnl;
            }
          }
        } catch (error) {
          console.error(`Error fetching ticker for ${bot.symbol}:`, error);
        }
      }
    });
  } catch (error) {
    console.error('Error fetching bots:', error);
  }
}

// Bot control functions
async function stopBot(botId) {
  console.log('Stopping bot with ID:', botId);
  if (!botId) {
    console.error('Bot ID is undefined or null');
    notification.error({
      content: "Error",
      meta: "Invalid bot ID",
      duration: 3000
    });
    return;
  }
  
  try {
    const response = await $fetch('/api/v1/stopBot', {
      method: 'POST',
      body: { botId }
    });
    
    if (response.success) {
      notification.success({
        content: "Bot Stopped",
        meta: response.message,
        duration: 3000
      });
      // Refresh the bots list
      await fetchBots();
    }
  } catch (error) {
    console.error('Error stopping bot:', error);
    notification.error({
      content: "Error",
      meta: error.data?.statusMessage || "Failed to stop bot",
      duration: 3000
    });
  }
}

async function startBot(botId) {
  console.log('Starting bot with ID:', botId);
  if (!botId) {
    console.error('Bot ID is undefined or null');
    notification.error({
      content: "Error",
      meta: "Invalid bot ID",
      duration: 3000
    });
    return;
  }
  
  try {
    const response = await $fetch('/api/v1/startBot', {
      method: 'POST',
      body: { botId }
    });
    
    if (response.success) {
      notification.success({
        content: "Bot Started",
        meta: response.message,
        duration: 3000
      });
      // Refresh the bots list
      await fetchBots();
    }
  } catch (error) {
    console.error('Error starting bot:', error);
    notification.error({
      content: "Error",
      meta: "Failed to start bot",
      duration: 3000
    });
  }
}

async function deleteBot(botId) {
  // Show confirmation dialog
  const confirmed = confirm('Are you sure you want to delete this bot? This action cannot be undone.');
  
  if (!confirmed) return;
  
  try {
    const response = await $fetch('/api/v1/deleteBot', {
      method: 'POST',
      body: { botId }
    });
    
    if (response.success) {
      notification.success({
        content: "Bot Deleted",
        meta: "Bot has been deleted successfully",
        duration: 3000
      });
      // Refresh the bots list
      await fetchBots();
    }
  } catch (error) {
    console.error('Error deleting bot:', error);
    notification.error({
      content: "Error",
      meta: "Failed to delete bot",
      duration: 3000
    });
  }
}
</script>

<template>
  <n-card>
    <n-tabs type="line" animated>
      <n-tab-pane name="Active Bots" tab="Active Bots">
        <!-- Portfolio Summary Stats -->
        <n-grid :cols="6" :x-gap="10" style="margin-bottom: 15px;">
          <n-gi>
            <n-statistic label="Active Bots">
              <template #prefix>
                <n-text :style="{ color: activeBots > 0 ? 'green' : 'gray' }">
                  {{ activeBots }}
                </n-text>
              </template>
            </n-statistic>
          </n-gi>
          <n-gi>
            <n-statistic label="Total P&L">
              <template #prefix>
                <n-text :style="{ color: totalProfit >= 0 ? 'green' : 'red' }">
                  ${{ totalProfit.toFixed(2) }}
                </n-text>
              </template>
            </n-statistic>
          </n-gi>
          <n-gi>
            <n-statistic label="Unrealized P&L">
              <template #prefix>
                <n-text :style="{ color: totalUnrealized >= 0 ? 'green' : 'red' }">
                  ${{ totalUnrealized.toFixed(2) }}
                </n-text>
              </template>
            </n-statistic>
          </n-gi>
          <n-gi>
            <n-statistic label="Total Deals">
              <template #prefix>
                {{ totalDeals }}
              </template>
            </n-statistic>
          </n-gi>
          <n-gi>
            <n-statistic label="Win Rate">
              <template #prefix>
                <n-text :style="{ color: overallWinRate >= 50 ? 'green' : 'red' }">
                  {{ overallWinRate.toFixed(0) }}%
                </n-text>
              </template>
            </n-statistic>
          </n-gi>
          <n-gi>
            <n-statistic label="Avg Profit">
              <template #prefix>
                <n-text :style="{ color: avgProfit >= 0 ? 'green' : 'red' }">
                  ${{ avgProfit.toFixed(2) }}
                </n-text>
              </template>
            </n-statistic>
          </n-gi>
        </n-grid>
        
        <n-data-table
            :columns="botsTableColumns"
            :data="botsTableData"
            :pagination="botsTablePagination"
            :row-key="(row) => row.id"
            size="small"
        />
      </n-tab-pane>
      <n-tab-pane name="Open Orders" tab="Open Orders">
        <n-data-table
            :columns="openOrdersTableColumns"
            :data="openOrdersTableData"
            :pagination="openOrdersTablePagination"
            :max-height="250"
            size="small"
        />
      </n-tab-pane>
      <n-tab-pane name="Closed Orders" tab="Closed Orders">
        <n-data-table
            :columns="closedOrdersTableColumns"
            :data="closedOrdersTableData"
            :pagination="closedOrdersTablePagination"
            :max-height="250"
            size="small"
        />
      </n-tab-pane>
    </n-tabs>
  </n-card>
</template>

<style scoped>
/* Add your component-specific styles here */
</style>
