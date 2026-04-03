"use client";

import { useState } from "react";
import { CPICategory } from "@/types";
import { AIAssistResult } from "@/types";
import { CPI_CATEGORIES } from "@/lib/constants";
import {
  Zap,
  Brain,
  Stethoscope,
  Shield,
  Settings,
  Send,
  Sparkles,
  Loader2,
  Check,
  Search,
  Mic,
  MicOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = { Zap, Brain, Stethoscope, Shield, Settings };

type Step = "write" | "ai_review" | "confirm" | "done";

export default function NominatePage() {
  const [step, setStep] = useState<Step>("write");
  const [description, setDescription] = useState("");
  const [nomineeSearch, setNomineeSearch] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CPICategory | null>(
    null
  );
  const [aiResult, setAiResult] = useState<AIAssistResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleAIAssist = async () => {
    if (!description.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description }),
      });

      const result: AIAssistResult = await res.json();
      setAiResult(result);
      setSelectedCategory(result.category);
      setStep("ai_review");
    } catch {
      // Fallback: let user pick manually
      setStep("ai_review");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);

    try {
      await fetch("/api/nominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nominee_id: "placeholder", // TODO: wire to user search
          category: selectedCategory,
          raw_text: description,
          ai_text: aiResult?.cleaned_text,
          ai_category: aiResult?.category,
          ai_confidence: aiResult?.confidence,
          ai_reasoning: aiResult?.reasoning,
          is_anonymous: isAnonymous,
        }),
      });
      setStep("done");
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVoice = () => {
    setIsRecording(!isRecording);
    // TODO: integrate Web Speech API
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Nomination Submitted
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Your recognition has been recorded and will be reviewed by the
            committee.
          </p>
          <button
            onClick={() => {
              setStep("write");
              setDescription("");
              setAiResult(null);
              setSelectedCategory(null);
              setNomineeSearch("");
            }}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-gray-900">
            Recognize a Colleague
          </h1>
          <p className="text-sm text-gray-500">
            CPI — Clinical Performance Index
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Nominee Search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Who are you recognizing?
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={nomineeSearch}
              onChange={(e) => setNomineeSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 border-0 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            What happened?
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this person did — 1 to 3 sentences is perfect..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 border-0 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
            <button
              onClick={toggleVoice}
              className={cn(
                "absolute bottom-3 right-3 p-2 rounded-full transition-colors",
                isRecording
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 text-gray-400 hover:text-gray-600"
              )}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Anonymous toggle */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              Submit anonymously
            </span>
            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                isAnonymous ? "bg-indigo-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  isAnonymous && "translate-x-5"
                )}
              />
            </button>
          </label>
        </div>

        {/* AI Review Step */}
        {step === "ai_review" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
            {aiResult && (
              <div className="bg-indigo-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-600">
                    AI Suggestion
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  &ldquo;This appears to be{" "}
                  <strong>
                    {CPI_CATEGORIES[aiResult.category].label}
                  </strong>
                  &rdquo;
                </p>
                {aiResult.cleaned_text && (
                  <p className="text-xs text-gray-500 italic">
                    Cleaned: &ldquo;{aiResult.cleaned_text}&rdquo;
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select category
              </label>
              <div className="space-y-2">
                {(
                  Object.entries(CPI_CATEGORIES) as [
                    CPICategory,
                    (typeof CPI_CATEGORIES)[CPICategory],
                  ][]
                ).map(([key, cat]) => {
                  const Icon = iconMap[cat.icon as keyof typeof iconMap];
                  const isRecommended = aiResult?.category === key;
                  const isSelected = selectedCategory === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-100 hover:border-gray-200"
                      )}
                    >
                      <Icon
                        className="w-5 h-5 shrink-0"
                        style={{ color: cat.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {cat.label}
                          </span>
                          {isRecommended && (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full uppercase">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {cat.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedCategory || submitting}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Nomination
            </button>
          </div>
        )}

        {/* Continue Button (Step 1) */}
        {step === "write" && (
          <button
            onClick={handleAIAssist}
            disabled={!description.trim() || loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Continue
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
