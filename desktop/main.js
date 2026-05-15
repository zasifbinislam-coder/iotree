// Plant Sim IDE - Electron main process
// Wraps the static plant-sim-ide/ folder as a desktop window.

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

// Resolve the path to plant-sim-ide regardless of whether we're packaged.
function resolveIndex() {
  // Packaged: files are bundled at resources/app/plant-sim-ide/index.html via electron-builder config.
  const packagedPath = path.join(__dirname, 'plant-sim-ide', 'index.html');
  if (fs.existsSync(packagedPath)) return packagedPath;
  // Dev: load from the sibling folder.
  return path.join(__dirname, '..', 'plant-sim-ide', 'index.html');
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Plant Sim IDE',
    backgroundColor: '#1e1e1e',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const indexPath = resolveIndex();
  mainWindow.loadFile(indexPath);

  // Open external links in the user's default browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Application menu - keep it minimal but useful
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Quit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Source on GitHub',
          click: () => shell.openExternal('https://github.com/zasifbinislam-coder/iotree')
        },
        {
          label: 'About',
          click: () => shell.openExternal('https://zasifbinislam-coder.github.io/iotree/')
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
