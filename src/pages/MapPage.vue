<script setup lang="ts">
import { ref } from "vue";
import MapViewer from "@/components/MapViewer.vue";
import type { MapViewerConfig } from "@/types/ifc-viewer";

const modelSchool =
  "https://thatopen.github.io/engine_components/resources/ifc/school_str.ifc";

/** Собираем один объект конфигурации (каждое поле подписано в типах) */
const config: MapViewerConfig = {
  model: modelSchool, // Источник модели
  wasm: { version: "0.0.71", absolute: true }, // Версия/путь web-ifc
  showGrid: true, // Показ сетки
  gridOffset: 0, // Смещение сетки по Y
  liftBy: 10.2, // Подъём модели по Y
  lookAt: { eye: [78, 20, -2.2], target: [26, -4, 25] }, // Стартовый ракурс
  autoFit: false, // Автокадр по сцене
  showStats: false, // FPS панель
  background: "#0e0e11", // Цвет фона
};

const viewerRef = ref<InstanceType<typeof MapViewer> | null>(null);

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !viewerRef.value) return;

  viewerRef.value.clear();
  viewerRef.value.loadModel(file).catch(console.error);

  // Важно: позволяет повторно выбрать тот же файл
  input.value = "";
}
</script>

<template>
  <MapViewer ref="viewerRef" :config="config">
    <div
      style="
        position: absolute;
        left: 12px;
        top: 12px;
        z-index: 2;
        display: flex;
        gap: 8px;
      "
    >
      <input type="file" accept=".ifc" @change="onFileChange" />
    </div>
  </MapViewer>
</template>
