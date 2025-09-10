<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";

let components: OBC.Components | null = null;
let world: OBC.World | null = null;

onMounted(async () => {
  // 1) Базовые компоненты и мир
  components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);

  world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBC.SimpleRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();

  const container = document.getElementById("viewer")!;
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.OrthoPerspectiveCamera(components);
  await world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

  components.init();

  // Сетка (навигация в сцене)
  components.get(OBC.Grids).create(world);

  // 2) Настраиваем FragmentsManager (нужен воркер)
  const fragments = components.get(OBC.FragmentsManager);
  // Берём воркер из оф. примера
  const workerGithubUrl =
    "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
  const fetched = await fetch(workerGithubUrl);
  const blob = await fetched.blob();
  const workerFile = new File([blob], "worker.mjs", {
    type: "text/javascript",
  });
  const workerUrl = URL.createObjectURL(workerFile);
  fragments.init(workerUrl);

  // Когда модель сконвертируется — добавим в сцену
  fragments.list.onItemSet.add(({ value: model }) => {
    model.useCamera(world!.camera.three);
    world!.scene.three.add(model.object);
    fragments.core.update(true);
  });

  // 3) Настраиваем IfcLoader + путь к WASM
  const ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
  });

  // 4) Загрузка IFC — можно поменять на свой URL или input
  const loadIfc = async (url: string) => {
    const res = await fetch(url);
    const buf = new Uint8Array(await res.arrayBuffer());
    await ifcLoader.load(buf, false, "example", {
      processData: {
        progressCallback: (p) => console.log("IFC → Fragments progress:", p),
      },
    });
  };

  // демо-файл из доки:
  await loadIfc(
    "https://thatopen.github.io/engine_components/resources/ifc/school_str.ifc"
  );

  // 5) (Опц.) Панель UI + FPS
  BUI.Manager.init();
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
