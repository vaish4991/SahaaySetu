import { UrgencyLevel, IncidentCategory } from '@sahaaysetu/shared';

export interface UrgencyEvaluation {
  urgencyLevel: UrgencyLevel;
  score: number;
  explanation: string;
  contributingFactors: string[];
}

interface PrioritizationInput {
  text: string;
  category?: IncidentCategory;
  hasCasualtiesOrTrapped?: boolean;
  hasFireOrElectricalHazard?: boolean;
  hasStructuralRisk?: boolean;
  isUnverifiedSource?: boolean;
  hasMedicalDistress?: boolean;
}

/**
 * Deterministic, rule-based urgency scoring engine.
 * Computes transparent, explainable 0-100 crisis priority.
 */
export function calculateUrgency(input: PrioritizationInput): UrgencyEvaluation {
  let score = 20; // baseline score for any reported incident
  const factors: string[] = ['Baseline incident report registered (+20)'];
  const textLower = (input.text || '').toLowerCase();

  // Severe Life-Threat Triggers (+40)
  const lifeThreatKeywords = [
    'trapped', 'unconscious', 'fainted', 'not breathing', 'collapsed', 'chest pain',
    'severe bleeding', 'heart attack', 'drowning', 'electrocution', 'sparking near water',
    'crushed', 'buried'
  ];
  const detectedLifeThreats = lifeThreatKeywords.filter(k => textLower.includes(k));
  if (input.hasCasualtiesOrTrapped || detectedLifeThreats.length > 0 || input.hasMedicalDistress) {
    score += 40;
    factors.push(`Direct life safety / trapped / medical threat detected (+40): ${detectedLifeThreats.slice(0, 3).join(', ')}`);
  }

  // Active Environmental / Infrastructure Hazard (+25)
  const hazardKeywords = [
    'fuel leak', 'gas leak', 'explosion', 'fire', 'live wire', 'transformer',
    'power line', 'power cable', 'cable', 'sparking', 'electric', 'live power',
    'bridge collapse', 'ceiling collapse', 'slab collapse', 'flash flood', 'submerged',
    'fallen tree', 'leakage'
  ];
  const detectedHazards = hazardKeywords.filter(k => textLower.includes(k));
  if (input.hasFireOrElectricalHazard || input.hasStructuralRisk || detectedHazards.length > 0) {
    score += 25;
    factors.push(`Active secondary hazard or structural danger (+25): ${detectedHazards.slice(0, 3).join(', ')}`);
  }

  // Worsening or High Impact Multipliers (+15)
  const impactKeywords = ['expressway', 'highway', 'crowd', 'underpass', 'blocked', 'rising water', 'jam', 'road'];
  const detectedImpacts = impactKeywords.filter(k => textLower.includes(k));
  if (detectedImpacts.length > 0) {
    score += 15;
    factors.push(`High public impact or escalating condition (+15): ${detectedImpacts.slice(0, 3).join(', ')}`);
  }

  // Category Specific Weights
  if (input.category === 'MEDICAL_EMERGENCY') {
    score += 15;
    factors.push('Medical emergency category weight (+15)');
  } else if (input.category === 'NATURAL_DISASTER') {
    score += 10;
    factors.push('Natural disaster / severe weather impact (+10)');
  }

  // Unverified Rumor / Social Forward Penalty (-20)
  if (input.isUnverifiedSource || textLower.includes('forwarded') || textLower.includes('viral') || textLower.includes('whatsapp')) {
    score -= 20;
    factors.push('Unverified external social media forward without official corroboration (-20)');
  }

  // Bound score between 10 and 100
  const finalScore = Math.min(100, Math.max(10, score));

  let urgencyLevel: UrgencyLevel = 'LOW';
  if (finalScore >= 80) {
    urgencyLevel = 'CRITICAL';
  } else if (finalScore >= 60) {
    urgencyLevel = 'HIGH';
  } else if (finalScore >= 35) {
    urgencyLevel = 'MEDIUM';
  }

  const explanation = `Priority evaluated at ${urgencyLevel} (Score: ${finalScore}/100) based on transparent criteria: ${factors.join('; ')}.`;

  return {
    urgencyLevel,
    score: finalScore,
    explanation,
    contributingFactors: factors
  };
}
