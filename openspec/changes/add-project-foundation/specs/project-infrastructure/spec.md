# Spec Delta: Project Infrastructure

## ADDED Requirements

### Requirement: Monorepo Structure
The system SHALL organize code as a monorepo with separate packages for frontend, backend, shared types, and database using npm workspaces.

#### Scenario: Developer adds a new shared type
- **WHEN** a developer creates a new TypeScript interface in `/packages/shared/src/types`
- **THEN** the type is automatically available for import in both frontend and backend packages without publishing

#### Scenario: Developer runs build command
- **WHEN** a developer runs `npm run build` from the root directory
- **THEN** all packages (frontend, backend, shared, database) build successfully in the correct dependency order

### Requirement: TypeScript Configuration
The system SHALL use TypeScript in strict mode across all packages with consistent compiler options and path aliases.

#### Scenario: Developer writes code without explicit types
- **WHEN** a developer writes a function without return type annotation
- **THEN** TypeScript compiler enforces type inference and shows errors for implicit 'any' types

#### Scenario: Developer imports from shared package
- **WHEN** frontend code imports from `@stepsignal/shared`
- **THEN** TypeScript resolves the import correctly and provides full IntelliSense

### Requirement: Code Quality Tooling
The system SHALL enforce consistent code style using ESLint and Prettier with pre-commit hooks.

#### Scenario: Developer commits code with formatting issues
- **WHEN** a developer attempts to commit code that violates Prettier formatting rules
- **THEN** the pre-commit hook automatically formats the code before completing the commit

#### Scenario: Developer writes code with ESLint violations
- **WHEN** a developer writes code that violates ESLint rules (e.g., unused variables)
- **THEN** the IDE shows inline errors and `npm run lint` fails until issues are resolved

### Requirement: Development Environment
The system SHALL provide local development scripts with hot-reload for frontend and auto-restart for backend.

#### Scenario: Developer starts local development
- **WHEN** a developer runs `npm run dev` from the root directory
- **THEN** frontend starts on `http://localhost:5173` and backend starts on `http://localhost:3000` with live reload enabled

#### Scenario: Developer modifies frontend component
- **WHEN** a developer saves changes to a React component
- **THEN** the browser automatically refreshes within 1 second showing the updated component

#### Scenario: Developer modifies backend route
- **WHEN** a developer saves changes to an Express route handler
- **THEN** the backend server automatically restarts within 2 seconds without manual intervention

### Requirement: Environment Configuration
The system SHALL manage environment variables separately for each package using `.env` files with validation.

#### Scenario: Developer starts app without required env vars
- **WHEN** a developer starts the backend without `DATABASE_URL` in `.env`
- **THEN** the application fails to start with a clear error message indicating the missing variable

#### Scenario: Developer accesses environment variable
- **WHEN** backend code accesses `process.env.DATABASE_URL`
- **THEN** TypeScript provides type safety and auto-completion for known environment variables
