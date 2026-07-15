# Lewegene Foundation Therapy Management System

A comprehensive therapy management platform for tracking student goals, sessions, assessments, behavior incidents, and reporting.

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite, React Query, React Router
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL 16
- **Build:** Turborepo monorepo
- **Deployment:** Docker & Docker Compose

## Project Structure

```
lewegene/
├── apps/
│   ├── api/          # Express REST API
│   └── web/          # React SPA frontend
├── packages/
│   ├── shared/       # Shared types, schemas, utilities
│   └── db/           # Prisma schema & database client
├── docker-compose.yml
└── turbo.json
```

## Quick Start with Docker

```bash
docker-compose up --build
```

The app will be available at:
- Frontend: http://localhost
- API: http://localhost:3001
- Health check: `curl http://localhost:3001/health`

## Quick Start (Dev Mode)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your database credentials
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Default Credentials

After seeding, the following test accounts are available:

| Role                  | Email                          | Password      |
| --------------------- | ------------------------------ | ------------- |
| Director              | director@lewegene.org          | password123   |
| Program Director      | pd@lewegene.org                | password123   |
| Therapy Coordinator   | coordinator@lewegene.org       | password123   |
| Teacher               | teacher@lewegene.org           | password123   |
| System Administrator  | admin@lewegene.org             | password123   |
| Parent                | parent@lewegene.org            | password123   |

> **Note:** Change all default passwords before deploying to production.

## API Health Check

```bash
curl http://localhost:3001/health
```

Returns:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-07-15T00:00:00.000Z"
}
```

## Environment Variables

See `apps/api/.env.example` for all required configuration. Key variables:

| Variable       | Description                                  |
| -------------- | -------------------------------------------- |
| DATABASE_URL   | PostgreSQL connection string                 |
| JWT_SECRET     | Secret for JWT token signing                 |
| CORS_ORIGIN    | Comma-separated allowed origins              |
| STORAGE_*      | S3-compatible file storage configuration     |
