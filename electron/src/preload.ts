import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform:      process.platform,
  getConfig:     ()                   => ipcRenderer.invoke("get-config"),
  pickDbFolder:  ()                   => ipcRenderer.invoke("pick-db-folder"),
  pickDbFile:    ()                   => ipcRenderer.invoke("pick-db-file"),
  completeSetup: (data: unknown)      => ipcRenderer.invoke("complete-setup", data),
  changeKey:     (newKey: string)     => ipcRenderer.invoke("change-key", { newKey }),
  resetConfig:   ()                   => ipcRenderer.invoke("reset-config"),
});
