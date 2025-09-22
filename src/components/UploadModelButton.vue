<script setup lang="ts">
import { ref } from "vue";

interface Emit {
  (e: "file-selected", file: File): void;
}

const emit = defineEmits<Emit>();

const inputRef = ref<HTMLInputElement | null>(null);

function trigger() {
  inputRef.value?.click();
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit("file-selected", file);
  input.value = "";
}
</script>

<template>
  <button class="upload-btn" type="button" @click="trigger">
    Загрузить модель
  </button>
  <input
    ref="inputRef"
    type="file"
    accept=".ifc"
    class="hidden-input"
    @change="onChange"
  />
</template>

<style scoped lang="scss">
.hidden-input {
  display: none;
}
.upload-btn {
  background-color: var(--btn-color);
  color: white;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--btn-hover);
  }
}
</style>
