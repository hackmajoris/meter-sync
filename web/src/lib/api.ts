/**
 * API client for the counter app backend
 * 
 * All endpoints are under /api/ prefix
 * Error handling: throws errors with message property for failed requests
 */

const API_BASE = '/api'

// ============================================================================
// Type Definitions
// ============================================================================

export interface House {
  id: string
  name: string
}

export interface Counter {
  id: string
  name: string
  unit: string
  color: string
  houseId: string
}

export interface Entry {
  id: string
  date: string
  value: number
  note: string
}

export interface CounterStats {
  avg: number
  total: number
  max: number
  min: number
  count: number
}

export interface BulkCreateResult {
  created: number
  skipped: number
  errors: Array<{
    index: number
    error: string
  }>
}

export interface GetEntriesFilters {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface GetCountersFilters {
  houseId?: string
}

export interface GetStatsFilters {
  startDate?: string
  endDate?: string
}

export interface BulkCreateOptions {
  skipExisting?: boolean
}

export interface CreateHouseInput {
  name: string
}

export interface UpdateHouseInput {
  name: string
}

export interface CreateCounterInput {
  name: string
  unit: string
  color: string
  houseId: string
}

export interface UpdateCounterInput {
  name?: string
  unit?: string
  color?: string
  houseId?: string
}

export interface CreateEntryInput {
  date: string
  value: number
  note?: string
}

export interface UpdateEntryInput {
  date?: string
  value?: number
  note?: string
}

// ============================================================================
// API Interface
// ============================================================================

/**
 * API interface that must be implemented by both real and mock API clients
 * This ensures type safety and that mocks stay in sync with the real implementation
 */
export interface IApi {
  // Houses
  getHouses(): Promise<House[]>
  getHouse(id: string): Promise<House>
  createHouse(data: CreateHouseInput): Promise<House>
  updateHouse(id: string, data: UpdateHouseInput): Promise<House>
  deleteHouse(id: string): Promise<null>
  
  // Counters
  getCounters(filters?: GetCountersFilters): Promise<Counter[]>
  getCounter(id: string): Promise<Counter>
  createCounter(data: CreateCounterInput): Promise<Counter>
  updateCounter(id: string, data: UpdateCounterInput): Promise<Counter>
  deleteCounter(id: string): Promise<null>
  
  // Entries
  getEntries(counterId: string, filters?: GetEntriesFilters): Promise<Entry[]>
  getEntry(counterId: string, entryId: string): Promise<Entry>
  createEntry(counterId: string, data: CreateEntryInput): Promise<Entry>
  updateEntry(counterId: string, entryId: string, data: UpdateEntryInput): Promise<Entry>
  deleteEntry(counterId: string, entryId: string): Promise<null>
  bulkCreateEntries(counterId: string, entries: CreateEntryInput[], options?: BulkCreateOptions): Promise<BulkCreateResult>
  
  // Statistics
  getCounterStats(counterId: string, filters?: GetStatsFilters): Promise<CounterStats>
}

// ============================================================================
// Generic fetch wrapper with error handling
// ============================================================================

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Request failed with status ${response.status}`)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T
    }

    return await response.json()
  } catch (error) {
    // Re-throw with additional context
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network request failed')
  }
}

// ============================================================================
// Houses API
// ============================================================================

/**
 * ApiClient implements the IApi interface using real HTTP requests
 */
class ApiClient implements IApi {
  /**
   * Get all houses
   */
  async getHouses(): Promise<House[]> {
    return request<House[]>('/houses')
  }

  /**
   * Get a single house by ID
   */
  async getHouse(id: string): Promise<House> {
    return request<House>(`/houses/${id}`)
  }

  /**
   * Create a new house
   */
  async createHouse(data: CreateHouseInput): Promise<House> {
    return request<House>('/houses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update a house
   */
  async updateHouse(id: string, data: UpdateHouseInput): Promise<House> {
    return request<House>(`/houses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete a house
   */
  async deleteHouse(id: string): Promise<null> {
    return request<null>(`/houses/${id}`, {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // Counters API
  // ============================================================================

  /**
   * Get all counters
   */
  async getCounters(filters: GetCountersFilters = {}): Promise<Counter[]> {
    const params = new URLSearchParams()
    if (filters.houseId) {
      params.append('houseId', filters.houseId)
    }
    
    const query = params.toString()
    return request<Counter[]>(`/counters${query ? `?${query}` : ''}`)
  }

  /**
   * Get a single counter by ID
   */
  async getCounter(id: string): Promise<Counter> {
    return request<Counter>(`/counters/${id}`)
  }

  /**
   * Create a new counter
   */
  async createCounter(data: CreateCounterInput): Promise<Counter> {
    return request<Counter>('/counters', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update a counter
   */
  async updateCounter(id: string, data: UpdateCounterInput): Promise<Counter> {
    return request<Counter>(`/counters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete a counter and all its entries
   */
  async deleteCounter(id: string): Promise<null> {
    return request<null>(`/counters/${id}`, {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // Entries API
  // ============================================================================

  /**
   * Get all entries for a counter
   */
  async getEntries(counterId: string, filters: GetEntriesFilters = {}): Promise<Entry[]> {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.offset) params.append('offset', filters.offset.toString())
    
    const query = params.toString()
    return request<Entry[]>(`/counters/${counterId}/entries${query ? `?${query}` : ''}`)
  }

  /**
   * Get a single entry by ID
   */
  async getEntry(counterId: string, entryId: string): Promise<Entry> {
    return request<Entry>(`/counters/${counterId}/entries/${entryId}`)
  }

  /**
   * Create a new entry for a counter
   */
  async createEntry(counterId: string, data: CreateEntryInput): Promise<Entry> {
    return request<Entry>(`/counters/${counterId}/entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update an entry
   */
  async updateEntry(counterId: string, entryId: string, data: UpdateEntryInput): Promise<Entry> {
    return request<Entry>(`/counters/${counterId}/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete an entry
   */
  async deleteEntry(counterId: string, entryId: string): Promise<null> {
    return request<null>(`/counters/${counterId}/entries/${entryId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Bulk create entries for a counter (useful for CSV import)
   */
  async bulkCreateEntries(
    counterId: string,
    entries: CreateEntryInput[],
    options: BulkCreateOptions = {}
  ): Promise<BulkCreateResult> {
    return request<BulkCreateResult>(`/counters/${counterId}/entries/bulk`, {
      method: 'POST',
      body: JSON.stringify({
        entries,
        skipExisting: options.skipExisting ?? true,
      }),
    })
  }

  // ============================================================================
  // Statistics API (optional - can be computed client-side)
  // ============================================================================

  /**
   * Get statistics for a counter
   */
  async getCounterStats(
    counterId: string,
    filters: GetStatsFilters = {}
  ): Promise<CounterStats> {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    
    const query = params.toString()
    return request<CounterStats>(`/counters/${counterId}/stats${query ? `?${query}` : ''}`)
  }
}

// ============================================================================
// Export singleton instance and individual methods for backward compatibility
// ============================================================================

const apiClient = new ApiClient()

// Export individual functions for backward compatibility
export const getHouses = apiClient.getHouses.bind(apiClient)
export const getHouse = apiClient.getHouse.bind(apiClient)
export const createHouse = apiClient.createHouse.bind(apiClient)
export const updateHouse = apiClient.updateHouse.bind(apiClient)
export const deleteHouse = apiClient.deleteHouse.bind(apiClient)

export const getCounters = apiClient.getCounters.bind(apiClient)
export const getCounter = apiClient.getCounter.bind(apiClient)
export const createCounter = apiClient.createCounter.bind(apiClient)
export const updateCounter = apiClient.updateCounter.bind(apiClient)
export const deleteCounter = apiClient.deleteCounter.bind(apiClient)

export const getEntries = apiClient.getEntries.bind(apiClient)
export const getEntry = apiClient.getEntry.bind(apiClient)
export const createEntry = apiClient.createEntry.bind(apiClient)
export const updateEntry = apiClient.updateEntry.bind(apiClient)
export const deleteEntry = apiClient.deleteEntry.bind(apiClient)
export const bulkCreateEntries = apiClient.bulkCreateEntries.bind(apiClient)

export const getCounterStats = apiClient.getCounterStats.bind(apiClient)

// ============================================================================
// Export API functions as default object for convenience
// ============================================================================

const api: IApi = apiClient

export default api
