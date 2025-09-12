<template>
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">
        <n-icon :component="DashboardIcon" size="28" />
        Portfolio Dashboard
        <span v-if="isBackgroundRefreshing" style="margin-left: 12px; font-size: 14px; font-weight: normal; color: var(--n-text-color-3);">
          <n-icon :component="RefreshIcon" :depth="3" size="16" style="animation: spin 1s linear infinite;" />
          Updating...
        </span>
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
      <!-- Portfolio Overview Card -->
      <n-card class="overview-card">
        <div class="overview-stats">
          <!-- Total Portfolio Value -->
          <div class="stat-item">
            <div class="stat-label">Total Portfolio Value</div>
            <div class="stat-value">
              <span class="value-main">${{ formatNumber(totalPortfolioValue) }}</span>
              <span class="stat-change" :class="{ positive: dayChange >= 0, negative: dayChange < 0 }">
                <n-icon :component="dayChange >= 0 ? TrendingUpIcon : TrendingDownIcon" size="14" />
                {{ Math.abs(dayChange).toFixed(2) }}% (24h)
              </span>
            </div>
          </div>
          
          <!-- Total Assets -->
          <div class="stat-item">
            <div class="stat-label">Total Assets</div>
            <div class="stat-value">
              <span class="value-main">{{ totalAssets }}</span>
              <span class="value-sub">across {{ exchanges.length }} exchange{{ exchanges.length !== 1 ? 's' : '' }}</span>
            </div>
          </div>
          
          <!-- Best Performer -->
          <div class="stat-item">
            <div class="stat-label">Best Performer (24h)</div>
            <div class="stat-value">
              <template v-if="performanceData?.bestPerformer">
                <span class="value-main">{{ performanceData.bestPerformer.coin }}</span>
                <span class="stat-change positive">
                  {{ performanceData.bestPerformer.change > 0 ? '+' : '' }}{{ performanceData.bestPerformer.change }}%
                </span>
              </template>
              <span v-else class="no-data">No data</span>
            </div>
          </div>
          
          <!-- Worst Performer -->
          <div class="stat-item">
            <div class="stat-label">Worst Performer (24h)</div>
            <div class="stat-value">
              <template v-if="performanceData?.worstPerformer">
                <span class="value-main">{{ performanceData.worstPerformer.coin }}</span>
                <span class="stat-change negative">
                  {{ performanceData.worstPerformer.change > 0 ? '+' : '' }}{{ performanceData.worstPerformer.change }}%
                </span>
              </template>
              <span v-else class="no-data">No data</span>
            </div>
          </div>
        </div>
      </n-card>

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
  middleware: 'auth',
  ssr: false  // Disable SSR for dashboard - it's all dynamic data anyway
})

const message = useMessage()
const isLoading = ref(false) // Start with NO SPINNER - we'll show cached data instantly
const isRefreshing = ref(false)
const isBackgroundRefreshing = ref(false)
const error = ref(null)
const exchanges = ref([])
const selectedPeriod = ref('24h')
const autoRefreshInterval = ref(null)
const snapshotInterval = ref(null)

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
  if (!portfolioHistory24h.value) return 0
  
  const currentTotal = totalPortfolioValue.value
  const previousTotal = portfolioHistory24h.value
  
  if (previousTotal === 0) return 0
  return ((currentTotal - previousTotal) / previousTotal * 100).toFixed(2)
})

// Store performance data
const performanceData = ref(null)
const portfolioHistory24h = ref(0)

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
  
  // For 24h view, we want hourly data points
  const isHourlyView = selectedPeriod.value === '24h'
  
  // Aggregate historical data from all exchanges
  const aggregatedData = new Map() // timestamp or date string -> total USD
  
  exchanges.value.forEach(exchange => {
    if (exchange.allBalance && exchange.allBalance.length > 0) {
      exchange.allBalance.forEach(balance => {
        const date = new Date(balance.timestamp)
        if (date >= cutoffDate) {
          let key
          if (isHourlyView) {
            // For 24h view, group by hour
            const hour = date.getHours()
            const hourStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + hour.toString().padStart(2, '0') + ':00'
            key = hourStr
          } else {
            // For other views, group by day
            key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
          
          const current = aggregatedData.get(key) || { total: 0, count: 0, timestamp: date }
          aggregatedData.set(key, {
            total: current.total + (balance.totalUSD || 0),
            count: current.count + 1,
            timestamp: date
          })
        }
      })
    }
  })
  
  // Add current balance as the most recent point
  const now = new Date()
  const currentKey = isHourlyView 
    ? now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + now.getHours().toString().padStart(2, '0') + ':00'
    : now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  
  aggregatedData.set(currentKey, {
    total: totalPortfolioValue.value,
    count: 1,
    timestamp: now
  })
  
  // Convert to arrays and sort by timestamp
  const sortedEntries = Array.from(aggregatedData.entries())
    .map(([key, value]) => ({
      label: key,
      value: value.total / value.count, // Average if multiple data points
      timestamp: value.timestamp
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
  
  if (sortedEntries.length === 0) {
    // If no historical data, just show current value
    return {
      labels: [currentKey],
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
  
  // For hourly view, ensure we have enough data points
  if (isHourlyView && sortedEntries.length < 24) {
    // Fill in missing hours with interpolated or repeated values
    const filledData = []
    const startTime = new Date(cutoffDate)
    for (let h = 0; h < 24; h++) {
      const hourTime = new Date(startTime.getTime() + h * 60 * 60 * 1000)
      const hourLabel = hourTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + hourTime.getHours().toString().padStart(2, '0') + ':00'
      
      const existingData = sortedEntries.find(e => e.label === hourLabel)
      if (existingData) {
        filledData.push(existingData)
      } else if (filledData.length > 0) {
        // Use the last known value
        filledData.push({
          label: hourLabel,
          value: filledData[filledData.length - 1].value,
          timestamp: hourTime
        })
      }
    }
    sortedEntries.splice(0, sortedEntries.length, ...filledData)
  }
  
  const labels = sortedEntries.map(entry => entry.label)
  const data = sortedEntries.map(entry => entry.value)
  
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
    
    // FIRST: Load from local database cache for INSTANT display
    const cacheResponse = await $fetch('/api/v1/fetchDatabaseBalance')
    
    // Process cached data if available
    if (cacheResponse?.success && cacheResponse.exchanges) {
      exchanges.value = cacheResponse.exchanges
        .filter(ex => !ex.noData)
        .map(ex => ({
          name: ex.exchange,
          lastBalance: ex.balance || [],
          totalUSD: ex.totalUSD || 0,
          chartData: formatChartData(ex.balance || []),
          timestamp: ex.timestamp,
          isStale: ex.isStale
        }))
      
      // IMMEDIATELY show the cached data - no more spinner!
      isLoading.value = false
    }
    
    // THEN: Fetch live data in the background to update
    isBackgroundRefreshing.value = true
    $fetch('/api/v1/fetchLiveBalance')
      .then(response => {
        if (response?.success && response.exchanges) {
          // PRESERVE the allBalance historical data when updating!
          const existingHistoricalData = {}
          exchanges.value.forEach(ex => {
            if (ex.allBalance) {
              existingHistoricalData[ex.name] = ex.allBalance
            }
          })
          
          exchanges.value = response.exchanges
            .filter(ex => !ex.error)
            .map(ex => ({
              name: ex.exchange,
              lastBalance: ex.balance || [],
              totalUSD: ex.totalUSD || 0,
              chartData: formatChartData(ex.balance || []),
              timestamp: ex.timestamp,
              isStale: false,
              // PRESERVE historical data!
              allBalance: existingHistoricalData[ex.exchange] || []
            }))
          message.success('Portfolio data updated')
        }
      })
      .catch(err => {})
      .finally(() => {
        isBackgroundRefreshing.value = false
      })
    
    // Load these in background too - AWAIT to ensure 24h data is loaded
    await loadHistoricalData().catch(err => console.error('Historical data error:', err))
    await loadPerformanceData().catch(err => console.error('Performance data error:', err))
    
  } catch (err) {
    error.value = err.message || 'Failed to load dashboard data'
    message.error('Failed to load dashboard data')
    isLoading.value = false
  }
}

const loadHistoricalData = async () => {
  try {
    // Fetch historical balance data for portfolio chart AND 24h change calculation
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let totalValue24hAgo = 0
    
    if (!exchanges.value || exchanges.value.length === 0) {
      console.warn('No exchanges available for historical data')
      return
    }
    
    const promises = exchanges.value.map(async (exchange) => {
      const response = await $fetch('/api/v1/fetchUserDbBalance', {
        query: { exchange: exchange.name }
      })
      const data = response?.data || []
      
      // Find the balance from ~24 hours ago for this exchange
      if (data && data.length > 0) {
        const balance24hAgo = data
          .filter(b => new Date(b.timestamp) <= oneDayAgo)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        
        if (balance24hAgo) {
          console.log(`Found 24h ago balance for ${exchange.name}: $${balance24hAgo.totalUSD}`)
          totalValue24hAgo += balance24hAgo.totalUSD || 0
        } else {
          console.log(`No 24h ago balance found for ${exchange.name}`)
        }
      }
      
      return data
    })
    
    const historicalData = await Promise.all(promises)
    
    // Store 24h ago total for change calculation
    portfolioHistory24h.value = totalValue24hAgo
    console.log(`Total portfolio 24h ago: $${totalValue24hAgo}, Current: $${totalPortfolioValue.value}`)
    
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

const fetchLiveDataInBackground = () => {
  isBackgroundRefreshing.value = true
  $fetch('/api/v1/fetchLiveBalance')
    .then(response => {
      if (response?.success && response.exchanges) {
        // PRESERVE the allBalance historical data when updating!
        const existingHistoricalData = {}
        exchanges.value.forEach(ex => {
          if (ex.allBalance) {
            existingHistoricalData[ex.name] = ex.allBalance
          }
        })
        
        exchanges.value = response.exchanges
          .filter(ex => !ex.error)
          .map(ex => ({
            name: ex.exchange,
            lastBalance: ex.balance || [],
            totalUSD: ex.totalUSD || 0,
            chartData: formatChartData(ex.balance || []),
            timestamp: ex.timestamp,
            isStale: false,
            // PRESERVE historical data!
            allBalance: existingHistoricalData[ex.exchange] || []
          }))
        message.success('Portfolio data updated')
      }
    })
    .catch(err => {})
    .finally(() => {
      isBackgroundRefreshing.value = false
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
      // fetchLiveBalance now NEVER saves to database
      const response = await $fetch('/api/v1/fetchLiveBalance')
      
      if (response?.success && response.exchanges) {
        // Update only the data, not the entire UI
        response.exchanges
          .filter(ex => !ex.error)
          .forEach(newEx => {
            const index = exchanges.value.findIndex(ex => ex.name === newEx.exchange)
            if (index !== -1) {
              // Update existing exchange data without triggering full re-render
              // PRESERVE historical data!
              exchanges.value[index].lastBalance = newEx.balance || []
              exchanges.value[index].totalUSD = newEx.totalUSD || 0
              exchanges.value[index].chartData = formatChartData(newEx.balance || [])
              exchanges.value[index].timestamp = newEx.timestamp
              // Keep allBalance intact!
            }
          })
      }
    } catch (err) {
      // Silently fail - don't show errors for background refresh
    }
  }, 30000)
}

const stopAutoRefresh = () => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
}

// Start loading data immediately on component creation
// Don't show spinner - we'll have data from cache almost instantly
$fetch('/api/v1/fetchDatabaseBalance')
  .then(async cacheResponse => {
    if (cacheResponse?.success && cacheResponse.exchanges) {
      exchanges.value = cacheResponse.exchanges
        .filter(ex => !ex.noData)
        .map(ex => ({
          name: ex.exchange,
          lastBalance: ex.balance || [],
          totalUSD: ex.totalUSD || 0,
          chartData: formatChartData(ex.balance || []),
          timestamp: ex.timestamp,
          isStale: ex.isStale
        }))
      
      // Load historical data RIGHT AWAY to get 24h change
      await loadHistoricalData()
      await loadPerformanceData()
    }
    // Fetch live data in background
    fetchLiveDataInBackground()
  })
  .catch(err => {
    isLoading.value = true // Show spinner only if cache fails
    loadDashboardData() // Fallback to full load
  })

onMounted(async () => {
  // Clear any existing intervals (in case of hot reload or re-mount)
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
  }
  if (snapshotInterval.value) {
    clearInterval(snapshotInterval.value)
  }
  
  // Start auto-refresh
  startAutoRefresh()
  
  // Store snapshots every 30 minutes (separate from data refresh)
  // First snapshot will happen after 30 minutes to avoid redundant saves
  snapshotInterval.value = setInterval(async () => {
    try {
      await $fetch('/api/v1/storeDatabaseBalance', { method: 'POST' })
    } catch (err) {
      // Silently fail
    }
  }, 30 * 60 * 1000) // Every 30 minutes
})

onUnmounted(() => {
  stopAutoRefresh()
  if (snapshotInterval.value) {
    clearInterval(snapshotInterval.value)
    snapshotInterval.value = null
  }
})
</script>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

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

.overview-card {
  margin-bottom: 24px;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
  padding: 8px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-label {
  font-size: 13px;
  color: var(--n-text-color-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.value-main {
  font-size: 24px;
  font-weight: 600;
  color: var(--n-text-color);
}

.value-sub {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.stat-change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
}

.stat-change.positive {
  color: #18a058;
}

.stat-change.negative {
  color: #d03050;
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
@media (max-width: 1024px) {
  .overview-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .overview-stats {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .stat-item {
    padding-bottom: 20px;
    border-bottom: 1px solid var(--n-border-color);
  }
  
  .stat-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
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