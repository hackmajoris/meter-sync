import { useState, useEffect, useCallback } from 'react'
import { useAppData } from './hooks/useAppData'
import { Sidebar } from './components/layout/Sidebar'
import { DashboardPage } from './components/layout/DashboardPage'
import { SettingsPage } from './components/layout/SettingsPage'
import { AddCounterModal } from './components/modals/AddCounterModal'
import { AddHouseModal } from './components/modals/AddHouseModal'
import { AddEntryModal } from './components/modals/AddEntryModal'
import { ExpandedChart } from './components/charts/ExpandedChart'

export default function App() {
  const {
    houses, 
    counters, 
    loading, 
    error, 
    addHouse, 
    addCounter, 
    deleteCounter, 
    addEntry, 
    deleteEntry, 
    importEntries 
  } = useAppData()

  // UI state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day')
  const [showAvg, setShowAvg] = useState(false)
  const [showTrend, setShowTrend] = useState(false)
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard')
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)
  const isMobile = windowWidth < 768

  // Modal state
  const [showAddCounter, setShowAddCounter] = useState(false)
  const [showAddHouse, setShowAddHouse] = useState(false)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showExpandedChart, setShowExpandedChart] = useState(false)
  const [addingToHouseId, setAddingToHouseId] = useState<string>('')

  // Set initial selected counter and house ID when data loads
  useEffect(() => {
    if (!loading && counters.length > 0 && !selectedId) {
      setSelectedId(counters[0].id)
    }
    if (!loading && houses.length > 0 && !addingToHouseId) {
      setAddingToHouseId(houses[0].id)
    }
  }, [loading, counters, houses, selectedId, addingToHouseId])

  const counter = counters.find(c => c.id === selectedId) || counters[0]

  // Handlers
  const handleAddHouse = useCallback(async (name: string) => {
    await addHouse(name)
  }, [addHouse])

  const handleAddCounter = useCallback(async (data: { name: string; unit: string; color: string; houseId: string }) => {
    const newCounter = await addCounter(data)
    setSelectedId(newCounter.id)
  }, [addCounter])

  const handleAddEntry = useCallback(async (counterId: string, data: { date: string; value: number; note: string }) => {
    await addEntry(counterId, data)
  }, [addEntry])

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    if (counter) {
      await deleteEntry(counter.id, entryId)
    }
  }, [counter, deleteEntry])

  const handleDeleteCounter = useCallback(async (id: string) => {
    await deleteCounter(id)
    const next = counters.filter(c => c.id !== id)
    if (selectedId === id) setSelectedId(next[0]?.id || null)
  }, [deleteCounter, counters, selectedId])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowExpandedChart(false)
        setShowAddCounter(false)
        setShowAddEntry(false)
        if (isMobile) setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile])

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      setWindowWidth(w)
      setSidebarOpen(w >= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Loading state
  if (loading) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text2)' }}>Loading...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: '#ef4444' }}>Error: {error}</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 1440, height: '100vh', overflow: 'hidden', position: 'relative' }}>
        {/* Mobile sidebar overlay */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 199,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
            }}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          houses={houses}
          counters={counters}
          selectedId={selectedId}
          onSelectCounter={setSelectedId}
          onAddCounter={(houseId) => { setAddingToHouseId(houseId); setShowAddCounter(true) }}
          onAddHouse={() => setShowAddHouse(true)}
          onOpenSettings={() => setView('settings')}
          view={view}
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
        />

        {/* Main */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
          {view === 'settings' ? (
            <SettingsPage 
              counters={counters} 
              onImport={importEntries} 
              onBack={() => setView('dashboard')} 
            />
          ) : (
            <DashboardPage
              counter={counter}
              chartType={chartType}
              onToggleChartType={setChartType}
              groupBy={groupBy}
              onToggleGroupBy={setGroupBy}
              showAvg={showAvg}
              showTrend={showTrend}
              onToggleAvg={() => setShowAvg(v => !v)}
              onToggleTrend={() => setShowTrend(v => !v)}
              onAddEntry={() => setShowAddEntry(true)}
              onDeleteCounter={handleDeleteCounter}
              onDeleteEntry={handleDeleteEntry}
              onExpandChart={() => setShowExpandedChart(true)}
              onAddCounter={() => setShowAddCounter(true)}
              isMobile={isMobile}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          )}
        </main>

        {/* Modals */}
        {showAddCounter && (
          <AddCounterModal 
            onClose={() => setShowAddCounter(false)} 
            onAdd={handleAddCounter} 
            houses={houses} 
            defaultHouseId={addingToHouseId} 
          />
        )}
        {showAddHouse && (
          <AddHouseModal 
            onClose={() => setShowAddHouse(false)} 
            onAdd={handleAddHouse} 
          />
        )}
        {showAddEntry && counter && (
          <AddEntryModal 
            counter={counter} 
            onClose={() => setShowAddEntry(false)} 
            onAdd={handleAddEntry} 
          />
        )}
        {showExpandedChart && counter && (
          <ExpandedChart 
            counter={counter} 
            chartType={chartType} 
            onClose={() => setShowExpandedChart(false)} 
            onToggleType={setChartType} 
            groupBy={groupBy} 
            onToggleGroupBy={setGroupBy} 
            showAvg={showAvg} 
            showTrend={showTrend} 
            onToggleAvg={() => setShowAvg(v => !v)} 
            onToggleTrend={() => setShowTrend(v => !v)} 
          />
        )}
      </div>
    </div>
  )
}
