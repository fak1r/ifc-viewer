import * as THREE from 'three'
import { ClipStyler as FrontClipStyler } from '@thatopen/components-front'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import * as OBC from '@thatopen/components'

type Options = {
  components: OBC.Components
  world: OBC.World
  clipper: OBC.Clipper
  styleName?: string
}

export function useClipStyler({ components, world, clipper, styleName = 'default' }: Options) {
  const styler = components.get(FrontClipStyler)
  styler.world = world
  styler.enabled = true
  styler.visible = true

  const resolveResolution = () => {
    const size = new THREE.Vector2()
    const renderer: any = (world as any).renderer?.three
    if (renderer?.getSize) {
      renderer.getSize(size)
      return size
    }
    return new THREE.Vector2(window.innerWidth, window.innerHeight)
  }

  if (!styler.styles.has(styleName)) {
    const linesMaterial = new LineMaterial({
      color: 0x000000,
      linewidth: 2,
      worldUnits: false,
    })
    linesMaterial.depthTest = false
    linesMaterial.transparent = true
    linesMaterial.resolution.copy(resolveResolution())

    const fillsMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      depthTest: false,
    })

    styler.styles.set(styleName, { linesMaterial, fillsMaterial })
  }

  const applyStyleToPlane = (planeId: string) => {
    try {
      const existing = styler.list.get(planeId)
      const edges =
        existing ??
        styler.createFromClipping(planeId, {
          id: planeId,
          world,
          link: true,
        })

      edges.items.clear()
      edges.items.set('default', { style: styleName })
      edges.visible = true
      void edges.update()
    } catch (err) {
      console.error('[ClipStyler] Failed to style clipping plane', err)
    }
  }

  clipper.list.forEach((_, id) => applyStyleToPlane(id))

  const onPlaneCreated = ({ key }: { key: string }) => applyStyleToPlane(key)
  const onPlaneDeleted = ({ key }: { key: string }) => {
    try {
      styler.list.delete(key)
    } catch {}
  }
  const onPlanesCleared = () => {
    try {
      styler.list.clear()
    } catch {}
  }

  clipper.list.onItemSet.add(onPlaneCreated)
  clipper.list.onBeforeDelete.add(onPlaneDeleted)
  clipper.list.onCleared.add(onPlanesCleared)
  const onAfterDrag = () => {
    styler.list.forEach((edges) => {
      edges.visible = true
      void edges.update()
    })
  }
  clipper.onAfterDrag.add(onAfterDrag)

  const handleResize = () => {
    const style = styler.styles.get(styleName)
    const res = resolveResolution()
    style?.linesMaterial?.resolution.copy(res)
  }
  window.addEventListener('resize', handleResize)

  return {
    styler,
    dispose() {
      clipper.list.onItemSet.remove(onPlaneCreated)
      clipper.list.onBeforeDelete.remove(onPlaneDeleted)
      clipper.list.onCleared.remove(onPlanesCleared)
      clipper.onAfterDrag.remove(onAfterDrag)
      window.removeEventListener('resize', handleResize)
    },
  }
}

