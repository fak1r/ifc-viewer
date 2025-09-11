import Stats from "stats.js";
import * as OBC from "@thatopen/components";

export function useStats(world: OBC.World) {
  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.left = "0px";
  stats.dom.style.top = "0px";
  stats.dom.style.zIndex = "10";
  document.body.append(stats.dom);
  if (!world.renderer) return;
  world.renderer.onBeforeUpdate.add(() => stats.begin());
  world.renderer.onAfterUpdate.add(() => stats.end());
  return () => {
    try {
      stats.dom.remove();
    } catch {}
  };
}
