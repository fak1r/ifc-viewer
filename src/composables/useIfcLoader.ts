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
    // Priority: explicit path -> version -> fallback
    if (wasm?.path) return { path: wasm.path, absolute: !!wasm.absolute };
    if (wasm?.version) {
      const abs = wasm.absolute ?? true;
      const path = `https://unpkg.com/web-ifc@${wasm.version}/`;
      return { path, absolute: abs };
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

  async function load(
    source: ModelSource,
    opts?: { name?: string; liftBy?: number; autoFit?: boolean }
  ) {
    const buffer = await toUint8Array(source);

    await ifcLoader.load(buffer, false, opts?.name ?? "model", {
      processData: {
        progressCallback: (p: number) =>
          console.debug("IFC convert progress:", p),
      },
    });

    // Post-load tweaks per config
    const list = components.get(OBC.FragmentsManager).list;
    const [model] = list.values();
    if (!model) return;

    if ((opts?.liftBy ?? 0) !== 0) {
      model.object.position.y += opts!.liftBy!;
    }

    if (opts?.autoFit) {
      const cam = components.get(OBC.Worlds).list.get(0)?.camera; // or use world injected via frags
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

  return { setup, load, clear } as const;
}
