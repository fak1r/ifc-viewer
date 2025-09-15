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

interface Emit {
  (e: "toggle:enabled", value: boolean): void;
  (e: "toggle:visible", value: boolean): void;
  (e: "change:color", value: string): void;
  (e: "change:mode", value: string): void;
  (e: "change:units", value: string): void;
  (e: "change:rounding", value: number): void;
  (e: "action:start"): void;
  (e: "action:finish"): void;
  (e: "action:deleteUnderCursor"): void;
  (e: "action:clearAll"): void;
  (e: "action:logValues"): void;
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

function start() {
  emit("action:start");
}
function finish() {
  emit("action:finish");
}
function deleteUnderCursor() {
  emit("action:deleteUnderCursor");
}
function clearAll() {
  emit("action:clearAll");
}
function logValues() {
  emit("action:logValues");
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
      <button @click="start">Создать точку (Двойной клик)</button>
      <button @click="finish">Закончить измерения (Enter)</button>
      <button @click="deleteUnderCursor">Удалить точку (Del)</button>
      <button class="danger" @click="clearAll">Удалить все точки</button>
      <button @click="logValues">Показать результат</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.measure-panel {
  position: absolute;
  z-index: 10;
  top: 48px;
  left: 12px;
  padding: 10px;
  background: rgba(20, 20, 28, 0.8);
  color: #fff;
  border-radius: 14px;
  backdrop-filter: blur(6px);
  min-width: 280px;
  max-width: 360px;
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
  border-radius: 10px;
  border: none;
  cursor: pointer;
}

button.danger {
  background: #9a2b2b;
  color: #fff;
}
</style>
