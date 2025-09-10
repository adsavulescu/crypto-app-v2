<template>
  <div class="line-chart-container">
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
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  showLegend: {
    type: Boolean,
    default: true
  }
})

const chartCanvas = ref(null)
let chartInstance = null

const createChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  if (!chartCanvas.value || !props.data) {
    return
  }

  const ctx = chartCanvas.value.getContext('2d')
  
  // Set Chart.js default colors based on theme
  const textColor = isDark?.value ? '#e0e0e0' : '#333333'
  const gridColor = isDark?.value ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
  const bgColor = isDark?.value ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)'
  
  Chart.defaults.color = textColor
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: props.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          grid: {
            color: gridColor,
            drawBorder: false
          },
          ticks: {
            color: textColor,
            font: {
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: gridColor,
            drawBorder: false
          },
          ticks: {
            color: textColor,
            font: {
              size: 11
            },
            callback: function(value) {
              return '$' + value.toLocaleString()
            }
          }
        }
      },
      plugins: {
        legend: {
          display: props.showLegend,
          labels: {
            color: textColor,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: bgColor,
          titleColor: isDark?.value ? '#ffffff' : '#000000',
          bodyColor: textColor,
          borderColor: '#00D9FF',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || ''
              if (label) {
                label += ': '
              }
              if (context.parsed.y !== null) {
                label += '$' + context.parsed.y.toLocaleString()
              }
              return label
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
.line-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
  min-height: 300px;
}
</style>