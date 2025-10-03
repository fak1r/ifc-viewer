import { onMounted, onBeforeUnmount, watch, type Ref, toValue } from "vue";
import { useFPS, type UseFPSOptions } from "./useFPS";
import type { ModelViewerConfig } from "@/types/ifc-viewer";

export type UseViewerFpsOptions = Omit<UseFPSOptions, "visible"> & {
  /** Автозапуск при mount, если showRef.value === true */
  auto?: boolean;
};

export function useViewerFPS(
  containerRef: Ref<HTMLElement | null>,
  showRef: ModelViewerConfig,
  opts: UseViewerFpsOptions = {}
) {
  const { auto = true, ...rest } = opts;

  let fps: ReturnType<typeof useFPS> | null = null;

  const ensure = () => {
    const container = containerRef.value;
    if (!container) return;
    if (!fps) {
      fps = useFPS(container, { ...rest, visible: false });
    }
  };

  const mountIfNeeded = () => {
    ensure();
    if (fps && toValue(showRef)) fps.setVisible(true);
  };

  const setVisible = (v: boolean) => {
    ensure();
    fps?.setVisible(v);
  };

  const toggle = () => setVisible(!toValue(showRef));

  const dispose = () => {
    try {
      fps?.dispose();
    } catch {}
    fps = null;
  };

  onMounted(() => {
    if (!auto) return;
    mountIfNeeded();
  });

  // Реагируем на появление контейнера (например, когда v-if)
  watch(containerRef, () => {
    if (!auto) return;
    if (containerRef.value && toValue(showRef)) mountIfNeeded();
  });

  // Реагируем на флаг видимости из конфига
  watch(showRef, (v) => {
    if (!containerRef.value) return;
    setVisible(!!v);
  });

  onBeforeUnmount(dispose);

  return {
    // DOM-элемент панели (когда инициализирована)
    get el() {
      return fps?.el ?? null;
    },
    setVisible,
    toggle,
    dispose,
  } as const;
}
