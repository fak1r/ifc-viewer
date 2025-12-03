<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  enabled: boolean
  orientation: 'horizontal' | 'vertical'
  top?: number
}

interface Emits {
  (e: 'toggle:enabled', value: boolean): void
  (e: 'change:orientation', value: 'horizontal' | 'vertical'): void
}

const props = withDefaults(defineProps<Props>(), { top: 60 })

const emit = defineEmits<Emits>()

const panelStyle = computed(() => ({ top: `${props.top}px` }))

function onToggle(e: Event) {
  emit('toggle:enabled', (e.target as HTMLInputElement).checked)
}

function onOrientationChange(e: Event) {
  emit('change:orientation', (e.target as HTMLInputElement).value as 'horizontal' | 'vertical')
}
</script>

<template>
  <div class="clipper-panel" :style="panelStyle">
    <label>
      <input type="checkbox" :checked="enabled" @change="onToggle" />
      Включить разрез
    </label>
    <div class="row">
      <span class="label">Ориентация</span>
      <label class="option">
        <input type="radio" value="horizontal" :checked="orientation === 'horizontal'" @change="onOrientationChange" />
        Горизонтальная
      </label>
      <label class="option">
        <input type="radio" value="vertical" :checked="orientation === 'vertical'" @change="onOrientationChange" />
        Вертикальная
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss">
.clipper-panel {
  position: absolute;
  left: 12px;
  z-index: 10;
  padding: 10px;
  background: rgba(20, 20, 28, 0.8);
  color: #fff;
  border-radius: 14px;
  backdrop-filter: blur(6px);
  min-width: 220px;
  font-size: 12px;
  pointer-events: auto;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
  flex-wrap: wrap;
}

.label {
  font-weight: 600;
}

.option {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>

