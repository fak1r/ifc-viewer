// Источник модели: URL | File | чистый бинарный буфер
export type ModelSource = string | File | Uint8Array;

// Конфиг путей/версии web-ifc (.wasm)
export interface IfcWasmConfig {
  version?: string;
  path?: string;
  absolute?: boolean;
}

// Пара «глаз» и «таргет» для ракурса камеры
export interface CameraLookAt {
  eye: [number, number, number];
  target: [number, number, number];
}

// Главное описание конфига ModelViewer (всё в одном объекте)
export interface ModelViewerConfig {
  model?: ModelSource;
  wasm?: IfcWasmConfig;
  showGrid?: boolean;
  gridOffset?: number;
  liftBy?: number;
  lookAt?: CameraLookAt;
  autoFit?: boolean;
  background?: string;
}

export type AlignMode = "center" | "min" | "max";

export type ToolApi = {
  setupMeasurement?: (opts?: Record<string, any>) => void;
  activateMeasurement: (on: boolean) => void;
  state: { enabled: boolean; ready?: boolean };
};
