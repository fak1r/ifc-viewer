import { onBeforeUnmount } from "vue";
import Stats from "stats.js";

export type UseFPSOptions = {
  /** Виден ли FPS при инициализации */
  visible?: boolean;
  /** Позиционирование панели внутри контейнера */
  position?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  /** Какую панель показывать (0 – FPS, 1 – MS, 2 – MB) */
  panel?: 0 | 1 | 2;
};

export function useFPS(
  container: HTMLElement,
  { visible = true, position, panel = 2 }: UseFPSOptions = {}
) {
  const stats = new Stats();
  stats.showPanel(panel);

  // Если у контейнера position: static, сделаем его позиционированным,
  // чтобы абсолютный FPS-панель корректно якорилась внутри него.
  try {
    const cs = getComputedStyle(container);
    if (cs.position === "static") {
      container.style.position = "relative";
    }
  } catch {}

  // Базовые стили контейнера панели
  const style = stats.dom.style as CSSStyleDeclaration;
  style.position = "absolute";
  style.zIndex = "1000";
  style.pointerEvents = "none"; // не перехватывать клики по вьюеру
  style.opacity = "0.9";

  // Сброс дефолтных углов от stats.js (обычно left: 0, top: 0)
  style.top = "";
  style.right = "";
  style.bottom = "";
  style.left = "";

  // Позиционирование (правый верх по умолчанию)
  const hasTop = position?.top != null;
  const hasBottom = position?.bottom != null;
  const hasLeft = position?.left != null;
  const hasRight = position?.right != null;

  if (hasTop) style.top = position!.top!;
  if (hasBottom) style.bottom = position!.bottom!;
  if (!hasTop && !hasBottom) style.top = "8px";

  if (hasRight) {
    style.right = position!.right!;
    style.left = ""; // взаимоисключаем противоположный край
  }
  if (hasLeft) {
    style.left = position!.left!;
    style.right = ""; // взаимоисключаем противоположный край
  }
  if (!hasLeft && !hasRight) style.right = "8px";

  let raf = 0;
  let running = false;

  const tick = () => {
    if (!running) return;
    stats.update();
    raf = requestAnimationFrame(tick);
  };

  const mount = () => {
    try {
      container.appendChild(stats.dom);
    } catch (e) {
      console.warn("useFPS: cannot mount stats panel", e);
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    tick();
  };

  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const setVisible = (v: boolean) => {
    stats.dom.style.display = v ? "" : "none";
    if (v) start();
    else stop();
  };

  const dispose = () => {
    stop();
    try {
      stats.dom.remove();
    } catch {}
  };

  // Автоинициализация
  mount();
  setVisible(visible);

  onBeforeUnmount(dispose);

  return { el: stats.dom, setVisible, start, stop, dispose } as const;
}
