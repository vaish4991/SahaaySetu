import React, { useState, useEffect } from 'react';
import { IncidentInputPayload } from '@sahaaysetu/shared';
import { AudioInput } from '../components/AudioInput';
import { ImageDropzone } from '../components/ImageDropzone';
import { analyzeIncidentApi, saveLocalDraft, loadLocalDraft, clearLocalDraft } from '../services/api';
import { Language, translations } from '../locales/translations';
import {
  Send,
  Sparkles,
  Shield,
  FileText,
  AlertTriangle,
  Lock,
  RotateCcw,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

interface Props {
  onAnalysisSuccess: (incidentId: string) => void;
  language: Language;
  initialPayload?: Partial<IncidentInputPayload>;
}

export const SubmitIncident: React.FC<Props> = ({
  onAnalysisSuccess,
  language,
  initialPayload
}) => {
  const t = translations[language];

  const [text, setText] = useState(initialPayload?.text || '');
  const [speechTranscript, setSpeechTranscript] = useState(initialPayload?.speechTranscript || '');
  const [pastedReport, setPastedReport] = useState(initialPayload?.pastedReport || '');
  const [pastedReportSource, setPastedReportSource] = useState(initialPayload?.pastedReportSource || '');
  const [imageBase64, setImageBase64] = useState<string | undefined>(initialPayload?.imageBase64);
  const [imageMimeType, setImageMimeType] = useState<string | undefined>(initialPayload?.imageMimeType);
  const [imageName, setImageName] = useState<string | undefined>(initialPayload?.imageName);
  const [medicalContext, setMedicalContext] = useState(initialPayload?.medicalContext || '');
  const [consentMedical, setConsentMedical] = useState(initialPayload?.consentGivenForMedical || false);
  const [consentLocation, setConsentLocation] = useState(initialPayload?.consentGivenForLocation ?? true);

  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState(false);

  // Auto-restore draft on mount if not given initial payload
  useEffect(() => {
    if (!initialPayload || Object.keys(initialPayload).length === 0) {
      const saved = loadLocalDraft();
      if (saved && (saved.text || saved.speechTranscript || saved.pastedReport)) {
        setText(saved.text || '');
        setSpeechTranscript(saved.speechTranscript || '');
        setPastedReport(saved.pastedReport || '');
        setPastedReportSource(saved.pastedReportSource || '');
        setDraftNotice(true);
      }
    }
  }, [initialPayload]);

  // Save non-sensitive draft on change
  useEffect(() => {
    saveLocalDraft({
      text,
      speechTranscript,
      pastedReport,
      pastedReportSource,
      consentGivenForLocation: consentLocation,
      consentGivenForMedical: consentMedical,
      medicalContext: consentMedical ? medicalContext : ''
    });
  }, [text, speechTranscript, pastedReport, pastedReportSource, consentLocation, consentMedical, medicalContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const hasAnyInput =
      text.trim().length > 0 ||
      speechTranscript.trim().length > 0 ||
      pastedReport.trim().length > 0 ||
      Boolean(imageBase64) ||
      (medicalContext.trim().length > 0 && consentMedical);

    if (!hasAnyInput) {
      setValidationError(
        'Please provide at least one input source: typed situation, voice transcript, pasted report, or scene photograph.'
      );
      return;
    }

    setLoading(true);

    try {
      const payload: IncidentInputPayload = {
        text,
        speechTranscript,
        pastedReport,
        pastedReportSource,
        imageBase64,
        imageMimeType,
        imageName,
        medicalContext: consentMedical ? medicalContext : '',
        consentGivenForMedical: consentMedical,
        consentGivenForLocation: consentLocation,
        languagePreference: language,
        clientTimestamp: new Date().toISOString()
      };

      const result = await analyzeIncidentApi(payload);
      clearLocalDraft();
      onAnalysisSuccess(result.incident.id);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to analyze incident. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setSpeechTranscript('');
    setPastedReport('');
    setPastedReportSource('');
    setImageBase64(undefined);
    setImageMimeType(undefined);
    setImageName(undefined);
    setMedicalContext('');
    setConsentMedical(false);
    setValidationError(null);
    setDraftNotice(false);
    clearLocalDraft();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Studio Header */}
        <div className="p-6 sm:p-8 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Incident Submission Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Multi-channel crisis ingestion with runtime validation and privacy safeguards
              </p>
            </div>
          </div>

          {draftNotice && (
            <div className="mt-3 bg-brand-950/80 border border-brand-800 rounded-lg p-2.5 flex items-center justify-between text-xs text-brand-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Recovered draft from your previous browser session.
              </span>
              <button
                type="button"
                onClick={() => setDraftNotice(false)}
                className="text-xs text-brand-400 hover:text-white underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Studio Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Validation Notice */}
          {validationError && (
            <div
              className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-900 text-sm"
              role="alert"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Submission Notice</p>
                <p className="text-xs text-red-800 mt-0.5">{validationError}</p>
              </div>
            </div>
          )}

          {/* 1. Free-form text description */}
          <div className="space-y-1.5">
            <label htmlFor="situation-text" className="block text-sm font-bold text-slate-800">
              1. Situation Description (Free-Form Text)
            </label>
            <p className="text-xs text-slate-500">
              Describe what happened in natural language: casualties, location, hazards, trapped people, or road conditions.
            </p>
            <textarea
              id="situation-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Collision between a tanker and two cars near expressway milestone 42. Diesel fuel is leaking onto the roadway. Thick fog is blinding drivers..."
              className="w-full text-sm rounded-xl border border-slate-300 bg-white p-3.5 focus:border-brand-500 focus:ring-brand-500 text-slate-800 placeholder-slate-400 shadow-sm transition"
            />
          </div>

          {/* 2. Voice Input with Speech Recognition */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              2. Audio Channel
            </span>
            <AudioInput
              value={speechTranscript}
              onTranscriptChange={(t) => setSpeechTranscript(t)}
            />
          </div>

          {/* 3. Image Upload */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              3. Visual Evidence
            </span>
            <ImageDropzone
              onImageSelected={(base64, mimeType, name) => {
                setImageBase64(base64);
                setImageMimeType(mimeType);
                setImageName(name);
              }}
            />
          </div>

          {/* 4. Pasted External Report / Weather Alert */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              4. External Communication or Alert Excerpt
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="pasted-report" className="text-xs font-semibold text-slate-700">
                  Pasted Alert / Message Excerpt
                </label>
                <textarea
                  id="pasted-report"
                  rows={2}
                  value={pastedReport}
                  onChange={(e) => setPastedReport(e.target.value)}
                  placeholder="Paste WhatsApp forward, police bulletin, or weather alert..."
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5 focus:border-brand-500 focus:ring-brand-500 text-slate-800 placeholder-slate-400 shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="pasted-source" className="text-xs font-semibold text-slate-700">
                  Claimed Source Attribution
                </label>
                <input
                  id="pasted-source"
                  type="text"
                  value={pastedReportSource}
                  onChange={(e) => setPastedReportSource(e.target.value)}
                  placeholder="e.g. IMD Advisory, Traffic Police, Resident WhatsApp"
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5 focus:border-brand-500 focus:ring-brand-500 text-slate-800 placeholder-slate-400 shadow-sm"
                />
                <p className="text-[11px] text-slate-500">
                  Helps Evidence Chain identify source credibility.
                </p>
              </div>
            </div>
          </div>

          {/* 5. Consented Medical Context (Optional) */}
          <div className="pt-2 border-t border-slate-100 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900">
                  {t.medicalConsentTitle}
                </h3>
              </div>
              <span className="text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded font-mono font-semibold">
                Strict Consent Required
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Only provide relevant health history (e.g. pacemaker, severe allergy, diabetes) if strictly necessary for first-aid safety. Never used to diagnose or prescribe.
            </p>

            <textarea
              rows={2}
              disabled={!consentMedical}
              value={medicalContext}
              onChange={(e) => setMedicalContext(e.target.value)}
              placeholder={
                consentMedical
                  ? "Enter relevant history (e.g. Age 68, Type 2 diabetes on insulin, pacemaker implanted 2021)..."
                  : "Check the consent box below to unlock medical context input..."
              }
              className={`w-full text-xs rounded-lg border p-2.5 transition ${
                consentMedical
                  ? 'border-slate-300 bg-white text-slate-800 focus:border-brand-500'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            />

            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={consentMedical}
                onChange={(e) => setConsentMedical(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 shrink-0"
              />
              <span>{t.medicalConsentDesc}</span>
            </label>
          </div>

          {/* Location Consent */}
          <div className="flex items-center justify-between text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={consentLocation}
                onChange={(e) => setConsentLocation(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span>{t.locationConsentTitle}</span>
            </label>
            <span className="text-slate-500 italic">Disclosed to on-scene brief only</span>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Clear Form</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/25'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t.analyzingText}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t.submitButtonText}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
