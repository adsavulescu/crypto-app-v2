<template>
  <footer class="app-footer" :style="footerStyle">
    <n-space vertical align="center" :size="16">
      <n-text>© 2024 MicroTrade. All rights reserved.</n-text>
      <n-text depth="3">Micro Precision. Macro Profits.</n-text>
    </n-space>
  </footer>
</template>

<script setup>
import { computed, inject } from 'vue';

// Get theme from parent
const isDark = inject('isDark', { value: true });

const footerStyle = computed(() => ({
  backgroundColor: isDark.value ? 'rgb(24, 24, 28)' : 'rgb(250, 250, 252)',
  borderTopColor: isDark.value ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
}));
</script>

<style scoped>
.app-footer {
  padding: 3rem 2rem;
  text-align: center;
  border-top-width: 1px;
  border-top-style: solid;
  margin-top: auto;
  width: 100%;
}
</style>