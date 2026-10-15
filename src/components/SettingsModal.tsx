import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Check,
  Cpu,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  getStoredGeminiKey,
  saveStoredGeminiKey,
  clearStoredGeminiKey,
  getStoredGeminiModel,
  saveStoredGeminiModel,
  verifyGeminiApiKey,
  AVAILABLE_MODELS,
  DEFAULT_GEMINI_MODEL,
} from '../utils/geminiSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(DEFAULT_GEMINI_MODEL);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [saveToast, setSaveToast] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredGeminiKey());
      setModel(getStoredGeminiModel());
      setVerifyStatus({ type: null, message: '' });
      setSaveToast(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setVerifyStatus({
        type: 'error',
        message: 'Please enter a Gemini API key first before testing.',
      });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus({ type: null, message: '' });

    const result = await verifyGeminiApiKey(apiKey, model);
    setIsVerifying(false);

    if (result.success) {
      setVerifyStatus({
        type: 'success',
        message: result.message,
      });
    } else {
      setVerifyStatus({
        type: 'error',
        message: result.message,
      });
    }
  };

  const handleSave = () => {
    saveStoredGeminiKey(apiKey);
    saveStoredGeminiModel(model);
    setSaveToast(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 700);
  };

  const handleClear = () => {
    clearStoredGeminiKey();
    setApiKey('');
    setVerifyStatus({ type: null, message: '' });
    if (onSaved) onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                App & Gemini Settings
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure your Gemini API key for AI vocabulary annotations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Status banner */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
            <div className="mt-0.5">
              {apiKey ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-xs flex-1">
              <span className="font-semibold block text-slate-200">
                {apiKey ? 'API Key Configured' : 'No Gemini Key Configured'}
              </span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                {apiKey
                  ? 'Your Gemini API key will be used to generate concise contextual vocabulary definitions tailored for physical book reading.'
                  : 'Enter your Google Gemini API key below to enable AI meaning generation without any demo simulation.'}
              </p>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
              >
                <span>Get key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setVerifyStatus({ type: null, message: '' });
                }}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-20"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700/50"
                    title="Clear key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Your key is saved locally in your browser storage and never shared or logged.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini Model</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {AVAILABLE_MODELS.map((m) => {
                const isSelected = model === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/80 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.id === DEFAULT_GEMINI_MODEL && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test & Verify Feedback */}
          {verifyStatus.type && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in ${
                verifyStatus.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/15 border border-red-500/40 text-red-300'
              }`}
            >
              {verifyStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              )}
              <div className="flex-1 leading-relaxed">{verifyStatus.message}</div>
            </div>
          )}

          {/* Test connection button */}
          <div>
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isVerifying || !apiKey.trim()}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Verifying API Key with Google...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Test API Key Connection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            {saveToast ? (
              <>
                <Check className="w-4 h-4" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
