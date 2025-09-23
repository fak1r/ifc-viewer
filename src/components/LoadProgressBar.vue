<script setup lang="ts">
import { computed } from "vue";
import { useModelLoadingProgress } from "@/composables/useModelLoadingProgress";

const { visible, percent } = useModelLoadingProgress();

const percentInt = computed(() =>
  Math.round(Math.max(0, Math.min(100, percent.value)))
);
const width = computed(() => `${percentInt.value}%`);
const label = computed(() => `${percentInt.value}%`);
</script>

<template>
  <transition name="fade">
    <div v-if="visible" class="loader">
      <div class="loader__bar">
        <div class="loader__fill" :style="{ width }" />
      </div>
      <div class="loader__label">{{ label }}</div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
.loader {
  position: absolute;
  left: 50%;
  top: 16px;
  transform: translateX(-50%);
  z-index: 10;

  display: flex;
  gap: 8px;
  align-items: center;

  &__bar {
    width: 320px;
    height: 8px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
  }

  &__fill {
    height: 100%;
    background: #888;
    transition: width 0.15s ease;
  }

  &__label {
    min-width: 48px;
    text-align: right;
    color: #fff;
    font-size: 12px;
    opacity: 0.9;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
