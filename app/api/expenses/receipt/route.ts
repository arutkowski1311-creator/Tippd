import { getAuthContext, json, error } from "@/lib/api-helpers";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_TAX_BUCKET, type ExpenseCategory } from "@/types/expense";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  fuel: ["gas", "fuel", "shell", "bp", "exxon", "mobil", "sunoco", "chevron", "wawa", "speedway", "pilot", "loves", "racetrac", "citgo", "valero", "marathon", "diesel", "petroleum", "petro"],
  repair: ["auto", "mechanic", "repair", "tire", "brake", "parts", "napa", "autozone", "oreilly", "advance auto", "meineke", "jiffy", "midas", "pep boys", "service center", "transmission", "welding"],
  wages: ["payroll", "wages", "labor", "salary", "staffing"],
  tolls: ["toll", "turnpike", "bridge", "tunnel", "ezpass", "e-zpass", "fastrak", "sunpass"],
  utilities: ["electric", "water", "gas bill", "internet", "phone", "utility", "power", "comcast", "verizon", "att", "t-mobile", "spectrum"],
  office: ["office", "staples", "depot", "supplies", "paper", "ink", "toner", "amazon"],
  insurance: ["insurance", "state farm", "geico", "allstate", "progressive", "liberty mutual", "usaa", "nationwide"],
  registration: ["dmv", "registration", "license", "tag", "title", "inspection", "dot", "permit"],
  other: [],
};

function autoCategorizeFallback(vendor: string): ExpenseCategory {
  const lower = vendor.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category as ExpenseCategory;
    }
  }
  return "other";
}

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  try {
    const formData = await request.formData();
    const file = formData.get("receipt") as File | null;
    const base64Direct = formData.get("base64") as string | null;

    let imageBase64: string;
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      imageBase64 = buffer.toString("base64");
      const mime = file.type as typeof mediaType;
      mediaType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mime)
        ? mime
        : "image/jpeg";
    } else if (base64Direct) {
      // Accept raw base64 with optional data URI prefix
      const match = base64Direct.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mediaType = match[1] as typeof mediaType;
        imageBase64 = match[2];
      } else {
        mediaType = "image/jpeg";
        imageBase64 = base64Direct;
      }
    } else {
      return error("No receipt image provided. Send as 'receipt' file or 'base64' field.");
    }

    // Upload to Supabase Storage
    let receiptUrl: string | null = null;
    const fileName = `${ctx.operatorId}/${Date.now()}.jpg`;
    const { data: uploadData } = await ctx.supabase.storage
      .from("receipts")
      .upload(fileName, Buffer.from(imageBase64, "base64"), {
        contentType: mediaType,
        upsert: false,
      });

    if (uploadData?.path) {
      const { data: urlData } = ctx.supabase.storage
        .from("receipts")
        .getPublicUrl(uploadData.path);
      receiptUrl = urlData?.publicUrl || null;
    }

    // Send to Claude Vision for OCR
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `You are an OCR assistant for a dumpster rental business. Extract the following from this receipt image and return ONLY valid JSON (no markdown, no code fences):

{
  "vendor": "Store/business name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "line_items": [{"description": "item", "amount": 0.00}],
  "category": "one of: fuel, repair, wages, tolls, utilities, office, insurance, registration, other",
  "confidence": 0.0 to 1.0
}

Category rules:
- Gas stations, fuel purchases → "fuel"
- Auto parts, mechanics, tire shops → "repair"
- Toll receipts, bridge/tunnel → "tolls"
- Electric/water/phone bills → "utilities"
- Office supplies → "office"
- Insurance documents → "insurance"
- DMV, registration, permits → "registration"
- If unsure → "other"

If you can't read a field, use null. For amount, extract the total/grand total. For date, use the transaction date on the receipt.`,
            },
          ],
        },
      ],
    });

    // Parse the response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: {
      vendor: string | null;
      amount: number | null;
      date: string | null;
      line_items: { description: string; amount: number }[] | null;
      category: string | null;
      confidence: number | null;
    };

    try {
      // Strip any markdown code fences if present
      const cleaned = responseText.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, try to extract fields
      parsed = {
        vendor: null,
        amount: null,
        date: null,
        line_items: null,
        category: null,
        confidence: null,
      };
    }

    // Validate and apply category
    const validCategories = [
      "fuel", "repair", "wages", "tolls", "utilities",
      "office", "insurance", "registration", "other",
    ];
    let category: ExpenseCategory = "other";
    if (parsed.category && validCategories.includes(parsed.category)) {
      category = parsed.category as ExpenseCategory;
    } else if (parsed.vendor) {
      category = autoCategorizeFallback(parsed.vendor);
    }

    const taxBucket = CATEGORY_TAX_BUCKET[category];

    return json({
      vendor: parsed.vendor,
      amount: parsed.amount,
      date: parsed.date,
      line_items: parsed.line_items,
      category,
      tax_bucket: taxBucket,
      confidence: parsed.confidence,
      receipt_url: receiptUrl,
      ocr_raw: {
        model: "claude-sonnet-4-20250514",
        response: parsed,
        raw_text: responseText,
      },
    });
  } catch (err: unknown) {
    console.error("Receipt OCR error:", err);
    const message = err instanceof Error ? err.message : "OCR processing failed";
    return error(message, 500);
  }
}
