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

// Get initial theme from cookie or localStorage
const getInitialTheme = () => {
  // Try cookie first (SSR compatible)
  const themeCookie = useCookie('theme', {
    httpOnly: false,
    sameSite: 'lax',
    secure: false
  });
  
  if (themeCookie.value) {
    return themeCookie.value !== 'light';
  }
  
  // Fallback to localStorage if available
  if (process.client) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme !== 'light';
    }
  }
  
  return true; // Default to dark
};

// Initialize theme
const isDark = ref(getInitialTheme());

// Compute the theme based on isDark
const theme = computed(() => isDark.value ? darkTheme : null);

// Watch for theme changes and save to both cookie and localStorage
watch(isDark, (newValue) => {
  const themeValue = newValue ? 'dark' : 'light';
  
  // Save to cookie (SSR compatible)
  const themeCookie = useCookie('theme');
  themeCookie.value = themeValue;
  
  // Also save to localStorage for redundancy
  if (process.client) {
    localStorage.setItem('theme', themeValue);
  }
});

// Provide theme toggle function globally
provide('isDark', isDark);
provide('toggleTheme', () => {
  isDark.value = !isDark.value;
});
</script>

<style>
/* Global app styles */
</style>
