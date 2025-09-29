import { type Ref } from "vue";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import type { Components, World } from "@thatopen/components";
import {
  useMeasurementBase,
  type MeasurementOptions,
  type MeasurementDeps,
} from "@/composables/measure/useMeasurementBase";

interface LengthMeasurementDeps extends MeasurementDeps {
  components: Ref<Components | null>;
  world: Ref<World | null>;
}

export function useLengthMeasurement(deps: LengthMeasurementDeps) {
  const base = useMeasurementBase(
    {
      components: deps.components,
      world: deps.world,
    },
    {
      createMeasurer: (c) => c.get(OBF.LengthMeasurement),
      onItemAdded: ({ item, world }) => {
        // у линии нет bbox, подзумимся по центру и длине
        try {
          const center = new THREE.Vector3();
          item.getCenter(center);
          const radius = Math.max(1e-3, item.distance() / 3);
          const sphere = new THREE.Sphere(center, radius);
          world.camera.controls?.fitToSphere(sphere, true);
        } catch {}
      },
    }
  );

  // Специфика Length
  function start() {
    const m: any = base.measurer.value;
    m?.create?.();
  }
  function finishMeasurement() {
    const m: any = base.measurer.value;
    m?.endCreation?.(); // на всякий случай, если будет режим с поэтапным вводом
  }
  function clearMeasurement() {
    base.clear();
  }
  function activateMeasurement(on: boolean) {
    base.setEnabled(on);
  }

  function displayRectangleDimensions() {
    const m: any = base.measurer.value;
    if (!m?.lines) return;
    for (const dim of m.lines) dim.displayRectangularDimensions?.();
  }
  function invertRectangleDimensions() {
    const m: any = base.measurer.value;
    if (!m?.lines) return;
    for (const dim of m.lines) dim.invertRectangularDimensions?.();
  }
  function displayProjectionDimensions() {
    const m: any = base.measurer.value;
    if (!m?.lines) return;
    for (const dim of m.lines) dim.displayProjectionDimensions?.();
  }
  function removeComplementaryDimensions() {
    const m: any = base.measurer.value;
    if (!m?.lines) return;
    for (const dim of m.lines) {
      dim.rectangleDimensions?.clear?.();
      dim.projectionDimensions?.clear?.();
    }
  }
  function deleteSelected() {
    const m: any = base.measurer.value;
    m?.delete?.();
  }

  return {
    measurer: base.measurer,
    state: base.state,
    setupMeasurement: (opts?: MeasurementOptions) => base.setup(opts),
    updateMeasurementOptions: base.updateOptions,
    activateMeasurement,
    start,
    finishMeasurement,
    clearMeasurement,
    // опционально:
    deleteSelected,
    displayRectangleDimensions,
    invertRectangleDimensions,
    displayProjectionDimensions,
    removeComplementaryDimensions,
  };
}
