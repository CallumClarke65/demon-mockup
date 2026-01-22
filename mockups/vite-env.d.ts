/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN: string;
  // add other VITE_ variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
