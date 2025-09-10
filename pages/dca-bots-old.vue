<template>
  <n-grid x-gap="12" :cols="12">
    <n-gi span="8">
      <TickerBar/>
      <Chart/>
      <DcaBotsList/>
    </n-gi>
    <n-gi span="4">
      <OrderBook/>
      <DcaBotsForm/>
    </n-gi>
  </n-grid>


</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})
import { useAppStore } from '~/stores/app.store';
const app = useAppStore()


await app.loadUserExchangeData();

</script>
