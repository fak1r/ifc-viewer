<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as OBC from "@thatopen/components";
import Stats from "stats.js";

interface Props {
  modelUrl?: string;
  webIfcVersion?: string;
}

const props = defineProps<Props>();

const containerRef = ref<HTMLDivElement | null>(null);

let components: OBC.Components | null = null;
let world: OBC.World | null = null;
let workerUrl: string | null = null;

onMounted(async () => {
  if (!containerRef.value) return;

  // 1) базовые компоненты
  components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);

  world = worlds.create();
  const scene = new OBC.SimpleScene(components);
  scene.setup();
  world.scene = scene;

  world.renderer = new OBC.SimpleRenderer(components, containerRef.value);

  // камера → сначала прикрепляем к world
  const camera = new OBC.OrthoPerspectiveCamera(components);
  world.camera = camera;

  // init
  components.init();

  // базовый ракурс
  await world.camera.controls?.setLookAt(78, 20, -2.2, 26, -4, 25);

  // сетка
  components.get(OBC.Grids).create(world);

  // 2) fragments + воркер
  const fragments = components.get(OBC.FragmentsManager);
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

    model.object.position.y += 10.2;

    world!.scene.three.add(model.object);
    fragments.core.update(true);
  });

  // 3) IfcLoader + wasm
  const ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: `https://unpkg.com/web-ifc@${props.webIfcVersion}/`,
      absolute: true,
    },
  });

  // 4) загрузка модели
  try {
    if (!props.modelUrl) return;
    const res = await fetch(props.modelUrl);
    if (!res.ok) {
      throw new Error(`Failed to load IFC model: ${res.status}`);
    }

    const buf = new Uint8Array(await res.arrayBuffer());
    await ifcLoader.load(buf, false, "example", {
      processData: {
        progressCallback: (p) => console.log("IFC → Fragments progress:", p),
      },
    });
  } catch (error) {
    console.error(error);
    return;
  }

  // 5) FPS-панель
  const stats = new Stats();
  stats.showPanel(2);
  document.body.append(stats.dom);
  stats.dom.style.left = "0px";
  world.renderer.onBeforeUpdate.add(() => stats.begin());
  world.renderer.onAfterUpdate.add(() => stats.end());
});

onBeforeUnmount(() => {
  if (!world) return;
  world.renderer?.dispose();
  if (workerUrl) URL.revokeObjectURL(workerUrl);
});
</script>

<template>
  <div class="map-viewer">
    <div ref="containerRef" class="viewer"></div>
  </div>
</template>

<style scoped lang="scss">
.viewer {
  position: fixed;
  inset: 0;
}
</style>
