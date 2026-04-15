import React, { useState } from 'react'
import type { CompletedSession } from '../App'

type Props = {
  session: CompletedSession
  onNewRecording: () => void
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`
}

export default function CompletedScreen({ session, onNewRecording }: Props) {
  const [merging, setMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(session.sessionName)
  const [currentSessionId, setCurrentSessionId] = useState(session.sessionId)

  const handleOpenFolder = () => {
    window.electronAPI?.openFolder(currentSessionId)
  }

  const handleMerge = async () => {
    setMerging(true)
    setMergeResult(null)
    const result = await window.electronAPI?.mergeRecordings(currentSessionId)
    setMerging(false)
    setMergeResult(result ?? { success: false, error: 'No API available' })
  }

  const handleRename = async () => {
    if (!nameInput.trim()) return
    const result = await window.electronAPI?.renameSession(currentSessionId, nameInput.trim())
    if (result?.success) {
      // The folder was renamed; update our session ID to the new name
      setCurrentSessionId(nameInput.trim())
    }
    setRenaming(false)
  }

  const hasWebcam = session.files.some(f => f.name === 'webcam.webm')
  const hasFinal  = session.files.some(f => f.name === 'final.mp4')
  const screenFile = session.files.find(f => f.name === 'screen.webm')
  const webcamFile = session.files.find(f => f.name === 'webcam.webm')

  return (
    <div className="completed-screen slide-up">
      {/* Success header */}
      <div className="completed-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>

      <h1 className="completed-title">Recording Complete!</h1>
      <p className="completed-subtitle">Your recording has been saved successfully.</p>

      {/* Stats row */}
      <div className="completed-stats">
        <div className="stat-card">
          <div className="stat-value">{formatTime(session.duration)}</div>
          <div className="stat-label">Duration</div>
        </div>
        {screenFile && (
          <div className="stat-card">
            <div className="stat-value">{formatBytes(screenFile.size)}</div>
            <div className="stat-label">Screen file</div>
          </div>
        )}
        {webcamFile && (
          <div className="stat-card">
            <div className="stat-value">{formatBytes(webcamFile.size)}</div>
            <div className="stat-label">Webcam file</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-value">{session.files.length}</div>
          <div className="stat-label">Files saved</div>
        </div>
      </div>

      {/* File list */}
      <div className="completed-files">
        <h3 style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Saved Files
        </h3>
        {session.files.map(f => (
          <div key={f.name} className="file-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="file-icon">
                {f.name.endsWith('.mp4') ? '🎬' : f.name.startsWith('screen') ? '🖥️' : '📷'}
              </span>
              <span className="file-name">{f.name}</span>
            </div>
            <span className="file-size">{formatBytes(f.size)}</span>
          </div>
        ))}
      </div>

      {/* Session name / rename */}
      <div className="completed-name-row">
        {renaming ? (
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input
              className="input"
              style={{ flex: 1, height: 36 }}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setRenaming(false)
              }}
              autoFocus
              maxLength={80}
            />
            <button className="btn btn-primary" style={{ padding: '0 16px', height: 36 }} onClick={handleRename}>Save</button>
            <button className="btn btn-ghost" style={{ padding: '0 12px', height: 36 }} onClick={() => setRenaming(false)}>Cancel</button>
          </div>
        ) : (
          <div className="rec-session-name" style={{ flex: 1 }}>
            <span style={{ color: 'var(--text-primary)' }}>{nameInput || session.sessionName}</span>
            <button className="btn-icon" onClick={() => setRenaming(true)} title="Rename session">✏️</button>
          </div>
        )}
      </div>

      {/* Merge result */}
      {mergeResult && (
        <div className={`merge-result ${mergeResult.success ? 'success' : 'error'}`}>
          {mergeResult.success
            ? '✅ Merged successfully! final.mp4 has been created.'
            : `❌ Merge failed: ${mergeResult.error}`}
        </div>
      )}

      {/* Action buttons */}
      <div className="completed-actions">
        <button className="btn btn-success" onClick={handleOpenFolder}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Open Folder
        </button>

        {hasWebcam && !hasFinal && (
          <button className="btn btn-ghost" onClick={handleMerge} disabled={merging}>
            {merging ? (
              <>
                <span className="spinner" />
                Merging…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                  <line x1="6" y1="9" x2="6" y2="15"/><path d="M18 9a9 9 0 0 0-9 9"/>
                </svg>
                Merge to MP4
              </>
            )}
          </button>
        )}

        <button className="btn btn-primary" onClick={onNewRecording}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          New Recording
        </button>
      </div>
    </div>
  )
}
