import { contextBridge, ipcRenderer } from 'electron'

export type DesktopSource = {
  id: string
  name: string
  displayId: string
  thumbnail: string
  appIcon: string | null
}

export type SessionInfo = {
  id: string
  dir: string
  files: { name: string; size: number }[]
}

export type SessionListItem = {
  id: string
  dir: string
  createdAt: string
  files: { name: string; size: number }[]
}

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Desktop capture sources
  getSources: (): Promise<DesktopSource[]> =>
    ipcRenderer.invoke('get-sources'),

  // Session management
  createSession: (): Promise<{ id: string; dir: string }> =>
    ipcRenderer.invoke('create-session'),

  openStream: (sessionId: string, fileName: string): Promise<string> =>
    ipcRenderer.invoke('open-stream', sessionId, fileName),

  writeChunk: (sessionId: string, fileName: string, chunk: ArrayBuffer): Promise<boolean> =>
    ipcRenderer.invoke('write-chunk', sessionId, fileName, chunk),

  closeStream: (sessionId: string, fileName: string): Promise<void> =>
    ipcRenderer.invoke('close-stream', sessionId, fileName),

  // Session info & rename
  getSessionInfo: (sessionId: string): Promise<SessionInfo | null> =>
    ipcRenderer.invoke('get-session-info', sessionId),

  renameSession: (sessionId: string, newName: string): Promise<{ success: boolean; newDir?: string; error?: string }> =>
    ipcRenderer.invoke('rename-session', sessionId, newName),

  listSessions: (): Promise<SessionListItem[]> =>
    ipcRenderer.invoke('list-sessions'),

  // Folder actions
  openFolder: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('open-folder', sessionId),

  getVideosDir: (): Promise<string> =>
    ipcRenderer.invoke('get-videos-dir'),

  // Custom save path
  getSavePath: (): Promise<string | null> =>
    ipcRenderer.invoke('get-save-path'),

  // FFmpeg merge
  mergeRecordings: (sessionId: string): Promise<{ success: boolean; outputFile?: string; error?: string }> =>
    ipcRenderer.invoke('merge-recordings', sessionId),
})
