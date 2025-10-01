<script setup lang="ts">
import { computed } from "vue";

interface MeasureState {
  enabled: boolean;
  visible: boolean;
  color: string;
  modes: string[];
  mode: string;
  unitsList: string[];
  units: string;
  rounding: number;
}

interface Props {
  state: MeasureState;
  variant?: "area" | "length";
  top?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "area",
  top: 48,
});

interface Emit {
  "toggle:enabled": [value: boolean];
  "toggle:visible": [value: boolean];
  "change:color": [value: string];
  "change:mode": [value: string];
  "change:units": [value: string];
  "change:rounding": [value: number];
  "action:start": [];
  "action:finishMeasurement": [];
  "action:clearMeasurement": [];
}

const emit = defineEmits<Emit>();

const rounding = computed({
  get: () => props.state.rounding,
  set(v: number) {
    emit("change:rounding", v);
  },
});

function onToggleEnabled(e: Event) {
  emit("toggle:enabled", (e.target as HTMLInputElement).checked);
}

function onToggleVisible(e: Event) {
  emit("toggle:visible", (e.target as HTMLInputElement).checked);
}

function onChangeColor(e: Event) {
  emit("change:color", (e.target as HTMLInputElement).value);
}

function onChangeMode(e: Event) {
  emit("change:mode", (e.target as HTMLSelectElement).value);
}

function onChangeUnits(e: Event) {
  emit("change:units", (e.target as HTMLSelectElement).value);
}

function finishMeasurement() {
  emit("action:finishMeasurement");
}

function clearMeasurement() {
  emit("action:clearMeasurement");
}

const instructionText = computed(() =>
  props.variant === "length"
    ? "Создать линию (Двойной клик)"
    : "Создать точку (Двойной клик)"
);

const panelStyle = computed(() => ({ top: `${props.top}px` }));
</script>

<template>
  <div class="measure-panel" :style="panelStyle">
    <div class="row">
      <label>
        <input
          type="checkbox"
          :checked="state.enabled"
          @change="onToggleEnabled"
        />
        Включить измерения
      </label>
      <label>
        <input
          type="checkbox"
          :checked="state.visible"
          @change="onToggleVisible"
        />
        Показывать линии
      </label>
    </div>

    <div class="row">
      <label class="grow">
        Цвет
        <input type="color" :value="state.color" @input="onChangeColor" />
      </label>
      <label>
        Округление
        <input type="number" min="0" max="5" v-model.number="rounding" />
      </label>
    </div>

    <div class="row">
      <label class="grow">
        Режим работы
        <select :value="state.mode" @change="onChangeMode">
          <option v-for="m in state.modes" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>
      <label class="grow">
        Еденицы измерения
        <select :value="state.units" @change="onChangeUnits">
          <option v-for="u in state.unitsList" :key="u" :value="u">
            {{ u }}
          </option>
        </select>
      </label>
    </div>

    <div class="row">
      <div>{{ instructionText }}</div>
      <button @click="finishMeasurement">Закончить измерения (Enter)</button>
      <button class="danger" @click="clearMeasurement">
        Удалить измерения (Del)
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.measure-panel {
  position: absolute;
  z-index: 10;
  left: 12px;
  padding: 10px;
  background: rgba(20, 20, 28, 0.8);
  color: #fff;
  border-radius: 14px;
  backdrop-filter: blur(6px);
  min-width: 280px;
  max-width: 400px;
  font-size: 12px;
}

.row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.row .grow {
  flex: 1;
}

button {
  padding: 6px 10px;
  border-radius: 4px;
  background-color: var(--btn-color);

  &:hover {
    background-color: var(--btn-hover);
  }
}

button.danger {
  background: #9a2b2b;
  color: white;

  &:hover {
    background-color: #bd4a4a;
  }
}
</style>
