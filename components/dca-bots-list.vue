<script setup>
import { ref, onMounted, onUnmounted, h } from 'vue';
// import { useNotification } from '~/composables/useNotification';
import { useAppStore } from '~/stores/app.store';
import { NButton, NCard, NDescriptions, NDescriptionsItem, NDataTable } from 'naive-ui';
import { clearIntervalAsync, setIntervalAsync } from 'set-interval-async';

// const notification = useNotification();
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
    renderExpand: (row) => {
      console.log(row);
      // Active Deal Section: If activeDeal exists, iterate its keys to show in a two-column description.
      const activeDealContent = row.activeDeal
          ? h(
              NDescriptions,
              { title: 'Active Deal Details', column: 2, bordered: true },
              {
                default: () =>
                    Object.entries(row.activeDeal).map(([key, value]) =>
                        h(NDescriptionsItem, { label: key }, String(value))
                    )
              }
          )
          : h('p', 'No active deal')

      // Closed Deals Section: If there are any closed deals, show them in a small data table.
      // (You can customize the columns as appropriate for your data.)
      const closedDealsContent = row.closedDeals && row.closedDeals.length
          ? h(NDataTable, {
            columns: [
              { title: 'Status', key: 'status' },
              { title: 'Profit', key: 'profit' }
              // Add additional columns as needed.
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
  { title: "Exchange", key: "exchange" },
  { title: "Symbol", key: "symbol" },
  { title: "Direction", key: "direction" },
  {
    title: "Status",
    key: "isRunning",
    render(row) {
      return row.isRunning ? 'Running' : 'Stopped';
    }
  },
  { title: "Profit", key: "profit" },
];

const botsTableData = ref([]);

// ----- Polling Intervals -----
let ordersInterval = null;
let botsInterval = null;

onMounted(() => {
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
  const botsRes = await $fetch('/api/v1/fetchBots', {
    query: {
      userID: userID.value
    }
  });

  if (botsRes.data) {
    botsTableData.value = botsRes.data.map(bot => ({
      id: bot._id,
      isRunning: bot.isRunning,
      exchange: bot.exchange,
      symbol: bot.symbol,
      direction: bot.direction,
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
      closedDeals: bot.closedDeals,
      logs: bot.logs,
      profit: bot.profit,
    }));
  }
}
</script>

<template>
  <n-card>
    <n-tabs type="line" animated>
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
      <n-tab-pane name="Bots" tab="Bots">
        <n-data-table
            :columns="botsTableColumns"
            :data="botsTableData"
            :pagination="botsTablePagination"
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
