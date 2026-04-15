import React, { useState } from 'react'
import type { ExportConfig } from '../App'

type Props = {
  config: ExportConfig
  onChange: (config: ExportConfig) => void
  onClose: () => void
}

export default function ExportSettings({ config, onChange, onClose }: Props) {
  const [localConfig, setLocalConfig] = useState<ExportConfig>(config)

  const update = <K extends keyof ExportConfig>(key: K, value: ExportConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSavePath = async () => {
    const p = await window.electronAPI?.getSavePath()
    if (p) update('savePath', p)
  }

  const handleApply = () => {
    onChange(localConfig)
    onClose()
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer slide-up" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Export Settings</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          {/* Format */}
          <div className="settings-section">
            <label className="settings-label">Output Format</label>
            <div className="format-pills">
              {(['webm', 'mp4'] as const).map(fmt => (
                <button
                  key={fmt}
                  className={`format-pill ${localConfig.format === fmt ? 'active' : ''}`}
                  onClick={() => update('format', fmt)}
                >
                  .{fmt}
                </button>
              ))}
            </div>
            <p className="settings-hint">
              {localConfig.format === 'webm'
                ? 'WebM is saved directly without conversion — fastest option.'
                : 'MP4 requires FFmpeg to be available for conversion.'}
            </p>
          </div>

          {/* Video bitrate */}
          <div className="settings-section">
            <label className="settings-label">
              Video Bitrate
              <span className="settings-value">{localConfig.videoBitrate} kbps</span>
            </label>
            <input
              type="range"
              min={500}
              max={8000}
              step={250}
              value={localConfig.videoBitrate}
              onChange={e => update('videoBitrate', Number(e.target.value))}
            />
            <div className="range-labels">
              <span>Low (500)</span>
              <span>HD (2500)</span>
              <span>4K (8000)</span>
            </div>
          </div>

          {/* Audio bitrate */}
          <div className="settings-section">
            <label className="settings-label">
              Audio Bitrate
              <span className="settings-value">{localConfig.audioBitrate} kbps</span>
            </label>
            <input
              type="range"
              min={64}
              max={320}
              step={32}
              value={localConfig.audioBitrate}
              onChange={e => update('audioBitrate', Number(e.target.value))}
            />
            <div className="range-labels">
              <span>64</span>
              <span>128</span>
              <span>320</span>
            </div>
          </div>

          {/* Save path */}
          <div className="settings-section">
            <label className="settings-label">Save Location</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="input" style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', height: 36, display: 'flex', alignItems: 'center' }}>
                {localConfig.savePath || 'Default: ~/AppData/recordings'}
              </div>
              <button className="btn btn-ghost" style={{ height: 36, whiteSpace: 'nowrap' }} onClick={handleSavePath}>
                Browse…
              </button>
              {localConfig.savePath && (
                <button className="btn btn-ghost" style={{ height: 36 }} onClick={() => update('savePath', null)}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>Apply Settings</button>
        </div>
      </div>
    </div>
  )
}
