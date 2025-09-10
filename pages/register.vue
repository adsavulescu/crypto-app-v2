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
            Create Your Account
          </n-gradient-text>
        </n-h2>
        <n-text class="auth-subtitle">
          Join MicroTrade and start precision trading
        </n-text>
      </n-space>

      <!-- Register Form -->
      <n-card class="auth-card">
        <n-form ref="formRef" :model="modelRef" :rules="rules" size="large">
          <n-form-item path="username" label="Username">
            <n-input 
              v-model:value="modelRef.username" 
              placeholder="Choose a username"
              @keydown.enter.prevent
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
              placeholder="Create a strong password"
              show-password-on="click"
              @input="handlePasswordInput"
              @keydown.enter.prevent
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
          
          <n-form-item
            ref="rPasswordFormItemRef"
            first
            path="reenteredPassword"
            label="Confirm Password"
          >
            <n-input
              v-model:value="modelRef.reenteredPassword"
              :disabled="!modelRef.password"
              type="password"
              placeholder="Re-enter your password"
              show-password-on="click"
              @keydown.enter.prevent
            >
              <template #prefix>
                <n-icon>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
                  </svg>
                </n-icon>
              </template>
            </n-input>
          </n-form-item>

          <!-- Submit Button -->
          <n-button
            :disabled="!modelRef.username"
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
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              </n-icon>
            </template>
            Create Account
          </n-button>
        </n-form>
      </n-card>

      <!-- Login Link -->
      <n-card class="link-card">
        <n-space justify="center" align="center">
          <n-text>Already have an account?</n-text>
          <nuxt-link to="/login" class="auth-link">
            <n-text type="primary" strong>Sign In</n-text>
          </nuxt-link>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

definePageMeta({
  layout: "no-sidebar",
});

const notification = useNotification();
const message = useMessage();

const formRef = ref(null);
const rPasswordFormItemRef = ref(null);
const isLoading = ref(false);

const modelRef = ref({
  username: null,
  password: null,
  reenteredPassword: null
});

function validatePasswordStartWith(rule, value) {
  return !!modelRef.value.password && modelRef.value.password.startsWith(value) && modelRef.value.password.length >= value.length;
}

function validatePasswordSame(rule, value) {
  return value === modelRef.value.password;
}

function handlePasswordInput() {
  if (modelRef.value.reenteredPassword) {
    rPasswordFormItemRef.value?.validate({ trigger: "password-input" });
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

        let resp = await $fetch('/api/v1/register', {
          method: 'POST',
          body: data
        });

        notification.success({
          title: "Registration Successful!",
          content: `Welcome to MicroTrade, ${modelRef.value.username}!`,
          meta: "Redirecting to login page...",
          duration: 2500,
        });

        setTimeout(async () => {
          await navigateTo('/login');
        }, 1500);
        
      } catch (error) {
        notification.error({
          title: "Registration Failed",
          content: error.data?.message || "An error occurred during registration",
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
        if (value.length < 3) {
          return new Error("Username must be at least 3 characters");
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          return new Error("Username can only contain letters, numbers, and underscores");
        }
        return true;
      },
      trigger: ["input", "blur"]
    }
  ],
  password: [
    {
      required: true,
      message: "Password is required"
    },
    {
      validator(rule, value) {
        if (value && value.length < 6) {
          return new Error("Password must be at least 6 characters");
        }
        return true;
      },
      trigger: ["input", "blur"]
    }
  ],
  reenteredPassword: [
    {
      required: true,
      message: "Please confirm your password",
      trigger: ["input", "blur"]
    },
    {
      validator: validatePasswordStartWith,
      message: "Passwords do not match",
      trigger: "input"
    },
    {
      validator: validatePasswordSame,
      message: "Passwords do not match",
      trigger: ["blur", "password-input"]
    }
  ]
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
  background: radial-gradient(ellipse at top left, 
    rgba(24, 160, 88, 0.15) 0%, 
    transparent 50%),
    radial-gradient(ellipse at bottom right, 
    rgba(36, 171, 255, 0.1) 0%, 
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

/* Form Styling - Naive UI handles spacing internally */

/* Button Styling */
.submit-button {
  height: 48px;
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1rem;
  background: linear-gradient(135deg, #18a058 0%, #18a058 100%);
  transition: all 0.3s;
}

.submit-button:hover {
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