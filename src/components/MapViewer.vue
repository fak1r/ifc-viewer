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
import { Vector2, Color, Group, Box3, Vector3 } from "three";

interface Props {
  config: MapViewerConfig;
}

const props = defineProps<Props>();

/** Эмиссии для HUD/тостов снаружи */
interface Emit {
  (e: "status", v: "idle" | "loading" | "ready" | "error"): void;
  (e: "progress", v: number): void; // 0..1
}

const emit = defineEmits<Emit>();

/** Значения по умолчанию (кроме model) */
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
    model: (cfg.model ?? undefined) as any,
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
let stats: Stats | null = null;

let fragments: OBC.FragmentsManager | null = null;
let ifcLoader: OBC.IfcLoader | null = null;

let modelsRoot: Group | null = null;
let gridRef: THREE.Object3D | null = null;

let workerUrl: string | null = null;
// При желании можно пиновать на конкретный тег Engine Fragments:
const WORKER_URL =
  "https://thatopen.github.io/engine_fragment/resources/worker.mjs";

/** Ресайз + адаптация DPR */
function handleResize() {
  if (!world || !containerRef.value) return;
  const { clientWidth: w, clientHeight: h } = containerRef.value;
  world.renderer?.resize(new Vector2(w, h));
  world.renderer?.setPixelRatio?.(Math.min(window.devicePixelRatio || 1, 2));
}

/** CDN-путь для web-ifc.wasm */
function cdnPath(version: string) {
  return `https://unpkg.com/web-ifc@${version}/`;
}

async function ensureWasm(wasm: IfcWasmConfig) {
  if (!ifcLoader) return;
  const version = wasm.version || defaults.wasm.version;
  if (!version) throw new Error("WASM version is required");
  let path = wasm.path ?? cdnPath(version);
  if (!path.endsWith("/")) path += "/";
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: { path, absolute: wasm.absolute ?? true },
  });
  console.info(`[web-ifc] using wasm path: ${path}`);
}

/** Инициализация движка/сцены/камеры/рендера/грида/фрагментов */
async function initEngine(cfg: Required<MapViewerConfig>) {
  if (!containerRef.value) throw new Error("MapViewer: container not ready");

  components = new OBC.Components();

  const worlds = components.get(OBC.Worlds);
  world = worlds.create();

  const scene = new OBC.SimpleScene(components);
  scene.setup();
  world.scene = scene;

  // Корневой контейнер для всех BIM-моделей
  modelsRoot = new Group();
  modelsRoot.name = "ModelsRoot";
  world.scene.three.add(modelsRoot);

  world.renderer = new OBC.SimpleRenderer(components, containerRef.value);
  world.renderer?.setPixelRatio?.(Math.min(window.devicePixelRatio || 1, 2));

  const camera = new OBC.OrthoPerspectiveCamera(components);
  world.camera = camera;

  components.init();

  // Стартовый ракурс
  const [ex, ey, ez] = cfg.lookAt.eye;
  const [tx, ty, tz] = cfg.lookAt.target;
  await world.camera.controls?.setLookAt(ex, ey, ez, tx, ty, tz);

  // Сетка
  if (cfg.showGrid) {
    const grid = components.get(OBC.Grids).create(world);
    if (cfg.gridOffset) grid.three.position.y = cfg.gridOffset;
    gridRef = grid.three;
  }

  // FragmentsManager + воркер
  fragments = components.get(OBC.FragmentsManager);
  // Загружаем воркер как Blob, чтобы получить blob: URL (нужно для cross-origin)
  const fetched = await fetch(WORKER_URL);
  const blob = await fetched.blob();
  const workerFile = new File([blob], "worker.mjs", {
    type: "text/javascript",
  });
  workerUrl = URL.createObjectURL(workerFile);
  fragments.init(workerUrl);

  // Реакция на добавление модели (FragmentsGroup)
  fragments.list.onItemSet.add(({ value: model }) => {
    model.useCamera(camera.three);
    if (cfg.liftBy) model.object.position.y += cfg.liftBy;
    modelsRoot!.add(model.object);
    fragments!.core.update(true);
  });

  // IfcLoader + WASM
  ifcLoader = components.get(OBC.IfcLoader);
  await ensureWasm(cfg.wasm);

  // Статистика FPS
  if (cfg.showStats) {
    stats = new Stats();
    stats.showPanel(2);
    document.body.append(stats.dom);
    stats.dom.style.left = "0px";
    world.renderer.onBeforeUpdate.add(() => stats && stats.begin());
    world.renderer.onAfterUpdate.add(() => stats && stats.end());
  }

  // Фон сцены
  world.scene.three.background = new Color(cfg.background);

  // Ресайз + подписка
  handleResize();
  window.addEventListener("resize", handleResize);

  // Авто-загрузка модели из конфига
  if (cfg.model) {
    try {
      await loadModel(cfg.model, cfg);
    } catch (e) {
      console.error(e);
    }
  }
}

/** Очистка только моделей, без грида/окружения */
async function clear() {
  if (!modelsRoot) return;
  for (let i = modelsRoot.children.length - 1; i >= 0; i--) {
    const child = modelsRoot.children[i];
    modelsRoot.remove(child);
    // аккуратный dispose геометрий/материалов
    child.traverse?.((o: any) => {
      o.geometry?.dispose?.();
      if (o.material?.dispose) o.material.dispose();
      if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
      if (o.texture?.dispose) o.texture.dispose?.();
    });
  }
  fragments?.core.update(true);
}

/** Загрузка модели из URL | File | Uint8Array */
async function loadModel(src: ModelSource, cfg?: Required<MapViewerConfig>) {
  const active = cfg ?? mergedConfig(props.config);
  if (!ifcLoader) throw new Error("IfcLoader not initialized");

  try {
    emit("status", "loading");

    let buffer: Uint8Array;
    if (typeof src === "string") {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`Failed to fetch model: ${res.status}`);
      buffer = new Uint8Array(await res.arrayBuffer());
    } else if (src instanceof File) {
      buffer = new Uint8Array(await src.arrayBuffer());
    } else {
      buffer = src;
    }

    const key = "model"; // один и тот же ключ — перезатираем предыдущее состояние
    await ifcLoader.load(buffer, false, key, {
      processData: {
        progressCallback: (p: number) => {
          emit("progress", p);
          console.log("IFC → Fragments progress:", Math.round(p * 100), "%");
        },
      },
    });

    // ЯВНО крепим группу в сцену (на случай, если onItemSet не сработал)
    await attachGroupByKey(key, active);

    if (active.autoFit) {
      await fitToModel();
    }

    emit("status", "ready");
  } catch (err) {
    emit("status", "error");
    throw err;
  }
}

/** Кадрировать камеру по границам моделей */
async function fitToModel(paddingFactor = 1.2) {
  if (!world?.camera?.controls || !modelsRoot) return;
  const box = new Box3().setFromObject(modelsRoot);
  if (!isFinite(box.min.x) || !isFinite(box.max.x)) return; // пусто
  const center = new Vector3();
  box.getCenter(center);

  // Простейшая эвристика позиции камеры, масштабируемая от размера бокса
  const diag = box.getSize(new Vector3()).length();
  const offset = Math.max(diag, 1) * paddingFactor;

  await world.camera.controls.setLookAt(
    center.x + offset,
    center.y + offset,
    center.z + offset,
    center.x,
    center.y,
    center.z
  );
}

/** Установка ракурса */
function setLookAt(val: CameraLookAt) {
  if (!world?.camera?.controls) return;
  const [ex, ey, ez] = val.eye;
  const [tx, ty, tz] = val.target;
  return world.camera.controls.setLookAt(ex, ey, ez, tx, ty, tz);
}

/** Смена фона */
function setBackground(color: string) {
  if (!world) return;
  world.scene.three.background = new Color(color);
}

async function attachGroupByKey(key: string, cfg: Required<MapViewerConfig>) {
  if (!fragments || !modelsRoot || !world?.camera) return;

  // Пытаемся достать группу разными способами (в разных версиях API по-разному)
  const group: any =
    // @ts-ignore
    fragments.list?.get?.(key) ??
    // @ts-ignore
    fragments.groups?.get?.(key);

  if (!group) {
    console.warn(`[Fragments] group "${key}" not found yet`);
    return;
  }

  group.useCamera?.(world.camera.three);

  // Удаляем предыдущий объект с тем же именем
  const prev = modelsRoot.getObjectByName(key);
  if (prev) modelsRoot.remove(prev);

  // Обновляем позицию/имя и добавляем в корень моделей
  group.object.name = key;
  group.object.position.y = cfg.liftBy ?? 0;

  modelsRoot.add(group.object);
  fragments.core.update(true);
}

/** Публичный API компонента */
defineExpose({
  loadModel, // загрузить модель вручную (URL | File | Uint8Array)
  clear, // очистить только модели
  fitToModel, // автокадр по текущим моделям
  setLookAt, // установка ракурса
  setBackground, // фон
});

onMounted(async () => {
  const cfg = mergedConfig(props.config);
  await initEngine(cfg);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);

  // dispose движка/фрагментов
  try {
    fragments?.dispose?.();
    components?.dispose?.();
  } catch (e) {
    // no-op
  }

  if (world) {
    world.renderer?.dispose();
  }
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
