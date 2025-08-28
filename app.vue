<template>
  <n-config-provider :theme="theme">
    <n-notification-provider>
      <n-message-provider>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </n-message-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { darkTheme, lightTheme } from "naive-ui";

// Check for saved theme preference or default to dark
const isDark = ref(true);

// Initialize from localStorage if available
if (process.client) {
  const savedTheme = localStorage.getItem('theme');
  isDark.value = savedTheme !== 'light';
}

// Compute the theme based on isDark
const theme = computed(() => isDark.value ? darkTheme : null);

// Watch for theme changes and save to localStorage
watch(isDark, (newValue) => {
  if (process.client) {
    localStorage.setItem('theme', newValue ? 'dark' : 'light');
  }
});

// Provide theme toggle function globally
provide('isDark', isDark);
provide('toggleTheme', () => {
  isDark.value = !isDark.value;
});
</script>

<style>

.header {
  text-align:center;
  display:flex;
  align-items: center;
  padding:20px;

  .inner {
    width:100%;
  }
}

.container {
  height: calc(100vh - 118px);
}

.content {
  padding: 10px 20px;
}

.footer {
  padding:10px;
  text-align:center;
  display:flex;
  align-items: center;
  justify-content: center
}
</style>
