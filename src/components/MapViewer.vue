<template>
  <div ref="containerRef" class="viewer">
    <slot />
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  toRefs,
  shallowRef,
} from "vue";
import * as OBC from "@thatopen/components";
import type { MapViewerConfig, ModelSource } from "@/types/ifc-viewer";
import { useWorld } from "@/composables/useWorld";
import { useCamera } from "@/composables/useCamera";
import { useGrid } from "@/composables/useGrid";
import { useFragments } from "@/composables/useFragments";
import { useIfcLoader } from "@/composables/useIfcLoader";
import { useStats } from "@/composables/useStats";
import { useBackground } from "@/composables/useBackground";

const props = defineProps<{ config: MapViewerConfig }>();
const { config } = toRefs(props);

const containerRef = ref<HTMLDivElement | null>(null);

const components = shallowRef<OBC.Components>();
const world = shallowRef<OBC.World>();

let disposeWorld: (() => void) | undefined;
let disposeGrid: (() => void) | undefined;
let disposeStats: (() => void) | undefined;
let disposeFragments: (() => void) | undefined;
let ifc: ReturnType<typeof useIfcLoader> | undefined;

async function loadModel(source: ModelSource) {
  if (!ifc) throw new Error("Viewer is not ready yet");
  await ifc.load(source, {
    name:
      typeof source === "string" ? source.split("/").pop() || "model" : "model",
    liftBy: config.value.liftBy ?? 0,
    autoFit: config.value.autoFit ?? false,
  });
}

function clear() {
  ifc?.clear();
}

defineExpose({ loadModel, clear });

// Life-cycle: init/destroy (no async setup => no Suspense warnings)
onMounted(async () => {
  if (!containerRef.value) return;

  // 1) Create basic world (scene, renderer, camera)
  ({
    components: components.value!,
    world: world.value!,
    dispose: disposeWorld,
  } = useWorld(containerRef.value));

  // 2) Camera initial lookAt (if provided)
  const cam = useCamera(components.value!, world.value!);
  if (config.value.lookAt) {
    const { eye, target } = config.value.lookAt;
    await cam.setLookAt(eye, target);
  }

  // 3) Background color
  useBackground(world.value!, config.value.background ?? "#0e0e11");

  // 4) Grid (optional)
  if (config.value.showGrid) {
    disposeGrid = useGrid(
      components.value!,
      world.value!,
      config.value.gridOffset ?? 0
    );
  }

  // 5) Stats (optional)
  if (config.value.showStats) {
    disposeStats = useStats(world.value!);
  }

  // 6) Fragments manager: worker + hooks to scene
  const frags = useFragments(components.value!, world.value!);
  disposeFragments = frags.dispose;

  // 7) IFC Loader (web-ifc wasm path/version)
  ifc = useIfcLoader(components.value!, frags, config.value.wasm);
  await ifc.setup();

  // 8) Autoload model if provided in props
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
});

// React to prop changes (basic ones)
watch(
  () => config.value.background,
  (bg) => {
    if (bg && world.value) useBackground(world.value, bg);
  }
);
</script>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
}
</style>
