import * as OBC from "@thatopen/components";

export function useWorld(container: HTMLElement) {
  const components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBC.SimpleRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();
  world.scene.three.background = null; // we control via CSS/clearColor

  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.OrthoPerspectiveCamera(components);

  components.init();

  const dispose = () => {
    try {
      components.dispose();
    } catch {}
  };

  return { components, world, dispose } as const;
}
