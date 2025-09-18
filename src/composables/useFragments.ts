import * as OBC from "@thatopen/components";

export function useFragments(components: OBC.Components, world: OBC.World) {
  const fragments = components.get(OBC.FragmentsManager);

  // Путь до воркера из /public (файл должен лежать: /public/worker.mjs)
  const BASE = import.meta.env.BASE_URL || "/";
  const WORKER_URL = `${location.origin}${BASE}worker.mjs`;

  async function init() {
    await fragments.init(WORKER_URL);

    // Добавляем загруженные модели в сцену и подключаем камеру
    fragments.list.onItemSet.add(({ value: model }: any) => {
      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      fragments.core.update(true);
    });
  }

  const ready = init();

  function dispose() {
    try {
      fragments.dispose();
    } catch {
      /* noop */
    }
  }

  return { fragments, ready, dispose } as const;
}
