import React, { useState, useEffect } from 'react';
import { IncidentRecord, DEMO_SCENARIOS, IncidentInputPayload } from '@sahaaysetu/shared';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { SubmitIncident } from './pages/SubmitIncident';
import { AnalysisReview } from './pages/AnalysisReview';
import { ActionCenter } from './pages/ActionCenter';
import { IncidentExplorer } from './pages/IncidentExplorer';
import { SettingsPrivacy } from './pages/SettingsPrivacy';
import { ResponderBriefModal } from './components/ResponderBriefModal';
import { fetchHealth, fetchIncidents, fetchIncidentById, HealthStatus } from './services/api';
import { Language } from './locales/translations';

type TabType = 'dashboard' | 'submit' | 'review' | 'actions' | 'explorer' | 'settings';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activeIncident, setActiveIncident] = useState<IncidentRecord | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [briefIncidentId, setBriefIncidentId] = useState<string | null>(null);

  const [submissionInitialData, setSubmissionInitialData] = useState<Partial<IncidentInputPayload> | undefined>(undefined);

  // Load initial backend status and incidents
  const refreshData = async () => {
    try {
      const healthData = await fetchHealth();
      setHealth(healthData);
    } catch (e) {
      console.warn('Backend health check pending:', e);
    }

    try {
      const list = await fetchIncidents();
      setIncidents(list);
      if (list.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(list[0].id);
        setActiveIncident(list[0]);
      }
    } catch (e) {
      console.warn('Backend incidents fetch pending:', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Sync active incident when selectedIncidentId changes
  useEffect(() => {
    if (!selectedIncidentId) return;
    const found = incidents.find(i => i.id === selectedIncidentId);
    if (found) {
      setActiveIncident(found);
    } else {
      fetchIncidentById(selectedIncidentId)
        .then(inc => setActiveIncident(inc))
        .catch(err => console.error(err));
    }
  }, [selectedIncidentId, incidents]);

  const handleSelectIncident = (id: string, view: 'review' | 'actions') => {
    setSelectedIncidentId(id);
    setCurrentTab(view);
  };

  const handleAnalysisSuccess = async (newIncidentId: string) => {
    await refreshData();
    setSelectedIncidentId(newIncidentId);
    setCurrentTab('review');
  };

  const handleSelectDemoScenario = (demoId: string) => {
    const demo = DEMO_SCENARIOS.find(d => d.id === demoId);
    if (demo) {
      setSubmissionInitialData(demo.inputPayload as any);
      setCurrentTab('submit');
    }
  };

  const handleOpenBrief = (id?: string) => {
    const target = id || selectedIncidentId;
    if (target) {
      setBriefIncidentId(target);
      setBriefModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'submit') {
            setSubmissionInitialData(undefined);
          }
          setCurrentTab(tab);
        }}
        geminiConfigured={Boolean(health?.geminiConfigured)}
        language={language}
        onLanguageChange={setLanguage}
      />

      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <Dashboard
            incidents={incidents}
            onAnalyzeNew={() => {
              setSubmissionInitialData(undefined);
              setCurrentTab('submit');
            }}
            onSelectIncident={handleSelectIncident}
            onSelectDemoScenario={handleSelectDemoScenario}
            language={language}
          />
        )}

        {currentTab === 'submit' && (
          <SubmitIncident
            onAnalysisSuccess={handleAnalysisSuccess}
            language={language}
            initialPayload={submissionInitialData}
          />
        )}

        {currentTab === 'review' && activeIncident && (
          <AnalysisReview
            incident={activeIncident}
            onUpdateIncident={(updated) => {
              setActiveIncident(updated);
              setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
            }}
            onProceedToActions={() => setCurrentTab('actions')}
            onOpenBrief={() => handleOpenBrief(activeIncident.id)}
            onSelectDuplicate={(dupId) => handleSelectIncident(dupId, 'review')}
            language={language}
          />
        )}

        {currentTab === 'actions' && activeIncident && (
          <ActionCenter
            incident={activeIncident}
            onUpdateIncident={(updated) => {
              setActiveIncident(updated);
              setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
            }}
            onBackToReview={() => setCurrentTab('review')}
            onOpenBrief={() => handleOpenBrief(activeIncident.id)}
            language={language}
          />
        )}

        {currentTab === 'explorer' && (
          <IncidentExplorer
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
            onOpenBrief={(id) => handleOpenBrief(id)}
            language={language}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPrivacy
            language={language}
            onLanguageChange={setLanguage}
            geminiConfigured={Boolean(health?.geminiConfigured)}
            onDataCleared={() => refreshData()}
          />
        )}
      </main>

      {/* Global Responder Brief Modal */}
      {briefIncidentId && (
        <ResponderBriefModal
          incidentId={briefIncidentId}
          isOpen={briefModalOpen}
          onClose={() => setBriefModalOpen(false)}
        />
      )}

      {/* Footer with Civic & PromptWars Attribution */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-300">
            SahaaySetu (सहायसेतु) — The AI Crisis-to-Action Bridge
          </p>
          <p className="max-w-2xl mx-auto text-slate-500">
            Engineered for PromptWars Societal Benefit Challenge. Compliant with WCAG 2.2 AA accessibility principles, explicit medical consent safeguards, and explainable evidence-to-action triage.
          </p>
        </div>
      </footer>
    </div>
  );
};
