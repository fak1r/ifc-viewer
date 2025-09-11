import * as THREE from "three";
import * as OBC from "@thatopen/components";

export function useBackground(world: OBC.World, color: string) {
  try {
    const c = new THREE.Color(color);
    world.scene.three.background = c;
  } catch {
    world.scene.three.background = null;
  }
}
