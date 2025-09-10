<template>
  <div class="auth-page">
    <!-- Background Effects -->
    <div class="auth-background">
      <div class="auth-gradient"></div>
      <div class="auth-pattern"></div>
    </div>
    
    <!-- Content -->
    <div class="auth-container">
      <!-- Logo and Title -->
      <n-space vertical align="center" :size="24" class="auth-header">
        <nuxt-link to="/">
          <LogoBadge :size="60" />
        </nuxt-link>
        <n-h2 class="auth-title">
          <n-gradient-text type="primary">
            Welcome Back
          </n-gradient-text>
        </n-h2>
        <n-text class="auth-subtitle">
          Sign in to your MicroTrade account
        </n-text>
      </n-space>

      <!-- Login Form -->
      <n-card class="auth-card">
        <n-form ref="formRef" :model="modelRef" :rules="rules" size="large">
          <n-form-item path="username" label="Username">
            <n-input 
              v-model:value="modelRef.username" 
              placeholder="Enter your username"
              @keydown.enter="handleEnterKey"
            >
              <template #prefix>
                <n-icon>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                  </svg>
                </n-icon>
              </template>
            </n-input>
          </n-form-item>
          
          <n-form-item path="password" label="Password">
            <n-input
              v-model:value="modelRef.password"
              type="password"
              placeholder="Enter your password"
              show-password-on="click"
              @keydown.enter="handleEnterKey"
            >
              <template #prefix>
                <n-icon>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                  </svg>
                </n-icon>
              </template>
            </n-input>
          </n-form-item>

          <!-- Remember Me & Forgot Password -->
          <n-form-item>
            <n-space justify="space-between" style="width: 100%;">
              <n-checkbox v-model:checked="rememberMe">
                <n-text>Remember me</n-text>
              </n-checkbox>
              <n-text type="primary" style="cursor: pointer;">
                Forgot password?
              </n-text>
            </n-space>
          </n-form-item>

          <!-- Submit Button -->
          <n-button
            :disabled="!modelRef.username || !modelRef.password"
            :loading="isLoading"
            type="primary"
            block
            size="large"
            class="submit-button"
            @click="handleValidateButtonClick"
          >
            <template #icon>
              <n-icon>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clip-rule="evenodd" />
                  <path fill-rule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clip-rule="evenodd" />
                </svg>
              </n-icon>
            </template>
            Sign In
          </n-button>
        </n-form>
      </n-card>

      <!-- Register Link -->
      <n-card class="link-card">
        <n-space justify="center" align="center">
          <n-text>Don't have an account?</n-text>
          <nuxt-link to="/register" class="auth-link">
            <n-text type="primary" strong>Create Account</n-text>
          </nuxt-link>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAppStore } from '~/stores/app.store';

definePageMeta({
  layout: "no-sidebar",
});

const notification = useNotification();
const message = useMessage();
const app = useAppStore();

const formRef = ref(null);
const isLoading = ref(false);
const rememberMe = ref(false);

const modelRef = ref({
  username: null,
  password: null,
});

function handleEnterKey(e) {
  if (modelRef.value.username && modelRef.value.password) {
    handleValidateButtonClick(e);
  }
}

async function handleValidateButtonClick(e) {
  e.preventDefault();
  
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      isLoading.value = true;
      
      try {
        let data = {
          username: modelRef.value.username,
          password: modelRef.value.password,
        };

        let resp = await $fetch('/api/v1/login', {
          method: 'POST',
          body: data
        });

        console.log('Login response:', resp); // Debug log
        
        // Check if cookies were set
        const authCheckAfterLogin = useCookie('auth-check');
        console.log('Auth check cookie after login:', authCheckAfterLogin.value);

        if (resp.success && resp.data) {
          notification.success({
            title: "Login Successful!",
            content: `Welcome back, ${resp.data.username}!`,
            meta: "Redirecting to dashboard...",
            duration: 2500,
          });

          setTimeout(() => {
            // Check cookie again before redirect
            const authCheckBeforeRedirect = useCookie('auth-check');
            console.log('Auth check before redirect:', authCheckBeforeRedirect.value);
            
            // Use window.location to ensure cookies are properly set
            window.location.href = '/dashboard';
          }, 1000);
        } else {
          notification.error({
            title: "Login Failed",
            content: "Invalid username or password",
            duration: 3000,
          });
        }
      } catch (error) {
        notification.error({
          title: "Login Failed",
          content: error.data?.message || "Invalid username or password",
          duration: 3000,
        });
      } finally {
        isLoading.value = false;
      }
    } else {
      message.error("Please fix the errors in the form");
    }
  });
}

const rules = {
  username: [
    {
      required: true,
      validator(rule, value) {
        if (!value) {
          return new Error("Username is required");
        }
        return true;
      },
      trigger: ["input", "blur"]
    }
  ],
  password: [
    {
      required: true,
      message: "Password is required",
      trigger: ["input", "blur"]
    }
  ],
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

/* Background Effects */
.auth-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.auth-gradient {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at top right, 
    rgba(36, 171, 255, 0.15) 0%, 
    transparent 50%),
    radial-gradient(ellipse at bottom left, 
    rgba(24, 160, 88, 0.1) 0%, 
    transparent 50%);
  animation: gradientShift 20s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

.auth-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.01) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.5;
}

/* Content Container */
.auth-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
.auth-header {
  margin-bottom: 2rem;
  text-align: center;
}

.auth-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.auth-subtitle {
  font-size: 1.1rem;
  opacity: 0.8;
}

/* Card Styling */
.auth-card {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.auth-card:deep(.n-card__content) {
  padding: 2rem;
}

/* Button Styling */
.submit-button {
  height: 48px;
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 0.5rem;
  background: linear-gradient(135deg, #18a058 0%, #18a058 100%);
  transition: all 0.3s;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(24, 160, 88, 0.4);
}

/* Link Card */
.link-card {
  margin-top: 1.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.link-card:deep(.n-card__content) {
  padding: 1rem;
}

.auth-link {
  text-decoration: none;
  transition: all 0.3s;
}

.auth-link:hover {
  transform: scale(1.05);
}

/* Input Icons */
.n-input:deep(.n-input__prefix) {
  margin-right: 8px;
}

/* Responsive */
@media (max-width: 640px) {
  .auth-container {
    max-width: 100%;
  }
  
  .auth-card:deep(.n-card__content) {
    padding: 1.5rem;
  }
  
  .auth-title {
    font-size: 1.5rem;
  }
}
</style>