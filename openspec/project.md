# Project Context

## Purpose

**StepSignal** is a B2B SaaS platform for medical schools that provides:
- Risk prediction and early warning for high-stakes exams (USMLE Step 1/2, NBME shelves, CBSE)
- Individualized, capacity-aware study plans based on error patterns and cognitive profiles
- Advisor/learning specialist coaching tools with live risk assessment
- Cohort-level analytics for deans and program administrators

**Core Value**: Identify at-risk medical students early and prescribe evidence-based interventions before exam failures occur.

## Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Tanstack Query (React Query) for server state
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts or Chart.js (lightweight, no heavy D3)
- **Styling**: CSS Modules with design tokens (NO external UI libraries - custom design system)

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express or Fastify
- **ORM**: Prisma or Drizzle (type-safe, schema migrations)
- **Validation**: Zod (shared schemas with frontend)
- **Auth**: NextAuth.js or Lucia (session-based, multi-role: student/advisor/admin)

### Database
- **Primary DB**: PostgreSQL 15+
  - JSON columns for flexible error taxonomy
  - Full-text search for reflections
  - Row-level security for multi-tenancy

### AI/LLM (Optional, Controlled)
- **Provider**: OpenAI GPT-4 or Anthropic Claude
- **Use Cases**: Reflection summarization, error pattern summaries, study plan text generation
- **Guardrails**: All AI outputs must be explainable, derived from structured data, and human-overrideable

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Render (backend + database)
- **File Storage**: AWS S3 or Cloudflare R2 (CSV imports, exports)
- **Monitoring**: Sentry (error tracking) + PostHog (product analytics)

## Project Conventions

### Code Style
- **TypeScript**: Strict mode enabled
- **Naming**:
  - Components: PascalCase (e.g., `StudentDetail.tsx`)
  - Files: camelCase for utilities, PascalCase for components
  - Database: snake_case (e.g., `student_exams`, `risk_scores`)
  - API routes: kebab-case (e.g., `/api/students/:id/risk-summary`)
- **Formatting**: Prettier with 2-space indentation, single quotes, trailing commas
- **Linting**: ESLint with TypeScript and React rules

### Architecture Patterns
- **Monorepo**: Frontend + Backend + Shared types in a single repo
- **API Design**: RESTful JSON API (not GraphQL for MVP)
- **Data Flow**: Server state via React Query; client state via React hooks
- **Auth**: Session-based with role-based access control (RBAC)
- **Multi-Tenancy**: Institution ID in all queries; row-level security in PostgreSQL

### UI/UX Constraints (CRITICAL)
- **NO "AI startup" aesthetic**: No neon gradients, no glassmorphism, no glowing elements
- **Visual Style**: Calm, clinical, professional (like a premium medical school analytics tool)
  - Page background: light gray/off-white (`#F5F5F7`)
  - Cards: white with subtle border and shadow
  - Text: charcoal (`#111827`) and muted gray (`#4B5563`)
  - Accent: deep teal (`#0F766E`) and green for positive actions
- **Typography**: Single clean sans-serif (system-ui or Inter-like), emphasis via weight/size
- **Layout**: Left sidebar nav, top header, main content with cards and tables
- **Feel**: Data-first, readable, minimal decoration

### Testing Strategy
- **Unit Tests**: Vitest for business logic (risk calculation, plan allocation)
- **Integration Tests**: API endpoint tests with test database
- **E2E Tests**: Playwright for critical paths (login, add assessment, view risk)
- **Test Coverage**: Aim for 80%+ on risk engine and study plan generator

### Git Workflow
- **Branching**: Feature branches from `main` (e.g., `feature/risk-engine`)
- **Commits**: Conventional Commits format (e.g., `feat: add risk calculation service`)
- **PRs**: Require review + passing tests before merge
- **Main Branch**: `main` (protected, always deployable)

## Domain Context

### Medical Education Terminology
- **USMLE**: United States Medical Licensing Examination (Step 1, Step 2 CK, Step 3)
  - **Step 1**: Pass/fail exam (changed in 2022; historically numeric score)
  - **Step 2 CK**: Numeric score (important for residency match)
- **NBME**: National Board of Medical Examiners (practice exams and shelf exams)
- **CBSE**: Comprehensive Basic Science Exam (internal predictor for Step 1)
- **Shelf Exams**: End-of-clerkship subject exams (e.g., Surgery, Psychiatry, IM)
- **QBank**: Question bank practice (e.g., UWorld, AMBOSS)
- **Clerkship**: Clinical rotations (3rd/4th year) in specialties

### Error Taxonomy
- **Knowledge Deficit**: Didn't know the fact/concept
- **Misread/Misinterpretation**: Missed key detail in question stem
- **Premature Closure**: Jumped to answer without considering all options
- **Time Management**: Ran out of time or rushed
- **Strategy Error**: Poor test-taking approach (e.g., not reviewing stems)

### Medical Systems (Blueprints)
- Cardiovascular, Pulmonary, Renal, GI, Endocrine, Neurology, Psychiatry, Musculoskeletal, Dermatology, OB/GYN, etc.
- Aligned to NBME/USMLE content blueprints

### Risk Tiers
- **Low**: On track, no major concerns
- **Moderate**: Some deficits, needs targeted intervention
- **High**: Significant risk of failure or low performance, urgent intervention required

## Important Constraints

### Regulatory & Compliance
- **FERPA**: Family Educational Rights and Privacy Act (student education records)
  - No sharing of student data across institutions
  - Students must be able to view their own data
- **Accommodations**: Students with disabilities may have accommodations (extra time, reduced volume)
  - **Critical**: Do NOT store medical details; only store a boolean `has_accommodations` flag
  - Risk and plan logic must account for accommodations (e.g., don't penalize lower question volume)
- **No HIPAA**: This is educational data, not health records (no PHI stored)

### Ethical Guardrails
- **Explainability**: Every risk score must show 2-4 clear reasons ("Why am I at risk?")
- **Human Override**: Advisors can override risk tiers and plans with justification
- **AI Transparency**: All AI-generated text must be:
  - Derived strictly from structured data (no hallucinations)
  - Clearly labeled as AI-generated
  - Editable/overrideable by humans
- **Disclaimers**: "This tool supports decision-making; it does not replace professional judgment or official exam advisement"

### Performance & Scale
- **Pilot Scale**: 1-3 institutions, 500-1500 students total
- **Target Response Time**: < 2s for dashboards, < 5s for risk calculations
- **Data Retention**: Keep historical risk scores and plans for calibration and audit

## External Dependencies

### Data Sources (Future Integrations)
- **UWorld API**: Question bank data (CSV import for MVP, API for v2+)
- **AMBOSS API**: Question bank data
- **NBME Reports**: Score reports (PDF → manual entry or CSV for MVP)
- **CBSE Reports**: Internal exam data

### Third-Party Services
- **OpenAI/Anthropic**: LLM for reflection summarization and error pattern summaries (optional)
- **SendGrid/Postmark**: Email notifications (exam reminders, risk alerts)
- **Stripe**: Billing and subscriptions (institutional contracts)

### Key Assumptions
- **No real-time proctoring**: This is a tracking/planning tool, not an exam delivery system
- **CSV-first data import**: Most schools won't have API access to QBanks initially
- **Session-based auth**: Not OAuth/SSO for MVP (can add later)
- **Single-region deployment**: No multi-region complexity for MVP
