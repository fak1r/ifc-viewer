import * as OBC from "@thatopen/components";

export function useFragments(components: OBC.Components, world: OBC.World) {
  const fragments = components.get(OBC.FragmentsManager);

  const workerGithubUrl =
    "https://thatopen.github.io/engine_fragment/resources/worker.mjs";

  async function init() {
    const res = await fetch(workerGithubUrl);
    const blob = await res.blob();
    const file = new File([blob], "worker.mjs", { type: "text/javascript" });
    const url = URL.createObjectURL(file);
    fragments.init(url);

    if (!world.camera.controls) return;

    world.camera.controls.addEventListener("rest", () =>
      fragments.core.update(true)
    );

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
    } catch {}
  }

  return { fragments, ready, dispose } as const;
}
