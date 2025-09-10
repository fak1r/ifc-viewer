<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import * as OBC from "@thatopen/components";
import Stats from "stats.js";

let components: OBC.Components | null = null;
let world: OBC.World | null = null;

onMounted(async () => {
  // 1. Базовые компоненты и мир
  components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);

  world = worlds.create();
  const scene = new OBC.SimpleScene(components);
  scene.setup();
  world.scene = scene;

  const container = document.getElementById("viewer")!;
  world.renderer = new OBC.SimpleRenderer(components, container);

  // 2. Камера → сразу прикрепляем к world
  const camera = new OBC.OrthoPerspectiveCamera(components);
  world.camera = camera;

  // 3. Инициализация компонентов
  components.init();

  // 4. Теперь можно использовать controls камеры
  await world.camera.controls?.setLookAt(78, 20, -2.2, 26, -4, 25);

  // 5. Сетка
  components.get(OBC.Grids).create(world);

  // 6. FragmentsManager
  const fragments = components.get(OBC.FragmentsManager);
  const workerGithubUrl =
    "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
  const fetched = await fetch(workerGithubUrl);
  const blob = await fetched.blob();
  const workerFile = new File([blob], "worker.mjs", {
    type: "text/javascript",
  });
  const workerUrl = URL.createObjectURL(workerFile);
  fragments.init(workerUrl);

  fragments.list.onItemSet.add(({ value: model }) => {
    model.useCamera(camera.three);
    world!.scene.three.add(model.object);
    fragments.core.update(true);
  });

  // 7. IfcLoader
  const ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
  });

  // 8. Загрузка IFC
  const loadIfc = async (url: string) => {
    const res = await fetch(url);
    const buf = new Uint8Array(await res.arrayBuffer());
    await ifcLoader.load(buf, false, "example", {
      processData: {
        progressCallback: (p) => console.log("IFC → Fragments progress:", p),
      },
    });
  };

  await loadIfc(
    "https://thatopen.github.io/engine_components/resources/ifc/school_str.ifc"
  );

  // 9. FPS-панель
  const stats = new Stats();
  stats.showPanel(2);
  document.body.append(stats.dom);
  stats.dom.style.left = "0px";
  world.renderer.onBeforeUpdate.add(() => stats.begin());
  world.renderer.onAfterUpdate.add(() => stats.end());
});

onBeforeUnmount(() => {
  // простая очистка
  if (world) {
    world.renderer?.dispose();
  }
});
</script>

<template>
  <div id="viewer" class="viewer"></div>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
}
</style>
