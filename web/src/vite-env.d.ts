/// <reference types="vite/client" />

interface ElectronConfig {
  configured: boolean;
  dbPath: string;
  keySet: boolean;
}

interface ElectronAPI {
  platform: string;
  getConfig(): Promise<ElectronConfig>;
  pickDbFolder(): Promise<string | null>;
  pickDbFile(): Promise<string | null>;
  completeSetup(data: {
    dbFolder?: string;
    dbPath?: string;
    encryptionKey: string;
  }): Promise<{ ok: boolean; error?: string }>;
  changeKey(newKey: string): Promise<{ ok: boolean; error?: string }>;
  resetConfig(): Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
