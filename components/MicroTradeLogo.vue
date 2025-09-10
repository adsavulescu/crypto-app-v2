<template>
  <svg 
    :width="width" 
    :height="height" 
    viewBox="0 0 200 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    class="microtrade-logo"
  >
    <!-- Logo Icon -->
    <g class="logo-icon">
      <!-- Hexagon Background -->
      <path 
        d="M15 5 L25 5 L30 12.5 L25 20 L15 20 L10 12.5 Z" 
        :fill="iconBg"
        stroke-width="1"
        :stroke="primaryColor"
        opacity="0.2"
      />
      
      <!-- μ Symbol (Micro) -->
      <text 
        x="20" 
        y="17" 
        font-family="Arial, sans-serif" 
        font-size="14" 
        font-weight="bold" 
        text-anchor="middle" 
        :fill="primaryColor"
      >
        μ
      </text>
      
      <!-- Trading Bars -->
      <rect x="12" y="22" width="2" height="6" :fill="primaryColor" opacity="0.8" />
      <rect x="15" y="20" width="2" height="8" :fill="accentColor" opacity="0.8" />
      <rect x="18" y="21" width="2" height="7" :fill="primaryColor" opacity="0.8" />
      <rect x="21" y="19" width="2" height="9" :fill="accentColor" opacity="0.8" />
      <rect x="24" y="22" width="2" height="6" :fill="primaryColor" opacity="0.8" />
    </g>
    
    <!-- Text Logo -->
    <g class="logo-text">
      <!-- MicroTrade Text -->
      <text 
        x="40" 
        y="20" 
        font-family="'Segoe UI', system-ui, sans-serif" 
        font-size="18" 
        font-weight="700" 
        :fill="textColor"
        letter-spacing="-0.5"
      >
        Micro<tspan :fill="primaryColor">Trade</tspan>
      </text>
      
      <!-- Tagline (optional) -->
      <text 
        v-if="showTagline"
        x="40" 
        y="32" 
        font-family="'Segoe UI', system-ui, sans-serif" 
        font-size="9" 
        :fill="subtextColor"
        opacity="0.8"
        letter-spacing="0.5"
      >
        PRECISION TRADING SERVICES
      </text>
    </g>
    
    <!-- Animated Pulse Effect -->
    <circle 
      cx="20" 
      cy="12.5" 
      r="15" 
      fill="none" 
      :stroke="primaryColor" 
      stroke-width="0.5" 
      opacity="0"
      class="pulse-ring"
    >
      <animate 
        attributeName="r" 
        from="10" 
        to="20" 
        dur="2s" 
        repeatCount="indefinite" 
      />
      <animate 
        attributeName="opacity" 
        from="0.6" 
        to="0" 
        dur="2s" 
        repeatCount="indefinite" 
      />
    </circle>
  </svg>
</template>

<script setup>
import { computed, inject } from 'vue';

const props = defineProps({
  width: {
    type: [String, Number],
    default: 200
  },
  height: {
    type: [String, Number],
    default: 40
  },
  showTagline: {
    type: Boolean,
    default: false
  }
});

// Get theme from parent
const isDark = inject('isDark', { value: true });

// Computed colors based on theme
const primaryColor = computed(() => '#18a058');
const accentColor = computed(() => '#24abff');
const textColor = computed(() => isDark.value ? '#ffffff' : '#000000');
const subtextColor = computed(() => isDark.value ? '#a0a0a0' : '#606060');
const iconBg = computed(() => isDark.value ? '#ffffff' : '#000000');
</script>

<style scoped>
.microtrade-logo {
  transition: all 0.3s ease;
  cursor: pointer;
}

.microtrade-logo:hover {
  transform: scale(1.05);
}

.microtrade-logo:hover .pulse-ring {
  animation-play-state: running;
}

.pulse-ring {
  animation-play-state: paused;
}

.logo-icon {
  transition: transform 0.3s ease;
}

.microtrade-logo:hover .logo-icon {
  transform: translateX(2px);
}

@media (max-width: 768px) {
  .microtrade-logo {
    transform: scale(0.9);
  }
}
</style>