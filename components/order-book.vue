<script setup>
import { useAppStore } from '~/stores/app.store';
import { computed } from 'vue';
const app = useAppStore()
const { $socket } = useNuxtApp();

// Get userID from the store instead of cookie
const userID = computed(() => app.getCurrentUser?.id || null);

let currentExchange = ref(app.getUserSelectedExchange);
let currentSymbol = ref(app.getUserSelectedMarket);

const bidsData = ref([]);
const asksData = ref([]);
const isStreaming = ref(false);

// Subscribe to order book updates via WebSocket
const subscribeOrderBook = () => {
  if (!currentExchange.value || !currentSymbol.value) return;
  
  console.log('[OrderBook] Subscribing to order book for', currentSymbol.value);
  
  // Request order book subscription
  $socket.emit('orderbook:subscribe', {
    userID: userID.value,
    exchange: currentExchange.value,
    symbol: currentSymbol.value
  });
};

// Unsubscribe from order book updates
const unsubscribeOrderBook = () => {
  if (!currentExchange.value || !currentSymbol.value) return;
  
  console.log('[OrderBook] Unsubscribing from order book');
  
  $socket.emit('orderbook:unsubscribe', {
    exchange: currentExchange.value,
    symbol: currentSymbol.value
  });
};

// Process order book data
const processOrderBook = (orderBook) => {
  let bids = [];
  let asks = [];
  
  // Process bids
  for (let i = 0; i < Math.min(orderBook.bids.length, 20); i++) {
    bids.push({
      price: orderBook.bids[i][0],
      quantity: orderBook.bids[i][1],
      total: (orderBook.bids[i][1] * orderBook.bids[i][0]).toFixed(2),
    });
  }
  bidsData.value = bids;
  
  // Process asks
  for (let i = 0; i < Math.min(orderBook.asks.length, 20); i++) {
    asks.push({
      price: orderBook.asks[i][0],
      quantity: orderBook.asks[i][1],
      total: (orderBook.asks[i][1] * orderBook.asks[i][0]).toFixed(2),
    });
  }
  asksData.value = asks;
};

onMounted(() => {
  // Remove any existing listeners first
  $socket.off('orderbook:update');
  $socket.off('orderbook:subscribed');
  
  // Set up socket listeners
  $socket.on('orderbook:update', (data) => {
    if (data.symbol === currentSymbol.value && data.exchange === currentExchange.value) {
      processOrderBook(data.orderBook);
      isStreaming.value = data.streaming;
    }
  });
  
  $socket.on('orderbook:subscribed', (data) => {
    console.log('[OrderBook] Subscribed to:', data.subscriptionKey);
  });
  
  // Subscribe to initial order book with a small delay to ensure socket is ready
  nextTick(() => {
    subscribeOrderBook();
  });
});

onUnmounted(() => {
  // Clean up
  unsubscribeOrderBook();
  $socket.off('orderbook:update');
  $socket.off('orderbook:subscribed');
});

// Watch for exchange/symbol changes
watch([currentExchange, currentSymbol], ([newExchange, newSymbol], [oldExchange, oldSymbol]) => {
  if (oldExchange !== newExchange || oldSymbol !== newSymbol) {
    // Unsubscribe from old
    if (oldExchange && oldSymbol) {
      $socket.emit('orderbook:unsubscribe', {
        exchange: oldExchange,
        symbol: oldSymbol
      });
    }
    
    // Subscribe to new
    if (newExchange && newSymbol) {
      subscribeOrderBook();
    }
  }
});

// Update references when store changes
watch(() => app.getUserSelectedExchange, (newVal) => {
  currentExchange.value = newVal;
});

watch(() => app.getUserSelectedMarket, (newVal) => {
  currentSymbol.value = newVal;
});
</script>

<template>
  <n-card>
    <template #header>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>Order Book</span>
        <n-tag v-if="isStreaming" type="success" size="tiny">LIVE</n-tag>
      </div>
    </template>
    <n-space vertical :size="12">
      <div class="asks box">
        <div class="row" v-for="row in asksData">
          <div class="col">
            {{row.price}}
          </div>
          <div class="col">
            {{row.quantity}}
          </div>
          <div class="col">
            {{row.total}}
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col labels">Price</div>
        <div class="col labels">Quantity</div>
        <div class="col labels">Total</div>
      </div>
      <div class="bids box">
        <div v-for="row in bidsData" class="row">
          <div class="col">
            {{row.price}}
          </div>
          <div class="col">
            {{row.quantity}}
          </div>
          <div class="col">
            {{row.total}}
          </div>
        </div>
      </div>
    </n-space>
  </n-card>
</template>

<style scoped>
.box {
  max-height:150px;
  overflow-y: scroll;
}

.asks {
  flex-direction: column-reverse;
  display: flex;
}

.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.col {
  font-size:12px;
  width:33.333%;
}

.labels {
  font-size:16px;
  font-weight:bold;
  text-transform:uppercase;
}
</style>