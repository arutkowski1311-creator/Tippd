"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Image as ImageIcon,
  Video,
  Hash,
  AlertTriangle,
  Zap,
  Target,
  BarChart3,
  BookOpen,
  Megaphone,
  Download,
  Palette,
  Type,
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

type Step = "ideas" | "customize" | "output" | "create";

// ─── Platform sizes for canvas ───

const PLATFORM_SIZES: Record<string, { width: number; height: number; label: string }> = {
  instagram: { width: 1080, height: 1080, label: "1080x1080" },
  facebook: { width: 1200, height: 630, label: "1200x630" },
  google_ads: { width: 1200, height: 628, label: "1200x628" },
  email: { width: 600, height: 400, label: "600x400" },
  sms: { width: 1080, height: 1080, label: "1080x1080" },
};

interface StockPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
  photographer: string;
  width: number;
  height: number;
  query: string;
}

// ─── Slide type for multi-slide carousel ───

interface Slide {
  id: string;
  photo: StockPhoto | null;
  text: string;
  subtext: string;
  position: "top" | "center" | "bottom";
  darkness: number;
}

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

  // Step 4: Create Asset
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<StockPhoto | null>(null);
  const [overlayText, setOverlayText] = useState("");
  const [overlaySubtext, setOverlaySubtext] = useState("");
  const [overlayPosition, setOverlayPosition] = useState<"center" | "bottom" | "top">("center");
  const [overlayDarkness, setOverlayDarkness] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [selectedVisual, setSelectedVisual] = useState<VisualOption | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [customSearchTerms, setCustomSearchTerms] = useState<string[]>([]);
  const [searchTermInput, setSearchTermInput] = useState("");

  // Multi-slide carousel
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Multiple uploaded photos (replaces single uploadedPhotoUrl)
  const [uploadedPhotos, setUploadedPhotos] = useState<StockPhoto[]>([]);

  // Operator branding (for logo watermark on canvas)
  const [operatorLogoUrl, setOperatorLogoUrl] = useState<string | null>(null);
  const [operatorPrimaryColor, setOperatorPrimaryColor] = useState<string>("#1B3A6B");

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

  // ─── Load operator branding for canvas watermark ───
  useEffect(() => {
    async function loadOperator() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: userData } = await supabase
          .from("users").select("operator_id").eq("id", user.id).single();
        if (!userData?.operator_id) return;
        const { data: op } = await supabase
          .from("operators")
          .select("logo_url, primary_color")
          .eq("id", userData.operator_id)
          .single();
        if (op?.logo_url) setOperatorLogoUrl(op.logo_url);
        if (op?.primary_color) setOperatorPrimaryColor(op.primary_color);
      } catch { /* non-critical */ }
    }
    loadOperator();
  }, []);

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

  // ─── Load photos from Pexels ───

  async function loadPhotos(visual?: VisualOption) {
    const activeVisual = visual ?? selectedVisual;

    // Build context-aware search queries
    // Priority: 1) custom terms entered by user, 2) selected visual terms, 3) all visuals fallback
    let queries: string[] = [];
    if (customSearchTerms.length > 0) {
      queries = customSearchTerms.slice(0, 3);
    } else if (activeVisual?.search_terms?.length) {
      // Use the AI's search terms exactly as generated — the AI prompt now produces specific terms
      queries = activeVisual.search_terms.slice(0, 3);
      setCustomSearchTerms(queries);
    } else if (generatedContent && "visual_options" in generatedContent) {
      const visuals = (generatedContent.visual_options || []) as VisualOption[];
      queries = visuals
        .flatMap((v) => v.search_terms)
        .slice(0, 3);
      setCustomSearchTerms(queries);
    } else {
      queries = ["roll-off dumpster delivery", "construction cleanup dumpster", "home renovation junk removal"];
      setCustomSearchTerms(queries);
    }

    if (queries.length === 0) return;

    setPhotosLoading(true);
    setPhotos([]);
    try {
      const orientation = platform === "instagram" || platform === "sms" ? "square" : "landscape";
      const res = await fetch("/api/content/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries, orientation }),
      });
      if (!res.ok) throw new Error("Failed to load photos");
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch (err) {
      toast.error("Failed to load stock photos");
    } finally {
      setPhotosLoading(false);
    }
  }

  // ─── Handle own photo upload (multiple) ───

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos: StockPhoto[] = files.map((file, i) => {
      const url = URL.createObjectURL(file);
      return {
        id: -(Date.now() + i), // negative IDs = uploaded
        src: { original: url, large2x: url, large: url, medium: url, small: url, portrait: url, landscape: url, tiny: url },
        alt: file.name,
        photographer: "Your photo",
        width: 0,
        height: 0,
        query: "upload",
      };
    });

    setUploadedPhotos(prev => [...prev, ...newPhotos]);
    // Auto-select the first uploaded photo
    setSelectedPhoto(newPhotos[0]);
    // Reset input so same file can be re-uploaded
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  // ─── Canvas helpers ───

  function loadCanvasImage(src: string, useCrossOrigin: boolean): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      if (useCrossOrigin) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ─── Core canvas renderer (accepts explicit params for multi-slide support) ───

  async function renderSlideToCanvas(
    canvas: HTMLCanvasElement,
    photo: StockPhoto,
    text: string,
    subtext: string,
    position: "top" | "center" | "bottom",
    darkness: number
  ): Promise<void> {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = PLATFORM_SIZES[platform] || PLATFORM_SIZES.instagram;
    canvas.width = size.width;
    canvas.height = size.height;

    await document.fonts.ready;

    const isBlob = photo.src.medium.startsWith("blob:");
    let img: HTMLImageElement;
    try {
      img = await loadCanvasImage(photo.src.large2x || photo.src.large, !isBlob);
    } catch {
      return;
    }

    // Draw image (cover fit)
    const imgRatio = img.width / img.height;
    const canvasRatio = size.width / size.height;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgRatio > canvasRatio) {
      sw = img.height * canvasRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / canvasRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size.width, size.height);

    // Dark overlay gradient
    const grad = ctx.createLinearGradient(0, 0, 0, size.height);
    const alpha = darkness / 100;
    grad.addColorStop(0, `rgba(0,0,0,${alpha * 0.4})`);
    grad.addColorStop(0.45, `rgba(0,0,0,${alpha * 0.55})`);
    grad.addColorStop(1, `rgba(0,0,0,${alpha * 0.9})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size.width, size.height);

    // ─── Text block ───
    const padding = size.width * 0.08;
    const maxWidth = size.width - padding * 2;

    let textY: number;
    if (position === "top") {
      textY = size.height * 0.25;
    } else if (position === "bottom") {
      textY = size.height * 0.68;
    } else {
      textY = size.height * 0.44;
    }

    if (text) {
      const fontSize = Math.min(size.width * 0.075, 78);
      const subFontSize = Math.round(fontSize * 0.42);
      const lineHeight = fontSize * 1.25;

      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      const words = text.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = word; }
        else { cur = test; }
      }
      if (cur) lines.push(cur);

      ctx.font = `400 ${subFontSize}px Inter, system-ui, sans-serif`;
      const subLines: string[] = [];
      if (subtext) {
        let subCur = "";
        for (const word of subtext.split(" ")) {
          const test = subCur ? `${subCur} ${word}` : word;
          if (ctx.measureText(test).width > maxWidth && subCur) { subLines.push(subCur); subCur = word; }
          else { subCur = test; }
        }
        if (subCur) subLines.push(subCur);
      }

      const accentBarH = Math.round(fontSize * 0.08);
      const accentBarW = Math.round(maxWidth * 0.18);
      const accentBarGap = Math.round(fontSize * 0.45);
      const totalTextHeight =
        accentBarH + accentBarGap +
        lines.length * lineHeight +
        (subLines.length > 0 ? subFontSize * 0.9 + subLines.length * subFontSize * 1.4 : 0);
      const blockTop = textY - totalTextHeight / 2;

      // Frosted backdrop
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#000000";
      drawRoundedRect(ctx, size.width / 2 - maxWidth / 2 - padding * 0.6, blockTop - fontSize * 0.55, maxWidth + padding * 1.2, totalTextHeight + fontSize * 1.1, 16);
      ctx.fill();
      ctx.restore();

      // Accent bar
      ctx.save();
      ctx.fillStyle = operatorPrimaryColor;
      drawRoundedRect(ctx, size.width / 2 - accentBarW / 2, blockTop, accentBarW, accentBarH, accentBarH / 2);
      ctx.fill();
      ctx.restore();

      // Headline
      ctx.save();
      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 12;
      let lineY = blockTop + accentBarH + accentBarGap + fontSize * 0.85;
      for (const line of lines) { ctx.fillText(line, size.width / 2, lineY); lineY += lineHeight; }
      ctx.restore();

      // Subtext / CTA
      if (subLines.length > 0) {
        ctx.save();
        ctx.font = `500 ${subFontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 6;
        const divY = lineY + subFontSize * 0.3;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size.width / 2 - maxWidth * 0.2, divY);
        ctx.lineTo(size.width / 2 + maxWidth * 0.2, divY);
        ctx.stroke();
        let subY = divY + subFontSize * 1.1;
        for (const sl of subLines) { ctx.fillText(sl.toUpperCase(), size.width / 2, subY); subY += subFontSize * 1.4; }
        ctx.restore();
      }
    }

    // ─── Logo watermark ───
    if (operatorLogoUrl) {
      try {
        const cleanLogoUrl = operatorLogoUrl.split("?")[0];
        const logoImg = await loadCanvasImage(cleanLogoUrl, true);
        const logoMaxW = Math.min(size.width * 0.2, 190);
        const logoMaxH = Math.min(size.height * 0.1, 70);
        const logoRatio = logoImg.width / logoImg.height;
        let logoW = logoMaxW;
        let logoH = logoW / logoRatio;
        if (logoH > logoMaxH) { logoH = logoMaxH; logoW = logoH * logoRatio; }
        const logoPad = size.width * 0.04;
        const logoX = size.width - logoW - logoPad;
        const logoY = size.height - logoH - logoPad;
        const pillPad = Math.round(logoH * 0.22);
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "#ffffff";
        drawRoundedRect(ctx, logoX - pillPad, logoY - pillPad, logoW + pillPad * 2, logoH + pillPad * 2, 10);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
        ctx.restore();
      } catch { /* logo load failed — no watermark */ }
    }
  }

  async function renderCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || !selectedPhoto) return;
    await renderSlideToCanvas(canvas, selectedPhoto, overlayText, overlaySubtext, overlayPosition, overlayDarkness);
    setCanvasReady(true);
  }

  // Re-render canvas when settings change
  useEffect(() => {
    if (selectedPhoto && step === "create") {
      setCanvasReady(false);
      renderCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhoto, overlayText, overlaySubtext, overlayPosition, overlayDarkness, step, operatorLogoUrl, operatorPrimaryColor]);

  // Sync active slide state into slides array whenever editing values change
  useEffect(() => {
    if (slides.length === 0 || step !== "create") return;
    setSlides(prev => {
      const next = [...prev];
      if (next[activeSlideIdx]) {
        next[activeSlideIdx] = { ...next[activeSlideIdx], photo: selectedPhoto, text: overlayText, subtext: overlaySubtext, position: overlayPosition, darkness: overlayDarkness };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhoto, overlayText, overlaySubtext, overlayPosition, overlayDarkness]);

  // ─── Slide management ───

  function switchToSlide(idx: number) {
    const slide = slides[idx];
    if (!slide) return;
    setSelectedPhoto(slide.photo);
    setOverlayText(slide.text);
    setOverlaySubtext(slide.subtext);
    setOverlayPosition(slide.position);
    setOverlayDarkness(slide.darkness);
    setActiveSlideIdx(idx);
    setCanvasReady(false);
  }

  function addSlide() {
    const newSlide: Slide = {
      id: Date.now().toString(),
      photo: null,
      text: "",
      subtext: overlaySubtext, // carry same CTA to next slide
      position: "center",
      darkness: 50,
    };
    const newIdx = slides.length;
    setSlides(prev => [...prev, newSlide]);
    setActiveSlideIdx(newIdx);
    setSelectedPhoto(null);
    setOverlayText("");
    setCanvasReady(false);
  }

  function removeSlide(idx: number) {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== idx);
    const newIdx = Math.min(activeSlideIdx, newSlides.length - 1);
    const slide = newSlides[newIdx];
    setSlides(newSlides);
    setActiveSlideIdx(newIdx);
    setSelectedPhoto(slide.photo);
    setOverlayText(slide.text);
    setOverlaySubtext(slide.subtext);
    setOverlayPosition(slide.position);
    setOverlayDarkness(slide.darkness);
    setCanvasReady(false);
  }

  async function downloadAllSlides() {
    // Snapshot slides with current editor values merged in
    const allSlides = slides.map((s, i) =>
      i === activeSlideIdx
        ? { ...s, photo: selectedPhoto, text: overlayText, subtext: overlaySubtext, position: overlayPosition, darkness: overlayDarkness }
        : s
    );
    const validSlides = allSlides.filter(s => s.photo !== null);
    if (validSlides.length === 0) { toast.error("No slides with photos to download"); return; }

    setDownloadingAll(true);
    const offCanvas = document.createElement("canvas");
    let count = 0;
    for (const slide of validSlides) {
      if (!slide.photo) continue;
      await renderSlideToCanvas(offCanvas, slide.photo, slide.text, slide.subtext, slide.position, slide.darkness);
      const link = document.createElement("a");
      link.download = `slide-${++count}-${platform}.png`;
      link.href = offCanvas.toDataURL("image/png");
      link.click();
      await new Promise(r => setTimeout(r, 150));
    }
    setDownloadingAll(false);
    toast.success(`Downloaded ${count} slide${count > 1 ? "s" : ""}!`);
  }

  // ─── Download single canvas image ───

  function downloadAsset() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `slide-${activeSlideIdx + 1}-${platform}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Image downloaded!");
  }

  // ─── Enter create step ───

  function enterCreateStep(chosenVisual?: VisualOption) {
    const activeVisual = chosenVisual ?? selectedVisual;
    let initText = "";
    let initSubtext = "";
    if (activeVisual?.overlay_text) {
      initText = activeVisual.overlay_text;
    } else if (generatedContent) {
      if ("hook" in generatedContent && generatedContent.hook) {
        initText = (generatedContent as SocialContentOutput).hook || "";
      } else if ("primary_caption" in generatedContent) {
        const caption = (generatedContent as SocialContentOutput).primary_caption;
        initText = caption.split(".")[0] || "";
      }
    }
    if (generatedContent && "cta" in generatedContent && (generatedContent as SocialContentOutput).cta) {
      initSubtext = (generatedContent as SocialContentOutput).cta || "";
    }
    setOverlayText(initText);
    setOverlaySubtext(initSubtext);
    setOverlayPosition("center");
    setOverlayDarkness(50);
    setSelectedPhoto(null);
    setCanvasReady(false);
    // Initialize slides with 1 slide
    setSlides([{ id: "1", photo: null, text: initText, subtext: initSubtext, position: "center", darkness: 50 }]);
    setActiveSlideIdx(0);
    setUploadedPhotos([]);
    setCustomSearchTerms([]);
    setStep("create");
    loadPhotos(activeVisual ?? undefined);
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
      { key: "create", label: "Create", num: 4 },
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
                else if (s.key === "create" && generatedContent) enterCreateStep();
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
    const isSelected = selectedVisual === visual;
    return (
      <div
        className={`rounded-lg p-4 border space-y-2 transition-all cursor-pointer ${
          isSelected
            ? "bg-tippd-blue/10 border-tippd-blue/50 ring-1 ring-tippd-blue/30"
            : "bg-tippd-ink border-white/5 hover:border-white/20"
        }`}
        onClick={() => {
          setSelectedVisual(visual);
          setCustomSearchTerms([]);
          if (visual.overlay_text) setOverlayText(visual.overlay_text);
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-tippd-smoke">
            {visual.type === "image" ? <ImageIcon className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            <span className="font-medium">Visual {index + 1}</span>
            <span className="text-tippd-ash">• {visual.aspect_ratio}</span>
          </div>
          {isSelected && (
            <span className="text-[10px] font-semibold text-tippd-blue uppercase tracking-wide">Selected</span>
          )}
        </div>
        <p className="text-sm text-white">{visual.concept}</p>
        {visual.overlay_text && (
          <p className="text-xs text-tippd-blue italic">&ldquo;{visual.overlay_text}&rdquo;</p>
        )}
        <div className="flex flex-wrap gap-1 mb-1">
          {visual.search_terms.map((term) => (
            <span key={term} className="px-2 py-0.5 bg-tippd-steel rounded text-[10px] text-tippd-smoke">
              {term}
            </span>
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedVisual(visual);
            enterCreateStep(visual);
          }}
          className="w-full mt-1 py-1.5 rounded bg-tippd-blue/20 hover:bg-tippd-blue/40 text-tippd-blue text-xs font-semibold transition-colors flex items-center justify-center gap-1"
        >
          <Palette className="w-3 h-3" />
          Use This Visual →
        </button>
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
            <button
              onClick={() => enterCreateStep(selectedVisual ?? undefined)}
              className="flex items-center gap-2 px-4 py-1.5 rounded bg-tippd-green text-white text-xs font-semibold hover:opacity-90"
            >
              <Palette className="w-3.5 h-3.5" />
              {selectedVisual ? "Create Asset with Selected Visual" : "Create Asset"}
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
            <div>
              <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider flex items-center gap-2 mb-1">
                <ImageIcon className="w-3.5 h-3.5" />
                Visual Suggestions
              </h3>
              <p className="text-[10px] text-tippd-ash">Click a concept to select it, or hit &ldquo;Use This Visual&rdquo; to jump straight to Create with matching photos.</p>
            </div>
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

  // ─── STEP 4: Create Asset ───

  function renderCreate() {
    const size = PLATFORM_SIZES[platform] || PLATFORM_SIZES.instagram;
    const previewRatio = size.width / size.height;

    return (
      <div className="space-y-6">
        {/* Back */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep("output")}
            className="flex items-center gap-1 text-sm text-tippd-smoke hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Content
          </button>
          <span className="text-xs text-tippd-ash">
            {platform} • {size.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas preview - 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" />
                  Preview
                </h3>
                {canvasReady && (
                  <div className="flex items-center gap-2">
                    {slides.filter(s => s.photo).length > 1 && (
                      <button
                        onClick={downloadAllSlides}
                        disabled={downloadingAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-tippd-blue text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                      >
                        {downloadingAll ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        All {slides.filter(s => s.photo).length}
                      </button>
                    )}
                    <button
                      onClick={downloadAsset}
                      className="flex items-center gap-2 px-4 py-2 rounded bg-tippd-green text-white text-sm font-semibold hover:opacity-90"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                )}
              </div>

              {selectedPhoto ? (
                <div style={{ aspectRatio: previewRatio, maxHeight: "500px" }} className="relative mx-auto">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full rounded-lg object-contain"
                    style={{ aspectRatio: previewRatio }}
                  />
                  {/* Slide counter badge */}
                  {slides.length > 1 && (
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {activeSlideIdx + 1} / {slides.length}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="flex items-center justify-center rounded-lg bg-tippd-ink border border-white/5"
                  style={{ aspectRatio: previewRatio, maxHeight: "400px" }}
                >
                  <p className="text-sm text-tippd-ash">Select a photo below to preview your asset</p>
                </div>
              )}

              {/* ─── Slide strip ─── */}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                {slides.map((slide, i) => (
                  <div key={slide.id} className="relative flex-shrink-0">
                    <button
                      onClick={() => switchToSlide(i)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        i === activeSlideIdx
                          ? "border-tippd-blue ring-2 ring-tippd-blue/40"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {slide.photo ? (
                        <img src={slide.photo.src.tiny || slide.photo.src.small} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-tippd-steel flex items-center justify-center">
                          <span className="text-tippd-ash text-xs">{i + 1}</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white text-center py-0.5">
                        Slide {i + 1}
                      </div>
                    </button>
                    {slides.length > 1 && (
                      <button
                        onClick={() => removeSlide(i)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center hover:bg-red-400 z-10"
                        title="Remove slide"
                      >×</button>
                    )}
                  </div>
                ))}
                {/* Add slide button */}
                <button
                  onClick={addSlide}
                  className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-white/20 hover:border-tippd-blue/50 flex flex-col items-center justify-center gap-1 text-tippd-ash hover:text-tippd-blue transition-colors"
                  title="Add slide"
                >
                  <span className="text-xl leading-none">+</span>
                  <span className="text-[8px]">Add</span>
                </button>
              </div>
            </div>

            {/* Photo grid */}
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Choose a Photo
                  {photosLoading && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Refresh Pexels results */}
                  <button
                    onClick={() => loadPhotos()}
                    disabled={photosLoading}
                    className="text-[10px] text-tippd-ash hover:text-white flex items-center gap-1 disabled:opacity-40"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                  {/* Upload own photos */}
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-tippd-blue/20 hover:bg-tippd-blue/40 text-tippd-blue text-[10px] font-semibold transition-colors border border-tippd-blue/30"
                  >
                    <Download className="w-3 h-3 rotate-180" />
                    Upload Your Photos
                  </button>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              {/* Search terms editor */}
              <div className="mb-3 pb-3 border-b border-white/5">
                <p className="text-[10px] text-tippd-ash mb-2">Search terms — edit or add to find better photos</p>
                {/* Tag list */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {customSearchTerms.map((term, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-tippd-steel rounded text-[11px] text-white"
                    >
                      {term}
                      <button
                        onClick={() => setCustomSearchTerms((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-tippd-ash hover:text-white ml-0.5"
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {customSearchTerms.length === 0 && (
                    <span className="text-[10px] text-tippd-ash italic">No terms yet — type below</span>
                  )}
                </div>
                {/* Input + add + search row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTermInput}
                    onChange={(e) => setSearchTermInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === ",") && searchTermInput.trim()) {
                        e.preventDefault();
                        const term = searchTermInput.trim().replace(/,$/, "");
                        if (term && !customSearchTerms.includes(term)) {
                          setCustomSearchTerms((prev) => [...prev, term].slice(0, 3));
                        }
                        setSearchTermInput("");
                      }
                    }}
                    placeholder='e.g. "dumpster driveway" — press Enter to add'
                    className="flex-1 h-8 px-3 rounded bg-tippd-ink border border-white/10 text-xs text-white placeholder:text-tippd-ash outline-none focus:border-tippd-blue"
                  />
                  <button
                    onClick={() => {
                      const term = searchTermInput.trim().replace(/,$/, "");
                      if (term && !customSearchTerms.includes(term)) {
                        setCustomSearchTerms((prev) => [...prev, term].slice(0, 3));
                      }
                      setSearchTermInput("");
                    }}
                    disabled={!searchTermInput.trim()}
                    className="px-3 h-8 rounded bg-tippd-steel text-tippd-smoke hover:text-white text-xs disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => loadPhotos()}
                    disabled={photosLoading || customSearchTerms.length === 0}
                    className="px-3 h-8 rounded bg-tippd-blue text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1"
                  >
                    {photosLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Hash className="w-3 h-3" />}
                    Search
                  </button>
                </div>
                <p className="text-[9px] text-tippd-ash mt-1.5">Max 3 terms · Press Enter or comma to add</p>
              </div>

              {/* Uploaded photos strip */}
              {uploadedPhotos.length > 0 && (
                <div className="mb-3 pb-3 border-b border-white/5">
                  <p className="text-[10px] text-tippd-ash mb-2">Your uploaded photos ({uploadedPhotos.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedPhoto?.id === photo.id
                            ? "border-tippd-green ring-2 ring-tippd-green/30"
                            : "border-transparent hover:border-white/20"
                        }`}
                      >
                        <img src={photo.src.medium} alt={photo.alt} className="w-full h-full object-cover" />
                        {selectedPhoto?.id === photo.id && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-tippd-green flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhoto?.id === photo.id
                          ? "border-tippd-green ring-2 ring-tippd-green/30"
                          : "border-transparent hover:border-white/20"
                      }`}
                    >
                      <img
                        src={photo.src.medium}
                        alt={photo.alt}
                        className="w-full aspect-square object-cover"
                        crossOrigin="anonymous"
                      />
                      {selectedPhoto?.id === photo.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-tippd-green flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                        <p className="text-[9px] text-white/70 truncate">{photo.photographer}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : photosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-tippd-smoke" />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-tippd-ash mb-2">No photos found</p>
                  <button
                    onClick={() => loadPhotos()}
                    className="px-3 py-1.5 bg-tippd-steel text-tippd-smoke rounded text-xs hover:text-white"
                  >
                    Retry
                  </button>
                </div>
              )}
              <p className="text-[9px] text-tippd-ash mt-2">Photos provided by Pexels</p>
            </div>
          </div>

          {/* Controls sidebar - 1 col */}
          <div className="space-y-4">
            {/* Text controls */}
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4 space-y-4">
              <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider flex items-center gap-2">
                <Type className="w-3.5 h-3.5" />
                Text Overlay
              </h3>

              <div>
                <label className="block text-xs text-tippd-smoke mb-1">Headline</label>
                <textarea
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="Main headline text..."
                  className="w-full bg-tippd-ink border border-white/10 rounded-md p-2.5 text-sm text-white placeholder:text-tippd-ash resize-none focus:outline-none focus:border-tippd-blue/50"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs text-tippd-smoke mb-1">Subtext / CTA</label>
                <input
                  type="text"
                  value={overlaySubtext}
                  onChange={(e) => setOverlaySubtext(e.target.value)}
                  placeholder="Call to action..."
                  className="w-full bg-tippd-ink border border-white/10 rounded-md p-2.5 text-sm text-white placeholder:text-tippd-ash focus:outline-none focus:border-tippd-blue/50"
                />
              </div>

              <div>
                <label className="block text-xs text-tippd-smoke mb-1">Text Position</label>
                <div className="flex gap-2">
                  {(["top", "center", "bottom"] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setOverlayPosition(pos)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                        overlayPosition === pos
                          ? "bg-tippd-blue text-white"
                          : "bg-tippd-steel text-tippd-smoke hover:text-white"
                      }`}
                    >
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-tippd-smoke mb-1">
                  Darken: {overlayDarkness}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={overlayDarkness}
                  onChange={(e) => setOverlayDarkness(Number(e.target.value))}
                  className="w-full accent-tippd-blue"
                />
              </div>
            </div>

            {/* Quick text presets from generated content */}
            {generatedContent && "overlay_text_options" in generatedContent && (generatedContent as SocialContentOutput).overlay_text_options?.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4 space-y-2">
                <h3 className="text-xs font-semibold text-tippd-smoke uppercase tracking-wider">
                  Suggested Headlines
                </h3>
                {(generatedContent as SocialContentOutput).overlay_text_options.map((text, i) => (
                  <button
                    key={i}
                    onClick={() => setOverlayText(text)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                      overlayText === text
                        ? "bg-tippd-blue/20 text-tippd-blue border border-tippd-blue/30"
                        : "bg-tippd-ink text-white hover:bg-tippd-steel border border-white/5"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            {/* Download buttons */}
            {canvasReady && selectedPhoto && (
              <div className="space-y-2">
                <button
                  onClick={downloadAsset}
                  className="w-full py-2.5 bg-tippd-green text-white rounded-md text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download This Slide
                </button>
                {slides.filter(s => s.photo).length > 1 && (
                  <button
                    onClick={downloadAllSlides}
                    disabled={downloadingAll}
                    className="w-full py-2.5 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {downloadingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {downloadingAll ? "Downloading..." : `Download All ${slides.filter(s => s.photo).length} Slides`}
                  </button>
                )}
                {operatorLogoUrl && (
                  <p className="text-[9px] text-tippd-ash text-center flex items-center justify-center gap-1">
                    <span className="text-tippd-green">✓</span> Your logo is auto-stamped on every image
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
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
      {step === "create" && renderCreate()}
    </div>
  );
}
