"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Save, Loader2, CheckCircle2, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Operator = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  phone: string;
  email: string;
  address: string;
  service_area_description: string | null;
  tagline: string | null;
};

export default function BrandSettings() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [form, setForm] = useState<Partial<Operator>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("operator_id")
        .eq("id", user.id)
        .single();

      if (!userData?.operator_id) return;

      const { data: op } = await supabase
        .from("operators")
        .select("id, name, slug, logo_url, primary_color, accent_color, phone, email, address, service_area_description, tagline")
        .eq("id", userData.operator_id)
        .single();

      if (op) {
        setOperator(op as Operator);
        setForm(op as Operator);
      }
      setLoading(false);
    }
    load();
  }, []);

  function setField(key: keyof Operator, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Upload failed (${res.status})`);
      }
      // Add cache-busting param so the new logo shows immediately
      const url = data.logo_url + `?t=${Date.now()}`;
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || null,
          primary_color: form.primary_color,
          accent_color: form.accent_color,
          phone: form.phone,
          email: form.email,
          address: form.address,
          service_area_description: form.service_area_description,
          tagline: form.tagline,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-tippd-smoke" />
      </div>
    );
  }

  const logoInitial = (form.name || "?")[0].toUpperCase();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/settings" className="text-tippd-smoke hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Brand Profile</h1>
      </div>

      <div className="max-w-2xl rounded-lg border border-white/10 bg-tippd-charcoal p-6 space-y-6">

        {/* Logo */}
        <div>
          <label className="block text-sm text-tippd-smoke mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-tippd-steel flex items-center justify-center overflow-hidden">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-tippd-blue font-bold text-2xl">{logoInitial}</span>
              )}
            </div>
            <div className="space-y-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-md text-sm text-tippd-smoke hover:text-white disabled:opacity-50"
              >
                {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </button>
              <p className="text-xs text-tippd-ash">PNG or SVG recommended, max 2MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>

        {/* Business Name + Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Business Name</label>
            <input
              value={form.name || ""}
              onChange={(e) => setField("name", e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-sm text-tippd-smoke mb-1">
              URL Slug
              <span className="group relative">
                <HelpCircle className="w-3.5 h-3.5 text-tippd-ash cursor-help" />
                <span className="invisible group-hover:visible absolute left-0 bottom-6 w-64 p-2 rounded-md bg-tippd-ink border border-white/10 text-xs text-tippd-ash z-10 leading-relaxed">
                  A short name for your business used in your public booking URL. For example if your slug is metro-waste your customers visit tippd.com/book/metro-waste to book. Lowercase letters, numbers, and hyphens only.
                </span>
              </span>
            </label>
            <input
              value={form.slug || ""}
              onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="metro-waste"
              className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm font-mono"
            />
            {form.slug && (
              <p className="text-xs text-tippd-ash mt-1">tippd.com/book/{form.slug}</p>
            )}
          </div>
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm text-tippd-smoke mb-1">
            Tagline <span className="text-tippd-ash">(optional)</span>
          </label>
          <input
            value={form.tagline || ""}
            onChange={(e) => setField("tagline", e.target.value)}
            placeholder="Fast, reliable dumpster rental in Central NJ"
            className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
          />
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm text-tippd-smoke mb-2">Brand Colors</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-tippd-ash mb-1">Primary Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.primary_color || "#1B3A6B"}
                  onChange={(e) => setField("primary_color", e.target.value)}
                  className="w-10 h-10 rounded-md cursor-pointer bg-transparent p-0.5 border border-white/10"
                />
                <input
                  value={form.primary_color || "#1B3A6B"}
                  onChange={(e) => setField("primary_color", e.target.value)}
                  className="flex-1 h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm font-mono"
                  maxLength={7}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-tippd-ash mb-1">Accent Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.accent_color || "#6DB33F"}
                  onChange={(e) => setField("accent_color", e.target.value)}
                  className="w-10 h-10 rounded-md cursor-pointer bg-transparent p-0.5 border border-white/10"
                />
                <input
                  value={form.accent_color || "#6DB33F"}
                  onChange={(e) => setField("accent_color", e.target.value)}
                  className="flex-1 h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm font-mono"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Phone</label>
            <input
              value={form.phone || ""}
              onChange={(e) => setField("phone", e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Email</label>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => setField("email", e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm text-tippd-smoke mb-1">Business Address</label>
          <input
            value={form.address || ""}
            onChange={(e) => setField("address", e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
          />
        </div>

        {/* Service Area */}
        <div>
          <label className="block text-sm text-tippd-smoke mb-1">Service Area Description</label>
          <textarea
            value={form.service_area_description || ""}
            onChange={(e) => setField("service_area_description", e.target.value)}
            rows={2}
            placeholder="Serving Union, Essex, and Morris counties in Northern New Jersey"
            className="w-full px-3 py-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm resize-none"
          />
        </div>

        {err && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {err}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </button>

        {operator && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-tippd-ash">
              Operator ID: <span className="font-mono">{operator.id}</span>
              <span className="ml-2 text-tippd-ash/60">
                — set this as your <code className="bg-tippd-steel px-1 rounded">NEXT_PUBLIC_OPERATOR_ID</code> env var in Vercel
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
