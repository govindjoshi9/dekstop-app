import { useState, useRef, useCallback } from 'react'
import type { ExportConfig } from '../App'

export type RecorderState = 'idle' | 'recording' | 'saving' | 'done' | 'error'

type Options = {
  onBytesWritten?: (total: number) => void
}

export function useScreenRecorder({ onBytesWritten }: Options = {}) {
  const [state, setState] = useState<RecorderState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const totalBytesRef = useRef(0)

  const startRecording = useCallback(async (
    sessionId: string,
    sourceId: string,
    config: ExportConfig
  ) => {
    try {
      setState('recording')
      totalBytesRef.current = 0

      // Acquire the screen stream via Electron's chromeMediaSource
      const stream = await (navigator.mediaDevices as any).getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 30
          },
        },
      })

      streamRef.current = stream

      // Open file write stream
      await window.electronAPI?.openStream(sessionId, 'screen.webm')

      const videoBps = config.videoBitrate * 1000
      const audioBps = config.audioBitrate * 1000

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm'

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: videoBps,
        audioBitsPerSecond: audioBps,
      })

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          const buf = await e.data.arrayBuffer()
          totalBytesRef.current += buf.byteLength
          onBytesWritten?.(totalBytesRef.current)
          await window.electronAPI?.writeChunk(sessionId, 'screen.webm', buf)
        }
      }

      recorder.onerror = (e: Event) => {
        console.error('MediaRecorder error:', e)
        setState('error')
      }

      recorder.start(1000) // 1-second chunks
    } catch (err) {
      console.error('startRecording error:', err)
      setState('error')
      throw err
    }
  }, [onBytesWritten])

  const stopRecording = useCallback(async (sessionId: string): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve()
        return
      }

      setState('saving')

      recorder.onstop = async () => {
        // Close file stream
        await window.electronAPI?.closeStream(sessionId, 'screen.webm')

        // Stop all tracks
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        mediaRecorderRef.current = null

        setState('done')
        resolve()
      }

      recorder.stop()
    })
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    totalBytesRef.current = 0
  }, [])

  return { state, startRecording, stopRecording, reset }
}
