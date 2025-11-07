import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'

export type ClipStylerWorld = {
  components: OBC.Components
  world: any
}

export type StyleSpec = {
  linesMaterial?: LineMaterial
  fillsMaterial?: THREE.Material
}

export type UseClipStylerOptions = {
  world: ClipStylerWorld
  defaultStyle?: string
  styles?: Record<string, StyleSpec>
  autoLink?: boolean
}

export function useClipStyler({ world, defaultStyle = 'BlackFill', styles, autoLink = true }: UseClipStylerOptions) {
  if (!world?.components || !world?.world) {
    throw new Error('[useClipStyler] Передайте { components, world } из useWorld().')
  }

  const components = world.components
  const obcWorld = world.world

  const clipStyler = components.get(OBF.ClipStyler)
  clipStyler.world = obcWorld

  const clipper = components.get(OBC.Clipper)

  if (!clipStyler.styles.has(defaultStyle)) {
    clipStyler.styles.set(defaultStyle, {
      fillsMaterial: new THREE.MeshBasicMaterial({ color: 'black', side: 2 }),
    })
  }

  if (styles) {
    for (const [name, spec] of Object.entries(styles)) {
      clipStyler.styles.set(name, spec)
    }
  }

  const linkPlane = (key: string, style = defaultStyle) => {
    clipStyler.createFromClipping(key, { items: { All: { style } } })
  }

  const linkExisting = (style = defaultStyle) => {
    for (const [key] of clipper.list) linkPlane(key, style)
  }

  let offCreate: (() => void) | null = null
  if (autoLink) {
    offCreate = clipper.list.onItemSet.add(({ key }) => linkPlane(key, defaultStyle))
  }

  const setDefaultStyle = (name: string) => {
    if (!clipStyler.styles.has(name)) {
      throw new Error(`[useClipStyler] Стиль "${name}" не найден`)
    }
    defaultStyle = name
  }

  const addStyle = (name: string, spec: StyleSpec) => {
    clipStyler.styles.set(name, spec)
  }

  const removeStyle = (name: string) => {
    clipStyler.styles.delete(name)
  }

  const dispose = () => {
    if (offCreate) {
      offCreate()
      offCreate = null
    }
  }

  return {
    clipStyler,
    linkExisting,
    setDefaultStyle,
    addStyle,
    removeStyle,
    dispose,
  }
}

export type UseClipStyler = ReturnType<typeof useClipStyler>

