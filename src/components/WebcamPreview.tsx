import React, { useEffect, useRef, useState, useCallback } from 'react'

type Props = {
  enabled: boolean
  onStreamReady: (stream: MediaStream | null) => void
}

export default function WebcamPreview({ enabled, onStreamReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos] = useState({ x: 20, y: 20 }) // from bottom-right
  const dragOffset = useRef({ x: 0, y: 0 })

  // Acquire webcam stream
  useEffect(() => {
    if (!enabled) {
      stream?.getTracks().forEach(t => t.stop())
      setStream(null)
      onStreamReady(null)
      if (videoRef.current) videoRef.current.srcObject = null
      return
    }

    let active = true
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then(s => {
        if (!active) { s.getTracks().forEach(t => t.stop()); return }
        setStream(s)
        setError(null)
        onStreamReady(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().catch(() => {})
        }
      })
      .catch(err => {
        if (!active) return
        setError(err.name === 'NotAllowedError'
          ? 'Camera permission denied'
          : 'Could not access camera')
        onStreamReady(null)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream])

  // Dragging logic
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const parent = containerRef.current?.parentElement?.getBoundingClientRect()
    if (!parent) return
    // offset from bottom-right corner
    dragOffset.current = {
      x: parent.right - e.clientX - pos.x,
      y: parent.bottom - e.clientY - pos.y,
    }
    setIsDragging(true)
  }, [pos])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      const parent = containerRef.current?.parentElement?.getBoundingClientRect()
      if (!parent) return
      const newX = Math.max(8, Math.min(parent.width - 172, parent.right - e.clientX - dragOffset.current.x))
      const newY = Math.max(8, Math.min(parent.height - 140, parent.bottom - e.clientY - dragOffset.current.y))
      setPos({ x: newX, y: newY })
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  return (
    <div
      ref={containerRef}
      className="webcam-preview"
      style={{ right: pos.x, bottom: pos.y, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
    >
      {error ? (
        <div className="webcam-error">
          <span>🚫</span>
          <span style={{ fontSize: 11 }}>{error}</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="webcam-video"
        />
      )}
      <div className="webcam-label">
        <span className="dot-blink" style={{ color: 'var(--accent-red)', marginRight: 4 }}>●</span>
        CAM
      </div>
    </div>
  )
}
