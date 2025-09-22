<script setup lang="ts">
import { ref } from "vue";
import ModelViewer from "@/components/ModelViewer.vue";
import type { ModelViewerConfig } from "@/types/ifc-viewer";
import SvgIcons from "@/components/Svg/SvgIcons.vue";

const base = import.meta.env.BASE_URL || "/";

/** Собираем один объект конфигурации (каждое поле подписано в типах) */
const config: ModelViewerConfig = {
  model: `${location.origin}${base}house-model.ifc`, // Источник модели
  wasm: { version: "0.0.71", absolute: true }, // Версия/путь web-ifc
  showGrid: true, // Показ сетки
  gridOffset: 0, // Смещение сетки по Y
  liftBy: 0, // Подъём модели по Y
  lookAt: { eye: [78, 20, -2.2], target: [26, -4, 25] }, // Стартовый ракурс
  autoFit: false, // Автокадр по сцене
  showStats: false, // FPS панель
  background: "#0e0111", // Цвет фона
  measure: {
    enabled: false,
  },
};

const viewerRef = ref<InstanceType<typeof ModelViewer> | null>(null);

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !viewerRef.value) return;

  viewerRef.value.clear();
  viewerRef.value.loadModel(file).catch(console.error);

  // Важно: позволяет повторно выбрать тот же файл
  input.value = "";
}

// function toggleActiveMeasure(name) {
//   switch (name) {
//     case "ruler":
//       config.measure.enabled = !config.measure.enabled;
//   }
// }
</script>

<template>
  <ModelViewer ref="viewerRef" :config="config">
    <div class="toolbar">
      <input
        type="file"
        accept=".ifc"
        @change="onFileChange"
        class="toolbar__input"
      />
      <div class="toolbar__icons">
        <button><SvgIcons icon="ruler" /></button>
        <button><SvgIcons icon="square-measument" /></button>
      </div>
    </div>
  </ModelViewer>
</template>

<style scoped lang="scss">
.toolbar {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 2;
  display: flex;
  gap: 8px;

  &__input {
    cursor: pointer;
  }

  &__icons {
    display: flex;
    gap: 8px;
  }
}
</style>
