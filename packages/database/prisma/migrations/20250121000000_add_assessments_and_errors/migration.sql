-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('nbme_practice', 'nbme_shelf', 'cbse', 'qbank_block', 'custom');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('knowledge_deficit', 'misread', 'premature_closure', 'time_management', 'strategy_error');

-- CreateEnum
CREATE TYPE "MedicalSystem" AS ENUM ('cardiovascular', 'pulmonary', 'renal', 'gastrointestinal', 'endocrine', 'neurology', 'psychiatry', 'musculoskeletal', 'dermatology', 'reproductive', 'hematology', 'immunology', 'general');

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "name" TEXT NOT NULL,
    "date_taken" TIMESTAMP(3) NOT NULL,
    "score" DOUBLE PRECISION,
    "percent_correct" DOUBLE PRECISION,
    "total_questions" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_events" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "error_type" "ErrorType" NOT NULL,
    "system" "MedicalSystem" NOT NULL,
    "topic" TEXT,
    "question_ref" TEXT,
    "reflection" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessments_student_id_idx" ON "assessments"("student_id");

-- CreateIndex
CREATE INDEX "assessments_date_taken_idx" ON "assessments"("date_taken");

-- CreateIndex
CREATE INDEX "assessments_type_idx" ON "assessments"("type");

-- CreateIndex
CREATE INDEX "error_events_assessment_id_idx" ON "error_events"("assessment_id");

-- CreateIndex
CREATE INDEX "error_events_error_type_idx" ON "error_events"("error_type");

-- CreateIndex
CREATE INDEX "error_events_system_idx" ON "error_events"("system");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_events" ADD CONSTRAINT "error_events_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
