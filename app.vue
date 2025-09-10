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

// Suppress annoying MetaMask auto-connect errors
if (process.client) {
  // Override console.error to filter out MetaMask errors
  const originalError = console.error;
  console.error = function(...args) {
    const errorString = args.join(' ');
    if (errorString.includes('MetaMask') || 
        errorString.includes('inpage.js') || 
        errorString.includes('Failed to connect to MetaMask') ||
        errorString.includes('MetaMask extension not found')) {
      return; // Suppress MetaMask errors
    }
    originalError.apply(console, args);
  };
  
  // Prevent MetaMask uncaught promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && (
        event.reason.message?.includes('MetaMask') ||
        event.reason.message?.includes('Failed to connect to MetaMask') ||
        event.reason.stack?.includes('inpage.js'))) {
      event.preventDefault();
    }
  });
  
  // Also catch any direct errors
  window.addEventListener('error', function(event) {
    if (event.filename?.includes('inpage.js') || 
        event.message?.includes('MetaMask')) {
      event.preventDefault();
    }
  });
}
</script>

<style>
/* Global app styles */
</style>
