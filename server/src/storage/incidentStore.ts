import {
  IncidentRecord,
  ResponderBrief,
  ResponderBriefSchema,
  DEMO_SCENARIOS
} from '@sahaaysetu/shared';
import { analyzeIncident } from '../services/gemini';
import { findPossibleDuplicates } from '../services/duplicateDetector';
import { calculateUrgency } from '../services/prioritization';

class IncidentStore {
  private incidents: Map<string, IncidentRecord> = new Map();
  private initialized = false;

  constructor() {
    this.seedDemoScenarios();
  }

  private async seedDemoScenarios() {
    if (this.initialized) return;
    this.initialized = true;

    for (const demo of DEMO_SCENARIOS) {
      try {
        const incident = await analyzeIncident(demo.inputPayload as any, true);
        incident.id = demo.id;
        incident.isDemoScenario = true;
        this.incidents.set(incident.id, incident);
      } catch (err) {
        console.error(`Failed to seed demo scenario ${demo.id}:`, err);
      }
    }
  }

  public getAll(filters?: {
    category?: string;
    urgency?: string;
    search?: string;
  }): IncidentRecord[] {
    let list = Array.from(this.incidents.values());

    if (filters?.category && filters.category !== 'ALL') {
      list = list.filter(inc => inc.category === filters.category);
    }

    if (filters?.urgency && filters.urgency !== 'ALL') {
      list = list.filter(inc => inc.estimatedUrgency === filters.urgency);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(inc =>
        inc.title.toLowerCase().includes(q) ||
        inc.situationSummary.toLowerCase().includes(q) ||
        inc.location.rawText.toLowerCase().includes(q) ||
        inc.potentialHazards.some(h => h.description.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getById(id: string): IncidentRecord | undefined {
    return this.incidents.get(id);
  }

  public save(record: IncidentRecord): IncidentRecord {
    // Check duplicates against existing incidents
    const duplicates = findPossibleDuplicates(
      record.title,
      record.situationSummary,
      record.location.rawText,
      Array.from(this.incidents.values()).filter(i => i.id !== record.id)
    );
    record.possibleDuplicates = duplicates;

    this.incidents.set(record.id, record);
    return record;
  }

  public update(id: string, updates: Partial<IncidentRecord>): IncidentRecord | null {
    const existing = this.incidents.get(id);
    if (!existing) return null;

    const updated: IncidentRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Re-check duplicates if title/location changed
    if (updates.title || updates.location || updates.situationSummary) {
      updated.possibleDuplicates = findPossibleDuplicates(
        updated.title,
        updated.situationSummary,
        updated.location.rawText,
        Array.from(this.incidents.values()).filter(i => i.id !== id)
      );
    }

    this.incidents.set(id, updated);
    return updated;
  }

  public delete(id: string): boolean {
    return this.incidents.delete(id);
  }

  public clearUserData(): number {
    let deletedCount = 0;
    for (const [id, record] of this.incidents.entries()) {
      if (!record.isDemoScenario) {
        this.incidents.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  public generateResponderBrief(
    id: string,
    options: { scrubMedical?: boolean; scrubLocation?: boolean } = {}
  ): ResponderBrief | null {
    const inc = this.incidents.get(id);
    if (!inc) return null;

    const containsMedical = inc.medicalContextIncluded;
    const shouldScrub = Boolean(options.scrubMedical && containsMedical);

    const brief: ResponderBrief = {
      incidentId: inc.id,
      generatedAt: new Date().toISOString(),
      title: inc.title,
      category: inc.category,
      urgency: inc.estimatedUrgency,
      urgencyScore: inc.urgencyScore,
      locationSummary: options.scrubLocation
        ? '[LOCATION WITHHELD PER PRIVACY PREFERENCE]'
        : `${inc.location.rawText} (${inc.location.confidence} confidence)`,
      situationOverview: inc.situationSummary,
      keyFacts: inc.userReportedFacts.map(f => ({
        fact: f.text,
        evidence: f.evidenceLabel
      })),
      criticalHazards: inc.potentialHazards.map(h => `[${h.severity}] ${h.description} (Precautions: ${h.precautions})`),
      topActionPriorities: inc.recommendedActions.slice(0, 4).map(a => ({
        step: a.stepNumber,
        title: a.title,
        precautions: a.safetyPrecautions
      })),
      openUncertainties: inc.uncertainties.map(u => `${u.description} (${u.type}: ${u.mitigationSuggestion})`),
      contactEmergencyServices: [
        'National Emergency Helpline: 112',
        'Ambulance / Medical Response: 108',
        'Fire & Rescue: 101',
        'Disaster Management Authority: 1078'
      ],
      containsRedactedMedical: shouldScrub,
      confidentialityNote: shouldScrub
        ? 'CONFIDENTIAL: Sensitive medical context was redacted at user request for privacy protection.'
        : 'SahaaySetu Responder Brief. Verified for field situational coordination.'
    };

    return ResponderBriefSchema.parse(brief);
  }
}

export const incidentStore = new IncidentStore();
