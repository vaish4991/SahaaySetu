import React from 'react';
import { Shield, Radio, Activity, Globe, FileText, Settings as SettingsIcon, PlusCircle, AlertCircle } from 'lucide-react';
import { Language, translations } from '../locales/translations';

interface Props {
  currentTab: 'dashboard' | 'submit' | 'review' | 'actions' | 'explorer' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'submit' | 'review' | 'actions' | 'explorer' | 'settings') => void;
  geminiConfigured: boolean;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Navbar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  geminiConfigured,
  language,
  onLanguageChange
}) => {
  const t = translations[language];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onSelectTab('dashboard')}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSelectTab('dashboard');
            }}
            aria-label="SahaaySetu Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-tealAccent-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
              <Shield className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  SahaaySetu
                </span>
                <span className="text-xs bg-slate-800 text-brand-300 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                  PromptWars
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                The AI Crisis-to-Action Bridge
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{t.navDashboard}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('submit')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'submit'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-brand-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-brand-400" />
              <span>{t.navSubmit}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('explorer')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'explorer'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.navExplorer}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'settings'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>{t.navSettings}</span>
            </button>
          </nav>

          {/* Status Badges & Language Selector */}
          <div className="flex items-center gap-3">
            {/* Live Gemini vs Demo Mode Indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                geminiConfigured
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : 'bg-amber-950/70 text-amber-300 border-amber-800'
              }`}
              title={
                geminiConfigured
                  ? 'Live Gemini API configured and active on server'
                  : 'Operating in Deterministic Demo Mode. Provide GEMINI_API_KEY in server/.env for live calls.'
              }
            >
              <Radio className={`w-3 h-3 ${geminiConfigured ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
              <span>{geminiConfigured ? 'Live Gemini AI' : 'Demo Simulator'}</span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                  language === 'en'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                aria-pressed={language === 'en'}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('hi')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                  language === 'hi'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                aria-pressed={language === 'hi'}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Submenu Navigation */}
      <div className="md:hidden bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-around text-xs">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`p-2 rounded font-medium ${currentTab === 'dashboard' ? 'text-brand-400' : 'text-slate-400'}`}
        >
          {t.navDashboard}
        </button>
        <button
          onClick={() => onSelectTab('submit')}
          className={`p-2 rounded font-medium ${currentTab === 'submit' ? 'text-brand-400 font-bold' : 'text-slate-400'}`}
        >
          {t.navSubmit}
        </button>
        <button
          onClick={() => onSelectTab('explorer')}
          className={`p-2 rounded font-medium ${currentTab === 'explorer' ? 'text-brand-400' : 'text-slate-400'}`}
        >
          {t.navExplorer}
        </button>
        <button
          onClick={() => onSelectTab('settings')}
          className={`p-2 rounded font-medium ${currentTab === 'settings' ? 'text-brand-400' : 'text-slate-400'}`}
        >
          {t.navSettings}
        </button>
      </div>
    </header>
  );
};
