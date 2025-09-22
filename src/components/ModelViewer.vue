<script setup lang="ts">
import {
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  toRefs,
  shallowRef,
  computed,
  nextTick,
} from "vue";
import * as OBC from "@thatopen/components";
import type { ModelViewerConfig, ModelSource } from "@/types/ifc-viewer";
import { useWorld } from "@/composables/useWorld";
import { useCamera } from "@/composables/useCamera";
import { useGrid } from "@/composables/useGrid";
import { useFragments } from "@/composables/useFragments";
import { useIfcLoader } from "@/composables/useIfcLoader";
import { useBackground } from "@/composables/useBackground";
import { useAreaMeasurement } from "@/composables/useAreaMeasurement";
import AreaMeasurePanel from "@/components/AreaMeasurePanel.vue";

const props = defineProps<{ config: ModelViewerConfig }>();

const { config } = toRefs(props);

const containerRef = ref<HTMLDivElement | null>(null);
const components = shallowRef<OBC.Components | null>(null);
const world = shallowRef<OBC.World | null>(null);
let cam: ReturnType<typeof useCamera>;

const {
  state,
  updateMeasurementOptions,
  activateMeasurement,
  start,
  finishMeasurement,
  clearMeasurement,
} = useAreaMeasurement({
  components,
  world,
  container: containerRef,
});

let disposeWorld: (() => void) | undefined;
let disposeGrid: (() => void) | undefined;
let disposeStats: (() => void) | undefined;
let disposeFragments: (() => void) | undefined;
let ifc: ReturnType<typeof useIfcLoader> | undefined;

const measureEnabled = computed(() => !!config.value.measure?.enabled);
const measureReady = computed(() => !!world.value && !!components.value);

async function loadModel(source: ModelSource) {
  if (!ifc) throw new Error("Viewer is not ready yet");
  await ifc.load(source, {
    name:
      typeof source === "string" ? source.split("/").pop() || "model" : "model",
    liftBy: config.value.liftBy ?? 0,
    autoFit: config.value.autoFit ?? false,
  });
  await ifc.groundToGrid(
    config.value.gridOffset ?? 0,
    config.value.liftBy ?? 0
  );
  // центрируем по XZ в (0, 0); если нужно по левому краю — меняем режим на "min"
  await ifc.alignHorizontally(0, 0, "center");
  // камера смотрит ровно на (0,0,0), дистанция по размеру модели
  await cam.lookAtOrigin();
}

function clear() {
  ifc?.clear();
}

defineExpose({ loadModel, clear });

// Жизненный цикл: init/destroy (no async setup => no Suspense warnings)
onMounted(async () => {
  if (!containerRef.value) return;

  // Создаём базовый мир (сцена, рендерер, камера)
  const created = useWorld(containerRef.value);
  components.value = created.components;
  world.value = created.world;
  disposeWorld = created.dispose;

  // Инициализируем камеру (если есть lookAt)
  cam = useCamera(components.value!, world.value!);
  if (config.value.lookAt) {
    const { eye, target } = config.value.lookAt;
    await cam.setLookAt(eye, target);
  }

  // Цвет фона
  useBackground(world.value!, config.value.background ?? "#0e0e11");

  // Сетка (опционально)
  if (config.value.showGrid) {
    disposeGrid = useGrid(
      components.value!,
      world.value!,
      config.value.gridOffset ?? 0
    );
  }

  // Менеджер фрагментов: воркер + хуки к сцене
  const frags = useFragments(components.value!, world.value!);
  disposeFragments = frags.dispose;

  // IFC Loader (путь/версия web-ifc wasm)
  ifc = useIfcLoader(components.value!, frags, config.value.wasm);
  await ifc.setup();

  // Загрузка модели, если она указана в пропсах
  if (config.value.model) {
    try {
      await loadModel(config.value.model);
    } catch (err) {
      console.error("Failed to autoload model:", err);
    }
  }
});

onBeforeUnmount(() => {
  try {
    ifc?.clear();
  } catch {}
  try {
    disposeFragments?.();
  } catch {}
  try {
    disposeStats?.();
  } catch {}
  try {
    disposeGrid?.();
  } catch {}
  try {
    disposeWorld?.();
  } catch {}

  activateMeasurement(false);
});

watch(
  () => config.value.background,
  (bg) => {
    if (bg && world.value) useBackground(world.value, bg);
  }
);

watch(
  () => [config.value.gridOffset, config.value.liftBy] as const,
  ([gridOffset, liftBy]) => ifc?.groundToGrid(gridOffset ?? 0, liftBy ?? 0)
);

watch(
  [measureEnabled, measureReady],
  async ([enabled, ready]) => {
    await nextTick();

    if (enabled && ready) {
      updateMeasurementOptions({
        color: config.value.measure?.color,
        units: config.value.measure?.units,
        rounding: config.value.measure?.rounding,
        visible: config.value.measure?.visible ?? true,
      });
      activateMeasurement(true);
    } else {
      activateMeasurement(false);
    }
  },
  { immediate: true, flush: "post" }
);
</script>

<template>
  <div ref="containerRef" class="viewer">
    <!-- v-if="measureEnabled" -->
    <!-- @toggle:enabled="(v) => activateMeasurement(v)" -->
    <!-- @toggle:enabled="(v) => emit('update:measureEnabled', v)" -->
    <AreaMeasurePanel
      :state="state"
      @toggle:enabled="(v) => activateMeasurement(v)"
      @toggle:visible="(v) => updateMeasurementOptions({ visible: v })"
      @change:color="(v) => updateMeasurementOptions({ color: v })"
      @change:mode="(v) => updateMeasurementOptions({ mode: v })"
      @change:units="(v) => updateMeasurementOptions({ units: v })"
      @change:rounding="(v) => updateMeasurementOptions({ rounding: v })"
      @action:start="start"
      @action:finishMeasurement="finishMeasurement"
      @action:clearMeasurement="clearMeasurement"
    />
    <slot />
  </div>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
}
</style>
