import { reactive, shallowRef, type Ref } from "vue";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

export interface AreaMeasurementOptions {
  color?: string | number;
  enabled?: boolean;
  visible?: boolean;
  mode?: string;
  units?: string;
  rounding?: number;
}

export function useAreaMeasurement(
  componentsRef: Ref<OBC.Components | undefined>,
  worldRef: Ref<OBC.World | undefined>
) {
  const measurer = shallowRef<InstanceType<typeof OBF.AreaMeasurement> | null>(
    null
  );

  const state = reactive({
    enabled: false,
    visible: true,
    color: "#494cb6",
    modes: [] as string[],
    mode: "" as string,
    unitsList: [] as string[],
    units: "" as string,
    rounding: 2 as number,
  });

  // Гарантируем, что deps готовы и measurer создан
  function ensure() {
    if (!componentsRef.value || !worldRef.value) {
      throw new Error(
        "AreaMeasurement not ready: components/world are undefined"
      );
    }
    if (!measurer.value) {
      const m = componentsRef.value.get(OBF.AreaMeasurement);
      m.world = worldRef.value;
      // автокадр на добавление измерения
      m.list.onItemAdded.add((area) => {
        if (!area.boundingBox) return;
        const sphere = new THREE.Sphere();
        area.boundingBox.getBoundingSphere(sphere);
        if (worldRef.value && worldRef.value.camera.controls) {
          worldRef.value.camera.controls.fitToSphere(sphere, true);
        }
      });
      // заполнить доступные списки
      state.modes = [...m.modes];
      state.mode = m.mode;
      state.unitsList = [...m.unitsList];
      state.units = m.units;
      state.rounding = m.rounding ?? 2;

      measurer.value = m;
    }
    return measurer.value!;
  }

  function setupMeasurement(opts: AreaMeasurementOptions = {}) {
    const m = ensure();
    updateMeasurementOptions(opts);
    // синхронизируем state с фактическими значениями
    state.enabled = m.enabled;
    state.visible = m.visible;
    state.color = `#${m.linesMaterial.color.getHexString()}`;
    state.mode = m.mode;
    state.units = m.units;
    state.rounding = m.rounding ?? 2;
  }

  function updateMeasurementOptions(opts: AreaMeasurementOptions = {}) {
    const m = ensure();
    if (opts.enabled !== undefined) {
      m.enabled = opts.enabled;
      state.enabled = opts.enabled;
    }
    if (opts.visible !== undefined) {
      m.visible = opts.visible;
      state.visible = opts.visible;
    }
    if (opts.color !== undefined) {
      m.color = new THREE.Color(opts.color as any);
      state.color = String(opts.color);
    }
    if (opts.mode) {
      m.mode = opts.mode as any;
      state.mode = opts.mode;
    }
    if (opts.units) {
      m.units = opts.units as any;
      state.units = opts.units;
    }
    if (opts.rounding !== undefined) {
      m.rounding = opts.rounding;
      state.rounding = opts.rounding;
    }
  }

  const activateMeasurement = (v = true) =>
    updateMeasurementOptions({ enabled: v });
  const start = () => ensure().create();
  const finishMeasurement = () => ensure().endCreation();
  const clearMeasurement = () => ensure().list.clear();
  /* 
    получить значения измерений
    const getValues = () => Array.from(ensure().list, (a) => a.value); 
  */

  return {
    measurer,
    state,
    setupMeasurement,
    updateMeasurementOptions,
    activateMeasurement,
    start,
    finishMeasurement,
    clearMeasurement,
  };
}
