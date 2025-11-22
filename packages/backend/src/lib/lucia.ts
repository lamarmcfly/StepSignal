// Session-based authentication types
import type { User } from '@stepsignal/shared';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    user?: User;
  }
}
