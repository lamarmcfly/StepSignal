# Spec Delta: Authentication

## ADDED Requirements

### Requirement: User Registration
The system SHALL allow new users to register with email and password, assigned to an institution with a specific role.

#### Scenario: New user registers successfully
- **WHEN** a user submits valid registration data (email, password, institution ID, role)
- **THEN** the system creates a user account with hashed password and returns a success confirmation

#### Scenario: User registers with duplicate email
- **WHEN** a user attempts to register with an email that already exists in the same institution
- **THEN** the system returns an error "Email already registered" and does not create a duplicate account

#### Scenario: User registers with weak password
- **WHEN** a user submits a password shorter than 8 characters
- **THEN** the system returns an error "Password must be at least 8 characters" and does not create the account

### Requirement: User Login
The system SHALL authenticate users via email and password and create a session upon successful login.

#### Scenario: User logs in with valid credentials
- **WHEN** a user submits correct email and password
- **THEN** the system creates a session, sets a secure HTTP-only session cookie, and returns user data with role

#### Scenario: User logs in with invalid password
- **WHEN** a user submits an incorrect password
- **THEN** the system returns "Invalid email or password" error without revealing which field was incorrect

#### Scenario: User session persists across requests
- **WHEN** an authenticated user makes a subsequent API request with the session cookie
- **THEN** the system validates the session and identifies the user without requiring re-authentication

### Requirement: Role-Based Access Control
The system SHALL enforce role-based permissions (student, advisor, admin) on all protected routes.

#### Scenario: Student accesses student-only route
- **WHEN** an authenticated user with role "student" requests `/api/students/:id` where `:id` matches their student record
- **THEN** the system allows access and returns the student's data

#### Scenario: Student attempts to access admin route
- **WHEN** an authenticated user with role "student" requests `/api/admin/institutions`
- **THEN** the system returns 403 Forbidden error

#### Scenario: Advisor accesses assigned student data
- **WHEN** an authenticated user with role "advisor" requests `/api/students/:id` for a student they are assigned to
- **THEN** the system allows access and returns the student's data

#### Scenario: Advisor attempts to access unassigned student
- **WHEN** an authenticated user with role "advisor" requests `/api/students/:id` for a student outside their assigned group
- **THEN** the system returns 403 Forbidden error

### Requirement: Session Management
The system SHALL store sessions in PostgreSQL with automatic expiration and support for logout.

#### Scenario: User logs out
- **WHEN** an authenticated user requests `/api/auth/logout`
- **THEN** the system deletes the session from database, clears the session cookie, and confirms logout

#### Scenario: Session expires after inactivity
- **WHEN** a session has not been used for 7 days
- **THEN** the system automatically deletes the expired session and subsequent requests with that session cookie return 401 Unauthorized

#### Scenario: User session is validated
- **WHEN** a request includes a session cookie
- **THEN** the system validates the session exists in database, is not expired, and loads the associated user data

### Requirement: Multi-Tenancy Isolation
The system SHALL ensure users can only access data from their own institution.

#### Scenario: User queries data from own institution
- **WHEN** an authenticated user requests `/api/students`
- **THEN** the system filters results to only include students from the user's institution

#### Scenario: User attempts cross-institution access
- **WHEN** an authenticated user from Institution A requests `/api/students/:id` for a student in Institution B
- **THEN** the system returns 404 Not Found (not 403, to avoid leaking existence of other institutions' data)

### Requirement: Password Security
The system SHALL hash passwords using bcrypt with appropriate work factor and enforce minimum password strength.

#### Scenario: Password is hashed on registration
- **WHEN** a user registers with password "SecurePass123"
- **THEN** the system stores a bcrypt hash (not plaintext) in the `password_hash` column

#### Scenario: Password is verified on login
- **WHEN** a user logs in with correct password
- **THEN** the system uses bcrypt.compare to validate password against stored hash
