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
            <nuxt-link to="/dashboard" class="nav-link">
              <n-text>Dashboard</n-text>
            </nuxt-link>
          </n-space>
        </n-space>
        <n-space align="center" :size="16">
          <UserProfileDropdown />
        </n-space>
      </n-space>
    </n-layout-header>
    <n-layout has-sider position="absolute" style="top: 64px; bottom: 0">
      <n-layout-sider
        bordered
        show-trigger
        collapse-mode="width"
        :collapsed-width="64"
        :width="200"
        :native-scrollbar="false"
      >
        <n-menu
          :collapsed-width="64"
          :collapsed-icon-size="22"
          :options="sidebarOptions"
        />
      </n-layout-sider>
      <n-layout-content 
        :native-scrollbar="false" 
        class="content-wrapper"
      >
        <div class="content">
          <slot></slot>
        </div>
        <AppFooter />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup>
import NuxtLink from "#app/components/nuxt-link";
import { h, inject, computed } from "vue";
import { NIcon } from "naive-ui";
import {
    BarChart as BarChart,
    Analytics as Analytics,
    MenuOutline as MenuOutline,
    GitCompareOutline as GitCompareOutline,
    BookOutline as BookIcon
} from "@vicons/ionicons5";
// Use auth-check to determine if user is logged in
const authCheck = useCookie('auth-check');
const isAuthenticated = computed(() => authCheck.value === 'true' || authCheck.value === true);
// We don't have userID in cookies anymore - it's in the JWT token
let userID = isAuthenticated.value ? 'Authenticated' : null;

// Inject theme functions from app.vue
const isDark = inject('isDark');
const toggleTheme = inject('toggleTheme');

function renderIcon(icon) {
    return () => h(NIcon, null, { default: () => h(icon) });
}

const sidebarOptions = [
    {
        label: () =>
            h(
                NuxtLink,
                {
                    to: {
                        name: 'dashboard',
                    }
                },
                { default: () => 'Dashboard' }
            ),
        key: 'dashboard',
        icon: renderIcon(BarChart),
    },
    {
        label: () =>
            h(
                NuxtLink,
                {
                    to: {
                        name: 'trade',
                    }
                },
                { default: () => 'Trade' }
            ),
        key: 'trade',
        icon: renderIcon(Analytics),
    },
    // {
    //     label: () =>
    //         h(
    //             NuxtLink,
    //             {
    //                 to: {
    //                     name: 'frontrunning-bots',
    //                 },
    //                 disabled: true
    //             },
    //             { default: () => 'Frontrunning Bots' }
    //         ),
    //     key: 'frontrunning-bots',
    //     icon: renderIcon(Analytics),
    // },
    {
        label: () =>
            h(
                NuxtLink,
                {
                    to: {
                        name: 'dca-bots',
                    }
                },
                { default: () => 'DCA Bots' }
            ),
        key: 'dca-bots',
        icon: renderIcon(MenuOutline),
    },
    // {
    //     label: () =>
    //         h(
    //             NuxtLink,
    //             {
    //                 to: {
    //                     name: 'dca-bots',
    //                 }
    //             },
    //             { default: () => 'DCA Bots' }
    //         ),
    //     key: 'dca-bots',
    //     icon: renderIcon(GitCompareOutline),
    // },
    // {
    //     label: () =>
    //         h(
    //             NuxtLink,
    //             {
    //               to: {
    //                 name: 'back-testing',
    //               }
    //             },
    //             { default: () => 'Back testing' }
    //         ),
    //     key: 'back-testing',
    //     icon: renderIcon(GitCompareOutline),
    // },
    {
        label: () =>
            h(
                NuxtLink,
                {
                  to: {
                    name: 'dev-tools',
                  }
                },
                { default: () => 'Dev Tools' }
            ),
        key: 'dev-tools',
        icon: renderIcon(GitCompareOutline),
    },
];



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

.content-wrapper {
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
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
</style>

