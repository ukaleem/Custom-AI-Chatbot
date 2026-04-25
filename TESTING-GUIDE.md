# Testing Guide — Custom AI Chatbot Platform

Complete step-by-step guide to set up, run, and manually test every feature of Sprints 1–6.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | bundled with Node |
| Docker Desktop | latest | https://docker.com |

```bash
# Install dependencies (one-time)
npm install
```

---

## Step 1 — Start Infrastructure

```bash
npm run docker:up
```

Wait ~10 seconds, then verify all three services are healthy:

```bash
docker ps
# You should see mongo, qdrant, redis all in "healthy" state
```

| Service | Check |
|---------|-------|
| MongoDB | `docker exec -it $(docker ps -qf name=mongo) mongosh --eval "db.runCommand({ping:1})"` |
| Qdrant | Open http://localhost:6333/dashboard |
| Redis | `docker exec -it $(docker ps -qf name=redis) redis-cli PING` → PONG |

---

## Step 2 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and set these values (minimum required):

```env
# Generate a strong random value (e.g. openssl rand -hex 32)
SUPER_ADMIN_KEY=my-secret-super-admin-key

# Generate a strong random value
JWT_SECRET=my-secret-jwt-key

# Optional: your default OpenAI key for embeddings
OPENAI_API_KEY=sk-...
```

> Everything else in `.env` can stay as the default for local development.

---

## Step 3 — Start the API

```bash
npm run start:api:dev
```

You should see:

```
🤖 Custom AI Chatbot API
   API:    http://localhost:3000/api/v1
   Docs:   http://localhost:3000/api/docs
   Health: http://localhost:3000/api/v1/health
```

**Verify:**
- Open http://localhost:3000/api/v1/health → should return `{"status":"ok",...}`
- Open http://localhost:3000/api/docs → Swagger UI loads

---

## Step 4 — Create Your First Tenant (Super-Admin Setup)

> This is a one-time setup step. Use Swagger at http://localhost:3000/api/docs or any HTTP client.

### 4a. Authorize in Swagger

1. Click **Authorize** (top right in Swagger)
2. Under **super-admin-key** enter: `my-secret-super-admin-key`
3. Click **Authorize** → **Close**

### 4b. Create the tenant

**`POST /api/v1/tenants`**

```json
{
  "name": "Catania City Pass",
  "slug": "catania-city-pass",
  "adminEmail": "admin@catania.test",
  "plan": "pro"
}
```

**Save the returned `apiKey`** — it looks like `cac_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

```json
{
  "_id": "...",
  "name": "Catania City Pass",
  "slug": "catania-city-pass",
  "apiKey": "cac_abc123...",   ← SAVE THIS
  ...
}
```

### 4c. Set the admin dashboard password

**`POST /api/v1/tenants/{id}/set-password`**

Use the `_id` from the response above:

```json
{ "password": "Test1234!" }
```

→ Returns `204 No Content` (no body). Password is now set.

---

## Step 5 — Test the Admin Dashboard

### 5a. Start the Angular admin app

```bash
npx nx serve admin
```

Open http://localhost:4200 — you will be redirected to `/login`.

### 5b. Login

| Field | Value |
|-------|-------|
| Company slug | `catania-city-pass` |
| Password | `Test1234!` |

Click **Sign in** → redirects to Dashboard.

> If login fails, check the API is running (`npm run start:api:dev`) and MongoDB is healthy.

### 5c. Dashboard

- The **Dashboard** page loads and calls `GET /analytics/overview`
- Stats show: Total Sessions: 0, Today: 0, etc. (normal — no chats yet)

### 5d. Add an attraction (manual form)

1. Click **Attractions** in sidebar → **+ Add Attraction**
2. Fill in:
   - **Name (EN):** `Catania Cathedral`
   - **Short Description:** `Baroque cathedral in Piazza del Duomo`
   - **Full Description:** `The Cathedral of Sant'Agata dominates Catania's main square...`
   - **Address:** `Piazza del Duomo, Catania`
   - **Latitude:** `37.5026`
   - **Longitude:** `15.0878`
   - **Category:** `Culture`
   - **Price Range:** `Free`
   - **Duration (min):** `60`
3. Click **Create Attraction**

→ Toast: "Attraction created" and redirects to list showing 1 attraction.

### 5e. Edit an attraction

1. Click **Edit** on the attraction row
2. Change the name to `Catania Cathedral ★`
3. Click **Save Changes**

→ Toast: "Attraction updated"

### 5f. Import via CSV

1. Click **Import CSV** button (top-right of attractions list)
2. Click **Download Template CSV** — save and open the file
3. Add 3 more rows below the sample row, for example:

```
"Mount Etna","nature","Etna, Sicily",37.7510,15.0003,"Europe's highest active volcano","Dramatic volcanic landscape","nature,volcano,hiking","free",240,""
"Ursino Castle","culture","Piazza Federico II di Svevia, Catania",37.4993,15.0829,"Medieval castle housing a museum","Norman castle from the 13th century","history,medieval,museum","budget",60,""
"Pescheria Market","food","Via Pardo, Catania",37.5007,15.0881,"Lively fish market in historic piazza","Fresh seafood and local produce","food,market,authentic","free",30,""
```

4. Save the CSV and drag-and-drop (or click to browse) it into the import page
5. Preview shows 4 rows with green **OK** badges
6. Click **Import 4 Attractions**

→ Progress bar fills → Toast: "Successfully imported 4 attractions"  
→ Redirects to attractions list showing 5 attractions total

### 5g. Search attractions

In the attractions list, type `etna` in the search box → list filters to show only Mount Etna.
Clear the search → all attractions reappear.

### 5h. Delete an attraction

Click **Delete** on any row → confirm dialog → attraction removed from list.

### 5i. Bot configuration

1. Click **Bot Config** in sidebar
2. Change **Bot Name** to `Catania Guide`
3. Change **Primary Color** to `#e11d48` (red)
4. Change **Opening Greeting** to `Ciao! I'm your Catania Guide. How can I help?`
5. Click **Save Configuration**

→ Toast: "Bot settings saved"

### 5j. LLM API Key — THIS IS HOW IT WORKS

> The API key you enter here is your **LLM provider key** (e.g. OpenAI, Anthropic).
> It is stored securely and used by the bot to generate responses.
> It is **not** the `cac_xxx` tenant key — those are different things.

1. Click **LLM API Key** in sidebar
2. Select your provider (e.g. **OpenAI**)
3. Paste your API key from https://platform.openai.com/api-keys  
   (e.g. `sk-proj-...` or `sk-...`)
4. Leave **Model** blank (uses default `gpt-4o`)
5. Click **Save API Key**

→ Toast: "API key saved successfully" and the field clears.

> **If you see "Invalid API key":** You are likely not logged in or your session expired.
> Log out and log back in, then try again. The dashboard now auto-logs you out on session errors.

### 5k. Embed Widget snippet

1. Click **Embed Widget** in sidebar
2. Snippet shows your actual server URL and tenant slug:
   ```html
   <script src="http://localhost:3000/widget/chatbot.js"></script>
   <catania-bot tenant-id="catania-city-pass" ...></catania-bot>
   ```
3. Click **Copy** → "Copied to clipboard!" toast

### 5l. Conversations (after running a chat)

Come back here after Step 6 — you will see real sessions in this table.

---

## Step 6 — Test the Embeddable Widget

### 6a. Build the widget bundle

```bash
node apps/widget/build.js --production
# Output: dist/apps/widget/chatbot.js  (~15KB)
```

### 6b. Verify widget is served by the API

```
GET http://localhost:3000/widget/chatbot.js
```

→ Returns JavaScript content (not 404).

### 6c. Verify widget API endpoints

```
GET http://localhost:3000/api/v1/widget/catania-city-pass/config
```

→ Returns:
```json
{
  "botName": "Catania Guide",
  "primaryColor": "#e11d48",
  "greeting": "Ciao! I'm your Catania Guide. How can I help?",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "it"]
}
```

### 6d. Open the test widget page

The file [test.html](test.html) is already in the project root. Open it directly in a browser:

```
File → Open File → test.html
```

Or serve it locally:

```bash
npx serve . -p 8080
# Then open: http://localhost:8080/test.html
```

**What to test:**

| Action | Expected |
|--------|----------|
| Page loads | Blue floating button appears bottom-right |
| Click the button | Chat window opens with bot header |
| Window header | Shows "Catania Guide" (loaded from API) |
| First message | Bot sends greeting automatically |
| Type anything | Input textarea works, Enter key sends |
| Bot responds | Message appears with typing indicator (3 dots) first |
| Bot asks questions | Guided flow: duration → preference → food → plan |
| Quick reply buttons | Appear after some bot messages, clickable |
| Change to Italian | Edit `language="it"` in test.html → placeholder says "Scrivi un messaggio..." |
| Mobile test | Open DevTools → toggle to mobile (375px) → chat window is full-screen |

### 6e. Full conversation flow

The bot walks users through these states in order:

```
GREETING → ASK_DURATION → ASK_PREFERENCE → ASK_FOOD → ASK_FOOD_STYLE → GENERATE_PLAN → FOLLOW_UP
```

Sample conversation:

1. Bot: "Ciao! I'm your Catania Guide. How can I help?"
2. You: "Hi, I want to explore Catania"  
3. Bot: "How many hours do you have?" (ASK_DURATION)
4. You: "3 hours" or click quick reply
5. Bot: "Do you prefer culture, food, or nature?" (ASK_PREFERENCE)
6. You: "Culture"
7. Bot: "Would you also like food recommendations?" (ASK_FOOD)
8. You: "Yes"
9. Bot: "Sit-down or street food?" (ASK_FOOD_STYLE)
10. You: "Street food"
11. Bot: Generates a personalised itinerary using only YOUR attractions from the database ← This is the RAG output
12. You: "Tell me more about the Cathedral" → Bot answers from context (FOLLOW_UP)

### 6f. After the conversation — check Conversations page

Go back to the admin dashboard → **Conversations**:
- The session you just ran appears in the table
- Click the row → right panel shows the full message thread

---

## Step 7 — Test the REST Chat API directly

Use Swagger (http://localhost:3000/api/docs) or curl.

### Authorize with tenant API key

In Swagger → **Authorize** → enter `cac_xxx...` under **tenant-api-key**.

### Start a session

**`POST /api/v1/chat/session`**

```json
{ "language": "en" }
```

→ Returns:
```json
{
  "sessionId": "sess_xxxxxxxxxx",
  "message": "Hello! I'm your AI tourist guide...",
  "quickReplies": [],
  "flowState": "GREETING",
  "language": "en",
  "isComplete": false
}
```

Save the `sessionId`.

### Send a message

**`POST /api/v1/chat/message`**

```json
{
  "sessionId": "sess_xxxxxxxxxx",
  "message": "I have 2 hours"
}
```

→ Bot advances the conversation state.

### View session history

**`GET /api/v1/chat/session/{sessionId}/history`**

→ Returns all messages in the session.

---

## Step 8 — Test the WebSocket Gateway

The WebSocket endpoint is at `ws://localhost:3000/chat`.

Quick test using the browser console on any page:

```javascript
const io = await import('https://cdn.socket.io/4.7.5/socket.io.esm.min.js');
const socket = io.io('http://localhost:3000/chat', {
  extraHeaders: { 'x-api-key': 'cac_YOUR_API_KEY' }
});

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('message', (data) => console.log('Bot:', data));
socket.on('error', (err) => console.error('Error:', err));

// Start a session
socket.emit('startSession', { language: 'en' });

// Send a message
socket.emit('message', { sessionId: 'sess_xxx', message: 'I have 3 hours' });
```

---

## Common Problems & Fixes

### "Invalid API key" when saving LLM settings

**Cause:** Session expired or stale — your browser has an old `cac_xxx` key that no longer matches the database.

**Fix:** 
1. Click **Sign out** in the admin dashboard top-right
2. Log back in with slug + password
3. Try saving the LLM key again

The dashboard now automatically logs you out if this happens.

### Admin login says "Admin password not set"

**Cause:** You created the tenant but forgot to run `POST /tenants/:id/set-password`.

**Fix:** Run the set-password step in Swagger using your `SUPER_ADMIN_KEY`.

### Bot gives "I can only help with tourism recommendations"

**Cause:** LLM key is not set. The bot uses an `UnconfiguredLlmProvider` by default.

**Fix:** Go to Admin Dashboard → LLM API Key → enter your key.

### Attractions don't appear in bot responses

**Cause 1:** No attractions in the database → add some via the dashboard.

**Cause 2:** Vector embeddings failed → click **Reindex** via:
```
POST /api/v1/attractions/reindex
x-api-key: cac_xxx
```

**Cause 3:** Wrong LLM provider for embeddings. Anthropic does not support embeddings. If using Anthropic for chat, you still need an **OpenAI** key set as the provider for embeddings to work.

### Docker containers not starting

```bash
npm run docker:down   # stop containers
npm run docker:up     # start fresh
docker logs custom-ai-chatbot-mongo-1   # check logs
```

### API fails to start with "Cannot connect to MongoDB"

Make sure Docker is running (`docker ps`) and the `MONGODB_URI` in `.env` matches the Docker port (`27017`).

---

## Environment Reference

| Variable | Required | Example |
|----------|----------|---------|
| `SUPER_ADMIN_KEY` | YES | `my-secret-key` |
| `JWT_SECRET` | YES | `random-32-char-string` |
| `MONGODB_URI` | auto | `mongodb://localhost:27017/custom-ai-chatbot` |
| `REDIS_HOST` | auto | `localhost` |
| `QDRANT_URL` | auto | `http://localhost:6333` |
| `OPENAI_API_KEY` | optional | `sk-...` (default embedding key) |
| `ALLOWED_ORIGINS` | optional | `http://localhost:4200,http://localhost:8100` |

---

## Port Summary

| Service | Port | URL |
|---------|------|-----|
| NestJS API | 3000 | http://localhost:3000/api/v1 |
| Swagger Docs | 3000 | http://localhost:3000/api/docs |
| Angular Admin | 4200 | http://localhost:4200 |
| MongoDB | 27017 | mongodb://localhost:27017 |
| Qdrant | 6333 | http://localhost:6333/dashboard |
| Redis | 6379 | redis://localhost:6379 |
