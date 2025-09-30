<script setup lang="ts">
import { computed } from "vue";

// Универсальное состояние инструмента измерений
export interface MeasureState {
  enabled: boolean;
  visible: boolean;
  color: string;
  modes: string[]; // список доступных режимов
  mode: string; // активный режим
  unitsList: string[]; // список единиц
  units: string; // активные единицы
  rounding: number; // точность
}

// События полностью совпадают с Area/Length панелями
const emit = defineEmits<{
  (e: "toggle:enabled", v: boolean): void;
  (e: "toggle:visible", v: boolean): void;
  (e: "change:color", v: string): void;
  (e: "change:mode", v: string): void;
  (e: "change:units", v: string): void;
  (e: "change:rounding", v: number): void;
  (e: "action:finishMeasurement"): void;
  (e: "action:clearMeasurement"): void;
}>();

interface Props {
  title: string;
  state: MeasureState;
}

const props = defineProps<Props>();

const hasModes = computed(() => (props.state.modes?.length ?? 0) > 0);
const hasUnits = computed(() => (props.state.unitsList?.length ?? 0) > 0);

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
function onChangeRounding(v: number) {
  emit("change:rounding", v);
}
</script>

<template>
  <div class="panel">
    <div class="row head">
      <h3 class="title">{{ title }}</h3>
      <div class="spacer" />
      <button
        class="btn"
        type="button"
        @click="emit('action:clearMeasurement')"
      >
        Очистить
      </button>
    </div>

    <div class="row switches">
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
      <label class="col">
        Цвет
        <input type="color" :value="state.color" @input="onChangeColor" />
      </label>
      <label v-if="hasModes" class="col">
        Режим
        <select :value="state.mode" @change="onChangeMode">
          <option v-for="m in state.modes" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>
    </div>

    <div class="row" v-if="hasUnits">
      <label class="col">
        Единицы
        <select :value="state.units" @change="onChangeUnits">
          <option v-for="u in state.unitsList" :key="u" :value="u">
            {{ u }}
          </option>
        </select>
      </label>
      <label class="col">
        Округление
        <input
          type="number"
          min="0"
          max="6"
          :value="state.rounding"
          @input="(e:any)=>onChangeRounding(Number(e.target.value))"
        />
      </label>
    </div>

    <div class="row actions">
      <button
        class="btn"
        type="button"
        @click="emit('action:finishMeasurement')"
      >
        Завершить
      </button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  /* предотвращаем бесконечный рост контейнера в превью */
  max-height: 60vh;
  overflow: auto;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap; /* чтобы элементы переносились, а не растягивали высоту */
}
.head {
  align-items: center;
}
.title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.spacer {
  flex: 1;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}
.btn {
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  background: #fff;
}
.switches {
  gap: 24px;
}
/* контролируем ширину инпутов, чтобы не раздвигали контейнер */
input[type="number"] {
  max-width: 120px;
}
input[type="color"] {
  width: 44px;
  height: 28px;
  padding: 0;
}
select {
  max-width: 200px;
}
</style>
