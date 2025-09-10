/** Источник модели: URL | File | чистый бинарный буфер */
export type ModelSource = string | File | Uint8Array;

/** Конфиг путей/версии web-ifc (.wasm) */
export interface IfcWasmConfig {
  /** Версия web-ifc для CDN (должна совпадать с установленным пакетом), напр. '0.0.71' */
  version?: string;
  /** Путь к каталогу с web-ifc.wasm. Если указан, перекрывает version/CDN */
  path?: string;
  /** Абсолютный ли путь (true — не будет резолвиться относительно сайта) */
  absolute?: boolean;
}

/** Пара «глаз» и «таргет» для ракурса камеры */
export interface CameraLookAt {
  /** Координаты точки камеры (eye) */
  eye: [number, number, number];
  /** Координаты точки, на которую смотрит камера (target) */
  target: [number, number, number];
}

/** Главное описание конфига MapViewer (всё в одном объекте) */
export interface MapViewerConfig {
  /** Источник модели (URL | File | Uint8Array). Если не задан, можно вызвать .loadModel() вручную */
  model?: ModelSource;
  /** Конфиг web-ifc (.wasm): версия/путь/абсолютность */
  wasm?: IfcWasmConfig;
  /** Показывать ли сетку (пол) */
  showGrid?: boolean;
  /** Смещение сетки по оси Y (метры), если нужно «опустить/поднять» пол */
  gridOffset?: number;
  /** Ручной подъём модели по оси Y (метры), быстрый способ выровнять по полу */
  liftBy?: number;
  /** Стартовый ракурс камеры */
  lookAt?: CameraLookAt;
  /** Автокадр по сцене после загрузки модели */
  autoFit?: boolean;
  /** Показать панель FPS (Stats.js) */
  showStats?: boolean;
  /** Цвет фона сцены, например '#0e0e11' */
  background?: string;
}
