# Frontend API Interface Documentation

This document describes the API interface expected by the frontend application. All endpoints should be implemented under the `/api` prefix.

## Base URL
All API endpoints are prefixed with `/api`

## Response Format
- Success responses should return JSON with appropriate HTTP status codes (200, 201, 204)
- Error responses should return JSON with the following structure:
  ```json
  {
    "message": "Error description"
  }
  ```

## Authentication
Currently not implemented. Can be added later with Bearer tokens in `Authorization` header.

---

## Houses API

### GET /api/houses
Get all houses.

**Response**: `200 OK`
```json
[
  {
    "id": "h1",
    "name": "Home"
  },
  {
    "id": "h2",
    "name": "Cottage"
  }
]
```

---

### GET /api/houses/:id
Get a single house by ID.

**Parameters**:
- `id` (path) - House ID

**Response**: `200 OK`
```json
{
  "id": "h1",
  "name": "Home"
}
```

**Errors**:
- `404 Not Found` - House not found

---

### POST /api/houses
Create a new house.

**Request Body**:
```json
{
  "name": "Home"
}
```

**Response**: `201 Created`
```json
{
  "id": "generated-uuid",
  "name": "Home"
}
```

**Validation**:
- `name` is required and must be non-empty

---

### PUT /api/houses/:id
Update a house.

**Parameters**:
- `id` (path) - House ID

**Request Body**:
```json
{
  "name": "Updated Home"
}
```

**Response**: `200 OK`
```json
{
  "id": "h1",
  "name": "Updated Home"
}
```

**Errors**:
- `404 Not Found` - House not found

---

### DELETE /api/houses/:id
Delete a house.

**Parameters**:
- `id` (path) - House ID

**Response**: `204 No Content`

**Errors**:
- `404 Not Found` - House not found
- `409 Conflict` - House has counters (optional: can cascade delete)

---

## Counters API

### GET /api/counters
Get all counters, optionally filtered by house.

**Query Parameters**:
- `houseId` (optional) - Filter by house ID

**Response**: `200 OK`
```json
[
  {
    "id": "c1",
    "name": "Electricity",
    "unit": "kWh",
    "color": "#3b82f6",
    "houseId": "h1"
  },
  {
    "id": "c2",
    "name": "Gas",
    "unit": "m³",
    "color": "#f97316",
    "houseId": "h1"
  }
]
```

---

### GET /api/counters/:id
Get a single counter by ID.

**Parameters**:
- `id` (path) - Counter ID

**Response**: `200 OK`
```json
{
  "id": "c1",
  "name": "Electricity",
  "unit": "kWh",
  "color": "#3b82f6",
  "houseId": "h1"
}
```

**Errors**:
- `404 Not Found` - Counter not found

---

### POST /api/counters
Create a new counter.

**Request Body**:
```json
{
  "name": "Electricity",
  "unit": "kWh",
  "color": "#3b82f6",
  "houseId": "h1"
}
```

**Response**: `201 Created`
```json
{
  "id": "generated-uuid",
  "name": "Electricity",
  "unit": "kWh",
  "color": "#3b82f6",
  "houseId": "h1"
}
```

**Validation**:
- `name` is required
- `unit` is required
- `color` is required (hex color format)
- `houseId` is required and must reference an existing house

---

### PUT /api/counters/:id
Update a counter.

**Parameters**:
- `id` (path) - Counter ID

**Request Body** (all fields optional):
```json
{
  "name": "Updated Electricity",
  "unit": "kWh",
  "color": "#3b82f6",
  "houseId": "h1"
}
```

**Response**: `200 OK`
```json
{
  "id": "c1",
  "name": "Updated Electricity",
  "unit": "kWh",
  "color": "#3b82f6",
  "houseId": "h1"
}
```

**Errors**:
- `404 Not Found` - Counter not found
- `400 Bad Request` - Invalid houseId reference

---

### DELETE /api/counters/:id
Delete a counter and all its entries.

**Parameters**:
- `id` (path) - Counter ID

**Response**: `204 No Content`

**Errors**:
- `404 Not Found` - Counter not found

---

## Entries API

### GET /api/counters/:counterId/entries
Get all entries for a counter.

**Parameters**:
- `counterId` (path) - Counter ID

**Query Parameters**:
- `startDate` (optional) - Start date in YYYY-MM-DD format
- `endDate` (optional) - End date in YYYY-MM-DD format
- `limit` (optional) - Maximum number of entries to return
- `offset` (optional) - Number of entries to skip (for pagination)

**Response**: `200 OK`
```json
[
  {
    "id": "e1",
    "date": "2024-01-15",
    "value": 14.5,
    "note": "Meter read"
  },
  {
    "id": "e2",
    "date": "2024-01-16",
    "value": 12.3,
    "note": ""
  }
]
```

---

### GET /api/counters/:counterId/entries/:entryId
Get a single entry by ID.

**Parameters**:
- `counterId` (path) - Counter ID
- `entryId` (path) - Entry ID

**Response**: `200 OK`
```json
{
  "id": "e1",
  "date": "2024-01-15",
  "value": 14.5,
  "note": "Meter read"
}
```

**Errors**:
- `404 Not Found` - Counter or entry not found

---

### POST /api/counters/:counterId/entries
Create a new entry for a counter.

**Parameters**:
- `counterId` (path) - Counter ID

**Request Body**:
```json
{
  "date": "2024-01-15",
  "value": 14.5,
  "note": "Meter read"
}
```

**Response**: `201 Created`
```json
{
  "id": "generated-uuid",
  "date": "2024-01-15",
  "value": 14.5,
  "note": "Meter read"
}
```

**Validation**:
- `date` is required (YYYY-MM-DD format)
- `value` is required (must be a number)
- `note` is optional (defaults to empty string)
- If an entry with the same date already exists, it should be updated (upsert behavior)

---

### PUT /api/counters/:counterId/entries/:entryId
Update an entry.

**Parameters**:
- `counterId` (path) - Counter ID
- `entryId` (path) - Entry ID

**Request Body** (all fields optional):
```json
{
  "date": "2024-01-15",
  "value": 15.0,
  "note": "Updated meter read"
}
```

**Response**: `200 OK`
```json
{
  "id": "e1",
  "date": "2024-01-15",
  "value": 15.0,
  "note": "Updated meter read"
}
```

**Errors**:
- `404 Not Found` - Counter or entry not found

---

### DELETE /api/counters/:counterId/entries/:entryId
Delete an entry.

**Parameters**:
- `counterId` (path) - Counter ID
- `entryId` (path) - Entry ID

**Response**: `204 No Content`

**Errors**:
- `404 Not Found` - Counter or entry not found

---

### POST /api/counters/:counterId/entries/bulk
Bulk create entries (useful for CSV import).

**Parameters**:
- `counterId` (path) - Counter ID

**Request Body**:
```json
{
  "entries": [
    {
      "date": "2024-01-15",
      "value": 14.5,
      "note": "Meter read"
    },
    {
      "date": "2024-01-16",
      "value": 12.3,
      "note": ""
    }
  ],
  "skipExisting": true
}
```

**Response**: `200 OK`
```json
{
  "created": 2,
  "skipped": 0,
  "errors": []
}
```

**Notes**:
- `skipExisting` - If true, skip entries with dates that already exist
- Returns count of created and skipped entries
- If there are validation errors, they're returned in the `errors` array

---

## Statistics API (Optional)

### GET /api/counters/:counterId/stats
Get statistics for a counter.

**Parameters**:
- `counterId` (path) - Counter ID

**Query Parameters**:
- `startDate` (optional) - Start date in YYYY-MM-DD format
- `endDate` (optional) - End date in YYYY-MM-DD format

**Response**: `200 OK`
```json
{
  "avg": 14.5,
  "total": 145.0,
  "max": 20.5,
  "min": 8.2,
  "count": 10
}
```

**Note**: Statistics can be computed client-side, but providing a server endpoint can improve performance for large datasets.

---

## Error Responses

All endpoints should return appropriate HTTP status codes and error messages:

### 400 Bad Request
Invalid request data or validation failure
```json
{
  "message": "Validation error: name is required"
}
```

### 404 Not Found
Resource not found
```json
{
  "message": "Counter not found"
}
```

### 409 Conflict
Conflict with existing data
```json
{
  "message": "Cannot delete house with existing counters"
}
```

### 500 Internal Server Error
Server error
```json
{
  "message": "Internal server error"
}
```

---

## Data Models

### House
```typescript
{
  id: string        // UUID
  name: string      // House name
}
```

### Counter
```typescript
{
  id: string        // UUID
  name: string      // Counter name (e.g., "Electricity")
  unit: string      // Measurement unit (e.g., "kWh")
  color: string     // Hex color code (e.g., "#3b82f6")
  houseId: string   // Reference to house ID
}
```

### Entry
```typescript
{
  id: string        // UUID
  date: string      // Date in YYYY-MM-DD format
  value: number     // Measurement value
  note: string      // Optional note
}
```

---

## Implementation Notes

1. **ID Generation**: Backend should generate UUIDs for new resources
2. **Date Format**: All dates should be in YYYY-MM-DD format (ISO 8601)
3. **Timestamps**: Consider adding `createdAt` and `updatedAt` timestamps to all models
4. **Cascade Deletes**: When deleting a counter, all its entries should be deleted
5. **Validation**: Implement proper validation for all fields
6. **CORS**: Configure CORS if frontend and backend are on different origins
7. **Rate Limiting**: Consider implementing rate limiting for API endpoints
8. **Pagination**: For large datasets, implement pagination for entries list

---

## Frontend Integration

The frontend uses the `/web/src/lib/api.js` module which exports:

```javascript
import api from './lib/api'

// Houses
await api.getHouses()
await api.createHouse({ name: 'Home' })

// Counters
await api.getCounters({ houseId: 'h1' })
await api.createCounter({ name: 'Electricity', unit: 'kWh', color: '#3b82f6', houseId: 'h1' })

// Entries
await api.getEntries('counterId')
await api.createEntry('counterId', { date: '2024-01-15', value: 14.5, note: 'Meter read' })
await api.bulkCreateEntries('counterId', entries, { skipExisting: true })
```

All API functions return Promises and throw errors on failure.
