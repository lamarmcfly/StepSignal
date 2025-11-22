export type UserRole = 'student' | 'advisor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  institutionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  id: string;
  userId: string;
  institutionId: string;
  classYear: number;
  hasAccommodations: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Institution {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamType {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  defaultWeight: number;
  createdAt: Date;
}

export interface StudentExam {
  id: string;
  studentId: string;
  examTypeId: string;
  scheduledDate: Date;
  attemptNumber: number;
  outcome: 'pass' | 'fail' | number | null;
  createdAt: Date;
}
