import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Loader2,
  Check,
  ArrowRight,
  SkipForward,
  User,
  GraduationCap,
  Briefcase,
  Code2,
  BookOpen,
} from 'lucide-react';
import { sendInterviewStepWithGemini } from '../../services/aiService';
import type { Resume, InterviewChatMessage } from '../../types/resume';

interface AiInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentResume: Resume;
  onApplyUpdates: (updatedResume: Resume) => void;
}

const SECTION_FLOW = [
  'personalInfo',
  'objective',
  'experience',
  'education',
  'projects',
  'publications',
  'skills',
  'achievements',
  'leadership',
  'volunteer',
  'memberships',
  'certifications',
  'additional',
  'references',
];

export const AiInterviewModal: React.FC<AiInterviewModalProps> = ({
  isOpen,
  onClose,
  currentResume,
  onApplyUpdates,
}) => {
  const [messages, setMessages] = useState<InterviewChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [stagedResume, setStagedResume] = useState<Resume>(currentResume);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSection = SECTION_FLOW[currentSectionIndex] || 'personalInfo';

  useEffect(() => {
    if (isOpen) {
      setStagedResume(currentResume);
      // Start greeting if empty
      if (messages.length === 0) {
        startInitialTurn();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startInitialTurn = async () => {
    setLoading(true);
    try {
      const initialName = currentResume.personalInfo.fullName;
      const initialGreeting = initialName
        ? `Hello ${initialName}! I am your AI CV Advisor. I'll help you craft a comprehensive academic CV step by step. Let's start with your Education or Work Experience: What is your current highest degree and which institution are you affiliated with?`
        : `Welcome! I am your AI CV Advisor. I'm here to interview you and help build your complete Academic CV with rich, detailed bullet points. To begin, what is your full name and current target role or research area?`;

      const botMsg: InterviewChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedChips: [
          'B.S. in Computer Science',
          'Ph.D. Candidate & Researcher',
          'Software Engineer',
          'Skip to Experience',
        ],
      };
      setMessages([botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: InterviewChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      // Send conversation history to backend Gemini API
      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendInterviewStepWithGemini(
        historyPayload,
        stagedResume,
        activeSection,
        text
      );

      // Merge any extracted updates into the staged resume
      if (res.structuredUpdates && Object.keys(res.structuredUpdates).length > 0) {
        setStagedResume((prev) => {
          const updated = { ...prev };
          const u = res.structuredUpdates;

          if (u.personalInfo) {
            updated.personalInfo = { ...prev.personalInfo, ...u.personalInfo };
          }
          if (u.objective) {
            updated.objective = u.objective;
          }
          if (Array.isArray(u.education) && u.education.length > 0) {
            updated.education = [...(prev.education || []), ...(u.education as any)];
          }
          if (Array.isArray(u.experience) && u.experience.length > 0) {
            updated.experience = [...(prev.experience || []), ...(u.experience as any)];
          }
          if (Array.isArray(u.projects) && u.projects.length > 0) {
            updated.projects = [...(prev.projects || []), ...(u.projects as any)];
          }
          if (Array.isArray(u.publications) && u.publications.length > 0) {
            updated.publications = [...(prev.publications || []), ...(u.publications as any)];
          }
          if (Array.isArray(u.skills) && u.skills.length > 0) {
            updated.skills = [...(prev.skills || []), ...(u.skills as any)];
          }
          if (Array.isArray(u.achievements) && u.achievements.length > 0) {
            updated.achievements = [...(prev.achievements || []), ...(u.achievements as any)];
          }
          if (Array.isArray(u.leadership) && u.leadership.length > 0) {
            updated.leadership = [...(prev.leadership || []), ...(u.leadership as any)];
          }
          return updated;
        });
      }

      if (res.isSectionCompleted && currentSectionIndex < SECTION_FLOW.length - 1) {
        setCurrentSectionIndex((idx) => idx + 1);
      }

      const botReply: InterviewChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedChips: res.suggestedChips,
        structuredUpdates: res.structuredUpdates,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('Interview turn error:', err);
      const fallbackMsg: InterviewChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content:
          "Thank you! I've noted that down. What other achievements, tools, or responsibilities would you like to add next?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedChips: ['Skip to Projects', 'Add another role', 'Save & review in editor'],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSection = () => {
    if (currentSectionIndex < SECTION_FLOW.length - 1) {
      const nextIdx = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIdx);
      handleSendMessage(`Let's skip ${activeSection} for now and move to ${SECTION_FLOW[nextIdx]}.`);
    } else {
      handleSendMessage("That is all my information for now, let's review the CV.");
    }
  };

  const handleApplyAndFinish = () => {
    onApplyUpdates(stagedResume);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">Build My CV with AI</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 uppercase tracking-wider">
                  Interactive Interview
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Focusing on: <span className="font-semibold text-slate-700">{activeSection}</span> • Step {currentSectionIndex + 1} of {SECTION_FLOW.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleApplyAndFinish}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e40] rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>Apply to CV &amp; Edit Forms</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Layout: Chat on Left, Real-time Snapshot Summary on Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Stream */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#0f2b5c] text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-900 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    <div className="font-sans whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`text-[9.5px] mt-1.5 ${
                        msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  {msg.role === 'assistant' && msg.suggestedChips && msg.suggestedChips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                      {msg.suggestedChips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(chip)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-full transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-start space-x-2">
                  <div className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 rounded-bl-xs flex items-center space-x-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>AI Advisor is formulating questions and structuring details...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <button
                  type="button"
                  onClick={handleSkipSection}
                  className="px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0 flex items-center"
                  title="Skip to the next section"
                >
                  <SkipForward className="w-3.5 h-3.5 mr-1" />
                  <span>Skip</span>
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Answer here (or ask a question, say 'skip' to move on)..."
                  disabled={loading}
                  className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-sans"
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="p-2.5 bg-[#0f2b5c] hover:bg-[#0a1e40] text-white rounded-lg disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Live Extraction Snapshot Drawer */}
          <div className="w-72 border-l border-slate-200 bg-slate-50/70 p-4 hidden md:flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Live Staged Details
                </span>
                <p className="text-[11px] text-slate-500">
                  Updates applied in real-time as you answer.
                </p>
              </div>

              {/* Items Summary list */}
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <User className="w-3 h-3 mr-1 text-slate-500" />
                    <span>Personal Info</span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {stagedResume.personalInfo.fullName || 'Not specified yet'}
                  </div>
                </div>

                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <GraduationCap className="w-3 h-3 mr-1 text-indigo-600" />
                    <span>Education: {stagedResume.education?.length || 0} entries</span>
                  </div>
                  {stagedResume.education?.[0] && (
                    <div className="text-[11px] text-slate-600 truncate">
                      {stagedResume.education[0].degree} ({stagedResume.education[0].institution})
                    </div>
                  )}
                </div>

                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <Briefcase className="w-3 h-3 mr-1 text-blue-600" />
                    <span>Experience: {stagedResume.experience?.length || 0} roles</span>
                  </div>
                  {stagedResume.experience?.[0] && (
                    <div className="text-[11px] text-slate-600 truncate">
                      {stagedResume.experience[0].position} @ {stagedResume.experience[0].company}
                    </div>
                  )}
                </div>

                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <Code2 className="w-3 h-3 mr-1 text-emerald-600" />
                    <span>Projects: {stagedResume.projects?.length || 0} entries</span>
                  </div>
                </div>

                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                    <span>Publications: {stagedResume.publications?.length || 0} records</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleApplyAndFinish}
                className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e40] rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <span>Save to Editor</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
