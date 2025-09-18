import * as THREE from "three";
import * as OBC from "@thatopen/components";
import type { IfcWasmConfig, ModelSource, AlignMode } from "@/types/ifc-viewer";

type FragsReadyLike = { ready: Promise<unknown> };

export function useIfcLoader(
  components: OBC.Components,
  frags: FragsReadyLike,
  wasm?: IfcWasmConfig
) {
  const ifcLoader = components.get(OBC.IfcLoader);

  function resolveWasmPath(): { path: string; absolute: boolean } {
    if (wasm?.path) {
      const p = wasm.path.endsWith("/") ? wasm.path : wasm.path + "/";
      return { path: p, absolute: !!wasm.absolute };
    }
    if (wasm?.version) {
      return {
        path: `https://unpkg.com/web-ifc@${wasm.version}/`,
        absolute: wasm.absolute ?? true,
      };
    }
    return { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true };
  }

  async function setup() {
    await frags.ready;
    const { path, absolute } = resolveWasmPath();
    await ifcLoader.setup({ autoSetWasm: false, wasm: { path, absolute } });
  }

  async function toUint8Array(source: ModelSource): Promise<Uint8Array> {
    if (typeof source === "string") {
      const res = await fetch(source);
      return new Uint8Array(await res.arrayBuffer());
    }
    if (source instanceof File) {
      return new Uint8Array(await source.arrayBuffer());
    }
    if (source instanceof Uint8Array) return source;
    throw new Error("Unsupported model source");
  }

  // Универсальный «вейтер» состояния фрагментов
  async function waitUntil(
    predicate: () => boolean,
    timeoutMs = 4000,
    label = "waitUntil"
  ) {
    const t0 = performance.now();
    while (!predicate()) {
      if (performance.now() - t0 > timeoutMs) {
        console.warn(`[${label}] timeout`);
        return false;
      }
      await new Promise(requestAnimationFrame);
    }
    return true;
  }

  function getFragsMgr() {
    return components.get(OBC.FragmentsManager);
  }

  function computeBBoxOfAll(): THREE.Box3 {
    const box = new THREE.Box3().makeEmpty();
    for (const m of getFragsMgr().list.values()) box.expandByObject(m.object);
    return box;
  }

  async function load(
    source: ModelSource,
    opts?: { name?: string; liftBy?: number; autoFit?: boolean }
  ) {
    const buffer = await toUint8Array(source);

    await ifcLoader.load(buffer, false, opts?.name ?? "model", {
      processData: {
        progressCallback: (p: number) =>
          console.log(`Прогресс рендера модели: ${Math.round(p * 100)}%`),
      },
    });

    // дождаться хотя бы одной группы
    await waitUntil(() => getFragsMgr().list.size > 0, 4000, "firstGroup");
    getFragsMgr().core.update(true);

    // дождаться непустого bbox
    await waitUntil(
      () => Number.isFinite(computeBBoxOfAll().min.y),
      4000,
      "nonEmptyBBox"
    );

    const [model] = getFragsMgr().list.values();
    if (!model) return;

    if ((opts?.liftBy ?? 0) !== 0) {
      model.object.position.y += opts!.liftBy!;
    }
  }

  function clear() {
    try {
      const frags = getFragsMgr();
      for (const m of frags.list.values()) {
        try {
          m.object.parent?.remove(m.object);
        } catch {}
        try {
          m.dispose?.();
        } catch {}
      }
      frags.list.clear();
      frags.core.update(true);
    } catch (e) {
      console.warn("clear() warning:", e);
    }
  }

  async function groundToGrid(gridY = 0, extraLift = 0) {
    await waitUntil(
      () => Number.isFinite(computeBBoxOfAll().min.y),
      4000,
      "groundToGridBBox"
    );
    const box = computeBBoxOfAll();
    const delta = gridY + extraLift - box.min.y;

    const frags = getFragsMgr();
    for (const m of frags.list.values()) m.object.position.y += delta;
    frags.core.update(true);
  }

  async function alignHorizontally(
    targetX = 0,
    targetZ = 0,
    mode: AlignMode = "center"
  ) {
    await waitUntil(
      () => Number.isFinite(computeBBoxOfAll().min.y),
      4000,
      "alignBBox"
    );
    const box = computeBBoxOfAll();

    const refX =
      mode === "center"
        ? (box.min.x + box.max.x) / 2
        : mode === "min"
        ? box.min.x
        : box.max.x;
    const refZ =
      mode === "center"
        ? (box.min.z + box.max.z) / 2
        : mode === "min"
        ? box.min.z
        : box.max.z;

    const dx = targetX - refX;
    const dz = targetZ - refZ;

    const frags = getFragsMgr();
    for (const m of frags.list.values()) {
      m.object.position.x += dx;
      m.object.position.z += dz;
    }
    frags.core.update(true);
  }

  return { setup, load, clear, groundToGrid, alignHorizontally } as const;
}
