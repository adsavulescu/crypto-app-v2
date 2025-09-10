<script setup>
import { useAppStore } from '~/stores/app.store';
import {reloadNuxtApp} from "nuxt/app";
import { computed } from 'vue';
const app = useAppStore()
const { $socket } = useNuxtApp();

// Unique instance ID for debugging
const instanceId = Math.random().toString(36).substring(7);
console.log('[Ticker] Creating new ticker-bar instance:', instanceId);

// Track if this instance is active
let isActive = ref(true);

// Get userID from the store instead of cookie
const userID = computed(() => app.getCurrentUser?.id || null);

let userExchanges = app.getUserExchanges;
let selectedExchange = ref(app.getUserSelectedExchange);
let userExchangeMarkets = app.getUserExchangeMarkets;
let selectedMarket = ref(app.getUserSelectedMarket);

// Ticker data
let ticker = ref({
  last:0,
  change:0,
  low:0,
  high:0,
  baseVolume:0,
  quoteVolume:0
});

let isStreaming = ref(false);

// Subscribe to ticker updates via WebSocket
const subscribeTicker = () => {
  console.log('[Ticker] subscribeTicker called - Exchange:', selectedExchange.value, 'Market:', selectedMarket.value);
  
  if (!selectedExchange.value || !selectedMarket.value) {
    console.log('[Ticker] Cannot subscribe - missing exchange or market');
    return;
  }
  
  console.log('[Ticker] Subscribing to ticker for', selectedMarket.value);
  
  // Request ticker subscription
  $socket.emit('ticker:subscribe', {
    userID: userID.value,
    exchange: selectedExchange.value,
    symbol: selectedMarket.value
  });
};

// Unsubscribe from ticker updates
const unsubscribeTicker = () => {
  if (!selectedExchange.value || !selectedMarket.value) return;
  
  console.log('[Ticker] Unsubscribing from ticker');
  
  $socket.emit('ticker:unsubscribe', {
    exchange: selectedExchange.value,
    symbol: selectedMarket.value
  });
};

// Store handlers at component level
let tickerUpdateHandler = null;
let tickerSubscribedHandler = null;

onMounted(() => {
  console.log(`[Ticker ${instanceId}] Component MOUNTED`);
  
  // DON'T REMOVE OLD LISTENERS - let each instance handle its own
  
  // Create THIS instance's handlers
  tickerUpdateHandler = (data) => {
    if (data.symbol === selectedMarket.value && data.exchange === selectedExchange.value) {
      ticker.value = data.ticker;
      isStreaming.value = data.streaming;
      console.log(`[Ticker ${instanceId}] Updated display:`, data.ticker.last);
    }
  };
  
  tickerSubscribedHandler = (data) => {
    console.log(`[Ticker ${instanceId}] Subscribed:`, data.subscriptionKey);
  };
  
  // Add THIS instance's listeners
  $socket.on('ticker:update', tickerUpdateHandler);
  $socket.on('ticker:subscribed', tickerSubscribedHandler);
  
  // Subscribe after a delay
  setTimeout(() => {
    subscribeTicker();
  }, 50);
});

onUnmounted(() => {
  console.log(`[Ticker ${instanceId}] UNMOUNTING`);
  
  // Unsubscribe from ticker
  unsubscribeTicker();
  
  // Remove ONLY THIS instance's handlers
  if (tickerUpdateHandler) {
    $socket.off('ticker:update', tickerUpdateHandler);
  }
  if (tickerSubscribedHandler) {
    $socket.off('ticker:subscribed', tickerSubscribedHandler);
  }
});

async function updateSelectedExchange(exchange) {
  // Unsubscribe from old exchange
  unsubscribeTicker();
  
  await app.updateUserSelectedExchange(userID.value, exchange);
  selectedExchange.value = exchange;
  
  // Subscribe to new exchange
  subscribeTicker();
}

async function updateSelectedMarket(market) {
  // Unsubscribe from old market
  unsubscribeTicker();
  
  await app.updateUserSelectedMarket(userID.value, selectedExchange.value, market);
  selectedMarket.value = market;
  
  // Subscribe to new market
  subscribeTicker();
  
  // Reload the page to refresh all components with new market data
  reloadNuxtApp();
}


</script>

<template>


  <div class="top-bar">
    <n-card  style="margin-bottom: 10px">
      <n-grid x-gap="12" :cols="12">
        <n-gi span="2">
          <n-select v-model:value="selectedExchange"
                    :options="userExchanges"
                    placeholder="Select exchange"
                    filterable
                    @update:value="updateSelectedExchange($event)"
          />
        </n-gi>
        <n-gi span="2">
          <n-select v-model:value="selectedMarket"
                    :options="userExchangeMarkets"
                    placeholder="Select market"
                    filterable
                    @update:value="updateSelectedMarket($event)"
          />
        </n-gi>
        <n-gi span="8">
          <div style="display: flex; align-items: center; justify-content: space-between; height: 34px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>Last Price: {{ticker.last}}</span>
              <span v-if="ticker.change" :style="{color: ticker.change > 0 ? '#18a058' : '#d03050'}">
                ({{ticker.change > 0 ? '+' : ''}}{{ticker.change.toFixed(2)}}%)
              </span>
              <span style="margin-left: 16px;">24h High: {{ticker.high}}</span>
              <span style="margin-left: 16px;">24h Low: {{ticker.low}}</span>
              <span style="margin-left: 16px;">Volume: {{ticker.baseVolume.toFixed(2)}}</span>
            </div>
            <n-tag v-if="isStreaming" type="success" size="tiny">LIVE</n-tag>
          </div>
        </n-gi>
      </n-grid>
    </n-card>

  </div>
</template>

<style scoped>

</style>
