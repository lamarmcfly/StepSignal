# Implementation Tasks: Project Foundation

## 1. Monorepo Setup

- [ ] 1.1 Initialize root `package.json` with npm workspaces configuration
- [ ] 1.2 Create `/packages/frontend`, `/packages/backend`, `/packages/shared`, `/packages/database` directories
- [ ] 1.3 Set up TypeScript config inheritance (root `tsconfig.base.json` and per-package `tsconfig.json`)
- [ ] 1.4 Configure path aliases for cross-package imports (`@stepsignal/shared`, etc.)
- [ ] 1.5 Add root-level scripts for `dev`, `build`, `lint`, `test`

## 2. Code Quality Tooling

- [ ] 2.1 Install and configure ESLint with TypeScript and React plugins
- [ ] 2.2 Install and configure Prettier with 2-space indent, single quotes, trailing commas
- [ ] 2.3 Add `.eslintrc.json` and `.prettierrc` config files
- [ ] 2.4 Install Husky and lint-staged for pre-commit hooks
- [ ] 2.5 Test pre-commit hook by intentionally formatting code incorrectly

## 3. Frontend Package Setup

- [ ] 3.1 Initialize Vite + React + TypeScript in `/packages/frontend`
- [ ] 3.2 Install dependencies: `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `zod`
- [ ] 3.3 Create basic folder structure: `/src/components`, `/src/pages`, `/src/hooks`, `/src/lib`, `/src/styles`
- [ ] 3.4 Configure Vite to proxy API requests to backend (`http://localhost:3000`)
- [ ] 3.5 Set up React Query provider in root component

## 4. Backend Package Setup

- [ ] 4.1 Initialize Node.js + TypeScript + Express in `/packages/backend`
- [ ] 4.2 Install dependencies: `express`, `cors`, `dotenv`, `zod`, `bcrypt`, `lucia`
- [ ] 4.3 Create folder structure: `/src/routes`, `/src/middleware`, `/src/services`, `/src/lib`
- [ ] 4.4 Create basic Express server with CORS configuration
- [ ] 4.5 Add `tsx` or `ts-node` for development with auto-restart (nodemon)
- [ ] 4.6 Verify backend starts on `http://localhost:3000`

## 5. Shared Package Setup

- [ ] 5.1 Initialize TypeScript library in `/packages/shared`
- [ ] 5.2 Create `/src/types` for shared TypeScript interfaces
- [ ] 5.3 Create `/src/schemas` for Zod validation schemas
- [ ] 5.4 Export all types and schemas from `index.ts`
- [ ] 5.5 Verify imports work in both frontend and backend

## 6. Database Package Setup

- [ ] 6.1 Initialize Prisma in `/packages/database`
- [ ] 6.2 Install dependencies: `@prisma/client`, `prisma`
- [ ] 6.3 Configure `schema.prisma` with PostgreSQL datasource
- [ ] 6.4 Set up `.env` file with `DATABASE_URL` (local PostgreSQL)
- [ ] 6.5 Verify `npx prisma studio` can connect to database

## 7. Database Schema Implementation

- [ ] 7.1 Define `Institution` model in Prisma schema
- [ ] 7.2 Define `User` model with email, password_hash, role enum (student, advisor, admin)
- [ ] 7.3 Define `Session` model for Lucia auth
- [ ] 7.4 Define `Student` model with user_id foreign key and accommodations flag
- [ ] 7.5 Define `ExamType` model with institution_id and exam details
- [ ] 7.6 Define `StudentExam` model linking students to exam types
- [ ] 7.7 Add indexes for performance (institution_id, user email, session lookups)
- [ ] 7.8 Create initial migration: `npx prisma migrate dev --name init`
- [ ] 7.9 Generate Prisma Client: `npx prisma generate`
- [ ] 7.10 Verify all models and relations work in Prisma Studio

## 8. Authentication Implementation

- [ ] 8.1 Install and configure Lucia auth library in backend
- [ ] 8.2 Create Prisma adapter for Lucia sessions
- [ ] 8.3 Implement `/api/auth/register` endpoint (email, password, role, institution_id)
- [ ] 8.4 Implement password hashing with bcrypt (work factor 12)
- [ ] 8.5 Implement `/api/auth/login` endpoint with session creation
- [ ] 8.6 Implement `/api/auth/logout` endpoint with session deletion
- [ ] 8.7 Create `requireAuth` middleware to validate sessions on protected routes
- [ ] 8.8 Create `requireRole(role)` middleware for role-based access control
- [ ] 8.9 Test registration, login, logout flow manually with Postman/cURL
- [ ] 8.10 Test role-based access control (student cannot access admin routes)

## 9. Design System - Tokens

- [ ] 9.1 Create `/packages/frontend/src/styles/tokens.css`
- [ ] 9.2 Define color tokens (bg-page, bg-card, border-subtle, text-main, text-muted, primary, success, warning)
- [ ] 9.3 Define typography tokens (font-sans, text-xs through text-xl)
- [ ] 9.4 Define spacing tokens (space-1 through space-6: 4px increments)
- [ ] 9.5 Define border radius tokens (radius-card, radius-pill)
- [ ] 9.6 Define shadow tokens (shadow-card)
- [ ] 9.7 Import tokens in root component and verify CSS variables are available

## 10. Design System - Base Components

- [ ] 10.1 Create `AppShell.tsx` with sidebar, header, and main content layout
- [ ] 10.2 Add navigation links in sidebar (Dashboard, Students, Exams, Plans, Analytics, Settings)
- [ ] 10.3 Create `Card.tsx` component with white bg, border, shadow
- [ ] 10.4 Create `Button.tsx` with variants (primary, secondary, ghost) and loading state
- [ ] 10.5 Create `Badge.tsx` with risk tier variants (low, moderate, high)
- [ ] 10.6 Create `Table.tsx` with styled headers, rows, hover states
- [ ] 10.7 Create `FormField.tsx` with label, input, error display, required indicator
- [ ] 10.8 Create `Alert.tsx` with variants (success, warning, error, info)
- [ ] 10.9 Create a demo page showcasing all components for visual QA
- [ ] 10.10 Verify all components use design tokens (no hardcoded colors/spacing)

## 11. Routing and Navigation

- [ ] 11.1 Set up React Router in frontend with route definitions
- [ ] 11.2 Create protected route wrapper component that checks auth status
- [ ] 11.3 Create login page (`/login`) with email/password form
- [ ] 11.4 Create placeholder dashboard page (`/dashboard`)
- [ ] 11.5 Implement navigation in AppShell sidebar with active route highlighting
- [ ] 11.6 Test navigation flow: login → dashboard → logout

## 12. Integration Testing

- [ ] 12.1 Verify frontend can make API calls to backend
- [ ] 12.2 Test full auth flow: register → login → access protected route → logout
- [ ] 12.3 Test role-based access: student cannot access advisor/admin routes
- [ ] 12.4 Verify design system components render correctly in all browsers
- [ ] 12.5 Test hot reload works for both frontend and backend in dev mode

## 13. Documentation

- [ ] 13.1 Create `README.md` in root with setup instructions
- [ ] 13.2 Document environment variables needed for each package
- [ ] 13.3 Create `DEVELOPMENT.md` with local dev workflow
- [ ] 13.4 Add JSDoc comments to key functions and components
- [ ] 13.5 Document design token usage in `DESIGN_SYSTEM.md`

## 14. Deployment Preparation

- [ ] 14.1 Create production build scripts for frontend and backend
- [ ] 14.2 Test production build locally
- [ ] 14.3 Add `.env.example` files for each package
- [ ] 14.4 Create `.gitignore` to exclude node_modules, .env, build artifacts
- [ ] 14.5 Verify migrations can be applied in production mode (`prisma migrate deploy`)

## Notes

- Tasks 1-6 can be done in parallel after 1.1-1.4 are complete
- Task 7 (Database Schema) must complete before Task 8 (Authentication)
- Task 9 (Design Tokens) must complete before Task 10 (Components)
- Task 11 (Routing) depends on Tasks 8 and 10
- Task 12 (Integration Testing) should be done continuously, not just at the end
