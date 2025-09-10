<template>
    <h2>Dev Tools</h2>

    <n-space>
      <n-button @click="deleteDBChartData">Delete DB chart data</n-button>
      <n-button @click="deleteDBGridBotsData">Delete DB Grid Bots data</n-button>
      <n-button @click="deleteDBDCABotsData">Delete DB DCA Bots data</n-button>
      <n-button @click="deleteDBBalanceData" type="warning">Delete DB Balance data</n-button>
<!--      <n-button>Delete DB User Exchanges and markets data</n-button>-->
<!--      <n-button>Delete ALL DB User Data</n-button>-->
    </n-space>
</template>

<script setup>
definePageMeta({
    middleware: 'auth'
})
let userID = useCookie('userID');
const notification = useNotification();

async function deleteDBChartData() {
  await $fetch('/api/v1/deleteDBChartData');

  notification['info']({
    content: "Data deleted!",
    meta: `Deleted all candles data from database.`,
    duration: 2500,
  });
}

async function deleteDBGridBotsData() {
  await $fetch('/api/v1/deleteDBGridBotsData');

  notification['info']({
    content: "Data deleted!",
    meta: `Deleted all grid bots data from database.`,
    duration: 2500,
  });
}

async function deleteDBDCABotsData() {
  await $fetch('/api/v1/deleteDBDCABotsData');

  notification['info']({
    content: "Data deleted!",
    meta: `Deleted all dca bots data from database.`,
    duration: 2500,
  });
}

async function deleteDBBalanceData() {
  await $fetch('/api/v1/deleteDBBalanceData');

  notification['info']({
    content: "Balance data deleted!",
    meta: `Deleted all balance and asset price data from database.`,
    duration: 2500,
  });
}
</script>
