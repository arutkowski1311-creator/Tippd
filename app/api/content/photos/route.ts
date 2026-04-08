import { getAuthContext, json, error } from "@/lib/api-helpers";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
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
}

interface PexelsResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  if (!PEXELS_API_KEY) {
    return error("Pexels API key not configured", 500);
  }

  const body = await request.json();
  const { queries, orientation, size } = body as {
    queries: string[];
    orientation?: "landscape" | "portrait" | "square";
    size?: "large" | "medium" | "small";
  };

  if (!queries || !Array.isArray(queries) || queries.length === 0) {
    return error("queries array is required");
  }

  try {
    // Fetch photos for each query in parallel
    const results = await Promise.all(
      queries.slice(0, 3).map(async (query: string) => {
        const params = new URLSearchParams({
          query,
          per_page: "4",
          ...(orientation && { orientation }),
          ...(size && { size }),
        });

        const res = await fetch(
          `https://api.pexels.com/v1/search?${params.toString()}`,
          {
            headers: { Authorization: PEXELS_API_KEY },
          }
        );

        if (!res.ok) {
          return { query, photos: [] };
        }

        const data: PexelsResponse = await res.json();
        return {
          query,
          photos: data.photos.map((p) => ({
            id: p.id,
            src: p.src,
            alt: p.alt,
            photographer: p.photographer,
            width: p.width,
            height: p.height,
          })),
        };
      })
    );

    // Flatten and dedupe by photo ID, take top results
    const seen = new Set<number>();
    const allPhotos: Array<{
      id: number;
      src: PexelsPhoto["src"];
      alt: string;
      photographer: string;
      width: number;
      height: number;
      query: string;
    }> = [];

    for (const result of results) {
      for (const photo of result.photos) {
        if (!seen.has(photo.id)) {
          seen.add(photo.id);
          allPhotos.push({ ...photo, query: result.query });
        }
      }
    }

    return json({
      photos: allPhotos.slice(0, 9),
      queries: queries.slice(0, 3),
    });
  } catch (err) {
    return error(
      `Photo search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      500
    );
  }
}
