import React, { useEffect, useState, useCallback, useRef } from 'react'
import type { SelectedSource } from '../App'

type DesktopSource = {
  id: string
  name: string
  displayId: string
  thumbnail: string
  appIcon: string | null
}

type Props = {
  selectedSource: SelectedSource | null
  onSelectSource: (src: SelectedSource) => void
  disabled?: boolean
}

type TabType = 'screen' | 'window'

export default function SourceSelector({ selectedSource, onSelectSource, disabled }: Props) {
  const [sources, setSources] = useState<DesktopSource[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('screen')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadSources = useCallback(async () => {
    try {
      const raw = await window.electronAPI?.getSources()
      if (raw) setSources(raw)
    } catch (e) {
      console.error('Failed to get sources:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSources()
    // Refresh thumbnails every 3 seconds when not disabled
    if (!disabled) {
      refreshInterval.current = setInterval(loadSources, 3000)
    }
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current)
    }
  }, [loadSources, disabled])

  const screens = sources.filter(s => s.id.startsWith('screen:'))
  const windows = sources.filter(s => s.id.startsWith('window:'))

  const displayed = (activeTab === 'screen' ? screens : windows).filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="source-selector">
      {/* Header */}
      <div className="source-selector__header">
        <div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: 2 }}>
            Select a source
          </h2>
          <p style={{ fontSize: 13 }}>
            Choose a screen or window to record
          </p>
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 13, padding: '7px 14px' }}
          onClick={loadSources}
          disabled={disabled}
          data-tooltip="Refresh sources"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="source-selector__toolbar">
        <div className="source-tabs">
          {(['screen', 'window'] as TabType[]).map(tab => (
            <button
              key={tab}
              className={`source-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'screen' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}s
              <span className="source-tab__count">
                {tab === 'screen' ? screens.length : windows.length}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'window' && (
          <div className="source-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
              placeholder="Search windows…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="source-grid-wrapper">
        {loading ? (
          <div className="source-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="source-card shimmer" style={{ height: 140 }} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="source-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <p>No {activeTab}s found</p>
          </div>
        ) : (
          <div className="source-grid">
            {displayed.map(src => {
              const isSelected = selectedSource?.id === src.id
              return (
                <button
                  key={src.id}
                  className={`source-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled-card' : ''}`}
                  onClick={() => !disabled && onSelectSource({ id: src.id, name: src.name, thumbnail: src.thumbnail })}
                  disabled={disabled}
                >
                  <div className="source-card__thumb">
                    <img src={src.thumbnail} alt={src.name} draggable={false} />
                    {isSelected && (
                      <div className="source-card__selected-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Selected
                      </div>
                    )}
                  </div>
                  <div className="source-card__info">
                    {src.appIcon && <img src={src.appIcon} className="source-card__icon" alt="" />}
                    <span className="source-card__name" title={src.name}>{src.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
