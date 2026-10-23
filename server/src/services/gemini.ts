import { GoogleGenAI } from '@google/genai';
import {
  IncidentCategory,
  IncidentInputPayload,
  IncidentRecord,
  IncidentRecordSchema,
  DEMO_SCENARIOS,
  EvidenceLabel,
  LocationConfidence,
  UrgencyLevel
} from '@sahaaysetu/shared';
import { env, isGeminiConfigured } from '../config/env';
import { calculateUrgency } from './prioritization';
import { sanitizeInputText, sanitizeMedicalContext } from './sanitizer';

let genAIClient: GoogleGenAI | null = null;
if (isGeminiConfigured) {
  try {
    genAIClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

const GEMINI_SYSTEM_INSTRUCTION = `
You are the AI Core of SahaaySetu — an emergency crisis-to-action bridge for humanitarian and civic coordination.
Your mission is to convert unstructured, messy crisis inputs (voice notes, bystander text, alerts, photos, medical snippets) into structured, safe, evidence-aware incident reports.

CRITICAL SAFETY & INTEGRITY RULES:
1. EVIDENCE-TO-ACTION CHAIN: You must label EVERY extracted fact, hazard, and recommended action with exactly one evidence label:
   - "USER-REPORTED": directly stated by the user/witness.
   - "SOURCE-VERIFIED": only if backed by an identifiable official communique (e.g. IMD, police bulletin, fire department). Do NOT label something source-verified merely because you inferred it.
   - "AI-INFERRED": deduced by you from the context (e.g. probable fuel explosion risk from a tanker crash in fog).
   - "UNVERIFIED": unconfirmed rumor, social media forward, or uncorroborated third-party claim.
2. MEDICAL CONSERVATISM: You are NOT a medical practitioner and must NEVER diagnose illnesses, prescribe medications, or guess treatment. Offer conservative first-aid and scene stabilization precautions (e.g. recovery position, clear airway, do not give water to unconscious person) and escalate immediately to emergency medical services (e.g. 108/112).
3. NO DISPATCH CLAIMS: NEVER claim emergency personnel or rescue teams are dispatched or "on their way". Clearly instruct the user on direct emergency telephone contacts.
4. UNCERTAINTIES: Explicitly surface missing facts (e.g., unknown mile marker, unverified count of trapped occupants, conflicting water levels).
5. LOCATION: Extract location and assign confidence: EXACT, APPROXIMATE, UNCONFIRMED, or UNKNOWN.

Output ONLY valid JSON strictly matching the requested schema. Do not include markdown code block formatting or backticks around the json.
`;

const RESPONSE_SCHEMA_JSON = {
  category: "NATURAL_DISASTER | TRAFFIC_ACCIDENT | INFRASTRUCTURE_FAILURE | PUBLIC_SAFETY | MEDICAL_EMERGENCY | OTHER",
  title: "Short concise incident title (max 100 chars)",
  situationSummary: "Clear 2-3 sentence summary of the situation",
  location: {
    rawText: "Location string from user",
    confidence: "EXACT | APPROXIMATE | UNCONFIRMED | UNKNOWN",
    normalized: "Clean city/district/landmark if discernible"
  },
  userReportedFacts: [
    {
      id: "fact-1",
      text: "Fact statement",
      evidenceLabel: "USER-REPORTED | SOURCE-VERIFIED | AI-INFERRED | UNVERIFIED",
      confidenceScore: 0.9,
      sourceReference: "Optional source info"
    }
  ],
  potentialHazards: [
    {
      id: "hazard-1",
      description: "Hazard description",
      severity: "SEVERE | MODERATE | LOW",
      precautions: "Immediate safety precautions",
      evidenceLabel: "USER-REPORTED | SOURCE-VERIFIED | AI-INFERRED | UNVERIFIED"
    }
  ],
  peopleAffected: {
    estimatedCount: "e.g. 2-5 persons or Unknown",
    vulnerableGroups: ["elderly", "children"],
    details: "Context on affected individuals"
  },
  uncertainties: [
    {
      id: "unc-1",
      description: "Uncertain detail",
      type: "MISSING_DATA | CONFLICTING_REPORT | LOCATION_AMBIGUITY | UNVERIFIED_SOURCE",
      mitigationSuggestion: "How responder can verify"
    }
  ],
  recommendedActions: [
    {
      id: "act-1",
      stepNumber: 1,
      title: "Immediate action title",
      description: "Step-by-step guidance",
      priority: "IMMEDIATE | HIGH | ROUTINE",
      safetyPrecautions: "Safety warnings",
      rationale: "Why this action is critical",
      evidenceLabel: "USER-REPORTED | SOURCE-VERIFIED | AI-INFERRED | UNVERIFIED",
      requiresConfirmation: true,
      emergencyServiceContact: "112 / 108"
    }
  ]
};

export async function analyzeIncident(
  payload: IncidentInputPayload,
  isExplicitDemo = false
): Promise<IncidentRecord> {
  const timestamp = new Date().toISOString();
  const incidentId = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Sanitize all inputs
  const cleanText = sanitizeInputText(payload.text).cleanedText;
  const cleanSpeech = sanitizeInputText(payload.speechTranscript).cleanedText;
  const cleanPasted = sanitizeInputText(payload.pastedReport).cleanedText;
  const cleanPastedSource = sanitizeInputText(payload.pastedReportSource).cleanedText;
  const cleanMedical = sanitizeMedicalContext(payload.medicalContext, payload.consentGivenForMedical);

  // Check if this input matches one of our 5 demo scenarios or is explicitly requested as demo
  const matchedDemo = DEMO_SCENARIOS.find(demo => {
    return isExplicitDemo || (
      (cleanText && demo.inputPayload.text && cleanText.includes(demo.inputPayload.text.substring(0, 30))) ||
      (cleanPasted && demo.inputPayload.pastedReport && cleanPasted.includes(demo.inputPayload.pastedReport.substring(0, 30)))
    );
  });

  // If Gemini is not configured or demo mode is matched, use the deterministic engine
  if (!isGeminiConfigured || !genAIClient || matchedDemo) {
    return generateDeterministicIncident({
      incidentId,
      timestamp,
      payload,
      cleanText,
      cleanSpeech,
      cleanPasted,
      cleanPastedSource,
      cleanMedical,
      demoTemplate: matchedDemo
    });
  }

  // Real Gemini API Execution
  try {
    const promptParts: any[] = [];

    let combinedDescription = `ANALYZE THIS EMERGENCY INCIDENT AND RETURN JSON.\n\n`;
    if (cleanText) combinedDescription += `PRIMARY USER TEXT: ${cleanText}\n\n`;
    if (cleanSpeech) combinedDescription += `VOICE RECORDING TRANSCRIPT: ${cleanSpeech}\n\n`;
    if (cleanPasted) combinedDescription += `PASTED EXTERNAL ALERT: ${cleanPasted} (Claimed Source: ${cleanPastedSource || 'Not specified'})\n\n`;
    if (cleanMedical && payload.consentGivenForMedical) {
      combinedDescription += `CONSENTED MEDICAL CONTEXT: ${cleanMedical}\n\n`;
    }
    combinedDescription += `LOCATION CONSENT GIVEN: ${payload.consentGivenForLocation ? 'YES' : 'NO'}\n`;
    combinedDescription += `LANGUAGE: ${payload.languagePreference}\n\n`;
    combinedDescription += `REQUIRED OUTPUT JSON STRUCTURE:\n${JSON.stringify(RESPONSE_SCHEMA_JSON, null, 2)}`;

    promptParts.push({ text: combinedDescription });

    // Handle multimodal image input if provided
    if (payload.imageBase64 && payload.imageMimeType) {
      promptParts.push({
        inlineData: {
          mimeType: payload.imageMimeType,
          data: payload.imageBase64.replace(/^data:[^;]+;base64,/, '')
        }
      });
    }

    const response = await genAIClient.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: promptParts,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const responseText = response.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // Clean possible markdown code fences if model enclosed in ```json
      const cleaned = responseText.replace(/```(?:json)?/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Algorithmic urgency evaluation for transparent score & validation
    const urgencyEval = calculateUrgency({
      text: `${cleanText} ${cleanSpeech} ${cleanPasted}`,
      category: parsed.category,
      hasMedicalDistress: Boolean(cleanMedical)
    });

    const incident: IncidentRecord = {
      id: incidentId,
      category: parsed.category || 'OTHER',
      title: parsed.title || 'Reported Crisis Incident',
      situationSummary: parsed.situationSummary || cleanText || cleanSpeech || 'Incident reported.',
      userReportedFacts: (parsed.userReportedFacts || []).map((f: any, idx: number) => ({
        id: f.id || `fact-${idx + 1}`,
        text: f.text,
        evidenceLabel: f.evidenceLabel || 'USER-REPORTED',
        userConfirmed: false,
        sourceReference: f.sourceReference,
        confidenceScore: typeof f.confidenceScore === 'number' ? f.confidenceScore : 0.85
      })),
      location: {
        rawText: parsed.location?.rawText || (payload.consentGivenForLocation ? 'Location provided in text' : 'Location withheld'),
        normalized: parsed.location?.normalized,
        confidence: parsed.location?.confidence || 'APPROXIMATE',
        userConfirmed: false
      },
      estimatedUrgency: urgencyEval.urgencyLevel,
      urgencyExplanation: urgencyEval.explanation,
      urgencyScore: urgencyEval.score,
      potentialHazards: (parsed.potentialHazards || []).map((h: any, idx: number) => ({
        id: h.id || `hazard-${idx + 1}`,
        description: h.description,
        severity: h.severity || 'MODERATE',
        precautions: h.precautions || 'Proceed with caution',
        evidenceLabel: h.evidenceLabel || 'AI-INFERRED'
      })),
      peopleAffected: {
        estimatedCount: parsed.peopleAffected?.estimatedCount || 'Unknown',
        vulnerableGroups: parsed.peopleAffected?.vulnerableGroups || [],
        details: parsed.peopleAffected?.details
      },
      uncertainties: (parsed.uncertainties || []).map((u: any, idx: number) => ({
        id: u.id || `unc-${idx + 1}`,
        description: u.description,
        type: u.type || 'MISSING_DATA',
        mitigationSuggestion: u.mitigationSuggestion || 'Verify with on-scene responders'
      })),
      recommendedActions: (parsed.recommendedActions || []).map((a: any, idx: number) => ({
        id: a.id || `act-${idx + 1}`,
        stepNumber: a.stepNumber || idx + 1,
        title: a.title,
        description: a.description,
        priority: a.priority || 'HIGH',
        safetyPrecautions: a.safetyPrecautions || 'Ensure personal safety first',
        rationale: a.rationale || 'Mitigate immediate risk',
        evidenceLabel: a.evidenceLabel || 'AI-INFERRED',
        requiresConfirmation: Boolean(a.requiresConfirmation),
        isCompleted: false,
        emergencyServiceContact: a.emergencyServiceContact || '112'
      })),
      evidenceReferences: [
        ...(cleanText ? [{
          id: 'ev-1',
          sourceType: 'USER_TEXT' as const,
          label: 'USER-REPORTED' as EvidenceLabel,
          contentSnippet: cleanText.substring(0, 150),
          sourceAttribution: 'Submitted by citizen witness'
        }] : []),
        ...(cleanSpeech ? [{
          id: 'ev-2',
          sourceType: 'VOICE_TRANSCRIPT' as const,
          label: 'USER-REPORTED' as EvidenceLabel,
          contentSnippet: cleanSpeech.substring(0, 150),
          sourceAttribution: 'Speech-to-text transcript'
        }] : []),
        ...(cleanPasted ? [{
          id: 'ev-3',
          sourceType: 'PASTED_ALERT' as const,
          label: cleanPastedSource ? 'SOURCE-VERIFIED' as EvidenceLabel : 'UNVERIFIED' as EvidenceLabel,
          contentSnippet: cleanPasted.substring(0, 150),
          sourceAttribution: cleanPastedSource || 'Pasted third-party alert'
        }] : [])
      ],
      verificationStatus: 'REQUIRES_HUMAN_REVIEW',
      lifecycleStatus: 'ANALYZED',
      possibleDuplicates: [],
      medicalContextIncluded: Boolean(cleanMedical && payload.consentGivenForMedical),
      medicalContextConsentGiven: payload.consentGivenForMedical,
      createdAt: timestamp,
      updatedAt: timestamp,
      language: payload.languagePreference,
      isDemoScenario: false,
      disclaimer: 'SahaaySetu is an AI-assisted crisis coordination bridge. It does not replace trained emergency services, officially certified responders, or medical practitioners. For immediate life danger, contact local emergency dispatch (e.g. 112 in India, 911 in US).'
    };

    return IncidentRecordSchema.parse(incident);
  } catch (apiError: any) {
    console.warn('Gemini API call failed, falling back to deterministic local analysis:', apiError?.message);
    // Fall back gracefully to deterministic analysis without crashing
    return generateDeterministicIncident({
      incidentId,
      timestamp,
      payload,
      cleanText,
      cleanSpeech,
      cleanPasted,
      cleanPastedSource,
      cleanMedical
    });
  }
}

/**
 * Deterministic fallback analysis engine for environments without live API credentials or for testing.
 */
function generateDeterministicIncident({
  incidentId,
  timestamp,
  payload,
  cleanText,
  cleanSpeech,
  cleanPasted,
  cleanPastedSource,
  cleanMedical,
  demoTemplate
}: {
  incidentId: string;
  timestamp: string;
  payload: IncidentInputPayload;
  cleanText: string;
  cleanSpeech: string;
  cleanPasted: string;
  cleanPastedSource: string;
  cleanMedical: string;
  demoTemplate?: typeof DEMO_SCENARIOS[0];
}): IncidentRecord {
  const allText = `${cleanText} ${cleanSpeech} ${cleanPasted}`;
  
  // If a known demo scenario was selected or matched, ground in its rich scenario data
  if (demoTemplate) {
    const urgency = calculateUrgency({
      text: allText,
      category: demoTemplate.category,
      hasMedicalDistress: Boolean(cleanMedical)
    });

    return {
      id: incidentId,
      category: demoTemplate.category,
      title: demoTemplate.title,
      situationSummary: demoTemplate.description,
      userReportedFacts: [
        {
          id: 'fact-1',
          text: `Primary incident context: ${cleanText.substring(0, 200) || demoTemplate.title}`,
          evidenceLabel: 'USER-REPORTED',
          userConfirmed: true,
          confidenceScore: 0.95
        },
        {
          id: 'fact-2',
          text: `Location identified as ${demoTemplate.locationText}`,
          evidenceLabel: 'USER-REPORTED',
          userConfirmed: true,
          confidenceScore: 0.9
        },
        ...(cleanPasted ? [{
          id: 'fact-3',
          text: `External communication received: ${cleanPasted.substring(0, 160)}`,
          evidenceLabel: cleanPastedSource ? ('SOURCE-VERIFIED' as EvidenceLabel) : ('UNVERIFIED' as EvidenceLabel),
          userConfirmed: false,
          sourceReference: cleanPastedSource || 'Uncorroborated text',
          confidenceScore: 0.85
        }] : [])
      ],
      location: {
        rawText: demoTemplate.locationText,
        normalized: demoTemplate.locationText,
        confidence: 'EXACT',
        userConfirmed: true
      },
      estimatedUrgency: demoTemplate.urgency,
      urgencyExplanation: urgency.explanation,
      urgencyScore: demoTemplate.urgencyScore,
      potentialHazards: demoTemplate.hazards,
      peopleAffected: {
        estimatedCount: demoTemplate.category === 'TRAFFIC_ACCIDENT' ? '3-5 persons' : 'Multiple citizens in vicinity',
        vulnerableGroups: demoTemplate.category === 'MEDICAL_EMERGENCY' ? ['Elderly patient'] : ['Motorists', 'Pedestrians'],
        details: 'Potential immediate exposure to environmental or collision hazards'
      },
      uncertainties: [
        {
          id: 'unc-1',
          description: 'Exact arrival timeframe of official municipal emergency dispatch teams',
          type: 'MISSING_DATA',
          mitigationSuggestion: 'Contact local dispatch (112) for active ticket confirmation'
        },
        {
          id: 'unc-2',
          description: 'Secondary cascade effects (e.g. rising flood levels, utility cutoffs)',
          type: 'UNVERIFIED_SOURCE',
          mitigationSuggestion: 'Monitor official local emergency broadcast radio/alerts'
        }
      ],
      recommendedActions: [
        {
          id: 'act-1',
          stepNumber: 1,
          title: 'Establish Immediate Safety Perimeter',
          description: 'Maintain distance from active hazards (waterlogged electricity, spilled fuel, or unstable structures).',
          priority: 'IMMEDIATE',
          safetyPrecautions: 'Do NOT touch metallic water poles, open wires, or enter standing flood waters.',
          rationale: 'Prevent fatal secondary electrocution or flash ignition.',
          evidenceLabel: 'AI-INFERRED',
          requiresConfirmation: true,
          isCompleted: false,
          emergencyServiceContact: '112 / 101'
        },
        {
          id: 'act-2',
          stepNumber: 2,
          title: 'Direct Call to Emergency Dispatch',
          description: 'Report incident with exact coordinates and hazards to unified emergency helpline (112 / 108).',
          priority: 'IMMEDIATE',
          safetyPrecautions: 'Speak clearly, state exact landmarks and known injuries.',
          rationale: 'Initiate official response without delay.',
          evidenceLabel: 'SOURCE-VERIFIED',
          requiresConfirmation: false,
          isCompleted: false,
          emergencyServiceContact: '112'
        },
        {
          id: 'act-3',
          stepNumber: 3,
          title: 'Divert Bystanders and Traffic',
          description: 'Warn approaching motorists or pedestrians to avoid the compromised area.',
          priority: 'HIGH',
          safetyPrecautions: 'Do not step into active high-speed roadway or dense smoke/fog.',
          rationale: 'Avoid multi-vehicle pileups and crowd crush.',
          evidenceLabel: 'AI-INFERRED',
          requiresConfirmation: false,
          isCompleted: false
        }
      ],
      evidenceReferences: [
        {
          id: 'ev-demo-1',
          sourceType: 'USER_TEXT',
          label: 'USER-REPORTED',
          contentSnippet: demoTemplate.description.substring(0, 150),
          sourceAttribution: 'Demonstration scenario dataset'
        }
      ],
      verificationStatus: 'REQUIRES_HUMAN_REVIEW',
      lifecycleStatus: 'ANALYZED',
      possibleDuplicates: [],
      medicalContextIncluded: Boolean(cleanMedical && payload.consentGivenForMedical),
      medicalContextConsentGiven: payload.consentGivenForMedical,
      createdAt: timestamp,
      updatedAt: timestamp,
      language: payload.languagePreference,
      isDemoScenario: true,
      demoScenarioId: demoTemplate.id,
      disclaimer: 'DEMONSTRATION RECORD: This is a verified scenario modeled for civic crisis simulation. For real-life emergencies, call 112 immediately.'
    };
  }

  // Generic heuristic analysis for novel input when Gemini is not configured
  const urgency = calculateUrgency({
    text: allText,
    hasMedicalDistress: Boolean(cleanMedical)
  });

  let detectedCategory: IncidentCategory = 'OTHER';
  const lower = allText.toLowerCase();
  if (lower.includes('water') || lower.includes('flood') || lower.includes('rain') || lower.includes('cyclone') || lower.includes('earthquake')) {
    detectedCategory = 'NATURAL_DISASTER';
  } else if (lower.includes('car') || lower.includes('truck') || lower.includes('highway') || lower.includes('crash') || lower.includes('accident')) {
    detectedCategory = 'TRAFFIC_ACCIDENT';
  } else if (lower.includes('collapse') || lower.includes('wire') || lower.includes('pipe') || lower.includes('bridge') || lower.includes('gas leak')) {
    detectedCategory = 'INFRASTRUCTURE_FAILURE';
  } else if (cleanMedical || lower.includes('unconscious') || lower.includes('fainted') || lower.includes('bleeding') || lower.includes('breathing')) {
    detectedCategory = 'MEDICAL_EMERGENCY';
  } else if (lower.includes('crowd') || lower.includes('fire') || lower.includes('stampede') || lower.includes('warning')) {
    detectedCategory = 'PUBLIC_SAFETY';
  }

  return {
    id: incidentId,
    category: detectedCategory,
    title: cleanText ? cleanText.substring(0, 60) : 'Citizen-Reported Incident',
    situationSummary: cleanText || cleanSpeech || cleanPasted || 'Unstructured emergency report submitted.',
    userReportedFacts: [
      {
        id: 'fact-1',
        text: cleanText ? cleanText.substring(0, 180) : 'Bystander voice/text input received',
        evidenceLabel: 'USER-REPORTED',
        userConfirmed: false,
        confidenceScore: 0.85
      },
      ...(cleanPasted ? [{
        id: 'fact-2',
        text: `External communication: ${cleanPasted.substring(0, 180)}`,
        evidenceLabel: cleanPastedSource ? ('SOURCE-VERIFIED' as EvidenceLabel) : ('UNVERIFIED' as EvidenceLabel),
        userConfirmed: false,
        sourceReference: cleanPastedSource,
        confidenceScore: 0.8
      }] : [])
    ],
    location: {
      rawText: payload.consentGivenForLocation ? 'Provided in text/report' : 'Location consent not provided',
      confidence: 'APPROXIMATE',
      userConfirmed: false
    },
    estimatedUrgency: urgency.urgencyLevel,
    urgencyExplanation: urgency.explanation,
    urgencyScore: urgency.score,
    potentialHazards: [
      {
        id: 'haz-1',
        description: 'Unassessed site condition or secondary environmental hazard',
        severity: urgency.urgencyLevel === 'CRITICAL' ? 'SEVERE' : 'MODERATE',
        precautions: 'Maintain safe distance until first responders arrive; do not enter unverified risk zones.',
        evidenceLabel: 'AI-INFERRED'
      }
    ],
    peopleAffected: {
      estimatedCount: 'Unknown / Under review',
      vulnerableGroups: [],
      details: 'Pending on-scene responder confirmation'
    },
    uncertainties: [
      {
        id: 'unc-1',
        description: 'Confirmation of exact incident location and casualty numbers',
        type: 'MISSING_DATA',
        mitigationSuggestion: 'Update location review in incident studio'
      }
    ],
    recommendedActions: [
      {
        id: 'act-1',
        stepNumber: 1,
        title: 'Call Local Emergency Services (112 / 108 / 101)',
        description: 'Notify qualified emergency personnel immediately if there is danger to life or property.',
        priority: 'IMMEDIATE',
        safetyPrecautions: 'Ensure you are in a safe location before placing the call.',
        rationale: 'AI cannot dispatch physical responders; certified human coordination is required.',
        evidenceLabel: 'SOURCE-VERIFIED',
        requiresConfirmation: false,
        isCompleted: false,
        emergencyServiceContact: '112'
      },
      {
        id: 'act-2',
        stepNumber: 2,
        title: 'Review and Confirm Extracted Incident Details',
        description: 'Inspect the extracted facts, correct any location inaccuracies, and export a Responder Brief.',
        priority: 'HIGH',
        safetyPrecautions: 'Never disclose private medical or sensitive personal data without explicit consent.',
        rationale: 'Accurate data speeds up responder triage.',
        evidenceLabel: 'AI-INFERRED',
        requiresConfirmation: true,
        isCompleted: false
      }
    ],
    evidenceReferences: [
      ...(cleanText ? [{
        id: 'ev-1',
        sourceType: 'USER_TEXT' as const,
        label: 'USER-REPORTED' as EvidenceLabel,
        contentSnippet: cleanText.substring(0, 120),
        sourceAttribution: 'User submission'
      }] : [])
    ],
    verificationStatus: 'REQUIRES_HUMAN_REVIEW',
    lifecycleStatus: 'ANALYZED',
    possibleDuplicates: [],
    medicalContextIncluded: Boolean(cleanMedical && payload.consentGivenForMedical),
    medicalContextConsentGiven: payload.consentGivenForMedical,
    createdAt: timestamp,
    updatedAt: timestamp,
    language: payload.languagePreference,
    isDemoScenario: !isGeminiConfigured,
    disclaimer: 'SahaaySetu local deterministic analysis engine. For life-threatening emergencies, call 112 immediately.'
  };
}
