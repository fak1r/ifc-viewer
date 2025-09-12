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

const emits = defineEmits<{
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
}>();

const rounding = computed({
  get: () => props.state.rounding,
  set: (v: number) => emits("change:rounding", v),
});
</script>

<template>
  <div class="measure-panel">
    <div class="row">
      <label
        ><input
          type="checkbox"
          :checked="state.enabled"
          @change="e => emits('toggle:enabled', (e.target as HTMLInputElement).checked)"
        />
        Enable</label
      >
      <label
        ><input
          type="checkbox"
          :checked="state.visible"
          @change="e => emits('toggle:visible', (e.target as HTMLInputElement).checked)"
        />
        Visible</label
      >
    </div>

    <div class="row">
      <label class="grow"
        >Color
        <input
          type="color"
          :value="state.color"
          @input="e => emits('change:color', (e.target as HTMLInputElement).value)"
        />
      </label>
      <label
        >Rounding
        <input type="number" min="0" max="5" v-model.number="rounding" />
      </label>
    </div>

    <div class="row">
      <label class="grow"
        >Mode
        <select
          :value="state.mode"
          @change="e => emits('change:mode', (e.target as HTMLSelectElement).value)"
        >
          <option v-for="m in state.modes" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>
      <label class="grow"
        >Units
        <select
          :value="state.units"
          @change="e => emits('change:units', (e.target as HTMLSelectElement).value)"
        >
          <option v-for="u in state.unitsList" :key="u" :value="u">
            {{ u }}
          </option>
        </select>
      </label>
    </div>

    <div class="row">
      <button @click="$emit('action:start')">Create (dblclick)</button>
      <button @click="$emit('action:finish')">End (Enter)</button>
      <button @click="$emit('action:deleteUnderCursor')">Delete (Del)</button>
      <button class="danger" @click="$emit('action:clearAll')">
        Delete all
      </button>
      <button @click="$emit('action:logValues')">Log values</button>
    </div>
  </div>
</template>

<style scoped>
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
