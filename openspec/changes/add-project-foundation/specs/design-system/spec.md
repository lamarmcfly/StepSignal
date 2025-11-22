# Spec Delta: Design System

## ADDED Requirements

### Requirement: Design Tokens
The system SHALL define design tokens for colors, typography, spacing, shadows, and border radii as CSS custom properties.

#### Scenario: Developer uses color token
- **WHEN** a CSS module references `var(--color-primary)`
- **THEN** the deep teal color `#0F766E` is applied consistently across the application

#### Scenario: Developer uses spacing token
- **WHEN** a component applies padding with `var(--space-4)`
- **THEN** 16px padding is applied, matching the spacing scale

#### Scenario: Tokens are defined in root
- **WHEN** the application loads
- **THEN** all design tokens are defined in `:root` selector and available globally

### Requirement: Typography System
The system SHALL use a single sans-serif font stack with consistent heading and body text sizes.

#### Scenario: Headings use consistent sizing
- **WHEN** a page renders an `<h1>` heading
- **THEN** it uses `var(--text-xl)` (22px) from the typography scale

#### Scenario: Body text is readable
- **WHEN** a page renders paragraph text
- **THEN** it uses `var(--text-md)` (16px) with charcoal color `var(--color-text-main)`

### Requirement: AppShell Layout Component
The system SHALL provide an AppShell component with left sidebar navigation, top header, and main content area.

#### Scenario: Page renders with AppShell
- **WHEN** a protected route component renders
- **THEN** it is wrapped in AppShell with visible sidebar, header, and content area

#### Scenario: Sidebar navigation links
- **WHEN** a user views the sidebar
- **THEN** navigation links are displayed for Dashboard, Students, Exams, Plans, Analytics, Settings

#### Scenario: Active route is highlighted
- **WHEN** a user is on `/dashboard`
- **THEN** the Dashboard link in sidebar shows active state with accent color

### Requirement: Card Component
The system SHALL provide a Card component with white background, subtle border, and shadow.

#### Scenario: Card displays content
- **WHEN** a Card component wraps content
- **THEN** it renders with white background, `var(--color-border-subtle)` border, and `var(--shadow-card)` shadow

#### Scenario: Card has optional title
- **WHEN** a Card receives a `title` prop
- **THEN** the title renders at the top of the card with appropriate typography

### Requirement: Button Component
The system SHALL provide Button component with variants: primary, secondary, and ghost.

#### Scenario: Primary button
- **WHEN** a Button is rendered with `variant="primary"`
- **THEN** it displays with deep teal background `var(--color-primary)` and white text

#### Scenario: Button is disabled
- **WHEN** a Button has `disabled={true}`
- **THEN** it shows reduced opacity, disabled cursor, and does not trigger onClick

#### Scenario: Button with loading state
- **WHEN** a Button has `isLoading={true}`
- **THEN** it shows a loading indicator and is non-interactive

### Requirement: Badge Component
The system SHALL provide Badge component with variants for risk tiers (low, moderate, high) and general tags.

#### Scenario: High risk badge
- **WHEN** a Badge is rendered with `variant="risk-high"`
- **THEN** it displays with red/warning color scheme and "High" label

#### Scenario: Moderate risk badge
- **WHEN** a Badge is rendered with `variant="risk-moderate"`
- **THEN** it displays with amber/caution color scheme and "Moderate" label

#### Scenario: Low risk badge
- **WHEN** a Badge is rendered with `variant="risk-low"`
- **THEN** it displays with green/success color scheme and "Low" label

### Requirement: Table Component
The system SHALL provide a styled Table component for displaying tabular data with consistent formatting.

#### Scenario: Table renders rows
- **WHEN** a Table receives an array of data
- **THEN** it renders with proper borders, row hover states, and consistent cell padding

#### Scenario: Table headers are styled
- **WHEN** a Table header row is rendered
- **THEN** headers use medium font weight and muted text color

#### Scenario: Table rows are clickable
- **WHEN** a Table row has an `onClick` handler
- **THEN** the row shows hover state and pointer cursor

### Requirement: FormField Component
The system SHALL provide FormField component with label, input, and error message display.

#### Scenario: Form field with label
- **WHEN** a FormField is rendered with `label="Email"`
- **THEN** it displays the label above the input with proper spacing and typography

#### Scenario: Form field shows error
- **WHEN** a FormField receives `error="Email is required"`
- **THEN** the error message displays in red below the input and the input shows error border

#### Scenario: Form field is required
- **WHEN** a FormField has `required={true}`
- **THEN** a red asterisk is displayed next to the label

### Requirement: Alert Component
The system SHALL provide Alert component for displaying warnings, errors, success messages, and info callouts.

#### Scenario: Warning alert
- **WHEN** an Alert is rendered with `variant="warning"` and message "High-risk exam in 3 weeks"
- **THEN** it displays with amber background, warning icon, and the message

#### Scenario: Success alert
- **WHEN** an Alert is rendered with `variant="success"` and message "Plan created successfully"
- **THEN** it displays with green background, success icon, and the message

### Requirement: No External UI Libraries
The system SHALL NOT use external UI component libraries (Material-UI, Chakra UI, Ant Design, etc.).

#### Scenario: Developer adds dependency
- **WHEN** a developer attempts to install `@mui/material` or `@chakra-ui/react`
- **THEN** code review rejects the PR with requirement to use custom components

#### Scenario: All components use design tokens
- **WHEN** a component is implemented
- **THEN** it uses only CSS custom properties from tokens, not hardcoded colors or spacing values

### Requirement: Calm, Clinical Aesthetic
The system SHALL maintain a professional, non-flashy visual style appropriate for medical school analytics.

#### Scenario: No gradient backgrounds
- **WHEN** any component is rendered
- **THEN** it uses solid colors only, no CSS gradients

#### Scenario: Minimal shadows and effects
- **WHEN** interactive elements are hovered
- **THEN** feedback is subtle (slight color change or border), not glowing effects or heavy shadows

#### Scenario: Consistent color palette
- **WHEN** pages are rendered
- **THEN** all accent colors use the approved deep teal and green tones, no purple/blue neon colors
