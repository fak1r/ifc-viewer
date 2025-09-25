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
}

const props = defineProps<Props>();

type Emit =
  | ((e: "toggle:enabled", value: boolean) => void)
  | ((e: "toggle:visible", value: boolean) => void)
  | ((e: "change:color", value: string) => void)
  | ((e: "change:mode", value: string) => void)
  | ((e: "change:units", value: string) => void)
  | ((e: "change:rounding", value: number) => void)
  | ((e: "action:finishMeasurement") => void)
  | ((e: "action:clearMeasurement") => void);

const emit = defineEmits<Emit>();

const rounding = computed({
  get: () => props.state.rounding,
  set: (v: number) => emit("change:rounding", v),
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
</script>

<template>
  <div class="measure-panel">
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
      <label class="color">
        Цвет:
        <input type="color" :value="state.color" @input="onChangeColor" />
      </label>

      <label>
        Режим:
        <select :value="state.mode" @change="onChangeMode">
          <option v-for="m in state.modes" :key="m" :value="m">
            {{ m }}
          </option>
        </select>
      </label>

      <label>
        Единицы:
        <select :value="state.units" @change="onChangeUnits">
          <option v-for="u in state.unitsList" :key="u" :value="u">
            {{ u }}
          </option>
        </select>
      </label>

      <label>
        Точность:
        <select v-model.number="rounding">
          <option :value="0">0</option>
          <option :value="1">1</option>
          <option :value="2">2</option>
          <option :value="3">3</option>
          <option :value="4">4</option>
          <option :value="5">5</option>
        </select>
      </label>
    </div>

    <div class="row">
      <div>Создать линию (Двойной клик)</div>
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
  top: 218px;
  left: 12px;
  padding: 10px;
  background: rgba(20, 20, 28, 0.8);
  color: #fff;
  border-radius: 14px;
  backdrop-filter: blur(6px);
  min-width: 280px;
  max-width: 400px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

label.color input[type="color"] {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
}

select {
  background: var(--input-bg, #2b2b2b);
  color: var(--input-fg, #eee);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 8px;
}

button {
  background: var(--btn-color, #3f51b5);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--btn-hover, #5c6bc0);
  }
}

button.danger {
  background: #9a2b2b;

  &:hover {
    background-color: #bd4a4a;
  }
}
</style>
