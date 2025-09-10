<template>
  <n-layout style="height: 100vh" position="absolute">
    <n-layout-header bordered class="header">
      <n-space justify="space-between" align="center" class="inner">
        <n-space align="center" :size="24">
          <n-space align="center" :size="12">
            <nuxt-link to="/">
              <LogoBadge :size="40" />
            </nuxt-link>
            <n-text strong style="font-size: 1.1rem;">MicroTrade</n-text>
          </n-space>
          <n-space align="center" :size="20">
            <nuxt-link to="/" class="nav-link">
              <n-text>Home</n-text>
            </nuxt-link>
            <nuxt-link v-if="isAuthenticated" to="/dashboard" class="nav-link">
              <n-text>Dashboard</n-text>
            </nuxt-link>
            <nuxt-link v-if="!isAuthenticated" to="/login" class="nav-link">
              <n-text>Login</n-text>
            </nuxt-link>
            <nuxt-link v-if="!isAuthenticated" to="/register" class="nav-link">
              <n-text>Register</n-text>
            </nuxt-link>
          </n-space>
        </n-space>
        <n-space align="center" :size="16">
          <UserProfileDropdown v-if="isAuthenticated" />
          <n-button 
            v-if="!isAuthenticated"
            circle 
            quaternary
            @click="toggleTheme"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            class="theme-toggle-btn"
          >
            <template #icon>
              <n-icon :size="20">
                <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              </n-icon>
            </template>
          </n-button>
        </n-space>
      </n-space>
    </n-layout-header>
    <n-layout-content position="absolute" style="top: 64px; bottom: 0" :native-scrollbar="false">
      <div class="content">
        <slot></slot>
      </div>
      <AppFooter />
    </n-layout-content>
  </n-layout>
</template>

<script setup>
import NuxtLink from "#app/components/nuxt-link";
import { computed, inject } from "vue";
import { NIcon } from "naive-ui";

// Check authentication status using the new auth-check cookie
const authCheck = useCookie('auth-check');
const isAuthenticated = computed(() => authCheck.value === 'true' || authCheck.value === true);

// Inject theme functions from app.vue
const isDark = inject('isDark');
const toggleTheme = inject('toggleTheme');
</script>

<style scoped>
.header {
  height: 64px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  z-index: 100;
}

.inner {
  width: 100%;
}

.content {
  padding: 20px;
  min-height: calc(100vh - 64px);
}

.nav-link {
  text-decoration: none;
  transition: all 0.3s;
  padding: 8px 12px;
  border-radius: 4px;
}

.nav-link:hover {
  background: rgba(24, 160, 88, 0.1);
}

.nav-link.router-link-active {
  background: rgba(24, 160, 88, 0.15);
  color: #18a058;
}

.theme-toggle-btn {
  transition: all 0.3s ease;
}

.theme-toggle-btn:hover {
  transform: rotate(15deg);
}
</style>

