"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Lightbulb,
  Shield,
  TrendingUp,
  Eye,
  Image,
  Video,
  Hash,
  AlertTriangle,
  Zap,
  Target,
  BarChart3,
  BookOpen,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ContentIdea,
  IdeasResponse,
  ContentType,
  Platform,
  Tone,
  TargetCustomer,
  GeneratedContent,
  SocialContentOutput,
  GoogleAdsOutput,
  EmailSmsOutput,
  BlogOutput,
  VisualOption,
  ContentCategory,
} from "@/types/content";

// ─── Constants ───

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "social_media_post", label: "Social Post" },
  { value: "google_ad", label: "Google Ad" },
  { value: "email_campaign", label: "Email" },
  { value: "sms_promo", label: "SMS" },
  { value: "blog_post", label: "Blog Post" },
];

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google_ads", label: "Google Ads" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "urgent", label: "Urgent" },
  { value: "friendly", label: "Friendly" },
  { value: "seasonal", label: "Seasonal" },
];

const TARGET_CUSTOMERS: { value: TargetCustomer; label: string }[] = [
  { value: "residential", label: "Residential" },
  { value: "contractor", label: "Contractor" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
];

const CATEGORY_ICONS: Record<ContentCategory, LucideIcon> = {
  seasonal_cleanout: Sparkles,
  moving_real_estate: ArrowRight,
  renovation_construction: Zap,
  local_educational: BookOpen,
  storm_cleanup: AlertTriangle,
  business_promotion: Megaphone,
  social_proof: TrendingUp,
  commercial_contractor: Target,
};

const CATEGORY_COLORS: Record<ContentCategory, string> = {
  seasonal_cleanout: "text-green-400 bg-green-400/10 border-green-400/20",
  moving_real_estate: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  renovation_construction: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  local_educational: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  storm_cleanup: "text-red-400 bg-red-400/10 border-red-400/20",
  business_promotion: "text-tippd-green bg-tippd-green/10 border-tippd-green/20",
  social_proof: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  commercial_contractor: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

// ─── Step type ───

type Step = "ideas" | "customize" | "output";

// ─── Component ───

export default function ContentPage() {
  // Step state
  const [step, setStep] = useState<Step>("ideas");

  // Step 1: Ideas
  const [ideasResponse, setIdeasResponse] = useState<IdeasResponse | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);

  // Step 2: Customize
  const [contentType, setContentType] = useState<ContentType>("social_media_post");
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [tone, setTone] = useState<Tone>("friendly");
  const [targetCustomer, setTargetCustomer] = useState<TargetCustomer | "">("");
  const [customIdea, setCustomIdea] = useState("");
  const [promoOffer, setPromoOffer] = useState("");
  const [townFocus, setTownFocus] = useState("");

  // Step 3: Output
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ─── Load ideas on mount ───

  const loadIdeas = useCallback(async () => {
    setIdeasLoading(true);
    setIdeasResponse(null);
    setSelectedIdea(null);
    try {
      const res = await fetch("/api/content/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load ideas");
      }
      const data: IdeasResponse = await res.json();
      setIdeasResponse(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load ideas");
    } finally {
      setIdeasLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIdeas();
  }, [loadIdeas]);

  // ─── Generate content ───

  async function handleGenerate() {
    if (!selectedIdea) return;
    setGenerating(true);
    setGeneratedContent(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structured: true,
          idea: {
            title: selectedIdea.title,
            category: selectedIdea.category,
            audience: selectedIdea.audience,
            why_now: selectedIdea.why_now,
            signal_summary: selectedIdea.signal_summary,
            cta_suggestion: selectedIdea.cta_suggestion,
            sensitivity_level: selectedIdea.sensitivity_level,
          },
          content_type: contentType,
          platform,
          tone,
          custom_idea: customIdea || undefined,
          promo_or_offer: promoOffer || undefined,
          target_customer: targetCustomer || undefined,
          town_or_county_focus: townFocus || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      setGeneratedContent(data.content);
      setStep("output");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // ─── Copy helper ───

  function copyText(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // ─── Sensitivity badge ───

  function SensitivityBadge({ score, level }: { score: number; level: string }) {
    const color =
      level === "high"
        ? "bg-red-500/20 text-red-400 border-red-500/30"
        : level === "medium"
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : "bg-green-500/20 text-green-400 border-green-500/30";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${color}`}>
        <Shield className="w-3 h-3" />
        {level} risk
      </span>
    );
  }

  // ─── Step indicator ───

  function StepIndicator() {
    const steps: { key: Step; label: string; num: number }[] = [
      { key: "ideas", label: "Signal Ideas", num: 1 },
      { key: "customize", label: "Customize", num: 2 },
      { key: "output", label: "Content", num: 3 },
    ];
    return (
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s.key === "ideas") setStep("ideas");
                else if (s.key === "customize" && selectedIdea) setStep("customize");
                else if (s.key === "output" && generatedContent) setStep("output");
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === s.key
                  ? "bg-tippd-blue text-white"
                  : "bg-tippd-steel text-tippd-smoke hover:text-white"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s.key ? "bg-white/20" : "bg-white/5"
              }`}>
                {s.num}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-tippd-ash" />}
          </div>
        ))}
      </div>
    );
  }

  // ─── Pill selector ───

  function PillSelector<T extends string>({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
  }) {
    return (
      <div>
        <label className="block text-sm text-tippd-smoke mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                value === o.value
                  ? "bg-tippd-blue text-white"
                  : "bg-tippd-steel text-tippd-smoke hover:text-white"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Copyable field ───

  function CopyableField({ label, value, fieldKey }: { label: string; value: string; fieldKey: string }) {
    if (!value) return null;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-tippd-smoke font-medium">{label}</span>
          <button
            onClick={() => copyText(value, fieldKey)}
            className="flex items-center gap-1 text-[10px] text-tippd-ash hover:text-white transition-colors"
          >
            {copiedField === fieldKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedField === fieldKey ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="bg-tippd-ink rounded-md p-3 text-sm text-white whitespace-pre-wrap">{value}</div>
      </div>
    );
  }

  // ─── Visual card ───

  function VisualCard({ visual, index }: { visual: VisualOption; index: number }) {
    return (
      <div className="bg-tippd-ink rounded-lg p-4 border border-white/5 space-y-2">
        <div className="flex items-center gap-2 text-xs text-tippd-smoke">
          {visual.type === "image" ? <Image className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          <span className="font-medium">Visual {index + 1}</span>
          <span className="text-tippd-ash">• {visual.type} • {visual.aspect_ratio}</span>
        </div>
        <p className="text-sm text-white">{visual.concept}</p>
        {visual.overlay_text && (
          <p className="text-xs text-tippd-blue italic">&ldquo;{visual.overlay_text}&rdquo;</p>
        )}
        <div className="flex flex-wrap gap-1">
          {visual.search_terms.map((term) => (
            <span key={term} className="px-2 py-0.5 bg-tippd-steel rounded text-[10px] text-tippd-smoke">
              {term}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ─── STEP 1: Ideas ───

  function renderIdeas() {
    if (ideasLoading) {
      return (
        <div className="space-y-4">
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 text-tippd-smoke">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <div>
                <p className="text-sm font-medium text-white">Scanning local signals...</p>
                <p className="text-xs text-tippd-ash mt-1">
                  Analyzing weather, housing market, regulations, and seasonal trends for Central NJ
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!ideasResponse) {
      return (
        <div className="text-center py-16">
          <p className="text-sm text-tippd-ash mb-3">No ideas loaded yet.</p>
          <button onClick={loadIdeas} className="px-4 py-2 bg-tippd-blue text-white rounded text-sm font-medium hover:opacity-90">
            Load Ideas
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Signals summary */}
        {ideasResponse.signals_used.length > 0 && (
          <div className="rounded-lg border border-white/5 bg-tippd-ink p-4">
            <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Active Signals ({ideasResponse.signals_used.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ideasResponse.signals_used.map((signal, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-tippd-green mt-1.5 shrink-0" />
                  <div>
                    <span className="text-white">{signal.summary}</span>
                    <span className="text-tippd-ash ml-1">({(signal.score * 100).toFixed(0)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service area */}
        <div className="flex items-center gap-2 text-xs text-tippd-ash">
          <Target className="w-3.5 h-3.5" />
          Service area: {ideasResponse.service_area.join(" • ")}
        </div>

        {/* Idea cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {ideasResponse.ideas.map((idea) => {
            const Icon = CATEGORY_ICONS[idea.category] || Sparkles;
            const colorClass = CATEGORY_COLORS[idea.category] || "text-tippd-blue bg-tippd-blue/10 border-tippd-blue/20";
            const isSelected = selectedIdea?.id === idea.id;

            return (
              <button
                key={idea.id}
                onClick={() => {
                  setSelectedIdea(idea);
                  // Auto-set tone from idea
                  if (idea.tone_options.length > 0) {
                    setTone(idea.tone_options[0]);
                  }
                  // Auto-set platform from recommended formats
                  const formatToPlatform: Record<string, Platform> = {
                    facebook_post: "facebook",
                    instagram_carousel: "instagram",
                    instagram_post: "instagram",
                    google_ad: "google_ads",
                    email: "email",
                    sms: "sms",
                    sms_promo: "sms",
                  };
                  if (idea.recommended_formats.length > 0) {
                    const mapped = formatToPlatform[idea.recommended_formats[0]];
                    if (mapped) setPlatform(mapped);
                  }
                  setStep("customize");
                }}
                className={`text-left rounded-lg border p-5 transition-all hover:border-tippd-blue/50 space-y-3 ${
                  isSelected
                    ? "border-tippd-blue bg-tippd-blue/5"
                    : "border-white/10 bg-tippd-charcoal hover:bg-tippd-steel/50"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2 rounded-lg border ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <SensitivityBadge score={idea.sensitivity_score} level={idea.sensitivity_level} />
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-white leading-snug">{idea.title}</h3>

                {/* Why now */}
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-tippd-blue uppercase tracking-wider">Why now</p>
                  <p className="text-xs text-tippd-smoke leading-relaxed">{idea.why_now}</p>
                </div>

                {/* Signals */}
                <div className="flex flex-wrap gap-1">
                  {idea.signal_summary.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-tippd-ink text-[10px] text-tippd-ash">
                      {s}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-3 text-[10px] text-tippd-ash">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {idea.audience}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {(idea.commercial_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-tippd-ash" />
                </div>

                {/* CTA hint */}
                <p className="text-[10px] text-tippd-ash italic truncate">{idea.cta_suggestion}</p>
              </button>
            );
          })}
        </div>

        {/* Refresh + custom idea */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadIdeas}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-tippd-steel text-tippd-smoke text-sm hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Ideas
          </button>
          <button
            onClick={() => {
              setSelectedIdea({
                id: "custom",
                title: "Custom Idea",
                category: "business_promotion",
                audience: "residential homeowners",
                why_now: "Custom content idea",
                signal_summary: [],
                recommended_formats: ["facebook_post"],
                tone_options: ["friendly", "professional", "casual"],
                cta_suggestion: "",
                sensitivity_score: 0,
                sensitivity_level: "low",
                commercial_score: 0.5,
              });
              setStep("customize");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-white/10 text-tippd-smoke text-sm hover:text-white hover:border-white/20 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            Enter My Own Idea
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 2: Customize ───

  function renderCustomize() {
    if (!selectedIdea) return null;

    return (
      <div className="space-y-6">
        {/* Selected idea summary */}
        <div className="rounded-lg border border-tippd-blue/30 bg-tippd-blue/5 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-medium text-tippd-blue uppercase tracking-wider mb-1">Selected Idea</p>
              <h3 className="text-sm font-semibold text-white">{selectedIdea.title}</h3>
              <p className="text-xs text-tippd-smoke mt-1">{selectedIdea.why_now}</p>
            </div>
            <button
              onClick={() => setStep("ideas")}
              className="flex items-center gap-1 text-xs text-tippd-ash hover:text-white"
            >
              <ChevronLeft className="w-3 h-3" />
              Change
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Config */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-5">
            <PillSelector label="Content Type" options={CONTENT_TYPES} value={contentType} onChange={setContentType} />
            <PillSelector label="Platform" options={PLATFORMS} value={platform} onChange={setPlatform} />
            <PillSelector label="Tone" options={TONES} value={tone} onChange={setTone} />

            <div>
              <label className="block text-sm text-tippd-smoke mb-2">Target Customer (optional)</label>
              <div className="flex flex-wrap gap-2">
                {TARGET_CUSTOMERS.map((tc) => (
                  <button
                    key={tc.value}
                    onClick={() => setTargetCustomer(targetCustomer === tc.value ? "" : tc.value)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      targetCustomer === tc.value
                        ? "bg-tippd-blue text-white"
                        : "bg-tippd-steel text-tippd-smoke hover:text-white"
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Optional inputs */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-4">
            {selectedIdea.id === "custom" && (
              <div>
                <label className="block text-sm text-tippd-smoke mb-2">Your Content Idea</label>
                <textarea
                  value={customIdea}
                  onChange={(e) => setCustomIdea(e.target.value)}
                  placeholder="Describe your content idea..."
                  className="w-full bg-tippd-ink border border-white/10 rounded-md p-3 text-sm text-white placeholder:text-tippd-ash resize-none focus:outline-none focus:border-tippd-blue/50"
                  rows={3}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-tippd-smoke mb-2">Promotion or Offer (optional)</label>
              <input
                type="text"
                value={promoOffer}
                onChange={(e) => setPromoOffer(e.target.value)}
                placeholder="e.g., $50 off spring cleanout bookings"
                className="w-full bg-tippd-ink border border-white/10 rounded-md p-3 text-sm text-white placeholder:text-tippd-ash focus:outline-none focus:border-tippd-blue/50"
              />
            </div>

            <div>
              <label className="block text-sm text-tippd-smoke mb-2">Town or County Focus (optional)</label>
              <input
                type="text"
                value={townFocus}
                onChange={(e) => setTownFocus(e.target.value)}
                placeholder="e.g., Edison, NJ or Middlesex County"
                className="w-full bg-tippd-ink border border-white/10 rounded-md p-3 text-sm text-white placeholder:text-tippd-ash focus:outline-none focus:border-tippd-blue/50"
              />
            </div>

            {/* Quick actions */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <p className="text-[10px] font-medium text-tippd-smoke uppercase tracking-wider">Quick Adjustments</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Make more local", action: () => setTownFocus("Central New Jersey") },
                  { label: "Make promotional", action: () => { setTone("urgent"); setContentType("social_media_post"); } },
                  { label: "Turn into ad", action: () => { setContentType("google_ad"); setPlatform("google_ads"); } },
                  { label: "Turn into email", action: () => { setContentType("email_campaign"); setPlatform("email"); } },
                  { label: "Turn into SMS", action: () => { setContentType("sms_promo"); setPlatform("sms"); } },
                ].map((q) => (
                  <button
                    key={q.label}
                    onClick={q.action}
                    className="px-2.5 py-1 rounded border border-white/10 text-[10px] text-tippd-ash hover:text-white hover:border-white/20 transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || (selectedIdea.id === "custom" && !customIdea)}
          className="w-full py-3 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Content
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── STEP 3: Output ───

  function renderOutput() {
    if (!generatedContent) return null;

    const content = generatedContent;
    const visuals: VisualOption[] = "visual_options" in content ? content.visual_options || [] : [];

    return (
      <div className="space-y-6">
        {/* Back + regenerate */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep("customize")}
            className="flex items-center gap-1 text-sm text-tippd-smoke hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Customize
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-tippd-steel text-tippd-smoke text-xs hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            {renderContentFields(content)}
          </div>

          {/* Visual sidebar - 1 col */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider flex items-center gap-2">
              <Image className="w-3.5 h-3.5" />
              Visual Suggestions
            </h3>
            {visuals.length > 0 ? (
              visuals.map((v, i) => <VisualCard key={i} visual={v} index={i} />)
            ) : (
              <p className="text-xs text-tippd-ash">No visual suggestions available.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderContentFields(content: GeneratedContent) {
    if ("primary_caption" in content) {
      // Social content
      const c = content as SocialContentOutput;
      return (
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-4">
          <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider">
            {c.platform} • Social Post
          </h3>

          <CopyableField label="Hook" value={c.hook} fieldKey="hook" />
          <CopyableField label="Primary Caption" value={c.primary_caption} fieldKey="primary" />
          <CopyableField label="Alternate Caption 1" value={c.alternate_caption_1} fieldKey="alt1" />
          <CopyableField label="Alternate Caption 2" value={c.alternate_caption_2} fieldKey="alt2" />
          <CopyableField label="Call to Action" value={c.cta} fieldKey="cta" />
          {c.boosted_version && (
            <CopyableField label="Boosted Version" value={c.boosted_version} fieldKey="boosted" />
          )}

          {/* Hashtags */}
          {c.hashtags && c.hashtags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-tippd-smoke font-medium flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Hashtags
                </span>
                <button
                  onClick={() => copyText(c.hashtags.join(" "), "hashtags")}
                  className="flex items-center gap-1 text-[10px] text-tippd-ash hover:text-white"
                >
                  {copiedField === "hashtags" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedField === "hashtags" ? "Copied" : "Copy all"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded bg-tippd-ink text-xs text-tippd-blue cursor-pointer hover:bg-tippd-steel"
                    onClick={() => copyText(tag, `tag-${tag}`)}
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Overlay text */}
          {c.overlay_text_options && c.overlay_text_options.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-tippd-smoke font-medium">Overlay Text Options</span>
              <div className="flex flex-wrap gap-2">
                {c.overlay_text_options.map((ot, i) => (
                  <span key={i} className="px-3 py-1.5 rounded bg-tippd-ink text-xs text-white border border-white/5">
                    {ot}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Compliance notes */}
          {c.compliance_notes && c.compliance_notes.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-white/5">
              <span className="text-xs text-tippd-smoke font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Compliance Notes
              </span>
              {c.compliance_notes.map((note, i) => (
                <p key={i} className="text-xs text-tippd-ash">{note}</p>
              ))}
            </div>
          )}
        </div>
      );
    }

    if ("headlines" in content) {
      // Google Ads
      const c = content as GoogleAdsOutput;
      return (
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-4">
          <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider">Google Ad</h3>

          <div className="space-y-1">
            <span className="text-xs text-tippd-smoke font-medium">Headlines</span>
            <div className="space-y-1">
              {c.headlines.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-tippd-ink rounded px-3 py-2">
                  <span className="text-sm text-white">{h}</span>
                  <span className="text-[10px] text-tippd-ash ml-2">{h.length}/30</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-tippd-smoke font-medium">Descriptions</span>
            {c.descriptions.map((d, i) => (
              <CopyableField key={i} label={`Description ${i + 1}`} value={d} fieldKey={`desc-${i}`} />
            ))}
          </div>

          <CopyableField label="Call to Action" value={c.cta} fieldKey="cta" />

          {c.keyword_themes && c.keyword_themes.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-tippd-smoke font-medium">Keyword Themes</span>
              <div className="flex flex-wrap gap-1">
                {c.keyword_themes.map((kw) => (
                  <span key={kw} className="px-2 py-1 rounded bg-tippd-ink text-xs text-tippd-blue">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {c.callout_extensions && c.callout_extensions.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-tippd-smoke font-medium">Callout Extensions</span>
              <div className="flex flex-wrap gap-1">
                {c.callout_extensions.map((ce) => (
                  <span key={ce} className="px-2 py-1 rounded bg-tippd-ink text-xs text-white">{ce}</span>
                ))}
              </div>
            </div>
          )}

          {c.structured_snippets && c.structured_snippets.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-tippd-smoke font-medium">Structured Snippets</span>
              <div className="flex flex-wrap gap-1">
                {c.structured_snippets.map((ss) => (
                  <span key={ss} className="px-2 py-1 rounded bg-tippd-ink text-xs text-white">{ss}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if ("body_copy" in content) {
      // Email/SMS
      const c = content as EmailSmsOutput;
      return (
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-4">
          <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider">
            {c.content_type === "email_campaign" ? "Email Campaign" : "SMS Promo"}
          </h3>

          {c.subject_line && <CopyableField label="Subject Line" value={c.subject_line} fieldKey="subject" />}
          {c.preview_line && <CopyableField label="Preview Line" value={c.preview_line} fieldKey="preview" />}
          <CopyableField label="Body Copy" value={c.body_copy} fieldKey="body" />
          <CopyableField label="Call to Action" value={c.cta} fieldKey="cta" />

          <div className="pt-2 border-t border-white/5 space-y-3">
            <span className="text-xs text-tippd-smoke font-medium">A/B Variants</span>
            <CopyableField label="Variant A" value={c.variant_a} fieldKey="varA" />
            <CopyableField label="Variant B" value={c.variant_b} fieldKey="varB" />
          </div>
        </div>
      );
    }

    if ("sections" in content) {
      // Blog
      const c = content as BlogOutput;
      return (
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-4">
          <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider">Blog Post</h3>

          <CopyableField label="Title" value={c.title} fieldKey="title" />
          <CopyableField label="Meta Description" value={c.meta_description} fieldKey="meta" />

          {c.sections.map((section, i) => (
            <div key={i} className="space-y-1">
              <CopyableField label={section.heading} value={section.body} fieldKey={`section-${i}`} />
            </div>
          ))}

          <CopyableField label="Call to Action" value={c.cta} fieldKey="cta" />
        </div>
      );
    }

    // Fallback for unexpected structure
    return (
      <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
        <CopyableField label="Generated Content" value={JSON.stringify(content, null, 2)} fieldKey="raw" />
      </div>
    );
  }

  // ─── Main Render ───

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-tippd-green" />
          <h1 className="text-2xl font-bold text-white">Content Engine</h1>
        </div>
        <span className="text-[10px] text-tippd-ash">Central NJ Dumpster Content Engine</span>
      </div>

      <StepIndicator />

      {step === "ideas" && renderIdeas()}
      {step === "customize" && renderCustomize()}
      {step === "output" && renderOutput()}
    </div>
  );
}
