import * as THREE from "three";
import * as OBC from "@thatopen/components";

export function useCamera(components: OBC.Components, world: OBC.World) {
  async function setLookAt(
    eye: [number, number, number],
    target: [number, number, number]
  ) {
    if (!world.camera.controls) return;

    await world.camera.controls.setLookAt(
      eye[0],
      eye[1],
      eye[2],
      target[0],
      target[1],
      target[2]
    );
  }

  async function fitModel(object: THREE.Object3D, padding = 1.2) {
    const box = new THREE.Box3().setFromObject(object);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    if (!isFinite(sphere.radius) || sphere.radius === 0) return;
    if (!world.camera.controls) return;

    await world.camera.controls.fitToSphere(sphere, true, { padding });
  }

  return { setLookAt, fitModel } as const;
}
