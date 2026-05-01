/**
 * Mock data store for development
 * Simulates a backend database with in-memory storage
 */

import type { House, Counter, Entry } from './api'

// Helper to generate sample entries with realistic seasonal patterns
function genSampleEntries(baseVal: number, variance: number, daysBack = 365): Entry[] {
  const entries: Entry[] = []
  const today = new Date()
  
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    // Seasonal multiplier: higher in winter months (Dec-Feb), lower in summer (Jun-Aug)
    const month = d.getMonth() // 0=Jan
    const seasonal = 1 + 0.25 * Math.cos(((month - 0) / 12) * 2 * Math.PI)
    const val = +(baseVal * seasonal + (Math.random() - 0.5) * variance * 2).toFixed(2)
    entries.push({
      id: crypto.randomUUID(),
      date: d.toISOString().split('T')[0],
      value: Math.max(0, val),
      note: ''
    })
  }
  
  return entries
}

// Initial mock data
const INITIAL_HOUSES: House[] = [
  { id: 'h1', name: 'Home' }
]

const INITIAL_COUNTERS: Counter[] = [
  {
    id: 'c1',
    name: 'Electricity',
    unit: 'kWh',
    color: '#3b82f6',
    houseId: 'h1'
  },
  {
    id: 'c2',
    name: 'Gas',
    unit: 'm³',
    color: '#f97316',
    houseId: 'h1'
  },
  {
    id: 'c3',
    name: 'Water',
    unit: 'L',
    color: '#06b6d4',
    houseId: 'h1'
  }
]

// Generate initial entries for each counter
const INITIAL_ENTRIES: Record<string, Entry[]> = {
  'c1': genSampleEntries(14.5, 4),
  'c2': genSampleEntries(3.2, 1),
  'c3': genSampleEntries(180, 40)
}

/**
 * In-memory data store
 * This simulates a database and persists data during the session
 */
class MockDataStore {
  private houses: House[]
  private counters: Counter[]
  private entries: Record<string, Entry[]> // keyed by counter ID

  constructor() {
    // Initialize with sample data
    this.houses = [...INITIAL_HOUSES]
    this.counters = [...INITIAL_COUNTERS]
    this.entries = { ...INITIAL_ENTRIES }
  }

  // Houses
  getHouses(): House[] {
    return [...this.houses]
  }

  getHouse(id: string): House | undefined {
    return this.houses.find(h => h.id === id)
  }

  createHouse(house: House): House {
    this.houses.push(house)
    return house
  }

  updateHouse(id: string, data: Partial<House>): House | undefined {
    const index = this.houses.findIndex(h => h.id === id)
    if (index === -1) return undefined
    
    this.houses[index] = { ...this.houses[index], ...data }
    return this.houses[index]
  }

  deleteHouse(id: string): boolean {
    const index = this.houses.findIndex(h => h.id === id)
    if (index === -1) return false
    
    this.houses.splice(index, 1)
    return true
  }

  // Counters
  getCounters(houseId?: string): Counter[] {
    if (houseId) {
      return this.counters.filter(c => c.houseId === houseId)
    }
    return [...this.counters]
  }

  getCounter(id: string): Counter | undefined {
    return this.counters.find(c => c.id === id)
  }

  createCounter(counter: Counter): Counter {
    this.counters.push(counter)
    // Initialize empty entries array for this counter
    this.entries[counter.id] = []
    return counter
  }

  updateCounter(id: string, data: Partial<Counter>): Counter | undefined {
    const index = this.counters.findIndex(c => c.id === id)
    if (index === -1) return undefined
    
    this.counters[index] = { ...this.counters[index], ...data }
    return this.counters[index]
  }

  deleteCounter(id: string): boolean {
    const index = this.counters.findIndex(c => c.id === id)
    if (index === -1) return false
    
    this.counters.splice(index, 1)
    // Also delete all entries for this counter
    delete this.entries[id]
    return true
  }

  // Entries
  getEntries(counterId: string): Entry[] {
    return [...(this.entries[counterId] || [])]
  }

  getEntry(counterId: string, entryId: string): Entry | undefined {
    const entries = this.entries[counterId] || []
    return entries.find(e => e.id === entryId)
  }

  createEntry(counterId: string, entry: Entry): Entry {
    if (!this.entries[counterId]) {
      this.entries[counterId] = []
    }
    
    // Check if entry with same date exists (upsert behavior)
    const existingIndex = this.entries[counterId].findIndex(e => e.date === entry.date)
    if (existingIndex !== -1) {
      this.entries[counterId][existingIndex] = entry
    } else {
      this.entries[counterId].push(entry)
    }
    
    return entry
  }

  updateEntry(counterId: string, entryId: string, data: Partial<Entry>): Entry | undefined {
    const entries = this.entries[counterId] || []
    const index = entries.findIndex(e => e.id === entryId)
    if (index === -1) return undefined
    
    entries[index] = { ...entries[index], ...data }
    return entries[index]
  }

  deleteEntry(counterId: string, entryId: string): boolean {
    const entries = this.entries[counterId] || []
    const index = entries.findIndex(e => e.id === entryId)
    if (index === -1) return false
    
    entries.splice(index, 1)
    return true
  }

  // Utility to reset data
  reset(): void {
    this.houses = [...INITIAL_HOUSES]
    this.counters = [...INITIAL_COUNTERS]
    this.entries = { ...INITIAL_ENTRIES }
  }
}

// Export singleton instance
export const mockDataStore = new MockDataStore()
