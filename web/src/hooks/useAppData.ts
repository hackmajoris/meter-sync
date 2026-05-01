/**
 * Custom hook for managing app data with API
 */

import { useState, useEffect, useCallback } from 'react'
import api, { type House, type Counter, type Entry } from '../lib'

/**
 * Extended counter type with entries included (for UI convenience)
 */
export interface CounterWithEntries extends Counter {
  entries: Entry[]
}

interface UseAppDataReturn {
  houses: House[]
  counters: CounterWithEntries[]
  loading: boolean
  error: string | null
  
  // Houses
  addHouse: (name: string) => Promise<void>
  updateHouse: (id: string, name: string) => Promise<void>
  deleteHouse: (id: string) => Promise<void>
  
  // Counters
  addCounter: (data: { name: string; unit: string; color: string; houseId: string }) => Promise<Counter>
  updateCounter: (id: string, data: Partial<Counter>) => Promise<void>
  deleteCounter: (id: string) => Promise<void>
  
  // Entries
  addEntry: (counterId: string, data: { date: string; value: number; note?: string }) => Promise<void>
  updateEntry: (counterId: string, entryId: string, data: Partial<Entry>) => Promise<void>
  deleteEntry: (counterId: string, entryId: string) => Promise<void>
  importEntries: (counterId: string, entries: Array<{ date: string; value: number; note?: string }>) => Promise<{ created: number; skipped: number }>
  
  // Utility
  refresh: () => Promise<void>
}

/**
 * Hook to manage all app data via API
 */
export function useAppData(): UseAppDataReturn {
  const [houses, setHouses] = useState<House[]>([])
  const [counters, setCounters] = useState<CounterWithEntries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load houses and counters in parallel
      const [housesData, countersData] = await Promise.all([
        api.getHouses(),
        api.getCounters(),
      ])
      
      // Load entries for each counter
      const countersWithEntries = await Promise.all(
        countersData.map(async (counter) => {
          const entries = await api.getEntries(counter.id)
          return { ...counter, entries }
        })
      )
      
      setHouses(housesData)
      setCounters(countersWithEntries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Houses
  const addHouse = useCallback(async (name: string) => {
    try {
      const newHouse = await api.createHouse({ name })
      setHouses(prev => [...prev, newHouse])
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create house')
    }
  }, [])

  const updateHouse = useCallback(async (id: string, name: string) => {
    try {
      const updated = await api.updateHouse(id, { name })
      setHouses(prev => prev.map(h => h.id === id ? updated : h))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update house')
    }
  }, [])

  const deleteHouse = useCallback(async (id: string) => {
    try {
      await api.deleteHouse(id)
      setHouses(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete house')
    }
  }, [])

  // Counters
  const addCounter = useCallback(async (data: { name: string; unit: string; color: string; houseId: string }) => {
    try {
      const newCounter = await api.createCounter(data)
      const counterWithEntries: CounterWithEntries = { ...newCounter, entries: [] }
      setCounters(prev => [...prev, counterWithEntries])
      return newCounter
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create counter')
    }
  }, [])

  const updateCounter = useCallback(async (id: string, data: Partial<Counter>) => {
    try {
      const updated = await api.updateCounter(id, data)
      setCounters(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update counter')
    }
  }, [])

  const deleteCounter = useCallback(async (id: string) => {
    try {
      await api.deleteCounter(id)
      setCounters(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete counter')
    }
  }, [])

  // Entries
  const addEntry = useCallback(async (counterId: string, data: { date: string; value: number; note?: string }) => {
    try {
      const newEntry = await api.createEntry(counterId, data)
      setCounters(prev => prev.map(c => {
        if (c.id !== counterId) return c
        // Remove any existing entry with same date (upsert behavior)
        const filteredEntries = c.entries.filter(e => e.date !== newEntry.date)
        return { ...c, entries: [...filteredEntries, newEntry] }
      }))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create entry')
    }
  }, [])

  const updateEntry = useCallback(async (counterId: string, entryId: string, data: Partial<Entry>) => {
    try {
      const updated = await api.updateEntry(counterId, entryId, data)
      setCounters(prev => prev.map(c => {
        if (c.id !== counterId) return c
        return { ...c, entries: c.entries.map(e => e.id === entryId ? updated : e) }
      }))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update entry')
    }
  }, [])

  const deleteEntry = useCallback(async (counterId: string, entryId: string) => {
    try {
      await api.deleteEntry(counterId, entryId)
      setCounters(prev => prev.map(c => {
        if (c.id !== counterId) return c
        return { ...c, entries: c.entries.filter(e => e.id !== entryId) }
      }))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }, [])

  const importEntries = useCallback(async (
    counterId: string,
    entries: Array<{ date: string; value: number; note?: string }>
  ) => {
    try {
      const result = await api.bulkCreateEntries(counterId, entries, { skipExisting: true })
      
      // Reload entries for this counter
      const updatedEntries = await api.getEntries(counterId)
      setCounters(prev => prev.map(c => 
        c.id === counterId ? { ...c, entries: updatedEntries } : c
      ))
      
      return { created: result.created, skipped: result.skipped }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to import entries')
    }
  }, [])

  return {
    houses,
    counters,
    loading,
    error,
    
    // Houses
    addHouse,
    updateHouse,
    deleteHouse,
    
    // Counters
    addCounter,
    updateCounter,
    deleteCounter,
    
    // Entries
    addEntry,
    updateEntry,
    deleteEntry,
    importEntries,
    
    // Utility
    refresh: loadData,
  }
}
