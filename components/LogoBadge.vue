<template>
  <div class="logo-badge" :style="{ width: size + 'px', height: size + 'px' }">
    <n-gradient-text type="primary" class="logo-text">μT</n-gradient-text>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: Number,
    default: 40
  }
})
</script>

<style scoped>
.logo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 900;
  background: rgba(24, 160, 88, 0.1);
  border-radius: 12px;
  border: 2px solid rgba(24, 160, 88, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;
}

.logo-badge:hover {
  transform: scale(1.1);
  background: rgba(24, 160, 88, 0.15);
  border-color: rgba(24, 160, 88, 0.5);
  box-shadow: 0 4px 12px rgba(24, 160, 88, 0.2);
}

.logo-text {
  font-size: inherit;
  line-height: 1;
}

/* Animation on page load */
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.logo-badge {
  animation: fadeInScale 0.5s ease-out;
}
</style>