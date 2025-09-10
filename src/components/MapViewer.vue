<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as OBC from "@thatopen/components";
import Stats from "stats.js";
import type {
  MapViewerConfig,
  ModelSource,
  IfcWasmConfig,
  CameraLookAt,
} from "@/types/ifc-viewer";
import { Vector2, Color, Scene } from "three";

/** Проп: один объект конфигурации */
const props = defineProps<{
  /** Конфиг MapViewer (см. интерфейс MapViewerConfig) */
  config: MapViewerConfig;
}>();

/** Значения по умолчанию */
const defaults: Required<Omit<MapViewerConfig, "model">> = {
  wasm: { version: "0.0.71", absolute: true },
  showGrid: true,
  gridOffset: 0,
  liftBy: 0,
  lookAt: { eye: [78, 20, -2.2], target: [26, -4, 25] },
  autoFit: false,
  showStats: false,
  background: "#0e0e11",
};

function mergedConfig(cfg: MapViewerConfig): Required<MapViewerConfig> {
  return {
    model: cfg.model as any,
    wasm: { ...defaults.wasm, ...(cfg.wasm ?? {}) },
    showGrid: cfg.showGrid ?? defaults.showGrid,
    gridOffset: cfg.gridOffset ?? defaults.gridOffset,
    liftBy: cfg.liftBy ?? defaults.liftBy,
    lookAt: cfg.lookAt ?? defaults.lookAt,
    autoFit: cfg.autoFit ?? defaults.autoFit,
    showStats: cfg.showStats ?? defaults.showStats,
    background: cfg.background ?? defaults.background,
  };
}

const containerRef = ref<HTMLDivElement | null>(null);

let components: OBC.Components | null = null;
let world: OBC.World | null = null;
let workerUrl: string | null = null;
let stats: Stats | null = null;

let fragments: OBC.FragmentsManager | null = null;
let ifcLoader: OBC.IfcLoader | null = null;

function handleResize() {
  if (!world || !containerRef.value) return;
  const { clientWidth: w, clientHeight: h } = containerRef.value;
  world.renderer?.resize(new Vector2(w, h));
}

function cdnPath(version: string) {
  return `https://unpkg.com/web-ifc@${version}/`;
}

async function ensureWasm(wasm: IfcWasmConfig) {
  if (!ifcLoader) return;
  const version = wasm.version || defaults.wasm.version;
  if (!version) throw new Error("WASM version is required");
  const path = wasm.path ?? cdnPath(version);
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: { path, absolute: wasm.absolute ?? true },
  });
}

async function initEngine(cfg: Required<MapViewerConfig>) {
  if (!containerRef.value) throw new Error("container not ready");

  components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);

  world = worlds.create();

  const scene = new OBC.SimpleScene(components);
  scene.setup();
  world.scene = scene;

  world.renderer = new OBC.SimpleRenderer(components, containerRef.value);

  const camera = new OBC.OrthoPerspectiveCamera(components);
  world.camera = camera;

  components.init();

  const [ex, ey, ez] = cfg.lookAt.eye;
  const [tx, ty, tz] = cfg.lookAt.target;
  await world.camera.controls?.setLookAt(ex, ey, ez, tx, ty, tz);

  if (cfg.showGrid) {
    const grid = components.get(OBC.Grids).create(world);
    if (cfg.gridOffset) grid.three.position.y = cfg.gridOffset;
  }

  fragments = components.get(OBC.FragmentsManager);
  const fetched = await fetch(
    "https://thatopen.github.io/engine_fragment/resources/worker.mjs"
  );
  const blob = await fetched.blob();
  const workerFile = new File([blob], "worker.mjs", {
    type: "text/javascript",
  });
  workerUrl = URL.createObjectURL(workerFile);
  fragments.init(workerUrl);

  fragments.list.onItemSet.add(({ value: model }) => {
    model.useCamera(camera.three);
    if (cfg.liftBy) model.object.position.y += cfg.liftBy;
    world!.scene.three.add(model.object);
    fragments!.core.update(true);
  });

  ifcLoader = components.get(OBC.IfcLoader);
  await ensureWasm(cfg.wasm);

  if (cfg.showStats) {
    stats = new Stats();
    stats.showPanel(2);
    document.body.append(stats.dom);
    stats.dom.style.left = "0px";
    world.renderer.onBeforeUpdate.add(() => stats && stats.begin());
    world.renderer.onAfterUpdate.add(() => stats && stats.end());
  }

  // фон сцены
  const { Color } = await import("three");
  world.scene.three.background = new Color(cfg.background);

  handleResize();
  window.addEventListener("resize", handleResize);

  // авто-загрузка модели, если передана в конфиге
  if (cfg.model) await loadModel(cfg.model, cfg);
}

async function clear() {
  if (!world) return;
  const toRemove: any[] = [];
  world.scene.three.traverse((obj) => {
    if ((obj as any).isMesh || (obj as any).isGroup) toRemove.push(obj);
  });
  toRemove.forEach((obj) => {
    if (obj !== world!.scene.three) world!.scene.three.remove(obj);
  });
  fragments?.core.update(true);
}

async function loadModel(src: ModelSource, cfg?: Required<MapViewerConfig>) {
  const active = cfg ?? mergedConfig(props.config);
  if (!ifcLoader) throw new Error("IfcLoader not initialized");

  let buffer: Uint8Array;
  if (typeof src === "string") {
    const res = await fetch(src);
    buffer = new Uint8Array(await res.arrayBuffer());
  } else if (src instanceof File) {
    buffer = new Uint8Array(await src.arrayBuffer());
  } else {
    buffer = src;
  }

  await ifcLoader.load(buffer, false, "model", {
    processData: {
      progressCallback: (p) => console.log("IFC → Fragments progress:", p),
    },
  });

  if (active.autoFit && world?.camera?.controls) {
    const { Box3, Vector3 } = await import("three");
    const box = new Box3().setFromObject(world.scene.three);
    const center = new Vector3();
    box.getCenter(center);
    await world.camera.controls.setLookAt(
      box.max.x * 1.2,
      box.max.y * 1.2,
      box.max.z * 1.2,
      center.x,
      center.y,
      center.z
    );
  }
}

function setLookAt(val: CameraLookAt) {
  if (!world?.camera?.controls) return;
  const [ex, ey, ez] = val.eye;
  const [tx, ty, tz] = val.target;
  return world.camera.controls.setLookAt(ex, ey, ez, tx, ty, tz);
}

function setBackground(color: string) {
  if (!world) return;
  import("three").then(({ Color }) => {
    world!.scene.three.background = new Color(color);
  });
}

/** Публичный API компонента */
defineExpose({
  /** Загрузить модель после монтирования компонента */
  loadModel,
  /** Очистить сцену от моделей */
  clear,
  /** Установить ракурс камеры */
  setLookAt,
  /** Сменить фон сцены */
  setBackground,
});

onMounted(async () => {
  const cfg = mergedConfig(props.config);
  await initEngine(cfg);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  if (world) world.renderer?.dispose();
  if (workerUrl) URL.revokeObjectURL(workerUrl);
  if (stats) {
    stats.dom.remove();
    stats = null;
  }
});
</script>

<template>
  <div ref="containerRef" class="viewer">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.viewer {
  position: fixed;
  inset: 0;
}
</style>
