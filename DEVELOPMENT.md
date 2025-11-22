# Development Guide

This document provides detailed information for developers working on the StepSignal platform.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker Desktop
- Git

### Initial Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy environment files:
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   cp packages/database/.env.example packages/database/.env
   ```
4. Start Docker services: `docker-compose up -d`
5. Run database migrations: `npm run db:migrate`

## Development Workflow

### Daily Development

1. **Start Development Environment**
   ```bash
   # Start Docker services
   docker-compose up -d

   # Start frontend
   cd packages/frontend
   npm run dev
   ```

2. **Making Changes**
   - Frontend: Changes auto-reload via Vite HMR
   - Backend: Restart Docker container: `docker-compose restart backend`
   - Shared package: Rebuild and restart dependent services

3. **Before Committing**
   ```bash
   npm run typecheck    # Type check all packages
   npm run lint:fix     # Fix linting issues
   npm run format       # Format code
   ```

## Project Architecture

### Monorepo Structure

```
stepsignal/
├── packages/
│   ├── frontend/          # React application (Vite + TypeScript)
│   ├── backend/           # Express API (TypeScript)
│   ├── shared/            # Shared types and Zod schemas
│   └── database/          # Prisma schema and migrations
├── docker-compose.yml     # Docker services
└── package.json           # Root workspace
```

### Package Dependencies

- frontend depends on: shared
- backend depends on: shared, database
- database: independent

## Database Management

### Schema Changes

1. Edit `packages/database/prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Enter migration name when prompted
4. Restart backend to apply: `docker-compose restart backend`

### Database Tools

```bash
# Open Prisma Studio (GUI)
npm run db:studio

# Generate Prisma Client
npm run db:generate

# Push schema without migration (dev only)
cd packages/database
npx prisma db push

# Reset database (WARNING: deletes all data)
cd packages/database
npx prisma migrate reset
```

### Access PostgreSQL

```bash
# Connect to PostgreSQL shell
docker exec -it stepsignal-postgres psql -U postgres -d stepsignal_dev

# Useful commands
\dt                  # List tables
\d table_name        # Describe table
SELECT * FROM users; # Query data
\q                   # Quit
```

## Code Style

### Git Commit Messages

Follow conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code formatting
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

Examples:
- `feat: add student performance analytics`
- `fix: resolve session timeout issue`
- `docs: update API documentation`

### TypeScript

- Use strict mode (already configured)
- Prefer interfaces over types for object shapes
- Avoid `any` type
- Use type inference where possible

### React Components

```typescript
interface ComponentProps {
  title: string;
  onSubmit: () => void;
}

export function Component({ title, onSubmit }: ComponentProps) {
  return <div>{title}</div>;
}
```

## Common Tasks

### Add New API Endpoint

1. Create validation schema in `packages/shared/src/schemas/`
2. Create route handler in `packages/backend/src/routes/`
3. Register route in `packages/backend/src/index.ts`
4. Test with curl or Postman
5. Restart backend: `docker-compose restart backend`

### Add New Frontend Page

1. Create page component in `packages/frontend/src/pages/`
2. Add route in `packages/frontend/src/App.tsx`
3. Wrap with `ProtectedRoute` if authentication required
4. Add navigation link in AppShell if needed

### Add New Database Table

1. Add model to `packages/database/prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Verify in Prisma Studio: `npm run db:studio`
4. Restart backend to use new schema

### Update Shared Types

1. Modify types in `packages/shared/src/`
2. Build shared package: `cd packages/shared && npm run build`
3. Restart dependent services (backend and frontend)

## Testing

### Manual API Testing

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"student","institutionId":"00000000-0000-0000-0000-000000000001"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","institutionId":"00000000-0000-0000-0000-000000000001"}' \
  -c cookies.txt

# Get current user (authenticated)
curl http://localhost:3000/api/auth/me -b cookies.txt
```

### Integration Testing Checklist

- [ ] User registration flow
- [ ] User login flow
- [ ] Protected routes (auth required)
- [ ] Role-based access control
- [ ] Logout flow
- [ ] Session persistence

## Troubleshooting

### Docker Issues

```bash
# View logs
docker logs --tail 50 -f stepsignal-backend
docker logs --tail 50 -f stepsignal-postgres

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up --build

# Clean restart
docker-compose down
docker-compose up -d
```

### Port Conflicts

If ports 3000, 5173, or 5432 are in use:

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
lsof -i :3000
kill -9 <PID>
```

### Database Connection Issues

1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify connection: `docker exec stepsignal-postgres pg_isready -U postgres`
3. Check logs: `docker logs stepsignal-postgres`
4. Restart: `docker-compose restart postgres`

### TypeScript Errors

```bash
# Type check all packages
npm run typecheck

# Rebuild shared package
cd packages/shared
npm run build

# Clean and reinstall
npm run clean
npm install
```

### Backend Not Responding

1. Check container status: `docker ps`
2. View logs: `docker logs stepsignal-backend`
3. Verify environment variables in docker-compose.yml
4. Restart: `docker-compose restart backend`

## Environment Variables

### Backend

Create `packages/backend/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/stepsignal_dev
SESSION_SECRET=dev-secret-change-in-production
FRONTEND_URL=http://localhost:5173
```

### Database

Create `packages/database/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/stepsignal_dev
```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
- [Vite Documentation](https://vitejs.dev/)

## Getting Help

1. Check this documentation
2. Review error messages and logs
3. Search the codebase for similar patterns
4. Ask team members
