import { reactive, shallowRef, onBeforeUnmount, type Ref } from "vue";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import type { Components, World } from "@thatopen/components";

export interface LengthMeasurementOptions {
  color?: string | number;
  enabled?: boolean;
  visible?: boolean;
  mode?: string;
  units?: string;
  rounding?: number;
}

interface LengthMeasurementDeps {
  components: Ref<Components | null>;
  world: Ref<World | null>;
  container: Ref<HTMLElement | null>;
}

export function useLengthMeasurement(deps: LengthMeasurementDeps) {
  const componentsRef = deps.components;
  const worldRef = deps.world;
  const containerRef = deps.container;

  const measurer = shallowRef<InstanceType<
    typeof OBF.LengthMeasurement
  > | null>(null);
  let removeListeners: (() => void) | null = null;

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

  // === ensure(): создать measurer и заполнить справочники ===
  function ensure() {
    if (!componentsRef.value || !worldRef.value) {
      throw new Error(
        "LengthMeasurement not ready: components/world are undefined"
      );
    }
    if (!measurer.value) {
      const m = componentsRef.value.get(OBF.LengthMeasurement);
      m.world = worldRef.value;

      // Автокадр по добавлению линии: центр + радиус по длине
      m.list.onItemAdded.add((line) => {
        try {
          const center = new THREE.Vector3();
          line.getCenter(center);
          const radius = Math.max(1e-3, line.distance() / 3);
          const sphere = new THREE.Sphere(center, radius);
          worldRef.value?.camera.controls?.fitToSphere(sphere, true);
        } catch {}
      });

      // Заполнить UI-списки
      state.modes = [...m.modes];
      state.mode = m.mode;
      state.unitsList = [...m.unitsList];
      state.units = m.units;
      state.rounding = m.rounding ?? 2;

      measurer.value = m;
    }
    return measurer.value!;
  }

  // === Первичная установка опций + синхронизация state ===
  function setupMeasurement(opts: LengthMeasurementOptions = {}) {
    const m = ensure();
    updateLengthMeasurementOptions(opts);
    state.enabled = m.enabled;
    state.visible = m.visible;
    state.color = `#${m.linesMaterial.color.getHexString()}`;
    state.mode = m.mode;
    state.units = m.units;
    state.rounding = m.rounding ?? 2;
  }

  // === Обновление опций инструмента ===
  function updateLengthMeasurementOptions(opts: LengthMeasurementOptions = {}) {
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

  // === API как у Area ===
  const start = () => ensure().create();
  const finishMeasurement = () => ensure().endCreation?.();
  const clearMeasurement = () => ensure().list.clear();

  function onKeydown(e: KeyboardEvent) {
    if (e.code === "Enter" || e.code === "NumpadEnter") finishMeasurement();
    if (e.code === "Delete" || e.code === "Backspace") clearMeasurement();
  }

  // === Включение/выключение инструмента (подписки тут!) ===
  function activateLengthMeasurement(on: boolean) {
    // OFF
    if (!on) {
      removeListeners?.();
      removeListeners = null;
      try {
        const m = measurer.value;
        if (m) {
          m.endCreation?.();
          m.enabled = false;
          // оставляем видимость такой, какой задана в state
          m.visible = state.visible;
        }
      } catch {}
      state.enabled = false;
      return;
    }

    // ON
    setupMeasurement({ enabled: true, visible: true });

    const dblTarget: EventTarget = (containerRef.value ??
      window) as EventTarget;
    const onDblClick: EventListener = () => start();
    const onKeyDown: EventListener = (e) => onKeydown(e as KeyboardEvent);

    dblTarget.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKeyDown);

    removeListeners = () => {
      dblTarget.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", onKeyDown);
    };

    state.enabled = true;
  }

  onBeforeUnmount(() => {
    removeListeners?.();
    removeListeners = null;
    try {
      const m = measurer.value;
      if (m) {
        m.endCreation?.();
        m.enabled = false;
      }
    } catch {}
  });

  return {
    measurer,
    state,
    setupMeasurement,
    updateLengthMeasurementOptions,
    activateLengthMeasurement,
    start,
    finishMeasurement,
    clearMeasurement,
  };
}
