<template>
  <div class="create-bot-page">
    <!-- Header with Back button -->
    <div class="page-header">
      <NuxtLink to="/dca-bots">
        <n-button quaternary circle size="large">
          <template #icon>
            <n-icon size="20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </n-icon>
          </template>
        </n-button>
      </NuxtLink>
      <h2>Create DCA Bot</h2>
      <div style="width: 40px;"></div> <!-- Spacer for centering -->
    </div>

    <!-- Full width ticker bar -->
    <TickerBar style="margin-bottom: 20px;" />
    
    <!-- Order book and form side by side -->
    <n-grid x-gap="20" :cols="2">
      <!-- Left side - Order Book (50%) -->
      <n-gi>
        <OrderBook />
      </n-gi>
      
      <!-- Right side - Bot Configuration Form (50%) -->
      <n-gi>
        <DcaBotsForm />
      </n-gi>
    </n-grid>
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
.create-bot-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
</style>