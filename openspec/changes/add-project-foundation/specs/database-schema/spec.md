# Spec Delta: Database Schema

## ADDED Requirements

### Requirement: Core Entity Tables
The system SHALL define PostgreSQL tables for institutions, users, sessions, students, exam types, and student exams using Prisma schema.

#### Scenario: Developer generates Prisma client
- **WHEN** a developer runs `npx prisma generate`
- **THEN** Prisma generates TypeScript types for all models (Institution, User, Student, ExamType, StudentExam, Session) with full type safety

#### Scenario: Developer queries a student with relations
- **WHEN** backend code queries `prisma.student.findUnique({ include: { user: true, institution: true } })`
- **THEN** Prisma returns typed student data with nested user and institution objects

### Requirement: Institution Multi-Tenancy
The system SHALL enforce institution-level data isolation through foreign keys and queries.

#### Scenario: Student belongs to single institution
- **WHEN** a student record is created
- **THEN** the student MUST reference a valid `institution_id` (enforced by foreign key constraint)

#### Scenario: Query filters by institution
- **WHEN** backend code queries students with `where: { institution_id: user.institution_id }`
- **THEN** only students from that institution are returned

### Requirement: User and Session Tables
The system SHALL store user accounts with hashed passwords and active sessions with expiration.

#### Scenario: User record is created
- **WHEN** a new user registers
- **THEN** a row is inserted into `users` table with `id`, `email`, `password_hash`, `role`, `institution_id`, and timestamps

#### Scenario: Session is stored
- **WHEN** a user logs in successfully
- **THEN** a session row is created with `id`, `user_id`, `expires_at`, and `created_at`

#### Scenario: Expired sessions are cleaned up
- **WHEN** a cleanup job runs
- **THEN** all sessions where `expires_at < NOW()` are deleted from the database

### Requirement: Student Profile Data
The system SHALL store student-specific data including class year and accommodations flag.

#### Scenario: Student record links to user
- **WHEN** a student profile is created
- **THEN** it MUST reference a valid `user_id` (one-to-one relationship)

#### Scenario: Accommodations flag is set
- **WHEN** a student has accommodations enabled
- **THEN** the `has_accommodations` boolean is set to `true` without storing medical details

### Requirement: Exam Configuration
The system SHALL support configurable exam types per institution with default weights.

#### Scenario: Institution defines custom exam type
- **WHEN** an admin creates an exam type with code "STEP1" and name "USMLE Step 1"
- **THEN** the exam type is stored with `institution_id`, `code`, `name`, `default_weight`, and timestamps

#### Scenario: Student exam references exam type
- **WHEN** a student exam is created
- **THEN** it MUST reference a valid `exam_type_id` and `student_id`

### Requirement: Schema Migrations
The system SHALL version control all database schema changes using Prisma migrations.

#### Scenario: Developer creates new migration
- **WHEN** a developer modifies the Prisma schema and runs `npx prisma migrate dev --name add-student-exams`
- **THEN** Prisma creates a timestamped migration SQL file in `packages/database/prisma/migrations/`

#### Scenario: Migration is applied to database
- **WHEN** a developer runs `npx prisma migrate deploy`
- **THEN** all pending migrations are applied to the PostgreSQL database in order

#### Scenario: Migration rollback is needed
- **WHEN** a migration causes issues in development
- **THEN** the developer can reset the database with `npx prisma migrate reset` and re-apply migrations

### Requirement: Type Safety and Validation
The system SHALL generate TypeScript types from Prisma schema and validate data constraints.

#### Scenario: Developer accesses typed model
- **WHEN** backend code uses `prisma.user.create()`
- **THEN** TypeScript enforces all required fields and provides autocomplete for model properties

#### Scenario: Unique constraint is enforced
- **WHEN** code attempts to insert a user with duplicate `email` in the same institution
- **THEN** PostgreSQL throws a unique constraint violation error

#### Scenario: Foreign key integrity is maintained
- **WHEN** code attempts to create a student with non-existent `user_id`
- **THEN** PostgreSQL throws a foreign key constraint error
