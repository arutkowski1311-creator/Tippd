// ─── Content Engine Types ───

export type ContentType = "social_media_post" | "google_ad" | "email_campaign" | "sms_promo" | "blog_post";
export type Platform = "facebook" | "instagram" | "google_ads" | "email" | "sms";
export type Tone = "professional" | "casual" | "urgent" | "friendly" | "seasonal";
export type TargetCustomer = "residential" | "contractor" | "commercial" | "industrial";
export type ContentCategory =
  | "seasonal_cleanout"
  | "moving_real_estate"
  | "renovation_construction"
  | "local_educational"
  | "storm_cleanup"
  | "business_promotion"
  | "social_proof"
  | "commercial_contractor";

export type SensitivityLevel = "low" | "medium" | "high";

// ─── Signal Types ───

export interface Signal {
  source: string;
  category: string;
  summary: string;
  local_relevance: number;
  service_relevance: number;
  recency: number;
  commercial_value: number;
  sensitivity_risk: number;
  score: number;
}

// ─── Idea Card ───

export interface ContentIdea {
  id: string;
  title: string;
  category: ContentCategory;
  audience: string;
  why_now: string;
  signal_summary: string[];
  recommended_formats: string[];
  tone_options: Tone[];
  cta_suggestion: string;
  sensitivity_score: number;
  sensitivity_level: SensitivityLevel;
  commercial_score: number;
}

export interface IdeasResponse {
  generated_at: string;
  service_area: string[];
  signals_used: Signal[];
  ideas: ContentIdea[];
}

// ─── Content Generation Request ───

export interface ContentGenerationRequest {
  idea: ContentIdea;
  content_type: ContentType;
  platform: Platform;
  tone: Tone;
  custom_idea?: string;
  promo_or_offer?: string;
  target_customer?: TargetCustomer;
  town_or_county_focus?: string;
}

// ─── Visual Recommendation ───

export interface VisualOption {
  type: "image" | "short_video";
  concept: string;
  search_terms: string[];
  overlay_text: string;
  aspect_ratio: string;
}

// ─── Social Content Output ───

export interface SocialContentOutput {
  platform: Platform;
  content_type: "social_media_post";
  primary_caption: string;
  alternate_caption_1: string;
  alternate_caption_2: string;
  hook: string;
  cta: string;
  hashtags: string[];
  overlay_text_options: string[];
  image_prompts: string[];
  stock_search_terms: string[];
  visual_options: VisualOption[];
  compliance_notes: string[];
  boosted_version?: string;
}

// ─── Google Ads Output ───

export interface GoogleAdsOutput {
  content_type: "google_ad";
  headlines: string[];
  descriptions: string[];
  keyword_themes: string[];
  callout_extensions: string[];
  structured_snippets: string[];
  cta: string;
  visual_options: VisualOption[];
}

// ─── Email/SMS Output ───

export interface EmailSmsOutput {
  content_type: "email_campaign" | "sms_promo";
  subject_line?: string;
  preview_line?: string;
  body_copy: string;
  cta: string;
  variant_a: string;
  variant_b: string;
  visual_options: VisualOption[];
}

// ─── Blog Output ───

export interface BlogOutput {
  content_type: "blog_post";
  title: string;
  meta_description: string;
  sections: { heading: string; body: string }[];
  cta: string;
  visual_options: VisualOption[];
}

// ─── Union type for all content outputs ───

export type GeneratedContent = SocialContentOutput | GoogleAdsOutput | EmailSmsOutput | BlogOutput;

// ─── Business Context for signal scoring ───

export interface BusinessContext {
  lead_goal: string;
  active_promotions: string[];
  capacity_status: "slow" | "normal" | "busy";
  recent_job_count_7d?: number;
  recent_job_count_14d?: number;
}
