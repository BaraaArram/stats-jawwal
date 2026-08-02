# Jawwal Pay Cache Service

A deployable backend service for caching Jawwal Pay users, teams, records, and team stats.

## Overview

This backend is intended to be deployed separately from the Chrome extension. It provides:

- User cache endpoints
- Team cache endpoints
- Record storage and lookup
- Team stats caching
- A user/team lookup helper endpoint

## Local setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Start the service:

```bash
npm start
```

3. The API will listen on `http://localhost:3000` by default.

## API endpoints

- `GET /health`
- `GET /users/:userId`
- `POST /users`
- `GET /teams/:teamId`
- `POST /teams`
- `GET /records/:recordId`
- `POST /records`
- `GET /teams/:teamId/records`
- `GET /users/:userId/records`
- `GET /team-stats/:teamId`
- `POST /team-stats`
- `GET /user-team/:userId`

## Environment

- `PORT` — optional port to listen on (default: 3000)
- `DB_PATH` — optional JSON database path (default: `data.json`)

## Deployment

This can be deployed on Fly or any container platform using the included `Dockerfile`.

### Deploying to Fly

1. Install `flyctl` and log in:

```bash
flyctl auth login
```

2. Create a persistent volume for data storage:

```bash
flyctl volumes create backend-data --region <region> --size 1
```

3. Deploy the app:

```bash
cd backend
flyctl deploy
```

4. If needed, set the database file path as an environment variable:

```bash
flyctl secrets set DB_PATH=/data/data.json
```

The app can use the included `fly.toml` and `Dockerfile` when deploying to Fly.

### Deploying to Render

1. Create a new web service in Render and connect it to this repository.
2. Configure the service as a Node web service with the following values:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: `node`
3. Add the following environment variables:

```bash
PORT=3000
DB_PATH=/data/data.json
```

4. Add a persistent disk named `backend-data` with `1 GB`.
5. Set the branch to deploy from, e.g. `main`.
6. Save and deploy.

If you use the `render.yaml` manifest at the repository root, Render can auto-detect this configuration and run it automatically.

### Using the backend from the extension

- Default backend URL is `http://127.0.0.1:3000`.
- After deploying to Fly, update `jawwal-pay-uxplus/content/api-hub.js` and replace `BACKEND_CACHE_BASE` with your Fly app URL, for example:

```js
const BACKEND_CACHE_BASE = 'https://your-fly-app.fly.dev';
```

- Then install or reload the extension.
