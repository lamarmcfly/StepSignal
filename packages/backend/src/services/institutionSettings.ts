import { prisma } from '@stepsignal/database';

// ============================================================================
// GET INSTITUTION SETTINGS
// ============================================================================

export interface InstitutionSettingsData {
  lowRiskThreshold: number;
  mediumRiskThreshold: number;
  highRiskThreshold: number;
  defaultWeeklyHours: number;
  defaultDailyHoursCap: number;
  accommodationsMultiplier: number;
  disclaimerText: string | null;
  enableAutoAlerts: boolean;
  enableStudyPlanEngine: boolean;
  customSettings: any;
}

/**
 * Get institution settings, creating default settings if they don't exist
 */
export async function getInstitutionSettings(
  institutionId: string
): Promise<InstitutionSettingsData> {
  let settings = await prisma.institutionSettings.findUnique({
    where: { institutionId },
  });

  // If settings don't exist, create with defaults
  if (!settings) {
    settings = await prisma.institutionSettings.create({
      data: {
        institutionId,
        // Defaults are already set in the schema
      },
    });
  }

  return {
    lowRiskThreshold: settings.lowRiskThreshold,
    mediumRiskThreshold: settings.mediumRiskThreshold,
    highRiskThreshold: settings.highRiskThreshold,
    defaultWeeklyHours: settings.defaultWeeklyHours,
    defaultDailyHoursCap: settings.defaultDailyHoursCap,
    accommodationsMultiplier: settings.accommodationsMultiplier,
    disclaimerText: settings.disclaimerText,
    enableAutoAlerts: settings.enableAutoAlerts,
    enableStudyPlanEngine: settings.enableStudyPlanEngine,
    customSettings: settings.customSettings,
  };
}

// ============================================================================
// UPDATE INSTITUTION SETTINGS
// ============================================================================

export interface UpdateInstitutionSettingsInput {
  lowRiskThreshold?: number;
  mediumRiskThreshold?: number;
  highRiskThreshold?: number;
  defaultWeeklyHours?: number;
  defaultDailyHoursCap?: number;
  accommodationsMultiplier?: number;
  disclaimerText?: string | null;
  enableAutoAlerts?: boolean;
  enableStudyPlanEngine?: boolean;
  customSettings?: any;
}

/**
 * Update institution settings
 */
export async function updateInstitutionSettings(
  institutionId: string,
  updates: UpdateInstitutionSettingsInput
): Promise<InstitutionSettingsData> {
  // Validate risk thresholds if provided
  if (updates.lowRiskThreshold !== undefined ||
      updates.mediumRiskThreshold !== undefined ||
      updates.highRiskThreshold !== undefined) {

    const currentSettings = await getInstitutionSettings(institutionId);

    const lowThreshold = updates.lowRiskThreshold ?? currentSettings.lowRiskThreshold;
    const mediumThreshold = updates.mediumRiskThreshold ?? currentSettings.mediumRiskThreshold;
    const highThreshold = updates.highRiskThreshold ?? currentSettings.highRiskThreshold;

    // Validate: low < medium < high
    if (lowThreshold >= mediumThreshold || mediumThreshold >= highThreshold) {
      throw new Error(
        'Risk thresholds must be in ascending order: low < medium < high'
      );
    }

    // Validate: all thresholds are between 0 and 100
    if (lowThreshold < 0 || lowThreshold > 100 ||
        mediumThreshold < 0 || mediumThreshold > 100 ||
        highThreshold < 0 || highThreshold > 100) {
      throw new Error('Risk thresholds must be between 0 and 100');
    }
  }

  // Validate study plan defaults
  if (updates.defaultWeeklyHours !== undefined && updates.defaultWeeklyHours <= 0) {
    throw new Error('Default weekly hours must be greater than 0');
  }

  if (updates.defaultDailyHoursCap !== undefined && updates.defaultDailyHoursCap <= 0) {
    throw new Error('Default daily hours cap must be greater than 0');
  }

  // Validate accommodations multiplier
  if (updates.accommodationsMultiplier !== undefined &&
      (updates.accommodationsMultiplier <= 0 || updates.accommodationsMultiplier > 1)) {
    throw new Error('Accommodations multiplier must be between 0 and 1');
  }

  // First ensure settings exist
  await getInstitutionSettings(institutionId);

  // Update settings
  const updatedSettings = await prisma.institutionSettings.update({
    where: { institutionId },
    data: updates,
  });

  return {
    lowRiskThreshold: updatedSettings.lowRiskThreshold,
    mediumRiskThreshold: updatedSettings.mediumRiskThreshold,
    highRiskThreshold: updatedSettings.highRiskThreshold,
    defaultWeeklyHours: updatedSettings.defaultWeeklyHours,
    defaultDailyHoursCap: updatedSettings.defaultDailyHoursCap,
    accommodationsMultiplier: updatedSettings.accommodationsMultiplier,
    disclaimerText: updatedSettings.disclaimerText,
    enableAutoAlerts: updatedSettings.enableAutoAlerts,
    enableStudyPlanEngine: updatedSettings.enableStudyPlanEngine,
    customSettings: updatedSettings.customSettings,
  };
}

// ============================================================================
// RISK LEVEL CALCULATION HELPER
// ============================================================================

/**
 * Calculate risk level based on institution-specific thresholds
 */
export async function calculateRiskLevel(
  institutionId: string,
  riskScore: number
): Promise<'low' | 'medium' | 'high' | 'critical'> {
  const settings = await getInstitutionSettings(institutionId);

  if (riskScore < settings.lowRiskThreshold) {
    return 'low';
  } else if (riskScore < settings.mediumRiskThreshold) {
    return 'medium';
  } else if (riskScore < settings.highRiskThreshold) {
    return 'high';
  } else {
    return 'critical';
  }
}

// ============================================================================
// ACCOMMODATIONS HELPER
// ============================================================================

/**
 * Apply accommodations multiplier to expected volume/hours
 */
export async function applyAccommodationsMultiplier(
  institutionId: string,
  baseValue: number,
  hasAccommodations: boolean
): Promise<number> {
  if (!hasAccommodations) {
    return baseValue;
  }

  const settings = await getInstitutionSettings(institutionId);
  return baseValue * settings.accommodationsMultiplier;
}
