# StepSignal

Medical Student Exam Performance & Risk Tracking Platform

## Overview

StepSignal is a platform designed to help medical schools track student exam performance, identify at-risk students, and provide data-driven support. The platform features role-based access control for students, advisors, and administrators.

## Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0
- **Docker**: Latest version
- **Docker Compose**: Latest version
- **PostgreSQL**: 15 (via Docker)

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- React Router v6 for routing
- React Hook Form for form management
- Zod for validation

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- PostgreSQL database
- Session-based authentication

### Database
- PostgreSQL 15
- Prisma for schema management and migrations

## Project Structure

```
stepsignal/
├── packages/
│   ├── frontend/          # React frontend application
│   ├── backend/           # Express backend API
│   ├── shared/            # Shared types and schemas
│   └── database/          # Prisma schema and migrations
├── docker-compose.yml     # Docker services configuration
└── package.json           # Root workspace configuration
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Docker Services

Start PostgreSQL database:

```bash
docker-compose up -d postgres
```

Wait for PostgreSQL to be healthy (check with `docker ps`), then start the backend:

```bash
docker-compose up -d backend
```

### 3. Set Up Database

The database will be automatically set up when the backend container starts. To manually run migrations:

```bash
npm run db:migrate
```

To seed the database with initial data:

```bash
npm run db:generate
docker exec stepsignal-postgres psql -U postgres -d stepsignal_dev -c "
  INSERT INTO institutions (id, name)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Test Medical School')
  ON CONFLICT DO NOTHING;
"
```

### 4. Start Frontend

```bash
cd packages/frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

## Environment Variables

### Backend (`packages/backend/.env`)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/stepsignal_dev
SESSION_SECRET=dev-secret-change-in-production-to-random-value
FRONTEND_URL=http://localhost:5173
```

### Database (`packages/database/.env`)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/stepsignal_dev
```

## Available Scripts

### Root Level

- `npm run dev` - Start all packages in development mode
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run lint:fix` - Fix linting issues
- `npm test` - Run tests in all packages
- `npm run typecheck` - Type check all packages
- `npm run db:studio` - Open Prisma Studio
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma Client

### Package-Specific Scripts

Navigate to the package directory and run:

**Frontend**
```bash
cd packages/frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

**Backend**
```bash
cd packages/backend
npm run dev        # Start development server with auto-reload
npm run build      # Build for production
npm start          # Start production server
```

**Database**
```bash
cd packages/database
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma Client
npm run db:studio        # Open Prisma Studio
npm run db:push          # Push schema changes without migration
```

## Development Workflow

1. **Make code changes** in your editor
2. **Frontend changes** reload automatically via Vite HMR
3. **Backend changes** require Docker restart: `docker-compose restart backend`
4. **Database schema changes**:
   - Update `packages/database/prisma/schema.prisma`
   - Run `npm run db:migrate` to create migration
   - Restart backend to apply changes

## Authentication

The platform uses session-based authentication with the following roles:

- **Student**: Access to personal performance data
- **Advisor**: Access to student data and analytics
- **Admin**: Full system access

### Test Accounts

After seeding the database, you can register test accounts via the registration page or API.

Example registration:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123",
    "role": "student",
    "institutionId": "00000000-0000-0000-0000-000000000001"
  }'
```

## Docker Commands

### View Logs
```bash
# Backend logs
docker logs --tail 50 -f stepsignal-backend

# PostgreSQL logs
docker logs --tail 50 -f stepsignal-postgres
```

### Restart Services
```bash
# Restart backend
docker-compose restart backend

# Restart all services
docker-compose restart
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Access PostgreSQL
```bash
# Connect to PostgreSQL shell
docker exec -it stepsignal-postgres psql -U postgres -d stepsignal_dev
```

## Troubleshooting

### Port Already in Use

If ports 3000, 5173, or 5432 are already in use:

1. Find the process:
   ```bash
   # Windows
   netstat -ano | findstr :3000

   # macOS/Linux
   lsof -i :3000
   ```

2. Kill the process or change the port in docker-compose.yml

### Database Connection Issues

1. Check if PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Verify connection:
   ```bash
   docker exec stepsignal-postgres pg_isready -U postgres
   ```

3. Check logs:
   ```bash
   docker logs stepsignal-postgres
   ```

### Backend Not Starting

1. Check backend logs:
   ```bash
   docker logs stepsignal-backend
   ```

2. Ensure PostgreSQL is healthy before starting backend

3. Rebuild backend image:
   ```bash
   docker-compose up --build backend
   ```

## Additional Resources

- [Development Guide](./DEVELOPMENT.md) - Detailed development workflows
- [API Documentation](./packages/backend/README.md) - Backend API reference
- [Database Schema](./packages/database/README.md) - Database structure and relationships

## License

Private - All Rights Reserved
