<template>
  <n-dropdown :options="dropdownOptions" @select="handleDropdownSelect">
    <n-button>User profile</n-button>
  </n-dropdown>
</template>

<script setup>
import { h, inject, computed } from "vue";
import { NIcon } from "naive-ui";
import {
  PersonCircleOutline as UserIcon,
  LogOutOutline as LogoutIcon,
  SunnyOutline as SunIcon,
  MoonOutline as MoonIcon
} from "@vicons/ionicons5";

// Inject theme functions from app.vue
const isDark = inject('isDark');
const toggleTheme = inject('toggleTheme');

function renderIcon(icon) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const dropdownOptions = computed(() => [
  {
    label: "Profile",
    key: "profile",
    icon: renderIcon(UserIcon)
  },
  {
    type: "divider",
    key: "d1"
  },
  {
    label: isDark.value ? 'Light Mode' : 'Dark Mode',
    key: "theme-toggle",
    icon: renderIcon(isDark.value ? SunIcon : MoonIcon)
  },
  {
    type: "divider",
    key: "d2"
  },
  {
    label: "Logout",
    key: "logout",
    icon: renderIcon(LogoutIcon)
  }
]);

async function handleDropdownSelect(key) {
  if (key === "profile") {
    await navigateTo("/profile");
  } else if (key === "theme-toggle") {
    toggleTheme();
  } else if (key === "logout") {
    // Call logout endpoint
    await $fetch('/api/v1/logout', { method: 'POST' });
    // Redirect to home
    window.location.href = '/';
  }
}
</script>