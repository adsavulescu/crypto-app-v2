<script setup>
import {ref, computed, watch} from "vue";
import {useAppStore} from "~/stores/app.store";
const app = useAppStore()
let userID = useCookie('userID');

let currentExchange = ref(app.getUserSelectedExchange);
let currentSymbol = ref(app.getUserSelectedMarket);

const direction = ref('long');
const directionOptions = [
  {
    label:'Long',
    value:'long'
  },
  {
    label:'Short',
    value:'short'
  },
  {
    label:'Auto (AI Detection)',
    value:'auto'
  },
];
const baseOrderAmount = ref('');
const baseOrderType = ref('limit');
const baseOrderTypeOptions = [
  {
    label:'Limit',
    value:'limit'
  },
  {
    label:'Market',
    value:'market'
  },
]
const takeProfitOrderPercent = ref('');
const safetyOrderAmount = ref('');
const safetyOrderPercent = ref('');
const maxSafetyOrdersCount = ref('');
const stopLossOrderPercent = ref('');
const leverage = ref('');
const marketType = ref('');
const dealStartCondition = ref('always');
const dealStartConditionOptions = [
  {
    label:'Always (Start Immediately)',
    value:'always'
  },
  {
    label:'Smart Start (Wait for Optimal Entry)',
    value:'smartStart'
  },
]

// Simulation calculations
const currentPrice = ref(1000); // Default price, will be fetched
const detectedDirection = ref(''); // For auto mode
const showSimulation = computed(() => {
  const show = baseOrderAmount.value && baseOrderAmount.value !== '' &&
         takeProfitOrderPercent.value && takeProfitOrderPercent.value !== '' &&
         safetyOrderAmount.value && safetyOrderAmount.value !== '' &&
         safetyOrderPercent.value && safetyOrderPercent.value !== '' &&
         maxSafetyOrdersCount.value && maxSafetyOrdersCount.value !== '';
  
  return show;
});

const simulationData = computed(() => {
  if (!showSimulation.value) return [];
  
  const baseAmount = parseFloat(baseOrderAmount.value) || 0;
  const tpPercent = parseFloat(takeProfitOrderPercent.value) || 0;
  const soAmount = parseFloat(safetyOrderAmount.value) || 0;
  const soPercent = parseFloat(safetyOrderPercent.value) || 0;
  const maxSO = parseInt(maxSafetyOrdersCount.value) || 0;
  const lev = parseFloat(leverage.value) || 1;
  const slPercent = parseFloat(stopLossOrderPercent.value) || 0;
  const feeRate = 0.001; // 0.1% fee
  
  const scenarios = [];
  const basePrice = currentPrice.value;
  
  // Calculate for each safety order level
  for (let soFilled = 0; soFilled <= maxSO; soFilled++) {
    let totalInvested = baseAmount;
    let totalAmount = (baseAmount * lev) / basePrice;
    let avgPrice = basePrice;
    let positions = [{
      type: 'Base Order',
      price: basePrice,
      amount: (baseAmount * lev) / basePrice,
      cost: baseAmount
    }];
    
    // Calculate safety orders
    for (let i = 0; i < soFilled; i++) {
      // For long: safety orders at lower prices, for short: at higher prices
      // For auto: we'll show long scenario as default
      const priceMultiplier = (direction.value === 'short') 
        ? (1 + (soPercent * (i + 1)) / 100)
        : (1 - (soPercent * (i + 1)) / 100);
      const soPrice = basePrice * priceMultiplier;
      const soAmountAdjusted = (soAmount * lev) / soPrice;
      const soCost = soAmount;
      
      positions.push({
        type: `Safety Order ${i + 1}`,
        price: soPrice.toFixed(2),
        amount: soAmountAdjusted.toFixed(8),
        cost: soCost
      });
      
      totalInvested += soCost;
      totalAmount += soAmountAdjusted;
      avgPrice = totalInvested / totalAmount * lev;
    }
    
    // Calculate take profit
    // For long: TP above entry, for short: TP below entry
    const tpMultiplier = (direction.value === 'short')
      ? (1 - tpPercent / 100)
      : (1 + tpPercent / 100);
    const tpPrice = avgPrice * tpMultiplier;
    const grossProceeds = totalAmount * tpPrice;
    const totalFees = totalInvested * feeRate + grossProceeds * feeRate;
    const netProfit = grossProceeds - totalInvested - totalFees;
    const profitPercent = (netProfit / totalInvested) * 100;
    
    // Calculate stop loss (if set)
    let slLoss = 0;
    let slPercLoss = 0;
    if (slPercent > 0) {
      const slPrice = avgPrice * (1 - slPercent / 100);
      const slProceeds = totalAmount * slPrice;
      const slFees = totalInvested * feeRate + slProceeds * feeRate;
      slLoss = slProceeds - totalInvested - slFees;
      slPercLoss = (slLoss / totalInvested) * 100;
    }
    
    scenarios.push({
      soFilled,
      totalInvested: totalInvested.toFixed(2),
      avgPrice: avgPrice.toFixed(2),
      totalAmount: totalAmount.toFixed(8),
      tpPrice: tpPrice.toFixed(2),
      netProfit: netProfit.toFixed(2),
      profitPercent: profitPercent.toFixed(2),
      slLoss: slLoss ? slLoss.toFixed(2) : 'N/A',
      slPercLoss: slPercLoss ? slPercLoss.toFixed(2) : 'N/A',
      positions,
      maxDrawdown: soFilled > 0 ? ((soPercent * soFilled).toFixed(2) + '%') : '0%'
    });
  }
  
  return scenarios;
});

// Fetch current price when symbol changes
watch(currentSymbol, async (newSymbol) => {
  if (newSymbol && currentExchange.value) {
    try {
      const tickerRes = await $fetch('/api/v1/fetchTicker', {
        query: {
          userID: userID.value,
          exchange: currentExchange.value,
          symbol: newSymbol
        }
      });
      
      if (tickerRes.data && tickerRes.data.last) {
        currentPrice.value = parseFloat(tickerRes.data.last);
      }
    } catch (error) {
      console.error('Error fetching ticker:', error);
    }
  }
}, { immediate: true });

async function submit(){
  console.log('clicked')

  let data = {
    userID:userID.value,
    isRunning:true,
    exchange: currentExchange.value,
    symbol:currentSymbol.value,
    direction:direction.value,
    baseOrderAmount:baseOrderAmount.value,
    baseOrderType:baseOrderType.value,
    takeProfitOrderPercent:takeProfitOrderPercent.value,
    safetyOrderAmount:safetyOrderAmount.value,
    safetyOrderPercent:safetyOrderPercent.value,
    maxSafetyOrdersCount:maxSafetyOrdersCount.value,
    stopLossOrderPercent:stopLossOrderPercent.value,
    leverage:leverage.value,
    marketType: 'spot',
    dealStartCondition: dealStartCondition.value,
  }

  await $fetch( '/api/v1/createDCABot', {
    method: 'POST',
    body: data
  } );
  
  // Redirect back to DCA bots page after creating bot
  await navigateTo('/dca-bots');
}


</script>

<template>
  <n-card>
      <n-grid x-gap="12" :cols="2">
        <n-gi>
          <n-space vertical>
            <n-select v-model:value="direction" :options="directionOptions" placeholder="Select direction" />
            <n-input v-model:value="baseOrderAmount" type="text" placeholder="Base Order Amount" />
            <n-select v-model:value="baseOrderType" :options="baseOrderTypeOptions"/>
            <n-input v-model:value="takeProfitOrderPercent" type="text" placeholder="Take profit percent" />
            <n-input v-model:value="safetyOrderAmount" type="text" placeholder="Safety order amount" />

            <n-button type="primary" @click="submit()">
              Submit
            </n-button>
          </n-space>
        </n-gi>
        <n-gi>
          <n-space vertical>
            <n-input v-model:value="safetyOrderPercent" type="text" placeholder="Safety orders percent" />
            <n-input v-model:value="maxSafetyOrdersCount" type="text" placeholder="Max safety orders count" />
            <n-input v-model:value="stopLossOrderPercent" type="text" placeholder="Stop loss percent" />
            <n-input v-model:value="leverage" type="text" placeholder="Leverage" />
            <n-select v-model:value="dealStartCondition" :options="dealStartConditionOptions" />
          </n-space>
        </n-gi>
      </n-grid>
      
      <!-- Simulation Section -->
      <n-divider />
      
      <!-- Show message when fields are incomplete -->
      <div v-if="!showSimulation" style="margin-top: 16px;">
        <n-alert type="info">
          Fill in all required fields to see DCA bot simulation:
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li v-if="!baseOrderAmount || baseOrderAmount === ''">Base Order Amount</li>
            <li v-if="!takeProfitOrderPercent || takeProfitOrderPercent === ''">Take Profit Percent</li>
            <li v-if="!safetyOrderAmount || safetyOrderAmount === ''">Safety Order Amount</li>
            <li v-if="!safetyOrderPercent || safetyOrderPercent === ''">Safety Orders Percent</li>
            <li v-if="!maxSafetyOrdersCount || maxSafetyOrdersCount === ''">Max Safety Orders Count</li>
          </ul>
        </n-alert>
      </div>
      
      <!-- Simulation Table -->
      <div v-else>
        <h3>DCA Bot Simulation</h3>
        <n-descriptions :column="2" bordered style="margin-bottom: 16px;">
          <n-descriptions-item label="Current Price">
            ${{ currentPrice.toFixed(2) }}
          </n-descriptions-item>
          <n-descriptions-item label="Symbol">
            {{ currentSymbol }}
          </n-descriptions-item>
          <n-descriptions-item label="Direction" v-if="direction === 'auto'">
            Auto (Will detect on start)
          </n-descriptions-item>
          <n-descriptions-item label="Direction" v-else>
            {{ direction === 'long' ? 'Long' : 'Short' }}
          </n-descriptions-item>
        </n-descriptions>
        
        <n-data-table 
          :columns="[
            { title: 'Safety Orders', key: 'soFilled', width: 120 },
            { title: 'Total Invested', key: 'totalInvested', width: 130 },
            { title: 'Avg Entry', key: 'avgPrice', width: 110 },
            { title: 'TP Price', key: 'tpPrice', width: 110 },
            { title: 'Net Profit', key: 'netProfit', width: 110,
              render: (row) => h('span', { 
                style: { 
                  color: parseFloat(row.netProfit) >= 0 ? 'green' : 'red', 
                  fontWeight: 'bold' 
                }
              }, `$${row.netProfit}`)
            },
            { title: 'Profit %', key: 'profitPercent', width: 100,
              render: (row) => h('span', { 
                style: { 
                  color: parseFloat(row.profitPercent) >= 0 ? 'green' : 'red', 
                  fontWeight: 'bold' 
                }
              }, `${row.profitPercent}%`)
            },
            { title: 'Drawdown', key: 'maxDrawdown', width: 100 }
          ]"
          :data="simulationData"
          :bordered="true"
          :single-line="false"
          size="small"
          style="margin-top: 16px;"
        />
        
        <n-alert type="info" style="margin-top: 16px;">
          <template #header>Simulation Notes</template>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Calculations include 0.1% trading fees on both entry and exit</li>
            <li>Assumes price drops exactly by Safety Order % for each level</li>
            <li>Best case: TP hits with only base order filled (0 safety orders)</li>
            <li>Worst case: All {{ maxSafetyOrdersCount }} safety orders fill before TP</li>
            <li v-if="dealStartCondition === 'smartStart'" style="font-weight: bold;">Smart Start: Bot will wait for optimal entry conditions (pullback to support/resistance, RSI recovery, momentum shift)</li>
            <li v-if="direction === 'auto'" style="font-weight: bold;">Auto Direction: Bot will detect market trend automatically using AI analysis</li>
            <li>Actual results may vary based on market conditions</li>
          </ul>
        </n-alert>
      </div>
  </n-card>
</template>

<style scoped>

</style>
