import realApi from './api'
import mockApi from './mockApi'

export default import.meta.env.VITE_DEMO ? mockApi : realApi
export type * from './api'
