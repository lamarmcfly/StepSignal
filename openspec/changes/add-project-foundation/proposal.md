# Proposal: Add Project Foundation

## Why

StepSignal is a greenfield project with no existing codebase. We need to establish the foundational infrastructure, authentication, database schema, and design system before any feature development can begin. Without this foundation, we cannot implement data ingestion, risk calculation, or any user-facing functionality.

This change sets up the core architecture that all subsequent features will build upon, including the monorepo structure, type-safe database access, multi-role authentication, and a consistent UI component library.

## What Changes

- **Monorepo Structure**: Initialize frontend (React + TypeScript + Vite), backend (Node.js + TypeScript + Express), and shared types packages
- **Build & Dev Tooling**: Configure TypeScript, ESLint, Prettier, and development scripts across all packages
- **Database Layer**: Set up PostgreSQL with Prisma ORM and initial schema for core entities (institutions, users, students, exam_types)
- **Authentication System**: Implement session-based auth with role-based access control (student, advisor, admin) using Lucia or NextAuth.js
- **Design System**: Create design tokens (colors, typography, spacing) and base UI components (AppShell, Card, Button, Badge, Table, FormField, Alert)
- **Routing & Navigation**: Set up React Router with protected routes and left sidebar navigation

## Impact

### Affected Specs
- **NEW**: `project-infrastructure` - Monorepo setup, build tooling, development environment
- **NEW**: `authentication` - Multi-role session-based authentication
- **NEW**: `database-schema` - PostgreSQL schema and Prisma ORM configuration
- **NEW**: `design-system` - Design tokens and base UI component library

### Affected Code
- **NEW**: `/packages/frontend/` - React app with Vite
- **NEW**: `/packages/backend/` - Express API server
- **NEW**: `/packages/shared/` - Shared TypeScript types and Zod schemas
- **NEW**: `/packages/database/` - Prisma schema and migrations
- **NEW**: Root-level config files (package.json, tsconfig.json, .eslintrc.json, .prettierrc)

### Dependencies
This is the foundational change. All future features (data ingestion, risk engine, study plans, etc.) depend on this infrastructure being in place.

### Risks & Mitigations
- **Risk**: Choosing wrong tech stack components that need to be replaced later
  - **Mitigation**: Stack choices align with `openspec/project.md` and are battle-tested in production (React, Express, Prisma, PostgreSQL)
- **Risk**: Over-engineering the initial setup
  - **Mitigation**: Minimal viable setup; no premature abstractions; can refactor as needed

### Breaking Changes
None (this is the initial setup).
