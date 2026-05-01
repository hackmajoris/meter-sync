import { app, BrowserWindow, shell, ipcMain, dialog, safeStorage } from "electron";
import { spawn, ChildProcess } from "child_process";
import readline from "readline";
import path from "path";
import fs from "fs";

// ---- config helpers ----

const configFile = () => path.join(app.getPath("userData"), "config.json");
const keyFile    = () => path.join(app.getPath("userData"), "db.key.enc");

interface Config { dbPath: string }

function loadConfig(): Partial<Config> {
  try { return JSON.parse(fs.readFileSync(configFile(), "utf8")); }
  catch { return {}; }
}

function saveConfig(cfg: Config): void {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(cfg, null, 2), "utf8");
}

function saveKey(key: string): void {
  fs.mkdirSync(path.dirname(keyFile()), { recursive: true });
  fs.writeFileSync(keyFile(), safeStorage.encryptString(key));
}

function loadKey(): string | null {
  try { return safeStorage.decryptString(fs.readFileSync(keyFile())); }
  catch { return null; }
}

function isConfigured(): boolean {
  const cfg = loadConfig();
  return !!(cfg.dbPath && fs.existsSync(keyFile()));
}

function defaultDbPath(): string {
  return path.join(app.getPath("userData"), "data.db");
}

// ---- paths ----

function goBinPath(): string {
  const name = process.platform === "win32" ? "server.exe" : "server";
  return app.isPackaged
    ? path.join(process.resourcesPath, name)
    : path.join(__dirname, "..", "..", ".bin", name);
}

// Setup screen: loaded from disk before the Go server starts.
function spaIndexPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "web", "dist", "index.html")
    : path.join(__dirname, "..", "..", "pkg", "web", "dist", "index.html");
}

// ---- backend process ----

let server: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;
let backendPort = 8080;

function startBackend(dbPath: string, dbKey: string): Promise<number> {
  if (server) { server.kill(); server = null; }

  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    const env = { ...process.env, DB_PATH: dbPath, DB_KEY: dbKey, PORT: "0" };
    server = spawn(goBinPath(), [], { env, stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    let resolved = false;

    const rl = readline.createInterface({ input: server!.stdout! });
    rl.on("line", (line) => {
      if (!resolved && line.includes("Server running on")) {
        const m = line.match(/:(\d+)/);
        resolved = true;
        resolve(m ? parseInt(m[1], 10) : 8080);
      }
    });

    server!.stderr!.on("data", (d: Buffer) => { stderr += d.toString(); });
    server!.on("exit", (code) => {
      if (!resolved) reject(new Error(`Server exited (code ${code}): ${stderr}`));
    });
    server!.on("error", reject);

    setTimeout(() => {
      if (!resolved) reject(new Error("Server startup timed out"));
    }, 15000);
  });
}

// Retry loading a URL — needed because the Go server may not be instantly ready.
function tryLoad(win: BrowserWindow, url: string, retries = 20, delay = 300): void {
  win.loadURL(url).catch(() => {
    if (retries > 0) setTimeout(() => tryLoad(win, url, retries - 1, delay), delay);
  });
}

// ---- window ----

function createWindow(opts: {
  width: number; height: number;
  resizable?: boolean; minWidth?: number; minHeight?: number;
}): void {
  mainWindow = new BrowserWindow({
    width: opts.width,
    height: opts.height,
    resizable: opts.resizable ?? true,
    minWidth: opts.minWidth,
    minHeight: opts.minHeight,
    backgroundColor: "#0d0d12",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow!.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ---- IPC handlers ----

ipcMain.handle("get-config", () => ({
  configured: isConfigured(),
  dbPath: loadConfig().dbPath ?? defaultDbPath(),
  keySet: fs.existsSync(keyFile()),
}));

ipcMain.handle("pick-db-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("pick-db-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: "SQLite Database", extensions: ["db"] }],
    properties: ["openFile"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("complete-setup", async (_e, {
  dbFolder, dbPath: existingPath, encryptionKey,
}: { dbFolder?: string; dbPath?: string; encryptionKey: string }) => {
  const dbPath = existingPath ?? path.join(dbFolder!, "data.db");
  try {
    backendPort = await startBackend(dbPath, encryptionKey);
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
  saveKey(encryptionKey);
  saveConfig({ dbPath });
  mainWindow!.setResizable(true);
  mainWindow!.setMinimumSize(900, 600);
  mainWindow!.setSize(1280, 800);
  tryLoad(mainWindow!, `http://localhost:${backendPort}`);
  return { ok: true };
});

ipcMain.handle("change-key", async (_e, { newKey }: { newKey: string }) => {
  const cfg = loadConfig();
  if (!cfg.dbPath) return { ok: false, error: "No database configured" };
  saveKey(newKey);
  server?.kill();
  try {
    backendPort = await startBackend(cfg.dbPath, newKey);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
});

ipcMain.handle("reset-config", () => {
  server?.kill();
  server = null;
  try { fs.unlinkSync(configFile()); } catch { /* already gone */ }
  try { fs.unlinkSync(keyFile()); } catch { /* already gone */ }
  mainWindow!.setResizable(false);
  mainWindow!.setSize(520, 640);
  mainWindow!.loadFile(spaIndexPath());
});

// ---- app lifecycle ----

app.whenReady().then(async () => {
  if (!isConfigured()) {
    createWindow({ width: 520, height: 640, resizable: false });
    mainWindow!.loadFile(spaIndexPath());
  } else {
    const cfg = loadConfig();
    const key = loadKey()!;
    createWindow({ width: 1280, height: 800, minWidth: 900, minHeight: 600 });
    try {
      backendPort = await startBackend(cfg.dbPath!, key);
      tryLoad(mainWindow!, `http://localhost:${backendPort}`);
    } catch (err: unknown) {
      dialog.showErrorBox("Failed to start", (err as Error).message);
      app.quit();
    }
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow?.show();
  });
});

app.on("window-all-closed", () => {
  server?.kill();
  if (process.platform !== "darwin") app.quit();
});
