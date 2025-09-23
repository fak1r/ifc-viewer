import { ref, shallowReadonly } from "vue";

const visible = ref(false);
const percent = ref(0);

const clamp100 = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

let raf: number | null = null;
let from = 0,
  to = 0,
  start = 0,
  dur = 200;

const stop = () => {
  if (raf != null) cancelAnimationFrame(raf);
  raf = null;
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function tick(now: number) {
  const t = Math.min(1, (now - start) / dur);
  percent.value = clamp100(from + (to - from) * easeOutCubic(t));
  raf = t < 1 ? requestAnimationFrame(tick) : null;
}

function animateTo(next: number, duration = 200) {
  from = percent.value;
  to = clamp100(next);
  dur = duration;
  start = performance.now();
  if (raf == null) raf = requestAnimationFrame(tick);
}

function show(initial = 0) {
  visible.value = true;
  percent.value = clamp100(initial);
}

function finish(delay = 250) {
  animateTo(100, 220);
  window.setTimeout(hide, delay);
}

function hide() {
  stop();
  visible.value = false;
  percent.value = 0;
}

export function useModelLoadingProgress() {
  return {
    visible: shallowReadonly(visible),
    percent: shallowReadonly(percent),
    show,
    animateTo,
    finish,
    hide,
  };
}
