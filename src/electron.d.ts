// Type declarations for the context bridge exposed from preload.ts
interface ElectronAPI {
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void

  getSources: () => Promise<{
    id: string
    name: string
    displayId: string
    thumbnail: string
    appIcon: string | null
  }[]>

  createSession: () => Promise<{ id: string; dir: string }>

  openStream: (sessionId: string, fileName: string) => Promise<string>
  writeChunk: (sessionId: string, fileName: string, chunk: ArrayBuffer) => Promise<boolean>
  closeStream: (sessionId: string, fileName: string) => Promise<void>

  getSessionInfo: (sessionId: string) => Promise<{
    id: string
    dir: string
    files: { name: string; size: number }[]
  } | null>

  renameSession: (sessionId: string, newName: string) => Promise<{
    success: boolean
    newDir?: string
    error?: string
  }>

  listSessions: () => Promise<{
    id: string
    dir: string
    createdAt: string
    files: { name: string; size: number }[]
  }[]>

  openFolder: (sessionId: string) => Promise<boolean>
  getVideosDir: () => Promise<string>
  getSavePath: () => Promise<string | null>

  mergeRecordings: (sessionId: string) => Promise<{
    success: boolean
    outputFile?: string
    error?: string
  }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
