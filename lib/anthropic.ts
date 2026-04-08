import Anthropic from "@anthropic-ai/sdk";

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

interface GenerateContentParams {
  type: string;
  platform: string;
  tone: string;
  operatorName: string;
  context?: string;
}

export async function generateContent({
  type,
  platform,
  tone,
  operatorName,
  context,
}: GenerateContentParams): Promise<string> {
  const message = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a marketing content writer for ${operatorName}, a dumpster rental and roll-off container business. Generate a ${type} for ${platform} in a ${tone} tone.${context ? ` Additional context: ${context}` : ""}\n\nReturn only the content, no explanations.`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}

// ─── Content Engine: Idea Generation ───

interface GenerateIdeasParams {
  operatorName: string;
  serviceArea: string[];
  currentDate: string;
  season: string;
  businessContext: {
    lead_goal: string;
    active_promotions: string[];
    capacity_status: string;
    recent_job_count_7d?: number;
    recent_job_count_14d?: number;
  };
}

export async function generateContentIdeas(params: GenerateIdeasParams): Promise<string> {
  const message = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a local marketing strategist for ${params.operatorName}, a Central New Jersey dumpster rental and waste services company. Your job is to turn real-world local business signals into useful, tasteful, lead-generating content ideas.

The company serves residential, commercial, industrial, and contractor customers across ${params.serviceArea.join(", ")}.

Be practical, local, and straightforward. Never sound exploitative about disasters, deaths, or hardship. Prioritize relevance to Central New Jersey over national noise.

Current context:
- Date: ${params.currentDate}
- Season: ${params.season}
- Business capacity: ${params.businessContext.capacity_status}
- Lead goal: ${params.businessContext.lead_goal}
- Active promotions: ${params.businessContext.active_promotions.length > 0 ? params.businessContext.active_promotions.join(", ") : "none"}
${params.businessContext.recent_job_count_7d !== undefined ? `- Jobs last 7 days: ${params.businessContext.recent_job_count_7d}` : ""}
${params.businessContext.recent_job_count_14d !== undefined ? `- Jobs last 14 days: ${params.businessContext.recent_job_count_14d}` : ""}

Step 1: Identify 5-8 current signals that could affect dumpster demand in Central NJ right now. Consider:
A. Local environment/timing: weather forecasts, seasonal transitions, holiday weekends, municipal cleanup days
B. Housing/moving: central NJ housing market, spring listings, sale activity, price trends
C. Home renovation/construction: remodeling trends, contractor demand, seasonal project starts
D. Waste/recycling/regulatory: NJDEP news, battery disposal education, recycling rules
E. Business-side: capacity status, lead goals, promotions

For each signal, score on 5 dimensions (0.0-1.0):
- local_relevance: does it affect central NJ?
- service_relevance: does it connect to dumpster demand?
- recency: is it timely right now?
- commercial_value: likely to generate leads?
- sensitivity_risk: could this look exploitative?

Score formula: (0.30 * local_relevance) + (0.25 * service_relevance) + (0.20 * recency) + (0.20 * commercial_value) - (0.25 * sensitivity_risk)

Step 2: From those signals, produce exactly 3 distinct content ideas optimized for diversity:
- max 1 weather/disaster-related idea
- max 1 hard promotional idea
- at least 1 evergreen low-risk idea
- at least 1 locally timely idea
- at least 1 educational or authority-building idea
- Do NOT give 3 ideas that are basically the same

The final 3 should feel like: one easy lead-gen post, one timely/local post, one trust-building post.

${params.businessContext.capacity_status === "slow" ? "BUSINESS IS SLOW: Favor promotional lead-gen concepts." : ""}
${params.businessContext.capacity_status === "busy" ? "BUSINESS IS BUSY: Favor authority and premium positioning over discounts." : ""}

Sensitivity rules:
- low (< 0.3): normal promotional content allowed
- medium (0.3-0.6): helpful/professional tone only
- high (> 0.6): educational/supportive only, no discount language, no urgency gimmicks

Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "generated_at": "ISO timestamp",
  "service_area": ${JSON.stringify(params.serviceArea)},
  "signals_used": [
    {
      "source": "signal source",
      "category": "category name",
      "summary": "brief description",
      "local_relevance": 0.0,
      "service_relevance": 0.0,
      "recency": 0.0,
      "commercial_value": 0.0,
      "sensitivity_risk": 0.0,
      "score": 0.0
    }
  ],
  "ideas": [
    {
      "id": "idea_1",
      "title": "short title",
      "category": "one of: seasonal_cleanout, moving_real_estate, renovation_construction, local_educational, storm_cleanup, business_promotion, social_proof, commercial_contractor",
      "audience": "target audience",
      "why_now": "explanation of why this matters right now",
      "signal_summary": ["signal 1", "signal 2"],
      "recommended_formats": ["facebook_post", "instagram_carousel", "google_ad", "email", "sms", "blog_post"],
      "tone_options": ["professional", "casual", "urgent", "friendly", "seasonal"],
      "cta_suggestion": "suggested call to action",
      "sensitivity_score": 0.0,
      "sensitivity_level": "low or medium or high",
      "commercial_score": 0.0
    }
  ]
}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "{}";
}

// ─── Content Engine: Structured Content Generation ───

interface GenerateStructuredContentParams {
  operatorName: string;
  idea: {
    title: string;
    category: string;
    audience: string;
    why_now: string;
    signal_summary: string[];
    cta_suggestion: string;
    sensitivity_level: string;
  };
  contentType: string;
  platform: string;
  tone: string;
  customIdea?: string;
  promoOrOffer?: string;
  targetCustomer?: string;
  townOrCountyFocus?: string;
}

export async function generateStructuredContent(params: GenerateStructuredContentParams): Promise<string> {
  const { contentType, platform } = params;

  let outputSchema = "";
  if (contentType === "social_media_post") {
    outputSchema = `{
  "platform": "${platform}",
  "content_type": "social_media_post",
  "primary_caption": "main caption text",
  "alternate_caption_1": "variation 1",
  "alternate_caption_2": "variation 2",
  "hook": "short attention-grabbing opener",
  "cta": "call to action",
  "hashtags": ["8-15 hashtags mixing broad + local + intent-driven"],
  "overlay_text_options": ["text overlay suggestion 1", "text overlay suggestion 2"],
  "image_prompts": ["image description 1"],
  "stock_search_terms": ["search term 1"],
  "visual_options": [
    {
      "type": "image or short_video",
      "concept": "visual concept description",
      "search_terms": ["term1", "term2", "term3"],
      "overlay_text": "text overlay",
      "aspect_ratio": "4:5 or 9:16 or 1:1"
    }
  ],
  "compliance_notes": ["any compliance or sensitivity notes"],
  "boosted_version": "shorter version optimized for paid promotion"
}`;
  } else if (contentType === "google_ad") {
    outputSchema = `{
  "content_type": "google_ad",
  "headlines": ["up to 15 headlines, max 30 chars each"],
  "descriptions": ["up to 4 descriptions, max 90 chars each"],
  "keyword_themes": ["keyword theme 1"],
  "callout_extensions": ["callout 1"],
  "structured_snippets": ["snippet 1"],
  "cta": "call to action",
  "visual_options": [
    {
      "type": "image",
      "concept": "visual concept",
      "search_terms": ["term1", "term2", "term3"],
      "overlay_text": "text overlay",
      "aspect_ratio": "1.91:1"
    }
  ]
}`;
  } else if (contentType === "email_campaign" || contentType === "sms_promo") {
    outputSchema = `{
  "content_type": "${contentType}",
  "subject_line": "email subject or SMS preview",
  "preview_line": "preview text",
  "body_copy": "main body content",
  "cta": "call to action",
  "variant_a": "A/B test variant A full text",
  "variant_b": "A/B test variant B full text",
  "visual_options": [
    {
      "type": "image",
      "concept": "visual concept",
      "search_terms": ["term1", "term2", "term3"],
      "overlay_text": "text overlay",
      "aspect_ratio": "16:9"
    }
  ]
}`;
  } else {
    outputSchema = `{
  "content_type": "blog_post",
  "title": "blog post title",
  "meta_description": "SEO meta description under 160 chars",
  "sections": [
    { "heading": "section heading", "body": "section content" }
  ],
  "cta": "call to action",
  "visual_options": [
    {
      "type": "image",
      "concept": "visual concept",
      "search_terms": ["term1", "term2", "term3"],
      "overlay_text": "text overlay",
      "aspect_ratio": "16:9"
    }
  ]
}`;
  }

  const sensitivityGuidance = params.idea.sensitivity_level === "high"
    ? "IMPORTANT: This topic has HIGH sensitivity. Use educational/supportive language only. No discount language. No urgency gimmicks. No aggressive promotion."
    : params.idea.sensitivity_level === "medium"
    ? "NOTE: This topic has MEDIUM sensitivity. Use helpful, professional tone only. No exploitative framing."
    : "This topic has LOW sensitivity. Normal promotional content is fine.";

  const message = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are the voice behind ${params.operatorName} — a real, boots-on-the-ground dumpster rental company in Central New Jersey. You write their social media, ads, and emails. You are NOT a corporate copywriter. You are NOT generic.

VOICE: Direct, confident, blue-collar but smart. You know the neighborhoods — Branchburg, Flemington, Hillsborough, Somerville, Bridgewater, Clinton, Bernardsville. You know the customers — contractors who need a dumpster on-site by 7am, homeowners finally tackling the garage, GCs clearing a job site before inspection. Speak to THEM, not at them.

WRITING RULES — FOLLOW THESE STRICTLY:
1. Open with a HOOK that stops the scroll. A real problem, a specific situation, a surprising stat, a relatable frustration. NOT "Looking for a dumpster?" NOT "Spring is here!" Get specific.
2. Short sentences. Punchy. Like you're talking, not presenting.
3. Name drop local towns, counties, or landmarks when relevant. It makes it real.
4. Specific > vague. "10-yard dumpster fits a full kitchen gut" beats "we have many sizes."
5. CTA must be frictionless and direct: "Text us your address." "Drop your zip in the link." "Same-day available — call now." NOT "Contact us today for more information."
6. If there's a promo, lead with the value, not the brand name.
7. NO corporate buzzwords: solutions, leverage, seamless, comprehensive, reliable services, professional team.
8. Captions for Instagram/Facebook: conversational, 3-5 sentences max for the body. Hashtags on a separate line.
9. Email subject lines: 6 words or fewer, curiosity or direct benefit, no emoji spam.

EXAMPLES OF GOOD HOOKS (study these, don't copy them):
- "Your contractor called. Dumpster's full. Now what?"
- "Most Flemington homeowners waste $200 ordering the wrong size. Here's the cheat sheet."
- "It's 6am. Your crew shows up. The dumpster isn't there. That's not us."
- "Demo starts Monday. We can have a 15-yarder at your Hillsborough site by Friday."

Content idea: ${params.customIdea || params.idea.title}
Category: ${params.idea.category}
Why now: ${params.idea.why_now}
Target audience: ${params.targetCustomer || params.idea.audience}
Signals: ${params.idea.signal_summary.join(", ")}
Suggested CTA: ${params.idea.cta_suggestion}

${sensitivityGuidance}

Generate content for:
- Content type: ${contentType}
- Platform: ${platform}
- Tone: ${params.tone}
${params.promoOrOffer ? `- Promotion/offer: ${params.promoOrOffer}` : ""}
${params.townOrCountyFocus ? `- Geographic focus: ${params.townOrCountyFocus}` : ""}

Hashtag rules (if social):
- 8-15 hashtags max
- Mix: 2-3 broad (#DumpsterRental #RollOffDumpster), 3-5 local (#CentralNJ #SomersetCounty #HunterdonCounty), 2-4 use-case (#SpringCleanout #ContractorLife #JobSiteReady)
- No generic viral tags like #fyp #viral

Visual recommendations:
- Provide exactly 3 visual options
- For each: type (image or short_video), concept, 3 search terms (specific and visual — think "overflowing garage renovation debris" not just "dumpster"), overlay text (short punchy headline, 5 words max), aspect ratio
- search_terms should match what you'd actually find on a stock photo site — concrete, visual, specific

Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
${outputSchema}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "{}";
}

interface GenerateInsightParams {
  operatorName: string;
  data: string;
  insightType: string;
}

export async function generateInsight({
  operatorName,
  data,
  insightType,
}: GenerateInsightParams): Promise<{ title: string; body: string; dollarImpact: number | null }> {
  const message = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a business intelligence analyst for ${operatorName}, a dumpster rental operator. Analyze the following ${insightType} data and provide ONE specific, actionable insight.\n\nData:\n${data}\n\nRespond in JSON format:\n{"title": "short headline", "body": "full insight with specific numbers and recommended action", "dollarImpact": estimated dollar impact or null}`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { title: "Insight", body: text, dollarImpact: null };
  }
}

interface ClassifyIntentParams {
  message: string;
  customerContext?: string;
}

export async function classifyIntent({
  message,
  customerContext,
}: ClassifyIntentParams): Promise<{ intent: string; confidence: number }> {
  const response = await getAnthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Classify the intent of this customer message for a dumpster rental business.\n\nMessage: "${message}"${customerContext ? `\nCustomer context: ${customerContext}` : ""}\n\nValid intents: drop_request, pickup_request, reschedule, complaint, driver_note, other\n\nRespond in JSON: {"intent": "...", "confidence": 0.0-1.0}`,
      },
    ],
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text : '{"intent":"other","confidence":0.5}';
  try {
    return JSON.parse(text);
  } catch {
    return { intent: "other", confidence: 0.5 };
  }
}
