import { useState, useRef, useCallback } from 'react'
import type { ExportConfig } from '../App'

export type RecorderState = 'idle' | 'recording' | 'saving' | 'done' | 'error'

type Options = {
  onBytesWritten?: (total: number) => void
}

export function useWebcamRecorder({ onBytesWritten }: Options = {}) {
  const [state, setState] = useState<RecorderState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const totalBytesRef = useRef(0)

  /**
   * Start recording the provided webcam stream.
   * The stream is obtained externally (shown in WebcamPreview) to avoid
   * double-requesting camera permission.
   */
  const startRecording = useCallback(async (
    sessionId: string,
    webcamStream: MediaStream,
    config: ExportConfig
  ) => {
    try {
      setState('recording')
      totalBytesRef.current = 0

      // We also need audio from the microphone for the webcam track
      let combinedStream = webcamStream
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        const audioTrack = audioStream.getAudioTracks()[0]
        combinedStream = new MediaStream([...webcamStream.getTracks(), audioTrack])
      } catch {
        // Microphone not available — record video only
      }

      await window.electronAPI?.openStream(sessionId, 'webcam.webm')

      const videoBps = Math.min(config.videoBitrate * 1000, 1500000)
      const audioBps = config.audioBitrate * 1000

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm'

      const recorder = new MediaRecorder(combinedStream, {
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
          await window.electronAPI?.writeChunk(sessionId, 'webcam.webm', buf)
        }
      }

      recorder.onerror = () => setState('error')
      recorder.start(1000)
    } catch (err) {
      console.error('Webcam recorder error:', err)
      setState('error')
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
        await window.electronAPI?.closeStream(sessionId, 'webcam.webm')
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
