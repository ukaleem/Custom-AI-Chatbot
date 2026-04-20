# Attraction Data Format Guide

This guide explains how to provide your attractions (POIs) to populate your AI chatbot's knowledge base.

---

## Option A — REST API (Recommended for live systems)

Send attractions via HTTP POST to our API endpoint.

### Endpoint

```
POST /api/v1/attractions
Headers:
  x-api-key: YOUR_API_KEY
  Content-Type: application/json
```

### Single Attraction

```json
{
  "externalId": "YOUR_INTERNAL_ID",
  "name": {
    "en": "Catania Cathedral",
    "it": "Cattedrale di Catania",
    "de": "Kathedrale von Catania"
  },
  "description": {
    "en": "The Catania Cathedral, dedicated to Saint Agatha, is a magnificent baroque cathedral located in the heart of Piazza del Duomo.",
    "it": "La Cattedrale di Catania, dedicata a Sant'Agata, è una magnifica cattedrale barocca situata nel cuore di Piazza del Duomo."
  },
  "shortDescription": {
    "en": "Baroque cathedral and symbol of Catania in Piazza del Duomo"
  },
  "category": "culture",
  "tags": ["historic", "baroque", "religious", "free-entry"],
  "address": "Piazza del Duomo, 95124 Catania CT, Italy",
  "location": {
    "lat": 37.5022,
    "lng": 15.0874
  },
  "openingHours": {
    "monday": "07:30–12:00, 16:00–19:00",
    "tuesday": "07:30–12:00, 16:00–19:00",
    "wednesday": "07:30–12:00, 16:00–19:00",
    "thursday": "07:30–12:00, 16:00–19:00",
    "friday": "07:30–12:00, 16:00–19:00",
    "saturday": "08:00–13:00",
    "sunday": "08:00–13:00"
  },
  "priceRange": "free",
  "durationMinutes": 45,
  "imageUrl": "https://example.com/images/catania-cathedral.jpg",
  "websiteUrl": "https://www.cattedralecatania.it"
}
```

### Bulk Upload (up to 100 at once)

```
POST /api/v1/attractions/bulk
```

```json
[
  { ...attraction1 },
  { ...attraction2 }
]
```

---

## Option B — CSV Upload (via Admin Dashboard)

Upload via your admin dashboard under **Attractions → Import CSV**.

### CSV Template

Download the template from your dashboard. Required columns:

| Column | Required | Example |
|--------|----------|---------|
| `externalId` | No | `my-db-id-123` |
| `name_en` | **Yes** | Catania Cathedral |
| `name_it` | No | Cattedrale di Catania |
| `description_en` | **Yes** | The Catania Cathedral... |
| `description_it` | No | La Cattedrale... |
| `shortDescription_en` | **Yes** | Baroque cathedral in Piazza del Duomo |
| `category` | **Yes** | culture |
| `tags` | No | historic,baroque,free |
| `address` | **Yes** | Piazza del Duomo, Catania |
| `lat` | **Yes** | 37.5022 |
| `lng` | **Yes** | 15.0874 |
| `priceRange` | No | free |
| `durationMinutes` | No | 45 |
| `imageUrl` | No | https://... |
| `websiteUrl` | No | https://... |

---

## Categories

Use one of these values for the `category` field:

| Value | Use For |
|-------|---------|
| `culture` | Museums, churches, historic sites, art galleries |
| `entertainment` | Shows, events, activities, experiences |
| `city-tour` | Landmarks, viewpoints, walking tour stops |
| `food` | Restaurants, cafes, street food, bars |
| `transport` | Bus stops, train stations, taxi stands, parking |
| `children` | Playgrounds, family attractions, kid-friendly places |
| `healthcare` | Hospitals, pharmacies, clinics |
| `safety` | Police stations, embassies, emergency services |
| `shopping` | Markets, malls, shops |
| `nature` | Parks, beaches, gardens |

---

## Food-Specific Fields

For `category: "food"`, also include:

```json
{
  "category": "food",
  "foodStyle": "sitting",
  "priceRange": "mid-range"
}
```

`foodStyle` options:
- `"sitting"` — table service restaurant/cafe
- `"walking"` — street food, takeaway, market stalls
- `"both"` — offers both options

---

## Important Rules

1. **Only registered attractions are suggested** — the bot will never recommend places not in your database.
2. **Language fallback** — if an attraction has no Italian translation, the bot uses the English version.
3. **Keep data updated** — use the re-index endpoint after bulk updates: `POST /api/v1/attractions/reindex`
4. **Minimum required** — at least one attraction per category you want the bot to cover.
