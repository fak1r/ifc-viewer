import * as THREE from 'three'

export type WorldForHelpers = {
  scene?: { three?: THREE.Scene | null } | null
}

type Options = {
  world: WorldForHelpers
  size?: number
  color?: THREE.ColorRepresentation
  opacity?: number
  handleHeight?: number
}

export function useClipperHelpers({ world, size = 100, color = 0xff66cc, opacity = 0.2, handleHeight = 2 }: Options) {
  const scene = world?.scene?.three
  if (!scene) throw new Error('[useClipperHelpers] world.scene.three не инициализирован')

  // --- Полупрозрачная плоскость Y=const (горизонтальная) ---
  const planeGeom = new THREE.PlaneGeometry(size * 2, size * 2)
  planeGeom.rotateX(-Math.PI / 2) // сделать горизонтальной (лежит в XZ)
  const planeMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const planeMesh = new THREE.Mesh(planeGeom, planeMat)
  planeMesh.visible = true

  // Перпендикулярная "ручка"
  const radius = 0.15
  const height = handleHeight
  const radialSegments = 24
  const handleGeom = new THREE.CylinderGeometry(radius, radius, height, radialSegments)
  const handleMat = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const handleMesh = new THREE.Mesh(handleGeom, handleMat)
  handleMesh.position.y = -height / 2 - 0.02

  // Группа, чтобы двигать сразу плоскость и ручку по Y
  const group = new THREE.Group()
  group.add(handleMesh)

  // Начально — у нуля; пользователь обновит setY(...)
  group.position.set(0, 0, 0)
  scene.add(group)

  const setY = (y: number) => {
    group.position.y = y
  }

  const show = () => {
    group.visible = true
  }
  const hide = () => {
    group.visible = false
  }

  const dispose = () => {
    scene.remove(group)
    planeGeom.dispose()
    planeMat.dispose()
    handleGeom.dispose()
    handleMat.dispose()
  }

  return { group, setY, show, hide, dispose }
}

export type UseClipperHelpers = ReturnType<typeof useClipperHelpers>

