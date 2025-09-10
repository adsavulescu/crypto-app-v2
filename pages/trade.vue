<template>
    <n-grid x-gap="12" :cols="12">
        <n-gi span="8">
          <TickerBar/>
          <Chart/>
          <OrderList/>
        </n-gi>
        <n-gi span="4">
          <OrderBook/>
          <ExchangeForm/>
        </n-gi>
    </n-grid>


</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})
import { useAppStore } from '~/stores/app.store';
const app = useAppStore()

// Use useFetch for proper SSR cookie handling
const { data: exchangeData } = await useFetch('/api/v1/fetchUserExchanges');
const { data: userData } = await useFetch('/api/v1/me');

// Pass the fetched data to the store
if (exchangeData.value) {
  app.setUserExchangeData(exchangeData.value);
}

// Store user info for components that need it (like WebSocket connections)
if (userData.value && userData.value.data) {
  app.setCurrentUser(userData.value.data);
}

</script>
