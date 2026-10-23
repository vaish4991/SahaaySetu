import React, { useState } from 'react';
import { IncidentRecord, IncidentFact } from '@sahaaysetu/shared';
import { EvidenceBadge } from '../components/EvidenceBadge';
import { UrgencyBadge } from '../components/UrgencyBadge';
import { DuplicateAlertBanner } from '../components/DuplicateAlertBanner';
import { updateIncidentApi } from '../services/api';
import { Language, translations } from '../locales/translations';
import {
  ShieldCheck,
  MapPin,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  Edit2,
  Save,
  ArrowRight,
  Printer,
  Sparkles
} from 'lucide-react';

interface Props {
  incident: IncidentRecord;
  onUpdateIncident: (updated: IncidentRecord) => void;
  onProceedToActions: () => void;
  onOpenBrief: () => void;
  onSelectDuplicate?: (id: string) => void;
  language: Language;
}

export const AnalysisReview: React.FC<Props> = ({
  incident,
  onUpdateIncident,
  onProceedToActions,
  onOpenBrief,
  onSelectDuplicate,
  language
}) => {
  const t = translations[language];

  const [facts, setFacts] = useState<IncidentFact[]>(incident.userReportedFacts);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editingFactText, setEditingFactText] = useState('');

  const [locationText, setLocationText] = useState(incident.location.rawText);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(incident.location.userConfirmed);

  const [saving, setSaving] = useState(false);

  // Toggle user confirmation of a fact
  const handleToggleConfirmFact = async (id: string) => {
    const updatedFacts = facts.map(f =>
      f.id === id ? { ...f, userConfirmed: !f.userConfirmed } : f
    );
    setFacts(updatedFacts);

    try {
      const updated = await updateIncidentApi(incident.id, {
        userReportedFacts: updatedFacts
      });
      onUpdateIncident(updated);
    } catch (err) {
      console.error('Failed to update fact confirmation:', err);
    }
  };

  // Edit fact text
  const handleStartEditFact = (fact: IncidentFact) => {
    setEditingFactId(fact.id);
    setEditingFactText(fact.text);
  };

  const handleSaveFact = async (id: string) => {
    const updatedFacts = facts.map(f =>
      f.id === id ? { ...f, text: editingFactText.trim() || f.text } : f
    );
    setFacts(updatedFacts);
    setEditingFactId(null);

    try {
      const updated = await updateIncidentApi(incident.id, {
        userReportedFacts: updatedFacts
      });
      onUpdateIncident(updated);
    } catch (err) {
      console.error('Failed to update fact text:', err);
    }
  };

  // Confirm or update location
  const handleSaveLocation = async () => {
    setIsEditingLocation(false);
    setSaving(true);
    try {
      const updated = await updateIncidentApi(incident.id, {
        location: {
          ...incident.location,
          rawText: locationText,
          userConfirmed: locationConfirmed
        }
      });
      onUpdateIncident(updated);
    } catch (err) {
      console.error('Failed to update location:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConfirmLocation = async () => {
    const newConfirmed = !locationConfirmed;
    setLocationConfirmed(newConfirmed);
    try {
      const updated = await updateIncidentApi(incident.id, {
        location: {
          ...incident.location,
          userConfirmed: newConfirmed
        }
      });
      onUpdateIncident(updated);
    } catch (err) {
      console.error('Failed to confirm location:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Suspected Duplicates Alert */}
      {incident.possibleDuplicates && incident.possibleDuplicates.length > 0 && (
        <DuplicateAlertBanner
          duplicates={incident.possibleDuplicates}
          onSelectDuplicate={onSelectDuplicate}
        />
      )}

      {/* Main Review Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
              {incident.category}
            </span>
            <span className="text-xs font-mono text-slate-400">#{incident.id}</span>
            {incident.isDemoScenario && (
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                Demonstration Simulation
              </span>
            )}
          </div>
          <UrgencyBadge urgency={incident.estimatedUrgency} score={incident.urgencyScore} size="md" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {incident.title}
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {incident.situationSummary}
          </p>
        </div>

        {/* Transparent Urgency Breakdown */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">Explainable Urgency Calculation: </span>
            <span>{incident.urgencyExplanation}</span>
          </div>
        </div>

        {/* Action Navigation Header Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Human Review Mode: Inspect and verify AI-extracted items before field distribution</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenBrief}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
            >
              <Printer className="w-4 h-4" />
              <span>{t.responderBriefBtn}</span>
            </button>

            <button
              type="button"
              onClick={onProceedToActions}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition shadow-sm"
            >
              <span>{t.actionsTitle}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reported Location Review Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-600" />
            <span>Reported Scene Location & Geographic Confidence</span>
          </h3>
          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
            Confidence: {incident.location.confidence}
          </span>
        </div>

        {!isEditingLocation ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-slate-800">{locationText}</p>
              <p className="text-xs text-slate-500">
                {locationConfirmed ? 'Verified by user/reporter' : 'Pending human confirmation'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleConfirmLocation}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  locationConfirmed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{locationConfirmed ? 'Confirmed' : 'Confirm Location'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingLocation(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
                aria-label="Edit location text"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:border-brand-500 focus:ring-brand-500"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsEditingLocation(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLocation}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Signature Feature: Evidence-to-Action Chain (Extracted Facts Review) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-600" />
              <span>{t.evidenceChainTitle}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {t.evidenceChainDesc}
            </p>
          </div>
          <span className="text-xs bg-brand-50 text-brand-800 px-2.5 py-1 rounded-full font-semibold border border-brand-200">
            {facts.length} Audited Items
          </span>
        </div>

        <div className="space-y-3">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition bg-slate-50/50 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <EvidenceBadge label={fact.evidenceLabel} size="sm" />
                  {fact.sourceReference && (
                    <span className="text-xs text-slate-500 italic">
                      via {fact.sourceReference}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleConfirmFact(fact.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      fact.userConfirmed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{fact.userConfirmed ? 'Fact Verified' : 'Verify'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartEditFact(fact)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-800 transition"
                    aria-label="Edit fact statement"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {editingFactId === fact.id ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={editingFactText}
                    onChange={(e) => setEditingFactText(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:border-brand-500 focus:ring-brand-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingFactId(null)}
                      className="px-2 py-1 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveFact(fact.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-brand-600 text-white rounded-md"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Fact</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-800 font-medium">
                  {fact.text}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Identified Hazards & Precautions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span>{t.hazardsTitle}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {incident.potentialHazards.map((haz) => (
            <div
              key={haz.id}
              className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 uppercase">
                  [{haz.severity}] HAZARD
                </span>
                <EvidenceBadge label={haz.evidenceLabel} size="sm" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">{haz.description}</p>
              <div className="text-xs text-red-950 font-medium bg-white/80 p-2.5 rounded-lg border border-red-200">
                <span className="font-bold">Required Precaution: </span>
                {haz.precautions}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Information Gaps & Uncertainties */}
      {incident.uncertainties && incident.uncertainties.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <span>{t.uncertaintiesTitle}</span>
          </h2>
          <p className="text-xs text-slate-500">
            Explicitly tracked information gaps prevent false assumptions during emergency triage:
          </p>

          <div className="space-y-2">
            {incident.uncertainties.map((u) => (
              <div
                key={u.id}
                className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-950"
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px]">
                    {u.type}
                  </span>
                  <span>{u.description}</span>
                </div>
                <div className="text-amber-800 mt-1 pl-1">
                  Mitigation: {u.mitigationSuggestion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
