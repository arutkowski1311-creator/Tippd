"use client";

import { useEffect, useState } from "react";

export default function QuotePrintPage({ params }: { params: { id: string } }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/quotes/${params.id}/pdf`);
      if (!res.ok) {
        setError("Failed to load quote");
        return;
      }
      const text = await res.text();
      setHtml(text);
    }
    load();
  }, [params.id]);

  useEffect(() => {
    if (html) {
      // Replace the entire document with the print-optimized HTML
      document.open();
      document.write(html);
      document.close();
    }
  }, [html]);

  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!html) return <div className="p-8 text-white">Loading quote...</div>;

  return null;
}
