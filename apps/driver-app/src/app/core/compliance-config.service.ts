import { Injectable } from '@angular/core';

export type DriverJobType =
  | 'RESIDENTIAL_ROUTE'
  | 'ROLL_OFF_DELIVERY'
  | 'SEPTIC_PUMPING'
  | 'YARD_MAINTENANCE'
  | 'EMERGENCY_CALL'
  | 'TRAINING_OFFICE';

type ReportingSystem = 'CalRecycle' | 'WA Digital Waste' | 'EPA e-Manifest' | 'State Portal';

interface ManifestRule {
  jobType: DriverJobType;
  required: boolean;
  reportingSystem?: ReportingSystem;
}

const MANIFEST_REQUIREMENTS: Record<string, ManifestRule[]> = {
  CO: [
    { jobType: 'RESIDENTIAL_ROUTE', required: false },
    { jobType: 'ROLL_OFF_DELIVERY', required: false },
    { jobType: 'SEPTIC_PUMPING', required: true, reportingSystem: 'State Portal' },
    { jobType: 'YARD_MAINTENANCE', required: false },
    { jobType: 'EMERGENCY_CALL', required: false },
    { jobType: 'TRAINING_OFFICE', required: false },
  ],
  CA: [
    { jobType: 'RESIDENTIAL_ROUTE', required: false },
    { jobType: 'ROLL_OFF_DELIVERY', required: true, reportingSystem: 'CalRecycle' },
    { jobType: 'SEPTIC_PUMPING', required: true, reportingSystem: 'CalRecycle' },
    { jobType: 'YARD_MAINTENANCE', required: false },
    { jobType: 'EMERGENCY_CALL', required: false },
    { jobType: 'TRAINING_OFFICE', required: false },
  ],
};

@Injectable({ providedIn: 'root' })
export class ComplianceConfigService {
  requiresManifest(stateCode: string, jobType: DriverJobType): boolean {
    const rules = MANIFEST_REQUIREMENTS[stateCode] ?? MANIFEST_REQUIREMENTS['CO'];
    return rules.find((rule) => rule.jobType === jobType)?.required ?? false;
  }

  reportingSystem(stateCode: string, jobType: DriverJobType): string | null {
    const rules = MANIFEST_REQUIREMENTS[stateCode] ?? MANIFEST_REQUIREMENTS['CO'];
    return rules.find((rule) => rule.jobType === jobType)?.reportingSystem ?? null;
  }
}
