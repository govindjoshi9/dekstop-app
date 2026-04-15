import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { SelectedSource, ExportConfig, CompletedSession } from '../App'
import { useScreenRecorder } from '../hooks/useScreenRecorder'
import { useWebcamRecorder } from '../hooks/useWebcamRecorder'

type Props = {
  selectedSource: SelectedSource | null
  webcamEnabled: boolean
  onWebcamToggle: (enabled: boolean) => void
  exportConfig: ExportConfig
  onOpenExportSettings: () => void
  onRecordingComplete: (session: CompletedSession) => void
  onRecordingStart: () => void
  webcamStream: MediaStream | null
  autoStarted?: boolean
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`
}

export default function RecordingControls({
  selectedSource,
  webcamEnabled,
  onWebcamToggle,
  exportConfig,
  onOpenExportSettings,
  onRecordingComplete,
  onRecordingStart,
  webcamStream,
  autoStarted,
}: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [screenBytes, setScreenBytes] = useState(0)
  const [webcamBytes, setWebcamBytes] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const {
    state: screenState,
    startRecording: startScreen,
    stopRecording: stopScreen,
  } = useScreenRecorder({ onBytesWritten: setScreenBytes })

  const {
    startRecording: startWebcam,
    stopRecording: stopWebcam,
  } = useWebcamRecorder({ onBytesWritten: setWebcamBytes })

  const isRecording = screenState === 'recording'
  const isSaving = screenState === 'saving'

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRecording])

  // Focus name input
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  const handleStart = useCallback(async () => {
    if (!selectedSource) return

    const session = await window.electronAPI?.createSession()
    if (!session) return

    const defaultName = `Recording ${new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })}`

    setSessionId(session.id)
    setSessionName(defaultName)
    setElapsed(0)
    setScreenBytes(0)
    setWebcamBytes(0)

    await startScreen(session.id, selectedSource.id, exportConfig)

    if (webcamEnabled && webcamStream) {
      await startWebcam(session.id, webcamStream, exportConfig)
    }

    onRecordingStart()
  }, [selectedSource, webcamEnabled, webcamStream, exportConfig, startScreen, startWebcam, onRecordingStart])

  const handleStop = useCallback(async () => {
    if (!sessionId) return

    await Promise.all([
      stopScreen(sessionId),
      webcamEnabled ? stopWebcam(sessionId) : Promise.resolve(),
    ])

    const info = await window.electronAPI?.getSessionInfo(sessionId)

    onRecordingComplete({
      sessionId,
      duration: elapsed,
      files: info?.files ?? [],
      sessionName,
    })
  }, [sessionId, elapsed, sessionName, webcamEnabled, stopScreen, stopWebcam, onRecordingComplete])

  const handleSaveName = useCallback(async () => {
    if (!sessionId || !nameInput.trim()) { setEditingName(false); return }
    const result = await window.electronAPI?.renameSession(sessionId, nameInput.trim())
    if (result?.success) {
      setSessionName(nameInput.trim())
    }
    setEditingName(false)
  }, [sessionId, nameInput])

  const startEditName = () => {
    setNameInput(sessionName)
    setEditingName(true)
  }

  return (
    <div className="recording-controls">
      {/* Session name row */}
      <div className="rec-session-row">
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input
              ref={nameInputRef}
              className="input"
              style={{ flex: 1, height: 36 }}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') setEditingName(false)
              }}
              placeholder="Session name…"
              maxLength={80}
            />
            <button className="btn btn-primary" style={{ padding: '0 16px', height: 36 }} onClick={handleSaveName}>
              Save
            </button>
            <button className="btn btn-ghost" style={{ padding: '0 12px', height: 36 }} onClick={() => setEditingName(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="rec-session-name" onClick={isRecording ? startEditName : undefined}>
            <span>{sessionName || (isRecording ? 'Unnamed Recording' : '')}</span>
            {isRecording && (
              <button className="btn-icon" style={{ fontSize: 13 }} onClick={startEditName} title="Rename session">
                ✏️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main controls row */}
      <div className="rec-bar">
        {/* Webcam toggle */}
        <label className="toggle" data-tooltip={webcamEnabled ? 'Disable webcam' : 'Enable webcam'}>
          <input
            type="checkbox"
            checked={webcamEnabled}
            onChange={e => !isRecording && onWebcamToggle(e.target.checked)}
            disabled={isRecording}
          />
          <span className="toggle-slider" />
        </label>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13, marginLeft: 4 }}>Webcam</span>

        {/* Timer / status */}
        <div className="rec-status">
          {isRecording ? (
            <>
              <span className="rec-dot dot-blink">●</span>
              <span className="rec-timer">{formatTime(elapsed)}</span>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                <span>🖥️ {formatBytes(screenBytes)}</span>
                {webcamEnabled && <span>📷 {formatBytes(webcamBytes)}</span>}
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {selectedSource ? `Ready — ${selectedSource.name}` : 'No source selected'}
            </span>
          )}
        </div>

        {/* Settings button */}
        <button
          className="btn btn-ghost"
          style={{ fontSize: 13, padding: '8px 14px' }}
          onClick={onOpenExportSettings}
          disabled={isRecording}
          data-tooltip="Export settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          Settings
        </button>

        {/* Record / Stop button */}
        {!isRecording ? (
          <button
            className="btn btn-primary rec-pulse"
            style={{ minWidth: 160 }}
            onClick={handleStart}
            disabled={!selectedSource || isSaving}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8"/>
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            className="btn btn-danger"
            style={{ minWidth: 160 }}
            onClick={handleStop}
            disabled={isSaving}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            {isSaving ? 'Saving…' : 'Stop Recording'}
          </button>
        )}
      </div>
    </div>
  )
}
