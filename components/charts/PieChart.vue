<template>
  <div class="pie-chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const isDark = inject('isDark')

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    default: ''
  }
})

const chartCanvas = ref(null)
let chartInstance = null

const createChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  if (!chartCanvas.value || !props.data || props.data.length === 0) {
    return
  }

  const ctx = chartCanvas.value.getContext('2d')
  
  // Set Chart.js default colors based on theme
  const textColor = isDark?.value ? '#e0e0e0' : '#333333'
  const gridColor = isDark?.value ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
  const bgColor = isDark?.value ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)'
  
  Chart.defaults.color = textColor
  Chart.defaults.plugins.legend.labels.color = textColor
  
  // Generate better colors for the pie chart
  const colors = generateColors(props.data.length)
  
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: props.data.map(item => item.label),
      datasets: [{
        data: props.data.map(item => item.value),
        backgroundColor: colors,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            color: textColor,
            padding: 15,
            font: {
              size: 12,
              family: 'system-ui, -apple-system, sans-serif',
              color: textColor
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        datalabels: {
          display: false
        },
        tooltip: {
          backgroundColor: bgColor,
          titleColor: isDark?.value ? '#ffffff' : '#000000',
          bodyColor: textColor,
          borderColor: '#00D9FF',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const label = context.label || ''
              const value = context.parsed || 0
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(2)
              return `${label}: $${value.toFixed(2)} (${percentage}%)`
            }
          }
        },
        title: {
          display: !!props.title,
          text: props.title,
          color: textColor,
          font: {
            size: 16,
            weight: 'normal'
          }
        }
      }
    }
  })
}

const generateColors = (count) => {
  // Professional color palette for financial dashboard
  const baseColors = [
    '#00D9FF', // Cyan
    '#7B61FF', // Purple
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#FFD93D', // Yellow
    '#6BCF7F', // Green
    '#FF9F40', // Orange
    '#FF6B9D', // Pink
    '#C44569', // Dark Red
    '#2E86AB', // Blue
  ]
  
  const colors = []
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length])
  }
  return colors
}

onMounted(() => {
  createChart()
})

watch(() => props.data, () => {
  createChart()
}, { deep: true })

watch(isDark, () => {
  createChart()
})
</script>

<style scoped>
.pie-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>