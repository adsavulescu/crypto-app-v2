<template>
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">
        <n-icon :component="DashboardIcon" size="28" />
        Portfolio Dashboard
      </h1>
      <div class="header-actions">
        <n-button @click="refreshData" :loading="isRefreshing" type="primary" ghost>
          <template #icon>
            <n-icon :component="RefreshIcon" />
          </template>
          Refresh
        </n-button>
        <n-dropdown :options="exportOptions" @select="handleExport">
          <n-button>
            <template #icon>
              <n-icon :component="DownloadIcon" />
            </template>
            Export
          </n-button>
        </n-dropdown>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <n-spin size="large" />
      <p>Loading your portfolio data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <n-result status="error" title="Failed to load portfolio" :description="error">
        <template #footer>
          <n-button @click="refreshData" type="primary">Try Again</n-button>
        </template>
      </n-result>
    </div>

    <!-- Main Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Portfolio Overview Cards -->
      <n-grid :x-gap="16" :y-gap="16" :cols="24" class="overview-grid">
        <n-gi :span="24" :xs="24" :sm="12" :md="6">
          <n-card class="stat-card">
            <n-statistic label="Total Portfolio Value">
              <template #prefix>$</template>
              {{ formatNumber(totalPortfolioValue) }}
            </n-statistic>
            <div class="stat-change" :class="{ positive: dayChange >= 0, negative: dayChange < 0 }">
              <n-icon :component="dayChange >= 0 ? TrendingUpIcon : TrendingDownIcon" />
              {{ Math.abs(dayChange).toFixed(2) }}% (24h)
            </div>
          </n-card>
        </n-gi>
        
        <n-gi :span="24" :xs="24" :sm="12" :md="6">
          <n-card class="stat-card">
            <n-statistic label="Total Assets">
              {{ totalAssets }}
              <template #suffix>
                <span class="stat-suffix">across {{ exchanges.length }} exchange{{ exchanges.length !== 1 ? 's' : '' }}</span>
              </template>
            </n-statistic>
          </n-card>
        </n-gi>
        
        <n-gi :span="24" :xs="24" :sm="12" :md="6">
          <n-card class="stat-card">
            <n-statistic label="Best Performer (24h)">
              <template v-if="performanceData?.bestPerformer">
                <div class="asset-performance">
                  <span class="asset-name">{{ performanceData.bestPerformer.coin }}</span>
                  <span class="asset-change positive">
                    {{ performanceData.bestPerformer.change > 0 ? '+' : '' }}{{ performanceData.bestPerformer.change }}%
                  </span>
                </div>
              </template>
              <template v-else>
                <span class="no-data">No data</span>
              </template>
            </n-statistic>
          </n-card>
        </n-gi>
        
        <n-gi :span="24" :xs="24" :sm="12" :md="6">
          <n-card class="stat-card">
            <n-statistic label="Worst Performer (24h)">
              <template v-if="performanceData?.worstPerformer">
                <div class="asset-performance">
                  <span class="asset-name">{{ performanceData.worstPerformer.coin }}</span>
                  <span class="asset-change negative">
                    {{ performanceData.worstPerformer.change > 0 ? '+' : '' }}{{ performanceData.worstPerformer.change }}%
                  </span>
                </div>
              </template>
              <template v-else>
                <span class="no-data">No data</span>
              </template>
            </n-statistic>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- Portfolio History Chart -->
      <n-card class="chart-card" title="Portfolio Value History" v-if="historyChartData">
        <template #header-extra>
          <n-button-group size="small">
            <n-button 
              v-for="period in ['24h', '7d', '30d', '90d', 'All']" 
              :key="period"
              :type="selectedPeriod === period ? 'primary' : 'default'"
              @click="selectedPeriod = period"
            >
              {{ period }}
            </n-button>
          </n-button-group>
        </template>
        <div class="chart-wrapper">
          <LineChart :data="historyChartData" />
        </div>
      </n-card>

      <!-- Exchange Breakdown -->
      <div v-for="exchange in exchanges" :key="exchange.name" class="exchange-section">
        <n-card>
          <template #header>
            <div class="exchange-header">
              <div class="exchange-info">
                <n-icon :component="WalletOutline" size="32" color="#00D9FF" />
                <h3>{{ exchange.name.charAt(0).toUpperCase() + exchange.name.slice(1) }}</h3>
                <n-tag type="success" size="small">Connected</n-tag>
              </div>
              <div class="exchange-value">
                <span class="value-label">Total Value:</span>
                <span class="value-amount">${{ formatNumber(exchange.totalUSD) }}</span>
              </div>
            </div>
          </template>

          <n-grid :x-gap="16" :y-gap="16" :cols="24">
            <!-- Asset Allocation Chart -->
            <n-gi :span="24" :xs="24" :md="10">
              <div class="allocation-section">
                <h4>Asset Allocation</h4>
                <div class="pie-chart-wrapper" v-if="exchange.chartData && exchange.chartData.length">
                  <PieChart :data="exchange.chartData" />
                </div>
                <n-empty v-else description="No assets in this exchange" />
              </div>
            </n-gi>

            <!-- Asset Table -->
            <n-gi :span="24" :xs="24" :md="14">
              <div class="table-section">
                <h4>Holdings</h4>
                <n-data-table
                  :columns="tableColumns"
                  :data="exchange.lastBalance"
                  :pagination="{ pageSize: 10 }"
                  size="small"
                  :bordered="false"
                />
              </div>
            </n-gi>
          </n-grid>

        </n-card>
      </div>

      <!-- Empty State -->
      <n-card v-if="!exchanges || exchanges.length === 0" class="empty-state">
        <n-empty description="No exchanges connected">
          <template #extra>
            <n-button type="primary" @click="navigateTo('/profile')">
              Connect Exchange
            </n-button>
          </template>
        </n-empty>
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { useMessage } from 'naive-ui'
import { 
  GridOutline as DashboardIcon,
  RefreshOutline as RefreshIcon,
  DownloadOutline as DownloadIcon,
  TrendingUpOutline as TrendingUpIcon,
  TrendingDownOutline as TrendingDownIcon,
  WalletOutline
} from '@vicons/ionicons5'
import PieChart from '~/components/charts/PieChart.vue'
import LineChart from '~/components/charts/LineChart.vue'

definePageMeta({
  middleware: 'auth'
})

const message = useMessage()
const isLoading = ref(true)
const isRefreshing = ref(false)
const error = ref(null)
const exchanges = ref([])
const selectedPeriod = ref('24h')
const autoRefreshInterval = ref(null)

// Computed values
const totalPortfolioValue = computed(() => {
  return exchanges.value.reduce((total, exchange) => total + (exchange.totalUSD || 0), 0)
})

const totalAssets = computed(() => {
  const uniqueAssets = new Set()
  exchanges.value.forEach(exchange => {
    if (exchange.lastBalance) {
      exchange.lastBalance.forEach(asset => {
        if (asset.total > 0) {
          uniqueAssets.add(asset.coin)
        }
      })
    }
  })
  return uniqueAssets.size
})

const dayChange = computed(() => {
  // Calculate 24h change from historical data
  if (!exchanges.value || exchanges.value.length === 0) return 0
  
  let currentTotal = totalPortfolioValue.value
  let previousTotal = 0
  
  // Get yesterday's balance from historical data
  exchanges.value.forEach(exchange => {
    if (exchange.allBalance && exchange.allBalance.length > 1) {
      // Find balance from ~24 hours ago
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const previousBalance = exchange.allBalance
        .filter(b => new Date(b.timestamp) <= oneDayAgo)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
      
      if (previousBalance) {
        previousTotal += previousBalance.totalUSD || 0
      }
    }
  })
  
  if (previousTotal === 0) return 0
  return (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(2)
})

// Store performance data
const performanceData = ref(null)

const largestHolding = computed(() => {
  // Find the asset with the highest USD value across all exchanges
  let largest = null
  let maxValue = 0
  
  exchanges.value.forEach(exchange => {
    if (exchange.lastBalance) {
      exchange.lastBalance.forEach(asset => {
        if (asset.usdt > maxValue) {
          maxValue = asset.usdt
          largest = { coin: asset.coin, value: asset.usdt }
        }
      })
    }
  })
  
  return largest
})

const lastUpdateTime = computed(() => {
  // Get the most recent update timestamp
  if (!exchanges.value || exchanges.value.length === 0) return null
  
  const mostRecent = exchanges.value
    .filter(ex => ex.timestamp)
    .map(ex => new Date(ex.timestamp))
    .sort((a, b) => b - a)[0]
    
  if (!mostRecent) return null
  
  // Format as relative time
  const now = new Date()
  const diff = now - mostRecent
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  return mostRecent.toLocaleDateString()
})

const historyChartData = computed(() => {
  // Use REAL historical data from database
  if (!exchanges.value || exchanges.value.length === 0) return null
  
  const periods = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    'All': 365
  }
  
  const days = periods[selectedPeriod.value]
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  // Aggregate historical data from all exchanges
  const aggregatedData = new Map() // date string -> total USD
  
  exchanges.value.forEach(exchange => {
    if (exchange.allBalance && exchange.allBalance.length > 0) {
      exchange.allBalance.forEach(balance => {
        const date = new Date(balance.timestamp)
        if (date >= cutoffDate) {
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const current = aggregatedData.get(dateStr) || 0
          aggregatedData.set(dateStr, current + (balance.totalUSD || 0))
        }
      })
    }
  })
  
  // Add current balance as the most recent point
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  aggregatedData.set(today, totalPortfolioValue.value)
  
  // Convert to arrays and sort by date
  const sortedEntries = Array.from(aggregatedData.entries())
    .sort((a, b) => {
      const dateA = new Date(a[0] + ', ' + new Date().getFullYear())
      const dateB = new Date(b[0] + ', ' + new Date().getFullYear())
      return dateA - dateB
    })
  
  if (sortedEntries.length === 0) {
    // If no historical data, just show current value
    return {
      labels: [today],
      datasets: [{
        label: 'Portfolio Value',
        data: [totalPortfolioValue.value],
        borderColor: '#00D9FF',
        backgroundColor: 'rgba(0, 217, 255, 0.1)',
        tension: 0.4,
        fill: true
      }]
    }
  }
  
  const labels = sortedEntries.map(entry => entry[0])
  const data = sortedEntries.map(entry => entry[1])
  
  return {
    labels,
    datasets: [{
      label: 'Portfolio Value',
      data,
      borderColor: '#00D9FF',
      backgroundColor: 'rgba(0, 217, 255, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }
})

const tableColumns = [
  {
    title: 'Asset',
    key: 'coin',
    sorter: 'default',
    render(row) {
      return h('div', { class: 'asset-cell' }, [
        h('span', { class: 'asset-symbol' }, row.coin)
      ])
    }
  },
  {
    title: 'Balance',
    key: 'total',
    sorter: (a, b) => a.total - b.total,
    render(row) {
      return formatNumber(row.total, 8)
    }
  },
  {
    title: 'Free',
    key: 'free',
    render(row) {
      return formatNumber(row.free, 8)
    }
  },
  {
    title: 'Locked',
    key: 'used',
    render(row) {
      return formatNumber(row.used, 8)
    }
  },
  {
    title: 'Value (USD)',
    key: 'usdt',
    sorter: (a, b) => a.usdt - b.usdt,
    render(row) {
      return h('span', { class: 'value-cell' }, `$${formatNumber(row.usdt)}`)
    }
  }
]

const exportOptions = [
  { label: 'Export as CSV', key: 'csv' },
  { label: 'Export as JSON', key: 'json' },
  { label: 'Export as PDF', key: 'pdf' }
]

// Methods
const loadDashboardData = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    // Fetch LIVE balance data from all exchanges
    const response = await $fetch('/api/v1/fetchLiveBalance')
    
    if (!response?.success) {
      throw new Error('Failed to fetch live balance data')
    }
    
    if (response.exchanges) {
      // Multiple exchanges returned
      exchanges.value = response.exchanges
        .filter(ex => !ex.error) // Filter out errored exchanges
        .map(ex => ({
          name: ex.exchange,
          lastBalance: ex.balance || [],
          totalUSD: ex.totalUSD || 0,
          chartData: formatChartData(ex.balance || []),
          timestamp: ex.timestamp
        }))
    } else if (response.balance) {
      // Single exchange returned
      exchanges.value = [{
        name: response.exchange,
        lastBalance: response.balance || [],
        totalUSD: response.totalUSD || 0,
        chartData: formatChartData(response.balance || []),
        timestamp: response.timestamp
      }]
    } else {
      exchanges.value = []
    }
    
    // Load historical data for charts
    await loadHistoricalData()
    
    // Load asset performance data
    await loadPerformanceData()
    
  } catch (err) {
    console.error('Dashboard error:', err)
    error.value = err.message || 'Failed to load dashboard data'
    message.error('Failed to load dashboard data')
  } finally {
    isLoading.value = false
  }
}

const loadHistoricalData = async () => {
  try {
    // Fetch historical balance data for portfolio chart
    const promises = exchanges.value.map(async (exchange) => {
      const { data: response } = await $fetch('/api/v1/fetchUserDbBalance', {
        query: { exchange: exchange.name }
      })
      return response?.data || []
    })
    
    const historicalData = await Promise.all(promises)
    // Store for use in history chart
    exchanges.value = exchanges.value.map((ex, index) => ({
      ...ex,
      allBalance: historicalData[index]
    }))
  } catch (err) {
    console.error('Error loading historical data:', err)
  }
}

const loadPerformanceData = async () => {
  try {
    const response = await $fetch('/api/v1/getAssetPerformance')
    if (response?.success) {
      performanceData.value = response
    }
  } catch (err) {
    console.error('Error loading performance data:', err)
    // Don't show error to user, just use null values
  }
}

const formatChartData = (balance) => {
  if (!balance || !Array.isArray(balance)) return []
  
  return balance
    .filter(item => item.usdt > 0.01) // Filter out dust
    .sort((a, b) => b.usdt - a.usdt) // Sort by value
    .slice(0, 10) // Top 10 assets
    .map(item => ({
      label: item.coin,
      value: item.usdt
    }))
}

const formatNumber = (num, decimals = 2) => {
  if (!num) return '0.00'
  const number = parseFloat(num)
  if (number < 0.01 && decimals === 2) {
    return number.toFixed(8).replace(/\.?0+$/, '')
  }
  return number.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

const refreshData = async () => {
  isRefreshing.value = true
  await loadDashboardData()
  isRefreshing.value = false
  message.success('Portfolio data refreshed')
}

const refreshExchange = async (exchangeName) => {
  message.info(`Refreshing ${exchangeName}...`)
  try {
    // Fetch live balance for specific exchange
    const response = await $fetch('/api/v1/fetchLiveBalance', {
      query: { exchange: exchangeName }
    })
    
    if (response?.success && response.balance) {
      // Update the specific exchange in our data
      const index = exchanges.value.findIndex(ex => ex.name === exchangeName)
      if (index !== -1) {
        exchanges.value[index] = {
          ...exchanges.value[index],
          lastBalance: response.balance,
          totalUSD: response.totalUSD,
          chartData: formatChartData(response.balance),
          timestamp: response.timestamp
        }
      }
      message.success(`${exchangeName} balance updated`)
    }
  } catch (err) {
    message.error(`Failed to refresh ${exchangeName}: ${err.message}`)
  }
}


const handleExport = (key) => {
  switch(key) {
    case 'csv':
      exportAsCSV()
      break
    case 'json':
      exportAsJSON()
      break
    case 'pdf':
      message.info('PDF export coming soon')
      break
  }
}

const exportAsCSV = () => {
  let csv = 'Exchange,Asset,Balance,Free,Locked,Value (USD)\n'
  exchanges.value.forEach(exchange => {
    exchange.lastBalance.forEach(asset => {
      csv += `${exchange.name},${asset.coin},${asset.total},${asset.free},${asset.used},${asset.usdt}\n`
    })
  })
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `portfolio_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  message.success('Portfolio exported as CSV')
}

const exportAsJSON = () => {
  const data = {
    timestamp: new Date().toISOString(),
    totalValue: totalPortfolioValue.value,
    exchanges: exchanges.value
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `portfolio_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  window.URL.revokeObjectURL(url)
  message.success('Portfolio exported as JSON')
}


// Auto-refresh every 30 seconds - only update data, not reload everything
const startAutoRefresh = () => {
  autoRefreshInterval.value = setInterval(async () => {
    try {
      // Silently fetch new data without showing loading state
      const response = await $fetch('/api/v1/fetchLiveBalance')
      
      if (response?.success && response.exchanges) {
        // Update only the data, not the entire UI
        response.exchanges
          .filter(ex => !ex.error)
          .forEach(newEx => {
            const index = exchanges.value.findIndex(ex => ex.name === newEx.exchange)
            if (index !== -1) {
              // Update existing exchange data without triggering full re-render
              exchanges.value[index].lastBalance = newEx.balance || []
              exchanges.value[index].totalUSD = newEx.totalUSD || 0
              exchanges.value[index].chartData = formatChartData(newEx.balance || [])
              exchanges.value[index].timestamp = newEx.timestamp
            }
          })
      }
    } catch (err) {
      // Silently fail - don't show errors for background refresh
      console.error('Background refresh error:', err)
    }
  }, 30000)
}

const stopAutoRefresh = () => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
}

onMounted(() => {
  loadDashboardData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 300;
  color: var(--n-text-color);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
}

.loading-container p {
  color: var(--n-text-color-3);
  margin-top: 16px;
}

.overview-grid {
  margin-bottom: 24px;
}

.stat-card {
  height: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 217, 255, 0.15);
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 14px;
}

.stat-change.positive {
  color: #18a058;
}

.stat-change.negative {
  color: #d03050;
}

.stat-suffix {
  font-size: 12px;
  color: var(--n-text-color-3);
  font-weight: normal;
}

.asset-performance {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-name {
  font-weight: 500;
  font-size: 16px;
}

.asset-change {
  font-size: 14px;
}

.asset-change.positive {
  color: #18a058;
}

.asset-change.negative {
  color: #d03050;
}

.asset-value {
  font-size: 14px;
  color: #00D9FF;
  font-weight: 500;
}

.update-time {
  font-size: 14px;
  color: var(--n-text-color-2);
}

.no-data {
  font-size: 14px;
  color: var(--n-text-color-3);
  font-style: italic;
}

.chart-card {
  margin-bottom: 24px;
}

.chart-wrapper {
  height: 400px;
  padding: 16px 0;
}

.exchange-section {
  margin-bottom: 24px;
}

.exchange-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.exchange-info {
  display: flex;
  align-items: center;
  gap: 12px;
}


.exchange-info h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.exchange-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-label {
  color: var(--n-text-color-3);
  font-size: 14px;
}

.value-amount {
  font-size: 20px;
  font-weight: 500;
  color: #00D9FF;
}

.allocation-section,
.table-section {
  padding: 16px;
}

.allocation-section h4,
.table-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--n-text-color-2);
}

.pie-chart-wrapper {
  height: 300px;
}

.asset-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.asset-symbol {
  font-weight: 500;
}

.value-cell {
  color: #00D9FF;
  font-weight: 500;
}

.empty-state {
  margin-top: 48px;
  text-align: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .exchange-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .chart-wrapper {
    height: 250px;
  }
  
  .pie-chart-wrapper {
    height: 250px;
  }
}
</style>