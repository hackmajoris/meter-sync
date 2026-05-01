/**
 * Mock API implementation for development
 * Implements the IApi interface using in-memory data store
 */

import { mockDataStore } from './mockDataStore'
import type {
  House,
  Counter,
  Entry,
  CounterStats,
  BulkCreateResult,
  GetEntriesFilters,
  GetCountersFilters,
  GetStatsFilters,
  BulkCreateOptions,
  CreateHouseInput,
  UpdateHouseInput,
  CreateCounterInput,
  UpdateCounterInput,
  CreateEntryInput,
  UpdateEntryInput,
  IApi,
} from './api'

/**
 * Simulate network delay for realistic testing
 */
const MOCK_DELAY = 100 // ms

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Helper to simulate API errors
 */
function notFoundError(resource: string): Error {
  return new Error(`${resource} not found`)
}

// ============================================================================
// Houses API
// ============================================================================

/**
 * MockApiClient implements the IApi interface using in-memory data
 */
class MockApiClient implements IApi {
  async getHouses(): Promise<House[]> {
    await delay(MOCK_DELAY)
    return mockDataStore.getHouses()
  }

  async getHouse(id: string): Promise<House> {
    await delay(MOCK_DELAY)
    const house = mockDataStore.getHouse(id)
    if (!house) throw notFoundError('House')
    return house
  }

  async createHouse(data: CreateHouseInput): Promise<House> {
    await delay(MOCK_DELAY)
    
    if (!data.name || !data.name.trim()) {
      throw new Error('Validation error: name is required')
    }
    
    const house: House = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
    }
    
    return mockDataStore.createHouse(house)
  }

  async updateHouse(id: string, data: UpdateHouseInput): Promise<House> {
    await delay(MOCK_DELAY)
    
    if (!data.name || !data.name.trim()) {
      throw new Error('Validation error: name is required')
    }
    
    const updated = mockDataStore.updateHouse(id, { name: data.name.trim() })
    if (!updated) throw notFoundError('House')
    
    return updated
  }

  async deleteHouse(id: string): Promise<null> {
    await delay(MOCK_DELAY)
    
    // Check if house has counters
    const counters = mockDataStore.getCounters(id)
    if (counters.length > 0) {
      throw new Error('Cannot delete house with existing counters')
    }
    
    const deleted = mockDataStore.deleteHouse(id)
    if (!deleted) throw notFoundError('House')
    
    return null
  }

  // ============================================================================
  // Counters API
  // ============================================================================

  async getCounters(filters: GetCountersFilters = {}): Promise<Counter[]> {
    await delay(MOCK_DELAY)
    return mockDataStore.getCounters(filters.houseId)
  }

  async getCounter(id: string): Promise<Counter> {
    await delay(MOCK_DELAY)
    const counter = mockDataStore.getCounter(id)
    if (!counter) throw notFoundError('Counter')
    return counter
  }

  async createCounter(data: CreateCounterInput): Promise<Counter> {
    await delay(MOCK_DELAY)
    
    // Validation
    if (!data.name || !data.name.trim()) {
      throw new Error('Validation error: name is required')
    }
    if (!data.unit || !data.unit.trim()) {
      throw new Error('Validation error: unit is required')
    }
    if (!data.color) {
      throw new Error('Validation error: color is required')
    }
    if (!data.houseId) {
      throw new Error('Validation error: houseId is required')
    }
    
    // Check if house exists
    const house = mockDataStore.getHouse(data.houseId)
    if (!house) {
      throw new Error('Invalid houseId: house not found')
    }
    
    const counter: Counter = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      unit: data.unit.trim(),
      color: data.color,
      houseId: data.houseId,
    }
    
    return mockDataStore.createCounter(counter)
  }

  async updateCounter(id: string, data: UpdateCounterInput): Promise<Counter> {
    await delay(MOCK_DELAY)
    
    // Check if counter exists
    const existing = mockDataStore.getCounter(id)
    if (!existing) throw notFoundError('Counter')
    
    // Validate houseId if provided
    if (data.houseId) {
      const house = mockDataStore.getHouse(data.houseId)
      if (!house) {
        throw new Error('Invalid houseId: house not found')
      }
    }
    
    const updated = mockDataStore.updateCounter(id, data)
    if (!updated) throw notFoundError('Counter')
    
    return updated
  }

  async deleteCounter(id: string): Promise<null> {
    await delay(MOCK_DELAY)
    
    const deleted = mockDataStore.deleteCounter(id)
    if (!deleted) throw notFoundError('Counter')
    
    return null
  }

  // ============================================================================
  // Entries API
  // ============================================================================

  async getEntries(counterId: string, filters: GetEntriesFilters = {}): Promise<Entry[]> {
    await delay(MOCK_DELAY)
    
    // Check if counter exists
    const counter = mockDataStore.getCounter(counterId)
    if (!counter) throw notFoundError('Counter')
    
    let entries = mockDataStore.getEntries(counterId)
    
    // Apply filters
    if (filters.startDate) {
      entries = entries.filter(e => e.date >= filters.startDate!)
    }
    if (filters.endDate) {
      entries = entries.filter(e => e.date <= filters.endDate!)
    }
    
    // Sort by date descending
    entries.sort((a, b) => b.date.localeCompare(a.date))
    
    // Apply pagination
    if (filters.offset) {
      entries = entries.slice(filters.offset)
    }
    if (filters.limit) {
      entries = entries.slice(0, filters.limit)
    }
    
    return entries
  }

  async getEntry(counterId: string, entryId: string): Promise<Entry> {
    await delay(MOCK_DELAY)
    
    // Check if counter exists
    const counter = mockDataStore.getCounter(counterId)
    if (!counter) throw notFoundError('Counter')
    
    const entry = mockDataStore.getEntry(counterId, entryId)
    if (!entry) throw notFoundError('Entry')
    
    return entry
  }

  async createEntry(counterId: string, data: CreateEntryInput): Promise<Entry> {
    await delay(MOCK_DELAY)
    
    // Check if counter exists
    const counter = mockDataStore.getCounter(counterId)
    if (!counter) throw notFoundError('Counter')
    
    // Validation
    if (!data.date) {
      throw new Error('Validation error: date is required')
    }
    if (data.value === undefined || data.value === null) {
      throw new Error('Validation error: value is required')
    }
    if (typeof data.value !== 'number') {
      throw new Error('Validation error: value must be a number')
    }
    
    // Validate date format (YYYY-MM-DD)
    if (!data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error('Validation error: date must be in YYYY-MM-DD format')
    }
    
    const entry: Entry = {
      id: crypto.randomUUID(),
      date: data.date,
      value: data.value,
      note: data.note || '',
    }
    
    return mockDataStore.createEntry(counterId, entry)
  }

  async updateEntry(counterId: string, entryId: string, data: UpdateEntryInput): Promise<Entry> {
    await delay(MOCK_DELAY)
    
    // Check if counter exists
    const counter = mockDataStore.getCounter(counterId)
    if (!counter) throw notFoundError('Counter')
    
    // Validate date format if provided
    if (data.date && !data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error('Validation error: date must be in YYYY-MM-DD format')
    }
    
    const updated = mockDataStore.updateEntry(counterId, entryId, data)
    if (!updated) throw notFoundError('Entry')
    
    return updated
  }

  async deleteEntry(counterId: string, entryId: string): Promise<null> {
    await delay(MOCK_DELAY)
    
    // Check if counter exists
    const counter = mockDataStore.getCounter(counterId)
    if (!counter) throw notFoundError('Counter')
    
    const deleted = mockDataStore.deleteEntry(counterId, entryId)
    if (!deleted) throw notFoundError('Entry')
    
    return null
  }

  async bulkCreateEntries(
    counterId: string,
    entries: CreateEntryInput[],
    options: BulkCreateOptions = {}
  ): Promise<BulkCreateResult> {
    await delay(MOCK_DELAY)
    
    // Check if counter exists
    const counter = mockDataStore.getCounter(counterId)
    if (!counter) throw notFoundError('Counter')
    
    const result: BulkCreateResult = {
      created: 0,
      skipped: 0,
      errors: [],
    }
    
    const existingEntries = mockDataStore.getEntries(counterId)
    const existingDates = new Set(existingEntries.map(e => e.date))
    
    for (let i = 0; i < entries.length; i++) {
      const entryData = entries[i]
      
      try {
        // Skip if date already exists and skipExisting is true
        if (options.skipExisting && existingDates.has(entryData.date)) {
          result.skipped++
          continue
        }
        
        // Validate
        if (!entryData.date || !entryData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          throw new Error('Invalid date format')
        }
        if (typeof entryData.value !== 'number') {
          throw new Error('Value must be a number')
        }
        
        const entry: Entry = {
          id: crypto.randomUUID(),
          date: entryData.date,
          value: entryData.value,
          note: entryData.note || '',
        }
        
        mockDataStore.createEntry(counterId, entry)
        result.created++
        
      } catch (error) {
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    
    return result
  }

  // ============================================================================
  // Statistics API
  // ============================================================================

  async getCounterStats(counterId: string, filters: GetStatsFilters = {}): Promise<CounterStats> {
    await delay(MOCK_DELAY)
    
    // Check if counter exists
    const counter = mockDataStore.getCounter(counterId)
    if (!counter) throw notFoundError('Counter')
    
    let entries = mockDataStore.getEntries(counterId)
    
    // Apply date filters
    if (filters.startDate) {
      entries = entries.filter(e => e.date >= filters.startDate!)
    }
    if (filters.endDate) {
      entries = entries.filter(e => e.date <= filters.endDate!)
    }
    
    if (entries.length === 0) {
      return {
        avg: 0,
        total: 0,
        max: 0,
        min: 0,
        count: 0,
      }
    }
    
    const values = entries.map(e => e.value)
    const total = values.reduce((sum, v) => sum + v, 0)
    
    return {
      avg: +(total / values.length).toFixed(2),
      total: +total.toFixed(2),
      max: Math.max(...values),
      min: Math.min(...values),
      count: values.length,
    }
  }
}

// ============================================================================
// Export singleton instance and individual methods for backward compatibility
// ============================================================================

const mockApiClient = new MockApiClient()

// Export individual functions for backward compatibility
export const getHouses = mockApiClient.getHouses.bind(mockApiClient)
export const getHouse = mockApiClient.getHouse.bind(mockApiClient)
export const createHouse = mockApiClient.createHouse.bind(mockApiClient)
export const updateHouse = mockApiClient.updateHouse.bind(mockApiClient)
export const deleteHouse = mockApiClient.deleteHouse.bind(mockApiClient)

export const getCounters = mockApiClient.getCounters.bind(mockApiClient)
export const getCounter = mockApiClient.getCounter.bind(mockApiClient)
export const createCounter = mockApiClient.createCounter.bind(mockApiClient)
export const updateCounter = mockApiClient.updateCounter.bind(mockApiClient)
export const deleteCounter = mockApiClient.deleteCounter.bind(mockApiClient)

export const getEntries = mockApiClient.getEntries.bind(mockApiClient)
export const getEntry = mockApiClient.getEntry.bind(mockApiClient)
export const createEntry = mockApiClient.createEntry.bind(mockApiClient)
export const updateEntry = mockApiClient.updateEntry.bind(mockApiClient)
export const deleteEntry = mockApiClient.deleteEntry.bind(mockApiClient)
export const bulkCreateEntries = mockApiClient.bulkCreateEntries.bind(mockApiClient)

export const getCounterStats = mockApiClient.getCounterStats.bind(mockApiClient)

// ============================================================================
// Export as default object
// ============================================================================

const mockApi: IApi = mockApiClient

export default mockApi
