# Design: Project Foundation

## Context

StepSignal is a B2B SaaS platform for medical schools requiring:
- Multi-tenancy (multiple institutions with isolated data)
- Role-based access control (students, advisors, admins)
- Type-safe API contracts between frontend and backend
- Consistent, professional UI matching medical school aesthetics
- Scalability to 1-3 pilot institutions (500-1500 students initially)

## Goals / Non-Goals

### Goals
- Establish a maintainable monorepo structure with clear separation of concerns
- Enable type-safe development with shared schemas between frontend and backend
- Provide session-based authentication with multi-role support
- Create a flexible, Prisma-based database layer with PostgreSQL
- Build a minimal, professional design system (no external UI libraries)

### Non-Goals
- Microservices architecture (monorepo with modular packages is sufficient for MVP)
- GraphQL API (REST is simpler and sufficient)
- Server-side rendering or Next.js (client-side React with Vite is faster to develop)
- Mobile native apps (responsive web UI only)

## Decisions

### 1. Monorepo Structure with npm Workspaces

**Decision**: Use npm workspaces to manage multiple packages in a single repository.

**Structure**:
```
/packages
  /frontend      - React + Vite + TypeScript
  /backend       - Express + TypeScript
  /shared        - Shared types, Zod schemas, constants
  /database      - Prisma schema and migrations
```

**Why**:
- Simplifies dependency management and version consistency
- Enables code sharing (types, validation schemas) without publishing packages
- Single CI/CD pipeline
- Easier refactoring across packages

**Alternatives Considered**:
- **Turborepo/Nx**: Adds complexity; npm workspaces sufficient for 4 packages
- **Separate repos**: Harder to keep types in sync; worse developer experience

### 2. Prisma ORM with PostgreSQL

**Decision**: Use Prisma as the ORM with PostgreSQL database.

**Why**:
- Type-safe database queries with auto-generated TypeScript types
- Schema-first migrations (Prisma schema is source of truth)
- Excellent TypeScript support and developer experience
- Built-in connection pooling and query optimization
- Supports PostgreSQL JSON columns for flexible error taxonomy

**Alternatives Considered**:
- **Drizzle ORM**: Newer, slightly better performance, but Prisma has better docs and maturity
- **Raw SQL + Kysely**: More control but loses type generation and migration tooling
- **TypeORM**: Decorator-based, more complex, less modern than Prisma

### 3. Session-Based Auth with Lucia

**Decision**: Use Lucia for session-based authentication.

**Why**:
- Lightweight, framework-agnostic session management
- Full control over session storage (stored in PostgreSQL)
- Built-in CSRF protection
- Better suited for B2B SaaS than JWT (can revoke sessions, easier to audit)
- Supports multiple roles via database lookups

**Alternatives Considered**:
- **NextAuth.js**: Excellent but tied to Next.js; we're using Vite + Express
- **Passport.js**: Older, callback-based API, less TypeScript support
- **JWT-only**: Harder to revoke, requires refresh token rotation, overkill for this use case

### 4. Custom Design System (No External UI Library)

**Decision**: Build a custom design system with CSS Modules and design tokens. No Chakra UI, MUI, or Ant Design.

**Why**:
- PRD explicitly requires a calm, clinical aesthetic (no "AI startup" look)
- External libraries force design opinions that don't match requirements
- Custom system is lighter (no unused components)
- Full control over styling and no theme overrides needed

**Components to Build**:
- `AppShell` (layout with sidebar + header)
- `Card`, `Button`, `Badge`, `Table`, `FormField`, `Alert`

**Design Tokens**:
- Colors, spacing, typography, shadows, border radii defined in `:root` CSS variables

**Alternatives Considered**:
- **Tailwind CSS**: Utility-first is fast but doesn't enforce component reuse; CSS Modules + tokens is clearer
- **Chakra UI/MUI**: Would require extensive theme overrides; adds bundle size

### 5. React Query (Tanstack Query) for Server State

**Decision**: Use Tanstack Query for all backend data fetching and caching.

**Why**:
- Automatic caching, background refetching, and stale data management
- Optimistic updates for mutations
- Loading and error states handled declaratively
- De facto standard for server state in React

**Alternatives Considered**:
- **SWR**: Similar but Tanstack Query has better TypeScript support and more features
- **Redux Toolkit Query**: Overkill; we don't need global Redux state

### 6. Zod for Shared Validation

**Decision**: Define all validation schemas with Zod in `/packages/shared` and use on both frontend (forms) and backend (API validation).

**Why**:
- Single source of truth for validation rules
- TypeScript type inference from schemas
- Works with React Hook Form (frontend) and Express middleware (backend)

**Alternatives Considered**:
- **Yup**: Older, less TypeScript-native than Zod
- **Joi**: Designed for Node.js, doesn't work in browser
- **Separate schemas**: Duplicates logic and risks drift

## Database Schema (Initial Core Tables)

### Core Entities

```prisma
// Multi-tenancy
Institution {
  id, name, settings (JSON), created_at, updated_at
}

// Users & Auth
User {
  id, email, password_hash, role (student|advisor|admin), institution_id, created_at, updated_at
}

Session {
  id, user_id, expires_at, created_at
}

// Students
Student {
  id, user_id, institution_id, class_year, has_accommodations, created_at, updated_at
}

// Exam Configuration
ExamType {
  id, institution_id, code (e.g., "STEP1"), name, default_weight, created_at
}

StudentExam {
  id, student_id, exam_type_id, scheduled_date, attempt_number, outcome (pass|fail|score), created_at
}
```

### Design Patterns
- **Soft foreign keys**: All tables include `institution_id` for row-level security
- **Timestamps**: All tables have `created_at` and `updated_at`
- **Enums**: Use Prisma enums for role, risk_tier, error_type, etc.
- **JSON columns**: For flexible data like `institution.settings` and error event metadata

## Risks / Trade-offs

### Risk: Monorepo complexity as project grows
- **Impact**: Medium
- **Mitigation**: Keep package boundaries clear; consider migrating to Turborepo if build times degrade

### Risk: Custom design system maintenance burden
- **Impact**: Medium
- **Mitigation**: Build only components we need; keep them simple; document in Storybook (future)

### Risk: Prisma schema migrations in production
- **Impact**: High (schema changes can break apps)
- **Mitigation**: Test migrations in staging; use Prisma's shadow database feature; version control all migrations

### Risk: Session storage in PostgreSQL under high load
- **Impact**: Low (pilot scale is small)
- **Mitigation**: If needed, migrate sessions to Redis in future without changing auth logic

## Migration Plan

N/A - This is the initial setup. No existing users or data to migrate.

## Open Questions

### 1. Should we use pnpm instead of npm for workspaces?
- **Recommendation**: Stick with npm workspaces for simplicity. Migrate to pnpm later if dependency resolution issues arise.

### 2. Do we need a staging environment from day 1?
- **Recommendation**: Start with local dev + production. Add staging when we have the first pilot institution.

### 3. Should Prisma migrations be auto-applied or manual?
- **Recommendation**: Manual migrations in production (via CI/CD), auto-apply in development for speed.
