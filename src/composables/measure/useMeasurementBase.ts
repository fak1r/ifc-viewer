import { reactive, shallowRef, onBeforeUnmount, type Ref } from "vue";
import * as THREE from "three";
import type { Components, World } from "@thatopen/components";

export interface MeasurementOptions {
  color?: string | number;
  enabled?: boolean;
  visible?: boolean;
  mode?: string;
  units?: string;
  rounding?: number;
}

export interface MeasurementDeps {
  components: Ref<Components | null>;
  world: Ref<World | null>;
}

type OnItemAdded = (args: { item: any; world: World }) => void;

interface BaseParams<TMeasurer> {
  /** Как получить экземпляр измерителя из Components */
  createMeasurer: (c: Components) => TMeasurer;
  /** Что делать при добавлении замера (для автокадра и т.п.) */
  onItemAdded?: OnItemAdded;
  /** Как прочитать/записать цвет (у кого-то color, у кого-то linesMaterial.color) */
  getColor?: (m: any) => THREE.Color | null;
  setColor?: (m: any, color: THREE.Color) => void;
}

export function useMeasurementBase<TMeasurer = any>(
  deps: MeasurementDeps,
  params: BaseParams<TMeasurer>
) {
  const { components, world } = deps;
  const measurer = shallowRef<TMeasurer | null>(null);

  const state = reactive({
    enabled: false,
    visible: true,
    color: "#494cb6",
    modes: [] as string[],
    mode: "" as string,
    unitsList: [] as string[],
    units: "" as string,
    rounding: 2 as number,
    ready: false,
  });

  function ensure(): TMeasurer {
    const c = components.value;
    const w = world.value;
    if (!c || !w)
      throw new Error("MeasurementBase: components/world are not ready");

    if (!measurer.value) {
      const m: any = params.createMeasurer(c);
      // присвоить world
      if ("world" in m) m.world = w;

      // заполнить справочники (если есть)
      if ("modes" in m && Array.isArray(m.modes)) state.modes = [...m.modes];
      if ("mode" in m) state.mode = m.mode;
      if ("unitsList" in m && Array.isArray(m.unitsList))
        state.unitsList = [...m.unitsList];
      if ("units" in m) state.units = m.units;
      if ("rounding" in m && typeof m.rounding === "number")
        state.rounding = m.rounding ?? 2;

      // начальные флаги/цвет
      if ("enabled" in m) state.enabled = !!m.enabled;
      if ("visible" in m) state.visible = !!m.visible;

      // вычитываем цвет
      const cGetter =
        params.getColor ??
        ((mm: any) => {
          if (mm?.linesMaterial?.color)
            return mm.linesMaterial.color as THREE.Color;
          if (mm?.color) return mm.color as THREE.Color;
          return null;
        });
      const col = cGetter(m);
      if (col) state.color = `#${col.getHexString()}`;

      // подписки на list.onItemAdded
      if (params.onItemAdded && m?.list?.onItemAdded?.add) {
        m.list.onItemAdded.add((item: any) =>
          params.onItemAdded!({ item, world: w })
        );
      }

      measurer.value = m as TMeasurer;
      state.ready = true;
    }
    return measurer.value!;
  }

  function updateOptions(opts: MeasurementOptions = {}) {
    const m: any = ensure();

    if (opts.enabled !== undefined && "enabled" in m) {
      m.enabled = !!opts.enabled;
      state.enabled = !!opts.enabled;
    }
    if (opts.visible !== undefined && "visible" in m) {
      m.visible = !!opts.visible;
      state.visible = !!opts.visible;
    }

    if (opts.color !== undefined) {
      const colorStr =
        typeof opts.color === "number"
          ? `#${(opts.color as number).toString(16).padStart(6, "0")}`
          : String(opts.color);
      state.color = colorStr;
      const setter =
        params.setColor ??
        ((mm: any, col: THREE.Color) => {
          if (mm?.linesMaterial?.color)
            (mm.linesMaterial.color as THREE.Color).set(col);
          else if (mm?.color) (mm.color as THREE.Color).set(col);
        });
      setter(m, new THREE.Color(colorStr));
    } else if (!state.ready) {
      // если опций нет, но инструмент только что создан — синхроним дефолт
      const getter =
        params.getColor ??
        ((mm: any) => {
          if (mm?.linesMaterial?.color)
            return mm.linesMaterial.color as THREE.Color;
          if (mm?.color) return mm.color as THREE.Color;
          return null;
        });
      const col = getter(m);
      if (col) state.color = `#${col.getHexString()}`;
    }

    if (opts.mode !== undefined && "mode" in m) {
      m.mode = opts.mode;
      state.mode = opts.mode;
    }
    if (opts.units !== undefined && "units" in m) {
      m.units = opts.units;
      state.units = opts.units;
    }
    if (opts.rounding !== undefined && "rounding" in m) {
      m.rounding = opts.rounding;
      state.rounding = opts.rounding;
    }
  }

  function setEnabled(on: boolean) {
    updateOptions({ enabled: on });
  }

  function clear() {
    const m: any = measurer.value;
    m?.list?.clear?.();
  }

  function setup(initial?: MeasurementOptions) {
    ensure();
    if (initial) updateOptions(initial);
  }

  onBeforeUnmount(() => {
    // мягкое выключение
    try {
      const m: any = measurer.value;
      if (m) m.enabled = false;
    } catch {}
  });

  return {
    measurer,
    state,
    setup,
    updateOptions,
    setEnabled,
    clear,
  };
}
