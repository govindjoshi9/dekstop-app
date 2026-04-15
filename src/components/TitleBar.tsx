import React from 'react'

export default function TitleBar() {
  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleMaximize = () => window.electronAPI?.maximizeWindow()
  const handleClose    = () => window.electronAPI?.closeWindow()

  return (
    <div className="titlebar">
      <div className="titlebar-title">
        <span className="titlebar-dot" />
        Screen &amp; Webcam Recorder
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={handleMinimize} title="Minimize">
          <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
            <rect width="10" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
        <button className="titlebar-btn" onClick={handleMaximize} title="Maximize">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="0.5" y="0.5" width="9" height="9" rx="2" stroke="currentColor"/>
          </svg>
        </button>
        <button className="titlebar-btn close" onClick={handleClose} title="Close">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
