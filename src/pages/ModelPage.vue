<script setup lang="ts">
import { reactive, ref } from "vue";
import ModelViewer from "@/components/ModelViewer.vue";
import type { ModelViewerConfig } from "@/types/ifc-viewer";
import SvgIcons from "@/components/Svg/SvgIcons.vue";

const base = import.meta.env.BASE_URL || "/";

const config: ModelViewerConfig = {
  model: `${location.origin}${base}house-model.ifc`,
  showGrid: true,
  background: "#0e0111",
};

const measurePanelsVisibility = reactive<{ square: boolean; linear: boolean }>({
  square: false,
  linear: false,
});

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

function toggleVisibleMeasure(name: "square" | "linear") {
  measurePanelsVisibility[name] = !measurePanelsVisibility[name];
}
</script>

<template>
  <ModelViewer
    ref="viewerRef"
    :config="config"
    :measure-panels-visibility="measurePanelsVisibility"
  >
    <div class="toolbar">
      <input
        type="file"
        accept=".ifc"
        @change="onFileChange"
        class="toolbar__input"
      />
      <div class="toolbar__icons">
        <button @click="toggleVisibleMeasure('linear')">
          <SvgIcons icon="linear-measurement" />
        </button>
        <button @click="toggleVisibleMeasure('square')">
          <SvgIcons icon="square-measurement" />
        </button>
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
