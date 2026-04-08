/**
 * Google Cloud Vision — Receipt OCR
 * Blueprint Section 09
 *
 * Extracts text from receipt photos for expense tracking.
 * Requires GOOGLE_VISION_API_KEY environment variable.
 */

interface ParsedReceipt {
  vendor: string | null;
  amount: number | null;
  date: string | null;
  raw_text: string;
}

/**
 * Extract text from a receipt image using Google Cloud Vision API.
 * Accepts a Supabase Storage URL or base64-encoded image.
 */
export async function ocrReceipt(imageUrl: string): Promise<ParsedReceipt> {
  if (!process.env.GOOGLE_VISION_API_KEY) {
    throw new Error("GOOGLE_VISION_API_KEY not configured");
  }

  // Build the Vision API request
  const body: any = {
    requests: [
      {
        image: {} as any,
        features: [{ type: "TEXT_DETECTION" }],
      },
    ],
  };

  if (imageUrl.startsWith("data:")) {
    // Base64 encoded
    body.requests[0].image.content = imageUrl.split(",")[1];
  } else {
    // URL — download first and convert to base64
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    body.requests[0].image.content = Buffer.from(buffer).toString("base64");
  }

  const visionResponse = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!visionResponse.ok) {
    const err = await visionResponse.text();
    throw new Error(`Vision API error: ${err}`);
  }

  const result = await visionResponse.json();
  const rawText =
    result.responses?.[0]?.fullTextAnnotation?.text || "";

  return {
    vendor: extractVendor(rawText),
    amount: extractAmount(rawText),
    date: extractDate(rawText),
    raw_text: rawText,
  };
}

// ─── Parsing Helpers ───

function extractAmount(text: string): number | null {
  // Match dollar amounts like $12.34 or 12.34
  const patterns = [
    /(?:total|amount|due|balance)[:\s]*\$?([\d,]+\.?\d{0,2})/i,
    /\$\s*([\d,]+\.\d{2})/,
    /([\d,]+\.\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ""));
      if (amount > 0 && amount < 100000) return amount;
    }
  }
  return null;
}

function extractDate(text: string): string | null {
  // Match common date formats
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVendor(text: string): string | null {
  // First non-empty line is usually the vendor name
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Skip if it looks like a date or number
    if (/^\d/.test(firstLine) || /^[\$#]/.test(firstLine)) {
      return lines.length > 1 ? lines[1].substring(0, 50) : null;
    }
    return firstLine.substring(0, 50);
  }
  return null;
}
