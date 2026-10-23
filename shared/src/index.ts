import { z } from 'zod';

export const IncidentCategoryEnum = z.enum([
  'NATURAL_DISASTER',
  'TRAFFIC_ACCIDENT',
  'INFRASTRUCTURE_FAILURE',
  'PUBLIC_SAFETY',
  'MEDICAL_EMERGENCY',
  'OTHER'
]);
export type IncidentCategory = z.infer<typeof IncidentCategoryEnum>;

export const UrgencyLevelEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export type UrgencyLevel = z.infer<typeof UrgencyLevelEnum>;

export const EvidenceLabelEnum = z.enum([
  'USER-REPORTED',
  'SOURCE-VERIFIED',
  'AI-INFERRED',
  'UNVERIFIED'
]);
export type EvidenceLabel = z.infer<typeof EvidenceLabelEnum>;

export const IncidentLifecycleStatusEnum = z.enum([
  'SUBMITTED',
  'ANALYZED',
  'REVIEWED',
  'ACTION_IN_PROGRESS',
  'RESOLVED',
  'ARCHIVED'
]);
export type IncidentLifecycleStatus = z.infer<typeof IncidentLifecycleStatusEnum>;

export const LocationConfidenceEnum = z.enum(['EXACT', 'APPROXIMATE', 'UNCONFIRMED', 'UNKNOWN']);
export type LocationConfidence = z.infer<typeof LocationConfidenceEnum>;

export const ActionPriorityEnum = z.enum(['IMMEDIATE', 'HIGH', 'ROUTINE']);
export type ActionPriority = z.infer<typeof ActionPriorityEnum>;

// Core Schema Elements
export const IncidentFactSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  evidenceLabel: EvidenceLabelEnum,
  userConfirmed: z.boolean().default(false),
  sourceReference: z.string().optional(),
  confidenceScore: z.number().min(0).max(1).default(0.8)
});
export type IncidentFact = z.infer<typeof IncidentFactSchema>;

export const HazardItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  severity: z.enum(['SEVERE', 'MODERATE', 'LOW']),
  precautions: z.string(),
  evidenceLabel: EvidenceLabelEnum
});
export type HazardItem = z.infer<typeof HazardItemSchema>;

export const ActionItemSchema = z.object({
  id: z.string(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: ActionPriorityEnum,
  safetyPrecautions: z.string(),
  rationale: z.string(),
  evidenceLabel: EvidenceLabelEnum,
  requiresConfirmation: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  emergencyServiceContact: z.string().optional()
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const UncertaintyItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  type: z.enum(['MISSING_DATA', 'CONFLICTING_REPORT', 'LOCATION_AMBIGUITY', 'UNVERIFIED_SOURCE']),
  mitigationSuggestion: z.string()
});
export type UncertaintyItem = z.infer<typeof UncertaintyItemSchema>;

export const DuplicateSuggestionSchema = z.object({
  matchedIncidentId: z.string(),
  title: z.string(),
  similarityScore: z.number().min(0).max(1),
  reason: z.string()
});
export type DuplicateSuggestion = z.infer<typeof DuplicateSuggestionSchema>;

// Incident Input Payload
export const IncidentInputPayloadSchema = z.object({
  text: z.string().max(10000).optional().default(''),
  speechTranscript: z.string().max(5000).optional().default(''),
  pastedReport: z.string().max(10000).optional().default(''),
  pastedReportSource: z.string().max(500).optional().default(''),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  imageName: z.string().optional(),
  medicalContext: z.string().max(2000).optional().default(''),
  consentGivenForMedical: z.boolean().default(false),
  consentGivenForLocation: z.boolean().default(false),
  clientTimestamp: z.string().default(() => new Date().toISOString()),
  languagePreference: z.enum(['en', 'hi']).default('en')
}).refine(data => {
  const hasText = !!data.text && data.text.trim().length > 0;
  const hasSpeech = !!data.speechTranscript && data.speechTranscript.trim().length > 0;
  const hasPasted = !!data.pastedReport && data.pastedReport.trim().length > 0;
  const hasImage = !!data.imageBase64 && data.imageBase64.trim().length > 0;
  const hasMedical = !!data.medicalContext && data.medicalContext.trim().length > 0;
  return hasText || hasSpeech || hasPasted || hasImage || hasMedical;
}, {
  message: 'At least one input source (text, speech transcript, pasted report, image, or medical context) must be provided.'
});
export type IncidentInputPayload = z.infer<typeof IncidentInputPayloadSchema>;

// Complete Structured Incident Record
export const IncidentRecordSchema = z.object({
  id: z.string(),
  category: IncidentCategoryEnum,
  title: z.string().min(1).max(200),
  situationSummary: z.string().min(1),
  userReportedFacts: z.array(IncidentFactSchema),
  location: z.object({
    rawText: z.string(),
    normalized: z.string().optional(),
    confidence: LocationConfidenceEnum,
    coordinates: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional()
    }).optional(),
    userConfirmed: z.boolean().default(false)
  }),
  estimatedUrgency: UrgencyLevelEnum,
  urgencyExplanation: z.string(),
  urgencyScore: z.number().min(0).max(100), // Algorithmic + AI transparent score (0-100)
  potentialHazards: z.array(HazardItemSchema),
  peopleAffected: z.object({
    estimatedCount: z.string().optional(),
    vulnerableGroups: z.array(z.string()).default([]),
    details: z.string().optional()
  }),
  uncertainties: z.array(UncertaintyItemSchema),
  recommendedActions: z.array(ActionItemSchema),
  evidenceReferences: z.array(z.object({
    id: z.string(),
    sourceType: z.enum(['USER_TEXT', 'VOICE_TRANSCRIPT', 'IMAGE_ANALYSIS', 'PASTED_ALERT', 'MEDICAL_HISTORY']),
    label: EvidenceLabelEnum,
    contentSnippet: z.string(),
    sourceAttribution: z.string()
  })),
  verificationStatus: z.enum(['REQUIRES_HUMAN_REVIEW', 'USER_VERIFIED', 'OFFICIALLY_UNVERIFIED']),
  lifecycleStatus: IncidentLifecycleStatusEnum,
  possibleDuplicates: z.array(DuplicateSuggestionSchema).default([]),
  medicalContextIncluded: z.boolean().default(false),
  medicalContextConsentGiven: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  language: z.enum(['en', 'hi']).default('en'),
  isDemoScenario: z.boolean().default(false),
  demoScenarioId: z.string().optional(),
  disclaimer: z.string().default(
    'SahaaySetu is an AI-assisted crisis coordination bridge. It does not replace trained emergency services, officially certified responders, or medical practitioners. For immediate life danger, contact local emergency dispatch (e.g. 112 in India, 911 in US).'
  )
});
export type IncidentRecord = z.infer<typeof IncidentRecordSchema>;

// Responder Brief Export Schema
export const ResponderBriefSchema = z.object({
  incidentId: z.string(),
  generatedAt: z.string(),
  title: z.string(),
  category: IncidentCategoryEnum,
  urgency: UrgencyLevelEnum,
  urgencyScore: z.number(),
  locationSummary: z.string(),
  situationOverview: z.string(),
  keyFacts: z.array(z.object({
    fact: z.string(),
    evidence: EvidenceLabelEnum
  })),
  criticalHazards: z.array(z.string()),
  topActionPriorities: z.array(z.object({
    step: z.number(),
    title: z.string(),
    precautions: z.string()
  })),
  openUncertainties: z.array(z.string()),
  contactEmergencyServices: z.array(z.string()),
  containsRedactedMedical: z.boolean(),
  confidentialityNote: z.string()
});
export type ResponderBrief = z.infer<typeof ResponderBriefSchema>;

// Emergency Numbers Mapping (Jurisdiction aware)
export const EMERGENCY_NUMBERS = [
  { jurisdiction: 'India', service: 'National Emergency', number: '112', notes: 'Unified Emergency Helpline' },
  { jurisdiction: 'India', service: 'Police', number: '100', notes: 'Immediate law enforcement' },
  { jurisdiction: 'India', service: 'Fire & Rescue', number: '101', notes: 'Fire and structural hazards' },
  { jurisdiction: 'India', service: 'Ambulance / Medical', number: '108', notes: 'Disaster and medical response' },
  { jurisdiction: 'India', service: 'Disaster Management Helpline (NDRF)', number: '1078', notes: 'National Disaster response' },
  { jurisdiction: 'India', service: 'Women Helpline', number: '1091', notes: 'Women distress response' },
  { jurisdiction: 'United States & Canada', service: 'Emergency Dispatch', number: '911', notes: 'Police / Fire / EMS' },
  { jurisdiction: 'United Kingdom', service: 'Emergency Services', number: '999', notes: 'Emergency response' },
  { jurisdiction: 'European Union', service: 'Emergency', number: '112', notes: 'Pan-European helpline' }
];

// 5 Realistic Sample Scenarios (Deterministic & explicitly labeled as demonstrations)
export const DEMO_SCENARIOS = [
  {
    id: 'demo-1-flood-waterlogging',
    title: 'Flash Waterlogging & Blocked Arterial Underpass',
    category: 'NATURAL_DISASTER' as IncidentCategory,
    description: 'Heavy continuous monsoon downpour over 3 hours has flooded the Milan Subway underpass. Water level is estimated at 3.5 to 4 feet. Two compact cars are submerged up to windshield level; drivers have evacuated to the elevated walkway. Electrical junction box nearby is sparking intermittently. Traffic is jammed for 2 km on SV Road towards Santacruz.',
    inputPayload: {
      text: 'Heavy continuous monsoon downpour for the last 3 hours has flooded the Milan Subway underpass. Water is at least 3.5 to 4 feet deep. Two cars are stuck, water is up to the windshields. Drivers climbed out onto the high walkway. A roadside electric junction box is sparking occasionally near the north entrance. SV Road is totally choked with traffic back towards Santacruz.',
      pastedReport: 'IMD Alert (15 mins ago): Heavy to very heavy rainfall warning for Mumbai Suburbs next 6 hours. High tide of 4.12m expected at 14:30 IST.',
      pastedReportSource: 'Regional Meteorological Department Flash Advisory',
      consentGivenForLocation: true,
      consentGivenForMedical: false,
      languagePreference: 'en' as const
    },
    urgency: 'HIGH' as UrgencyLevel,
    urgencyScore: 82,
    locationText: 'Milan Subway Underpass, SV Road, Santacruz West, Mumbai',
    hazards: [
      { id: 'h1', description: 'Active electrical sparking near flooded water creates severe electrocution risk', severity: 'SEVERE' as const, precautions: 'Maintain 50m perimeter; do not enter standing water near the north junction box; alert utility department immediately', evidenceLabel: 'USER-REPORTED' as EvidenceLabel },
      { id: 'h2', description: 'Submerged vehicles could be swept further if water rises; potential open manholes invisible beneath floodwaters', severity: 'SEVERE' as const, precautions: 'Do not attempt to push or wade into vehicles; stay on elevated concrete walkway', evidenceLabel: 'AI-INFERRED' as EvidenceLabel },
      { id: 'h3', description: 'Severe gridlock delaying potential emergency vehicles and municipal pumps', severity: 'MODERATE' as const, precautions: 'Divert approaching traffic 1 km prior at SV Road junction', evidenceLabel: 'USER-REPORTED' as EvidenceLabel }
    ]
  },
  {
    id: 'demo-2-highway-collision',
    title: 'Multi-Vehicle Highway Collision with Fuel Spill & Uncertain Mile Marker',
    category: 'TRAFFIC_ACCIDENT' as IncidentCategory,
    description: 'Collision between a transport tanker and two passenger SUVs on Pune-Mumbai Expressway. Diesel fuel leakage detected on the asphalt. Visibility compromised due to dense early morning fog. Mile marker reported ambiguously as "between km 42 and 46 near Khandala exit". One passenger in SUV complains of chest tightness; both drivers conscious.',
    inputPayload: {
      text: 'Accident on the expressway! A transport tanker and two SUVs crashed just past the tunnel. Heavy diesel smell and fuel is leaking on the road. Super foggy, cannot see 20 meters ahead. Someone is sitting on the side with bad chest pain from the seatbelt. Mile marker says either km 42 or 46 near Khandala cut, not 100% sure.',
      speechTranscript: 'Please hurry, fuel is spreading across two lanes. We need fire brigade and traffic police to stop cars speeding into this fog.',
      consentGivenForLocation: true,
      consentGivenForMedical: true,
      medicalContext: 'Passenger has history of hypertension and asthma. Complaining of chest tightness post-impact. No visible external bleeding, alert and speaking.',
      languagePreference: 'en' as const
    },
    urgency: 'CRITICAL' as UrgencyLevel,
    urgencyScore: 92,
    locationText: 'Pune-Mumbai Expressway, Approx km 42-46 westbound near Khandala Exit (Unconfirmed exact km)',
    hazards: [
      { id: 'h1', description: 'Flammable fuel spill (diesel) across high-speed expressway lanes under low visibility', severity: 'SEVERE' as const, precautions: 'STRICT NO-SMOKING / NO OPEN FLAMES; place hazard triangles 100m upstream; keep bystanders away from pooling fuel', evidenceLabel: 'USER-REPORTED' as EvidenceLabel },
      { id: 'h2', description: 'Secondary collision hazard from incoming vehicles traveling at highway speeds in dense fog', severity: 'SEVERE' as const, precautions: 'Clear lanes immediately; all occupants must move behind steel crash barrier away from road shoulder', evidenceLabel: 'AI-INFERRED' as EvidenceLabel }
    ]
  },
  {
    id: 'demo-3-unverified-cyclone-alert',
    title: 'Forwarded Cyclone Warning & Evacuation Rumor Verification',
    category: 'PUBLIC_SAFETY' as IncidentCategory,
    description: 'Viral message circulating on community WhatsApp groups alleging an immediate Category-4 cyclone landfall in 2 hours with order to evacuate entire coastal district. Official IMD tracking shows deep depression 320 km offshore moving north-northwest, with wind advisory but no immediate landfall or district evacuation order issued.',
    inputPayload: {
      text: 'Everyone in our apartment society is panicking and packing cars to leave. A forwarded voice note says Cyclone Mahasen is hitting our beach in exactly 2 hours and everyone must run inland immediately.',
      pastedReport: 'URGENT FORWARD: Red alert declared! Category 4 Cyclone hitting coast at 3 PM today. District collector has ordered complete evacuation of all coastal sectors within 10 km. Share with everyone immediately!',
      pastedReportSource: 'Unverified Viral Messaging Group (WhatsApp Forward)',
      consentGivenForLocation: false,
      consentGivenForMedical: false,
      languagePreference: 'en' as const
    },
    urgency: 'MEDIUM' as UrgencyLevel,
    urgencyScore: 58,
    locationText: 'Coastal District Sector 4 (Unspecified jurisdiction)',
    hazards: [
      { id: 'h1', description: 'Stampede and mass panic on egress roads caused by unverified viral alert', severity: 'MODERATE' as const, precautions: 'Verify solely through official District Disaster Management Authority (DDMA) or National Meteorological Service handles before mobilizing', evidenceLabel: 'AI-INFERRED' as EvidenceLabel },
      { id: 'h2', description: 'Unverified source claiming official evacuation mandate without verifiable government communique', severity: 'MODERATE' as const, precautions: 'Do not circulate unverified WhatsApp forwards; tune in to official All India Radio / DD News bulletins', evidenceLabel: 'SOURCE-VERIFIED' as EvidenceLabel }
    ]
  },
  {
    id: 'demo-4-structural-collapse-missing-facts',
    title: 'Old Commercial Building Partial Ceiling Collapse with Missing Occupancy Data',
    category: 'INFRASTRUCTURE_FAILURE' as IncidentCategory,
    description: 'A portion of the second-floor slab and ceiling collapsed in a 45-year-old commercial complex during morning renovation work. Loud crash reported, dust plume visible. Ground floor shops are open. Number of workers on the second floor at the time is unknown (estimated 2 to 6). Access staircase is partially obstructed by rubble.',
    inputPayload: {
      text: 'Loud thud and cloud of plaster dust at Star Plaza commercial complex. The second floor slab gave way. Some renovation guys were working up there earlier, but no one knows if they were inside when it dropped or down for tea. Staircase has chunks of concrete blocking the way. Downstairs chemists and groceries are screaming.',
      consentGivenForLocation: true,
      consentGivenForMedical: false,
      languagePreference: 'en' as const
    },
    urgency: 'CRITICAL' as UrgencyLevel,
    urgencyScore: 89,
    locationText: 'Star Plaza Commercial Complex, Market Road',
    hazards: [
      { id: 'h1', description: 'Secondary structural collapse of weakened adjacent floor slabs and beams', severity: 'SEVERE' as const, precautions: 'Immediate evacuation of ground floor shops; do NOT re-enter building to retrieve belongings; cordoning off 30m radius', evidenceLabel: 'AI-INFERRED' as EvidenceLabel },
      { id: 'h2', description: 'Unknown number of trapped persons requiring specialized search and rescue (NDRF / Fire Rescue)', severity: 'SEVERE' as const, precautions: 'Establish contact without entering compromised structure; verify attendance roll with contractor', evidenceLabel: 'USER-REPORTED' as EvidenceLabel }
    ]
  },
  {
    id: 'demo-5-elderly-collapse-medical-context',
    title: 'Elderly Individual Sudden Collapse at Community Center (Privacy-Consented)',
    category: 'MEDICAL_EMERGENCY' as IncidentCategory,
    description: '68-year-old individual collapsed suddenly during morning yoga session. Breathing is shallow and irregular. Eyes open but unresponsive to verbal cues. User consented to sharing relevant medical summary (diabetic on insulin, pacemaker implanted 2021). Conservative first-aid guidance generated without prescribing medication or attempting diagnosis.',
    inputPayload: {
      text: 'A senior citizen collapsed 4 minutes ago on the lawn at the community park. Breathing sounds very faint and raspy. He is not answering when we shake his shoulder. His wife is here and gave his medical history.',
      consentGivenForLocation: true,
      consentGivenForMedical: true,
      medicalContext: 'Age 68. History of Type 2 Diabetes (takes insulin daily), Pacemaker implant in 2021. No known allergies.',
      languagePreference: 'en' as const
    },
    urgency: 'CRITICAL' as UrgencyLevel,
    urgencyScore: 98,
    locationText: 'Shivaji Community Park, Sector 9 Lawn',
    hazards: [
      { id: 'h1', description: 'Airway obstruction or acute cardiac / hypoglycemic crisis requiring immediate professional life support', severity: 'SEVERE' as const, precautions: 'Call 108 / 112 immediately; place patient in recovery position if breathing; check for clear airway without forcing foreign objects into mouth', evidenceLabel: 'USER-REPORTED' as EvidenceLabel },
      { id: 'h2', description: 'Medical intervention risks: Bystanders attempting to give water or oral medication to an unresponsive person', severity: 'SEVERE' as const, precautions: 'STRICT WARNING: DO NOT administer fluids, food, or oral sugar to an unconscious/unresponsive person due to severe choking/aspiration risk', evidenceLabel: 'AI-INFERRED' as EvidenceLabel }
    ]
  }
];
