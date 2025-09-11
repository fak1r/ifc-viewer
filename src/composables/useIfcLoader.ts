import * as THREE from "three";
import * as OBC from "@thatopen/components";
import type { IfcWasmConfig, ModelSource } from "@/types/ifc-viewer";

export function useIfcLoader(
  components: OBC.Components,
  frags: ReturnType<typeof useFragments>,
  wasm?: IfcWasmConfig
) {
  const ifcLoader = components.get(OBC.IfcLoader);

  function resolveWasmPath(): { path: string; absolute: boolean } {
    if (wasm?.path) {
      let p = wasm.path;
      if (!p.endsWith("/")) p += "/";
      return { path: p, absolute: !!wasm.absolute };
    }
    if (wasm?.version) {
      const abs = wasm.absolute ?? true;
      let p = `https://unpkg.com/web-ifc@${wasm.version}/`;
      return { path: p, absolute: abs };
    }
    return { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true };
  }

  async function setup() {
    await frags.ready;
    const { path, absolute } = resolveWasmPath();
    await ifcLoader.setup({
      autoSetWasm: false,
      wasm: { path, absolute },
    });
    const webIfcSettings = (ifcLoader as any).settings?.webIfc;
    if (webIfcSettings) {
      webIfcSettings.COORDINATE_TO_ORIGIN = true;
      webIfcSettings.OPTIMIZE_PROFILES = true;
    }
  }

  async function toUint8Array(source: ModelSource): Promise<Uint8Array> {
    if (typeof source === "string") {
      const res = await fetch(source);
      const ab = await res.arrayBuffer();
      return new Uint8Array(ab);
    }
    if (source instanceof File) {
      const ab = await source.arrayBuffer();
      return new Uint8Array(ab);
    }
    if (source instanceof Uint8Array) return source;
    throw new Error("Unsupported model source");
  }

  async function waitForFirstGroup(timeoutMs = 4000) {
    const fragsMgr = components.get(OBC.FragmentsManager);
    if (fragsMgr.list.size > 0) return;

    let stop = false;
    const t0 = performance.now();

    // Быстрый поллинг: ждём, пока list.size > 0
    while (!stop) {
      // уже есть?
      if (fragsMgr.list.size > 0) return;

      // таймаут?
      if (performance.now() - t0 > timeoutMs) {
        console.warn(
          "[waitForFirstGroup] timeout, list.size =",
          fragsMgr.list.size
        );
        return;
      }
      // следующий кадр
      await new Promise(requestAnimationFrame);
    }
  }

  async function waitForNonEmptyBBox(timeoutMs = 4000) {
    const fragsMgr = components.get(OBC.FragmentsManager);
    const t0 = performance.now();
    const box = new THREE.Box3();

    while (true) {
      box.makeEmpty();
      for (const m of fragsMgr.list.values()) box.expandByObject(m.object);

      if (isFinite(box.min.y)) return box; // ← готов bbox

      if (performance.now() - t0 > timeoutMs) {
        console.warn(
          "[waitForNonEmptyBBox] timeout; list.size =",
          fragsMgr.list.size
        );
        return null;
      }
      await new Promise(requestAnimationFrame);
    }
  }

  async function load(
    source: ModelSource,
    opts?: { name?: string; liftBy?: number; autoFit?: boolean }
  ) {
    const buffer = await toUint8Array(source);

    await ifcLoader.load(buffer, false, opts?.name ?? "model", {
      processData: {
        progressCallback: (p: number) =>
          console.log("IFC convert progress:", p),
      },
    });

    await waitForFirstGroup();
    components.get(OBC.FragmentsManager).core.update(true);

    await waitForNonEmptyBBox();

    // Post-load tweaks per config
    const list = components.get(OBC.FragmentsManager).list;
    const [model] = list.values();
    if (!model) return;

    if ((opts?.liftBy ?? 0) !== 0) {
      model.object.position.y += opts!.liftBy!;
    }

    if (opts?.autoFit) {
      try {
        const box = new THREE.Box3().setFromObject(model.object);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        await components
          .get(OBC.Worlds)
          .list.get(0)
          ?.camera.controls.fitToSphere(sphere, true, { padding: 1.2 });
      } catch {}
    }
  }

  function clear() {
    try {
      const fragments = components.get(OBC.FragmentsManager);
      // remove from scene
      for (const m of fragments.list.values()) {
        try {
          m.object.parent?.remove(m.object);
        } catch {}
        try {
          m.dispose?.();
        } catch {}
      }
      fragments.list.clear();
      fragments.core.update(true);
    } catch (e) {
      console.warn("clear() warning:", e);
    }
  }

  /* function groundToGrid(gridY = 0, extraLift = 0) {
    const frags = components.get(OBC.FragmentsManager);
    const box = new THREE.Box3();
    for (const m of frags.list.values()) box.expandByObject(m.object);
    if (!isFinite(box.min.y)) return;
    const target = gridY + extraLift; // сетка + опциональный подъём
    const delta = target - box.min.y; // сколько поднять/опустить
    for (const m of frags.list.values()) m.object.position.y += delta;
    frags.core.update(true);
  } */
  async function groundToGrid(gridY = 0, extraLift = 0) {
    const fragsMgr = components.get(OBC.FragmentsManager);

    const boxBefore = await waitForNonEmptyBBox();
    if (!boxBefore) {
      console.warn("[groundToGrid] bbox по-прежнему пустой");
      return;
    }

    const target = gridY + extraLift;
    const delta = target - boxBefore.min.y;

    console.log("[groundToGrid:BEFORE]", {
      minY: boxBefore.min.y,
      maxY: boxBefore.max.y,
      target,
      delta,
      groups: fragsMgr.list.size,
    });

    for (const m of fragsMgr.list.values()) {
      console.log(
        "[groundToGrid] move",
        m.object.name ?? "(no-name)",
        "y:",
        m.object.position.y,
        "->",
        m.object.position.y + delta
      );
      m.object.position.y += delta;
    }
    fragsMgr.core.update(true);

    const boxAfter = new THREE.Box3();
    for (const m of fragsMgr.list.values()) boxAfter.expandByObject(m.object);
    console.log("[groundToGrid:AFTER]", {
      minY: boxAfter.min.y,
      maxY: boxAfter.max.y,
      target,
    });
  }

  return { setup, load, clear, groundToGrid } as const;
}
