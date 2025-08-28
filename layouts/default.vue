<template>
    <n-space vertical>
        <n-layout>
            <n-layout-header bordered class="header">
                <n-space justify="space-between" align="center" class="inner">
                    <nuxt-link to="/dashboard"><n-text><b>Crypto App</b></n-text></nuxt-link>
                    <n-text>userID: {{userID}}</n-text>
                    <n-space align="center" :size="12">
                        <n-button 
                            circle 
                            quaternary
                            @click="toggleTheme"
                            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                        >
                            <template #icon>
                                <n-icon :size="20">
                                    <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                                    </svg>
                                </n-icon>
                            </template>
                        </n-button>
                        <n-dropdown :options="dropdownOptions">
                            <n-button>User profile</n-button>
                        </n-dropdown>
                    </n-space>
                </n-space>
            </n-layout-header>
            <n-layout has-sider class="container">
                <n-layout-sider
                    bordered
                    show-trigger
                    collapse-mode="width"
                    :collapsed-width="64"
                    :width="200"
                    :native-scrollbar="false"
                    class="sidebar"
                >
                    <n-menu
                        :collapsed-width="64"
                        :collapsed-icon-size="22"
                        :options="sidebarOptions"
                    />
                </n-layout-sider>
                <n-layout class="content">
                    <slot></slot>
                </n-layout>
            </n-layout>
            <n-layout-footer bordered class="footer">
                Crypto App - 2023
            </n-layout-footer>
        </n-layout>
    </n-space>
</template>

<script setup>
import NuxtLink from "#app/components/nuxt-link";
import { h, inject } from "vue";
import { NIcon, NButton, NSpace } from "naive-ui";
import {
    AppsSharp as AppsSharp,
    BarChart as BarChart,
    Analytics as Analytics,
    MenuOutline as MenuOutline,
    GitCompareOutline as GitCompareOutline,
    BookOutline as BookIcon,
    PersonCircleOutline as UserIcon,
    LogOutOutline as LogoutIcon
} from "@vicons/ionicons5";
let userIDCookie = useCookie('userID');
let userID = userIDCookie.value;

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
        icon: renderIcon(AppsSharp),
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
        icon: renderIcon(BarChart),
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

const dropdownOptions = [
    {
        label: () =>
            h(
                NuxtLink,
                {
                    to: {
                        name: 'profile',
                    }
                },
                { default: () => 'Profile' }
            ),
        key: 'profile',
        icon: renderIcon(UserIcon)
    },
    {
      label: () =>
          h(
              NuxtLink,
              {
                to: {
                  name: 'logout',
                }
              },
              { default: () => 'Logout' }
          ),
        key: 'logout',
        icon: renderIcon(LogoutIcon)
    }
];



</script>

