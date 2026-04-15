import React, { useState, useCallback } from 'react'
import TitleBar from './components/TitleBar'
import SourceSelector from './components/SourceSelector'
import RecordingControls from './components/RecordingControls'
import CompletedScreen from './components/CompletedScreen'
import ExportSettings from './components/ExportSettings'
import WebcamPreview from './components/WebcamPreview'
import './App.css'

export type AppView = 'setup' | 'recording' | 'completed'

export type SelectedSource = {
  id: string
  name: string
  thumbnail: string
}

export type ExportConfig = {
  videoBitrate: number    // kbps, e.g. 2500
  audioBitrate: number    // kbps, e.g. 128
  format: 'webm' | 'mp4'
  savePath: string | null // null = default (userData/videos)
}

export type CompletedSession = {
  sessionId: string
  duration: number        // seconds
  files: { name: string; size: number }[]
  sessionName: string
}

export default function App() {
  const [view, setView] = useState<AppView>('setup')
  const [selectedSource, setSelectedSource] = useState<SelectedSource | null>(null)
  const [webcamEnabled, setWebcamEnabled] = useState(true)
  const [showExportSettings, setShowExportSettings] = useState(false)
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    videoBitrate: 2500,
    audioBitrate: 128,
    format: 'webm',
    savePath: null,
  })
  const [completedSession, setCompletedSession] = useState<CompletedSession | null>(null)
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null)

  const handleRecordingComplete = useCallback((session: CompletedSession) => {
    setCompletedSession(session)
    setView('completed')
  }, [])

  const handleNewRecording = useCallback(() => {
    setCompletedSession(null)
    setSelectedSource(null)
    setView('setup')
  }, [])

  return (
    <div className="app-layout">
      <TitleBar />

      <div className="content-area" style={{ position: 'relative' }}>
        {/* Setup / Source Selection view */}
        {view === 'setup' && (
          <div className="main-view fade-in">
            <SourceSelector
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
            />
            <RecordingControls
              selectedSource={selectedSource}
              webcamEnabled={webcamEnabled}
              onWebcamToggle={setWebcamEnabled}
              exportConfig={exportConfig}
              onOpenExportSettings={() => setShowExportSettings(true)}
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={() => setView('recording')}
              webcamStream={webcamStream}
            />
          </div>
        )}

        {/* Active recording view */}
        {view === 'recording' && (
          <div className="main-view fade-in">
            <SourceSelector
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              disabled
            />
            <RecordingControls
              selectedSource={selectedSource}
              webcamEnabled={webcamEnabled}
              onWebcamToggle={setWebcamEnabled}
              exportConfig={exportConfig}
              onOpenExportSettings={() => setShowExportSettings(true)}
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={() => setView('recording')}
              webcamStream={webcamStream}
              autoStarted
            />
          </div>
        )}

        {/* Completed screen */}
        {view === 'completed' && completedSession && (
          <CompletedScreen
            session={completedSession}
            onNewRecording={handleNewRecording}
          />
        )}

        {/* Floating webcam preview */}
        {view !== 'completed' && webcamEnabled && (
          <WebcamPreview
            enabled={webcamEnabled}
            onStreamReady={setWebcamStream}
          />
        )}
      </div>

      {/* Export settings drawer */}
      {showExportSettings && (
        <ExportSettings
          config={exportConfig}
          onChange={setExportConfig}
          onClose={() => setShowExportSettings(false)}
        />
      )}
    </div>
  )
}
