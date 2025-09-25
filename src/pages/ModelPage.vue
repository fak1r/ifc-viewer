<script setup lang="ts">
import { reactive, ref } from "vue";
import ModelViewer from "@/components/ModelViewer.vue";
import type { ModelViewerConfig } from "@/types/ifc-viewer";
import SvgIcons from "@/components/Svg/SvgIcons.vue";
import UploadModelButton from "@/components/UploadModelButton.vue";
import LoadProgressBar from "@/components/LoadProgressBar.vue";

const base = import.meta.env.BASE_URL || "/";

const config: ModelViewerConfig = {
  model: `${location.origin}${base}house-model.ifc`,
  showGrid: true,
  background: "#0e0111",
};

const measurePanelsVisibility = reactive({ square: false, linear: false });
const viewerRef = ref<InstanceType<typeof ModelViewer> | null>(null);

function toggleVisibleMeasure(name: "square" | "linear") {
  if (name === "square") {
    const next = !measurePanelsVisibility.square;
    measurePanelsVisibility.square = next; // показать/скрыть Area
    measurePanelsVisibility.linear = false; // всегда гасим Length
  } else {
    const next = !measurePanelsVisibility.linear;
    measurePanelsVisibility.linear = next; // показать/скрыть Length
    measurePanelsVisibility.square = false; // всегда гасим Area
  }
}

async function handleFile(file: File) {
  if (!viewerRef.value) return;
  viewerRef.value.clear();
  await viewerRef.value.loadModel(file).catch(console.error);
}
</script>

<template>
  <ModelViewer
    ref="viewerRef"
    :config="config"
    :measure-panels-visibility="measurePanelsVisibility"
  >
    <LoadProgressBar />
    <div class="toolbar">
      <UploadModelButton @file-selected="handleFile" />

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
  align-items: center;

  &__input {
    cursor: pointer;
  }

  &__icons {
    display: flex;
    gap: 8px;
  }
}
</style>
