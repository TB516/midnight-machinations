declare global {
  namespace App {}

  interface ImportMetaEnv {
    readonly VITE_WS_ADDRESS?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
