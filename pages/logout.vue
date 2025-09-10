<template>
  <h3>Logging out...</h3>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const notification = useNotification();

onMounted(async () => {
  try {
    // Call the logout API endpoint
    await $fetch('/api/v1/logout', {
      method: 'POST'
    });
    
    notification['success']({
      content: "Logged Out Successfully",
      meta: "You have been securely logged out. Redirecting...",
      duration: 2500,
    });
  } catch (error) {
    // Even if the API call fails, clear cookies client-side
    const accessToken = useCookie('access-token');
    const refreshToken = useCookie('refresh-token');
    const userIDCookie = useCookie('userID');
    const oldToken = useCookie('token');
    
    accessToken.value = null;
    refreshToken.value = null;
    userIDCookie.value = null;
    oldToken.value = null;
    
    notification['info']({
      content: "Logged Out",
      meta: "You have been logged out. Redirecting...",
      duration: 2500,
    });
  }

  setTimeout(async () => {
    await navigateTo('/');
  }, 1000);
})
</script>
