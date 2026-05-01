/**
 * API client factory
 * Switches between mock and real API based on environment
 */

import realApi from './api'
import mockApi from './mockApi'

// Use mock API in development, real API in production
const USE_MOCK_API = import.meta.env.DEV ?? true

/**
 * Unified API client
 * Automatically uses mock API in development and real API in production
 */
const api = USE_MOCK_API ? mockApi : realApi

export default api

// Re-export all types for convenience
export type * from './api'
