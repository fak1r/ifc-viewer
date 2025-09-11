import * as THREE from "three";
import * as OBC from "@thatopen/components";

export function useCamera(components: OBC.Components, world: OBC.World) {
  async function setLookAt(
    eye: [number, number, number],
    target: [number, number, number]
  ) {
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
    await world.camera.controls.fitToSphere(sphere, true, { padding });
  }

  // ⬇️ НОВОЕ: смотрим на (0,0,0), дистанцию берём из bbox загруженных фрагментов
  async function lookAtOrigin(fallbackDist = 10) {
    const frags = components.get(OBC.FragmentsManager);
    const box = new THREE.Box3();
    for (const m of frags.list.values()) box.expandByObject(m.object);

    // Радиус сцены для подбора комфортной дистанции камеры
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r =
      isFinite(sphere.radius) && sphere.radius > 0
        ? sphere.radius
        : fallbackDist;

    // Чуть диагональный ракурс, цель — (0,0,0)
    const k = 1.6;
    await world.camera.controls.setLookAt(k * r, k * r, k * r, 0, 0, 0);
  }

  return { setLookAt, fitModel, lookAtOrigin } as const;
}
