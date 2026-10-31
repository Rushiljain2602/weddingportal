/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { SaaSWedding } from '../types';
import { 
  Settings2, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  Loader2, 
  MessageSquare,
  HelpCircle,
  Settings,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

export default function RsvpSettings() {
  const { 
    currentWeddingId, 
    currentWedding, 
    dbStatus,
    updateSaaSWedding
  } = useApp();

  // RSVP settings states
  const [rsvpWelcomeMessage, setRsvpWelcomeMessage] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [rsvpPollEnabled, setRsvpPollEnabled] = useState(false);
  const [rsvpPollType, setRsvpPollType] = useState<'text' | 'choice'>('text');
  const [rsvpPollQuestion, setRsvpPollQuestion] = useState('');
  const [rsvpPollOptionsStr, setRsvpPollOptionsStr] = useState('');
  const [savingRsvpSettings, setSavingRsvpSettings] = useState(false);
  const [rsvpSettingsStatus, setRsvpSettingsStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Initialize form fields once wedding metadata is loaded
  useEffect(() => {
    if (currentWedding) {
      setRsvpWelcomeMessage(currentWedding.rsvpWelcomeMessage || '');
      setRsvpPollEnabled(!!currentWedding.rsvpPollEnabled);
      setRsvpPollType(currentWedding.rsvpPollType || 'text');
      setRsvpPollQuestion(currentWedding.rsvpPollQuestion || '');
      setRsvpPollOptionsStr(currentWedding.rsvpPollOptions ? currentWedding.rsvpPollOptions.join(', ') : '');

      const wId = currentWeddingId;
      const cachedKey = wId ? `rsvp_msg_template_${wId}` : 'rsvp_msg_template_default';
      const defaultTemplate = `Hi {name}! 🌟 We are thrilled to invite you to the wedding of {couple}. Please check your personalized itinerary & submit your RSVP details here: {rsvp_link}`;
      setMessageTemplate(localStorage.getItem(cachedKey) || currentWedding.inviteMessageTemplate || defaultTemplate);
    }
  }, [currentWedding, currentWeddingId]);

  const handleSaveRsvpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWeddingId) return;
    setSavingRsvpSettings(true);
    setRsvpSettingsStatus('idle');

    // Parse options list
    const optionsList = rsvpPollOptionsStr
      .split(',')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);

    try {
      if (dbStatus !== 'local') {
        const weddingRef = doc(db, 'weddings', currentWeddingId);
        await updateDoc(weddingRef, {
          rsvpWelcomeMessage: rsvpWelcomeMessage.trim(),
          rsvpPollEnabled: rsvpPollEnabled,
          rsvpPollType: rsvpPollType,
          rsvpPollQuestion: rsvpPollQuestion.trim(),
          rsvpPollOptions: optionsList,
          inviteMessageTemplate: messageTemplate.trim()
        });
      } else {
        // Mock local-storage update
        const localWeddings = localStorage.getItem('saas_weddings_list');
        if (localWeddings) {
          const list = JSON.parse(localWeddings);
          const updatedList = list.map((w: any) => w.id === currentWeddingId ? {
            ...w,
            rsvpWelcomeMessage,
            rsvpPollEnabled,
            rsvpPollType,
            rsvpPollQuestion,
            rsvpPollOptions: optionsList,
            inviteMessageTemplate: messageTemplate.trim()
          } : w);
          localStorage.setItem('saas_weddings_list', JSON.stringify(updatedList));
        }
      }
      
      // Save to localStorage for instant GuestList pick up
      const cachedKey = currentWeddingId ? `rsvp_msg_template_${currentWeddingId}` : 'rsvp_msg_template_default';
      localStorage.setItem(cachedKey, messageTemplate.trim());

      // Also update SaaSWedding in memory
      if (updateSaaSWedding) {
        await updateSaaSWedding({
          ...currentWedding,
          rsvpWelcomeMessage: rsvpWelcomeMessage.trim(),
          rsvpPollEnabled: rsvpPollEnabled,
          rsvpPollType: rsvpPollType,
          rsvpPollQuestion: rsvpPollQuestion.trim(),
          rsvpPollOptions: optionsList,
          inviteMessageTemplate: messageTemplate.trim()
        } as SaaSWedding);
      }

      setRsvpSettingsStatus('success');
      setTimeout(() => setRsvpSettingsStatus('idle'), 3000);
    } catch (err) {
      console.error("Error saving RSVP page settings:", err);
      setRsvpSettingsStatus('error');
    } finally {
      setSavingRsvpSettings(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[#064E3B] text-stone-100 p-8 rounded-3xl shadow-lg border border-[#043427] relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
          <Settings className="h-64 w-64 text-white" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Sliders className="h-3 w-3" />
            <span>Dedicated Panel</span>
          </div>
          <h2 className="font-serif text-3xl font-black tracking-wide">
            RSVP Configuration &amp; Settings
          </h2>
          <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
            Customize the personal welcome messages guests see when logging into their RSVP dashboard, or build custom question modules to collect dietary, transport, or feedback preferences.
          </p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white border border-gold/20 shadow-lg rounded-3xl overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-stone-100 pb-5">
            <div className="p-2 bg-amber-50 text-amber-805 rounded-xl border border-amber-100">
              <Sparkles className="h-5 w-5 text-amber-600 fill-amber-500" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-black text-[#1a2f26]">RSVP Portal Personalization</h3>
              <p className="text-xs text-stone-400 mt-0.5 leading-normal">
                These settings directly influence the interface displayed in the Guest RSVP Portal.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveRsvpSettings} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                Custom Welcome Message / Deadline Alert
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Please submit your RSVP details before May 15th to finalize resort stay allocations."
                value={rsvpWelcomeMessage}
                onChange={(e) => setRsvpWelcomeMessage(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-xs bg-[#faf9f6] font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald focus:border-emerald leading-relaxed"
              />
              <p className="text-[10px] text-stone-400">
                This notice appears highlighted at the top of the guest portal, urging guests to take action before deadlines.
              </p>
            </div>

            <div className="pt-6 border-t border-stone-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-stone-500 font-bold">
                    WhatsApp Invitation Wording Template
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Configure the custom message sent to your guests when broadcasting or using the BULK Notification tool.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMessageTemplate(`Hi {name}! 🌟 We are thrilled to invite you to the wedding of {couple}. Please check your personalized itinerary & submit your RSVP details here: {rsvp_link}`);
                  }}
                  className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Template</span>
                </button>
              </div>

              <div className="bg-[#faf9f6] p-4 rounded-xl border border-stone-150 space-y-3">
                <p className="text-[10px] text-stone-500 leading-normal">
                  Customize your wording here. The system automatically substitutes these dynamic placeholders for each guest:
                </p>
                <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
                  <div className="bg-white px-2 py-1.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-amber-850 font-bold block">{`{name}`}</span>
                    <span className="text-[8px] text-stone-400">Guest's Name</span>
                  </div>
                  <div className="bg-white px-2 py-1.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-amber-850 font-bold block">{`{couple}`}</span>
                    <span className="text-[8px] text-stone-400">Couples' Names</span>
                  </div>
                  <div className="bg-white px-2 py-1.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-amber-850 font-bold block">{`{rsvp_link}`}</span>
                    <span className="text-[8px] text-stone-400">RSVP Link</span>
                  </div>
                </div>
              </div>

              <textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={5}
                className="w-full bg-[#faf9f6] border border-stone-200 rounded-xl px-4 py-3 text-xs font-sans text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald focus:border-emerald leading-relaxed shadow-inner"
                placeholder="Enter customized message template..."
              />
            </div>

            {/* TOGGLE POLL BUILDER */}
            <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#1a2f26] flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-emerald" />
                  <span>Enable Custom Question / Interactive Poll</span>
                </h4>
                <p className="text-xs text-stone-400 leading-normal max-w-md">
                  Enable this to embed a custom input/poll on the final submission step of the RSVP flow (e.g. food restrictions, flight details, song request).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRsvpPollEnabled(!rsvpPollEnabled)}
                className="p-1 cursor-pointer shrink-0"
              >
                {rsvpPollEnabled ? (
                  <ToggleRight className="h-10 w-10 text-[#064E3B]" />
                ) : (
                  <ToggleLeft className="h-10 w-10 text-stone-300" />
                )}
              </button>
            </div>

            {rsvpPollEnabled && (
              <div className="space-y-5 pt-5 border-t border-stone-100 bg-amber-50/10 p-5 rounded-2xl border border-amber-100/50 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold mb-1.5">
                    Question / Poll Type
                  </label>
                  <select
                    value={rsvpPollType}
                    onChange={(e) => setRsvpPollType(e.target.value as 'text' | 'choice')}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-xs bg-[#faf9f6] font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald"
                  >
                    <option value="text">Text Area (Open-ended answers/requests)</option>
                    <option value="choice">Multiple Choice Dropdown (Pre-defined options)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold mb-1.5">
                    Poll Question / Prompt Label
                  </label>
                  <input
                    type="text"
                    required={rsvpPollEnabled}
                    placeholder="e.g. Any dietary restrictions or allergies?"
                    value={rsvpPollQuestion}
                    onChange={(e) => setRsvpPollQuestion(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-xs bg-[#faf9f6] font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald"
                  />
                </div>

                {rsvpPollType === 'choice' && (
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold mb-1.5">
                      Multiple Choice Options (Comma Separated)
                    </label>
                    <input
                      type="text"
                      required={rsvpPollType === 'choice'}
                      placeholder="e.g. Vegetarian, Non-Vegetarian, Jain, Vegan, Gluten-Free"
                      value={rsvpPollOptionsStr}
                      onChange={(e) => setRsvpPollOptionsStr(e.target.value)}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl text-xs bg-[#faf9f6] font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald"
                    />
                    <p className="text-[10px] text-stone-400 mt-1.5">
                      Enter options separated by a comma. These options will be shown to the guests in a sleek dropdown list.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Save Buttons & Feedback */}
            <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-[10px] font-mono text-stone-400 font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                {dbStatus === 'local' ? "⚠️ OFFLINE LOCAL SANDBOX" : "⚡ CLOUD INTEGRATION ACTIVE"}
              </span>
              <button
                type="submit"
                disabled={savingRsvpSettings}
                className="px-6 py-3 bg-[#064E3B] hover:bg-[#043427] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
              >
                {savingRsvpSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 text-amber-300" />
                )}
                <span>SAVE RSVP SETTINGS</span>
              </button>
            </div>

            {rsvpSettingsStatus === 'success' && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-805 rounded-xl flex items-center gap-2.5 animate-scale-up">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">✓ RSVP configurations synchronized to the database successfully!</span>
              </div>
            )}
            {rsvpSettingsStatus === 'error' && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-750 rounded-xl flex items-center gap-2.5 animate-scale-up">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="text-xs font-bold">✕ Synchronization failed. Please check permissions or network connection.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
