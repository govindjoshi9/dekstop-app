import {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  dialog,
  shell,
  screen as electronScreen,
} from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { mergeRecordings } from './ffmpeg'

const isDev = process.env.NODE_ENV === 'development'
const VIDEOS_DIR = path.join(app.getPath('userData'), 'videos')

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true })
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const { width, height } = electronScreen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(820, height),
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC: Window controls ────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())

// ─── IPC: Get desktop sources ────────────────────────────────────────────────
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 200 },
    fetchWindowIcons: true,
  })
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    displayId: s.display_id,
    thumbnail: s.thumbnail.toDataURL(),
    appIcon: s.appIcon ? s.appIcon.toDataURL() : null,
  }))
})

// ─── IPC: Session management ─────────────────────────────────────────────────
ipcMain.handle('create-session', () => {
  const id = uuidv4()
  const sessionDir = path.join(VIDEOS_DIR, id)
  fs.mkdirSync(sessionDir, { recursive: true })
  return { id, dir: sessionDir }
})

// Track open file streams per session
const writeStreams: Record<string, fs.WriteStream> = {}

ipcMain.handle('open-stream', (_event, sessionId: string, fileName: string) => {
  const sessionDir = path.join(VIDEOS_DIR, sessionId)
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }
  const filePath = path.join(sessionDir, fileName)
  const key = `${sessionId}:${fileName}`
  writeStreams[key] = fs.createWriteStream(filePath)
  return filePath
})

ipcMain.handle('write-chunk', (_event, sessionId: string, fileName: string, chunk: ArrayBuffer) => {
  const key = `${sessionId}:${fileName}`
  const stream = writeStreams[key]
  if (stream) {
    stream.write(Buffer.from(chunk))
    return true
  }
  return false
})

ipcMain.handle('close-stream', (_event, sessionId: string, fileName: string) => {
  return new Promise<void>((resolve) => {
    const key = `${sessionId}:${fileName}`
    const stream = writeStreams[key]
    if (stream) {
      stream.end(() => {
        delete writeStreams[key]
        resolve()
      })
    } else {
      resolve()
    }
  })
})

// ─── IPC: Session info & rename ──────────────────────────────────────────────
ipcMain.handle('get-session-info', (_event, sessionId: string) => {
  const sessionDir = path.join(VIDEOS_DIR, sessionId)
  if (!fs.existsSync(sessionDir)) return null

  const files = fs.readdirSync(sessionDir).map((name) => {
    const filePath = path.join(sessionDir, name)
    const stat = fs.statSync(filePath)
    return { name, size: stat.size }
  })
  return { id: sessionId, dir: sessionDir, files }
})

ipcMain.handle('rename-session', (_event, sessionId: string, newName: string) => {
  const oldDir = path.join(VIDEOS_DIR, sessionId)
  // Sanitize name – replace invalid chars
  const safeName = newName.replace(/[/\\?%*:|"<>]/g, '-').trim()
  const newDir = path.join(VIDEOS_DIR, safeName)
  if (!fs.existsSync(oldDir)) return { success: false, error: 'Session not found' }
  if (fs.existsSync(newDir)) return { success: false, error: 'Name already taken' }
  try {
    fs.renameSync(oldDir, newDir)
    return { success: true, newDir }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})

// ─── IPC: Open folder ────────────────────────────────────────────────────────
ipcMain.handle('open-folder', (_event, sessionId: string) => {
  const sessionDir = path.join(VIDEOS_DIR, sessionId)
  if (fs.existsSync(sessionDir)) {
    shell.openPath(sessionDir)
    return true
  }
  return false
})

// ─── IPC: Custom save path dialog ────────────────────────────────────────────
ipcMain.handle('get-save-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose Save Location',
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// ─── IPC: Get videos directory ───────────────────────────────────────────────
ipcMain.handle('get-videos-dir', () => VIDEOS_DIR)

// ─── IPC: List all sessions ─────────────────────────────────────────────────
ipcMain.handle('list-sessions', () => {
  if (!fs.existsSync(VIDEOS_DIR)) return []
  return fs.readdirSync(VIDEOS_DIR).map((name) => {
    const dirPath = path.join(VIDEOS_DIR, name)
    const stat = fs.statSync(dirPath)
    const files = fs.existsSync(dirPath)
      ? fs.readdirSync(dirPath).map((f) => {
          const fp = path.join(dirPath, f)
          const s = fs.statSync(fp)
          return { name: f, size: s.size }
        })
      : []
    return { id: name, dir: dirPath, createdAt: stat.birthtime.toISOString(), files }
  })
})

// ─── IPC: Merge recordings via ffmpeg ───────────────────────────────────────
ipcMain.handle('merge-recordings', async (_event, sessionId: string) => {
  const sessionDir = path.join(VIDEOS_DIR, sessionId)
  const screenFile = path.join(sessionDir, 'screen.webm')
  const webcamFile = path.join(sessionDir, 'webcam.webm')
  const outputFile = path.join(sessionDir, 'final.mp4')

  if (!fs.existsSync(screenFile)) {
    return { success: false, error: 'screen.webm not found' }
  }

  try {
    await mergeRecordings(screenFile, webcamFile, outputFile)
    return { success: true, outputFile }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})
