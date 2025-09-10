<template>
  <div class="dca-bots-page">
    <!-- Header with Add Bot button -->
    <div class="page-header">
      <h2>DCA Bots</h2>
      <NuxtLink to="/create-bot">
        <n-button type="primary" size="large">
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5v14m7-7H5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </n-icon>
          </template>
          Create New Bot
        </n-button>
      </NuxtLink>
    </div>

    <!-- Full width ticker and chart -->
    <TickerBar />
    <Chart style="margin-bottom: 20px;" />
    
    <!-- Full width bots list -->
    <DcaBotsList />
  </div>
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

// Store user info for components that need it
if (userData.value && userData.value.data) {
  app.setCurrentUser(userData.value.data);
}
</script>

<style scoped>
.dca-bots-page {
  padding: 20px;
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
</style>