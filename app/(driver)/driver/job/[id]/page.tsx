"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Phone,
  Scale,
  AlertTriangle,
  Check,
  Navigation,
  Loader2,
  X,
  ChevronRight,
  RotateCcw,
  Box,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ConditionGrade } from "@/types/dumpster";

// ─── Types ───

type StopPhase =
  | "loading"
  | "en_route"
  | "arrived"
  | "at_customer"
  | "grading"
  | "audible_check"
  | "complete"
  | "dump_en_route"
  | "dump_arrived"
  | "dump_complete";

interface SegmentData {
  id: string;
  type: "drop" | "pickup" | "dump" | "yard_depart" | "yard_return" | "lunch" | "reposition";
  job_id?: string;
  customer_name?: string;
  to_address?: string;
  to_lat?: number;
  to_lng?: number;
  box_id?: string;
  box_size?: string;
  box_condition?: string;
  box_reused?: boolean;
  label: string;
  status: string;
  arrived_at?: string;
  completed_at?: string;
  planned_drive_minutes?: number;
  planned_stop_minutes?: number;
  planned_total_minutes?: number;
  planned_drive_miles?: number;
  decision?: string;
  decision_reason?: string;
  notes?: string;
  photos?: string[];
  weight_lbs?: number;
  condition_grade?: string;
  // We also get job details
  job?: {
    customer_name: string;
    customer_phone: string;
    drop_address: string;
    job_type: string;
    dumpster_unit_number?: string;
  };
  // Next segment info for audible decisions
  next_segment?: {
    id: string;
    type: string;
    customer_name?: string;
    box_size?: string;
    job_type?: string;
  };
}

// ─── Component ───

export default function DriverJobPage() {
  const router = useRouter();
  const params = useParams();
  const segmentId = params.id as string;

  const [segment, setSegment] = useState<SegmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<StopPhase>("loading");
  const [photos, setPhotos] = useState<string[]>([]);
  const [weight, setWeight] = useState("");
  const [weightOverageInfo, setWeightOverageInfo] = useState<{
    is_over: boolean;
    overage_lbs: number;
    overage_tons: number;
    overage_charge: number;
    included_lbs: number;
    message: string;
  } | null>(null);
  const [condition, setCondition] = useState<ConditionGrade | "">("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Pull from service state
  const [pullStep, setPullStep] = useState(0); // 0=hidden, 1=flag, 2=confirm, 3=note
  const [pullNote, setPullNote] = useState("");

  // Audible state
  const [showAudible, setShowAudible] = useState(false);
  const [audibleReason, setAudibleReason] = useState("");

  // Grade warnings
  const [gradeWarning, setGradeWarning] = useState<string | null>(null);

  const gpsRef = useRef<number | null>(null);
  const lastGpsUpdate = useRef<number>(0);

  // ─── Load segment data ───
  const loadSegment = useCallback(async () => {
    try {
      // Load from the route API and find this segment
      const res = await fetch("/api/driver/route");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/driver/login");
          return;
        }
        throw new Error("Failed to load");
      }
      const data = await res.json();
      const segs = data.segments || [];
      const seg = segs.find((s: any) => s.id === segmentId);

      if (!seg) {
        router.push("/driver");
        return;
      }

      // Find next segment
      const idx = segs.findIndex((s: any) => s.id === segmentId);
      const nextSeg = idx >= 0 && idx < segs.length - 1 ? segs[idx + 1] : null;

      setSegment({ ...seg, next_segment: nextSeg });

      // Determine initial phase based on status and type
      if (seg.status === "completed") {
        setPhase("complete");
      } else if (seg.arrived_at) {
        if (seg.type === "dump") {
          setPhase("dump_arrived");
        } else {
          setPhase("at_customer");
        }
      } else {
        if (seg.type === "dump") {
          setPhase("dump_en_route");
        } else {
          setPhase("en_route");
        }
      }

      // Restore existing data
      if (seg.photos) setPhotos(seg.photos);
      if (seg.weight_lbs) setWeight(String(seg.weight_lbs));
      if (seg.condition_grade) setCondition(seg.condition_grade as ConditionGrade);
      if (seg.notes) setNotes(seg.notes);
    } catch {
      router.push("/driver");
    } finally {
      setLoading(false);
    }
  }, [segmentId, router]);

  useEffect(() => {
    loadSegment();
  }, [loadSegment]);

  // GPS tracking on this page
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastGpsUpdate.current < 30000) return;
        lastGpsUpdate.current = now;

        fetch("/api/driver/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            status: "at_stop",
            segment_id: segmentId,
          }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    gpsRef.current = watchId;
    return () => {
      if (gpsRef.current !== null) {
        navigator.geolocation.clearWatch(gpsRef.current);
      }
    };
  }, [segmentId]);

  // ─── API actions ───

  async function sendAction(action: string, extra?: Record<string, any>) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/driver/segment/${segmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          photos: photos.length > 0 ? photos : undefined,
          weight: weight ? parseInt(weight) : undefined,
          condition: condition || undefined,
          notes: notes || undefined,
          ...extra,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Action failed:", err);
      return null;
    } finally {
      setProcessing(false);
    }
  }

  async function callAudible() {
    setProcessing(true);
    try {
      const res = await fetch("/api/driver/audible", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment_id: segmentId,
          reason: audibleReason || "Box cannot be reused",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowAudible(false);
        setPhase("complete");
      }
    } catch (err) {
      console.error("Audible failed:", err);
    } finally {
      setProcessing(false);
    }
  }

  // ─── Phase handlers ───

  async function handleArrived() {
    const result = await sendAction("arrived");
    if (result?.ok) {
      if (segment?.type === "dump") {
        setPhase("dump_arrived");
      } else {
        setPhase("at_customer");
      }
    }
  }

  async function handleDropped() {
    const result = await sendAction("dropped");
    if (result?.ok) {
      setPhase("complete");
    }
  }

  async function handlePickedUp() {
    const result = await sendAction("picked_up");
    if (result?.ok) {
      setPhase("grading");
    }
  }

  function handleGradeSelected(grade: ConditionGrade) {
    setCondition(grade);
    setGradeWarning(null);

    if (grade === "F") {
      // Jump to pull from service flow
      setPullStep(1);
      return;
    }

    if (grade === "D") {
      setGradeWarning("Grade D -- suitable for next job?");
      return;
    }

    if (grade === "C") {
      const nextType = segment?.next_segment?.job_type;
      if (nextType === "residential") {
        setGradeWarning("Grade C -- OK for residential?");
        return;
      }
    }

    // A or B -- proceed to audible check
    proceedToAudibleCheck();
  }

  function confirmGradeAndProceed() {
    setGradeWarning(null);
    proceedToAudibleCheck();
  }

  function proceedToAudibleCheck() {
    // If box is supposed to be reused, ask the audible question
    if (segment?.box_reused || segment?.next_segment?.type === "drop") {
      setPhase("audible_check");
    } else {
      // No reuse expected, auto-advance
      setPhase("complete");
    }
  }

  async function handleDumpArrived() {
    const result = await sendAction("dump_arrived");
    if (result?.ok) {
      setPhase("dump_arrived");
    }
  }

  async function handleDumpComplete() {
    // Record weight at dump before completing
    if (weight && segment?.job_id) {
      try {
        const weightRes = await fetch("/api/driver/dump-weight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: segment.job_id,
            weight_lbs: parseInt(weight),
          }),
        });
        const weightData = await weightRes.json();
        if (weightData.is_over) {
          setWeightOverageInfo(weightData);
        }
      } catch {
        // Non-fatal — continue with dump complete
      }
    }
    const result = await sendAction("dump_complete");
    if (result?.ok) {
      setPhase("complete");
    }
  }

  async function handlePullFromService() {
    if (pullStep < 3) {
      setPullStep(pullStep + 1);
      return;
    }
    // Step 3: submit with note
    if (!pullNote.trim()) return;
    const result = await sendAction("pull_from_service", { notes: pullNote });
    if (result?.ok) {
      setPullStep(0);
      setPhase("complete");
    }
  }

  function handleAudibleYes() {
    // Box can be reused, continue as planned
    setPhase("complete");
  }

  function handleAudibleNo() {
    // Box can't be reused -- call audible
    setShowAudible(true);
  }

  function goToNextSegment() {
    if (segment?.next_segment) {
      router.push(`/driver/job/${segment.next_segment.id}`);
    } else {
      router.push("/driver");
    }
  }

  // ─── Google Maps navigation URL ───
  function navUrl(): string {
    if (segment?.to_lat && segment?.to_lng) {
      return `https://maps.google.com/?daddr=${segment.to_lat},${segment.to_lng}&travelmode=driving`;
    }
    if (segment?.to_address) {
      return `https://maps.google.com/?daddr=${encodeURIComponent(segment.to_address)}&travelmode=driving`;
    }
    return "#";
  }

  // ─── Render ───

  if (loading || !segment) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-tippd-blue" />
      </div>
    );
  }

  const typeBadge = {
    drop: { label: "DROP-OFF", class: "bg-blue-100 text-blue-700" },
    pickup: { label: "PICKUP", class: "bg-amber-100 text-amber-700" },
    dump: { label: "DUMP", class: "bg-red-100 text-red-700" },
    yard_depart: { label: "YARD", class: "bg-emerald-100 text-emerald-700" },
    yard_return: { label: "YARD", class: "bg-emerald-100 text-emerald-700" },
    lunch: { label: "LUNCH", class: "bg-orange-100 text-orange-700" },
    reposition: { label: "REPOSITION", class: "bg-purple-100 text-purple-700" },
  }[segment.type] || { label: segment.type.toUpperCase(), class: "bg-gray-100 text-gray-700" };

  const phaseLabel: Record<StopPhase, string> = {
    loading: "Loading...",
    en_route: `En Route to ${segment.type === "drop" ? "Drop-off" : "Pickup"}`,
    arrived: "Arrived",
    at_customer: segment.type === "drop" ? "At Customer -- Ready to Drop" : "At Customer -- Ready to Pick Up",
    grading: "Grade the Dumpster",
    audible_check: "Can This Box Be Reused?",
    complete: "Segment Complete",
    dump_en_route: "En Route to Dump",
    dump_arrived: "At Dump -- Unloading",
    dump_complete: "Dump Complete",
  };

  const phaseColor: Record<StopPhase, string> = {
    loading: "bg-gray-50 border-gray-200",
    en_route: "bg-blue-50 border-blue-200",
    arrived: "bg-amber-50 border-amber-200",
    at_customer: "bg-amber-50 border-amber-200",
    grading: "bg-purple-50 border-purple-200",
    audible_check: "bg-orange-50 border-orange-200",
    complete: "bg-emerald-50 border-emerald-200",
    dump_en_route: "bg-red-50 border-red-200",
    dump_arrived: "bg-red-50 border-red-200",
    dump_complete: "bg-emerald-50 border-emerald-200",
  };

  return (
    <div className="p-4 pb-56">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/driver"
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", typeBadge.class)}>
              {typeBadge.label}
            </span>
            {segment.box_size && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Box className="w-3 h-3" />
                {segment.box_size}
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {segment.customer_name || segment.label}
          </h1>
          {segment.to_address && (
            <p className="text-sm text-gray-500 truncate">{segment.to_address}</p>
          )}
        </div>
      </div>

      {/* Phase status banner */}
      <div className={cn("rounded-xl p-4 mb-4 text-center border-2", phaseColor[phase])}>
        <p className="text-sm font-semibold text-gray-700">{phaseLabel[phase]}</p>
        {segment.planned_drive_minutes && phase.includes("en_route") ? (
          <p className="text-xs text-gray-500 mt-1">
            ~{Math.round(segment.planned_drive_minutes)} min drive
            {segment.planned_drive_miles ? ` / ${Math.round(segment.planned_drive_miles)} mi` : ""}
          </p>
        ) : null}
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Dumpster</p>
          <p className="text-lg font-bold">{segment.box_size || "--"}</p>
          <p className="text-xs text-gray-500">
            {segment.box_condition ? `Grade ${segment.box_condition}` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Job Type</p>
          <p className="text-lg font-bold capitalize">
            {segment.type === "dump" ? "Dump" : segment.job?.job_type || segment.type}
          </p>
          <p className="text-xs text-gray-500">{segment.label}</p>
        </div>
      </div>

      {/* Navigate button — en_route phases */}
      {(phase === "en_route" || phase === "dump_en_route") && (
        <a
          href={navUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-4 mb-4 bg-blue-600 text-white rounded-xl text-lg font-bold active:opacity-80 shadow-md"
        >
          <Navigation className="w-6 h-6" />
          Navigate
        </a>
      )}

      {/* Contact customer (drop/pickup only) */}
      {segment.job?.customer_phone && (segment.type === "drop" || segment.type === "pickup") && (
        <a
          href={`tel:${segment.job.customer_phone}`}
          className="flex items-center justify-center gap-2 w-full py-3 mb-5 border-2 border-gray-200 rounded-xl text-gray-700 font-medium active:bg-gray-50"
        >
          <Phone className="w-5 h-5" />
          Call Customer
        </a>
      )}

      {/* ────── AT CUSTOMER SECTION ────── */}

      {/* Photo capture */}
      {(phase === "at_customer" || phase === "dump_arrived") && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Photos {segment.type === "drop" ? "(optional)" : "(recommended)"}
          </h2>
          <div className="flex gap-3 flex-wrap">
            {photos.map((_, i) => (
              <div key={i} className="w-20 h-20 rounded-xl bg-emerald-100 flex items-center justify-center relative">
                <Check className="w-6 h-6 text-emerald-600" />
                <button
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setPhotos([...photos, `photo-${Date.now()}`])}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50"
            >
              <Camera className="w-6 h-6" />
              <span className="text-xs mt-1">Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Weight entry (pickup at_customer phase) */}
      {phase === "at_customer" && segment.type === "pickup" && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Estimated Weight</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="w-full h-14 pl-11 pr-4 rounded-xl border-2 border-gray-200 text-2xl font-bold text-center"
                inputMode="numeric"
              />
            </div>
            <div className="flex items-center px-4 bg-gray-100 rounded-xl text-sm font-medium text-gray-600">
              lbs
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {(phase === "at_customer" || phase === "dump_arrived") && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes (optional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Gate code, placement details, damage notes..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none"
          />
        </div>
      )}

      {/* ────── GRADING SECTION (pickup flow) ────── */}

      {phase === "grading" && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-gray-800 mb-3">
            Rate Dumpster Condition
          </h2>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {(["A", "B", "C", "D", "F"] as ConditionGrade[]).map((grade) => (
              <button
                key={grade}
                onClick={() => handleGradeSelected(grade)}
                className={cn(
                  "py-4 rounded-xl text-center font-bold text-xl transition-all active:scale-95",
                  condition === grade
                    ? grade === "A" || grade === "B"
                      ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                      : grade === "C"
                      ? "bg-amber-500 text-white ring-2 ring-amber-300"
                      : grade === "D"
                      ? "bg-orange-500 text-white ring-2 ring-orange-300"
                      : "bg-red-500 text-white ring-2 ring-red-300"
                    : "bg-gray-100 text-gray-600 active:bg-gray-200"
                )}
              >
                {grade}
              </button>
            ))}
          </div>

          {/* Grade warnings */}
          {gradeWarning && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 mb-4">
              <p className="text-sm font-medium text-amber-800 mb-3">{gradeWarning}</p>
              <div className="flex gap-2">
                <button
                  onClick={confirmGradeAndProceed}
                  className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm active:opacity-80"
                >
                  Yes, Proceed
                </button>
                <button
                  onClick={() => {
                    setCondition("");
                    setGradeWarning(null);
                  }}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm active:bg-gray-50"
                >
                  Re-grade
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────── AUDIBLE CHECK (pickup flow) ────── */}

      {phase === "audible_check" && (
        <div className="mb-5">
          <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-5 h-5 text-orange-600" />
              <h2 className="text-base font-bold text-gray-800">
                Can this box be reused for the next stop?
              </h2>
            </div>

            {segment.next_segment && (
              <div className="rounded-lg bg-white border border-orange-200 p-3 mb-4">
                <p className="text-xs text-gray-500 mb-0.5">Next stop:</p>
                <p className="font-semibold text-sm">
                  {segment.next_segment.customer_name || "Next customer"}
                </p>
                <p className="text-xs text-gray-500">
                  {segment.next_segment.box_size || segment.box_size} --{" "}
                  {segment.next_segment.job_type || ""}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAudibleYes}
                className="py-5 bg-emerald-500 text-white rounded-xl text-lg font-bold active:opacity-80 shadow-md"
              >
                YES
                <span className="block text-xs font-normal mt-0.5 opacity-80">Reuse box</span>
              </button>
              <button
                onClick={handleAudibleNo}
                className="py-5 bg-red-500 text-white rounded-xl text-lg font-bold active:opacity-80 shadow-md"
              >
                NO
                <span className="block text-xs font-normal mt-0.5 opacity-80">Can&apos;t reuse</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────── AUDIBLE REASON DIALOG ────── */}

      {showAudible && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-center mb-2">Box Can&apos;t Be Reused</h2>
            <p className="text-sm text-gray-500 text-center mb-4">
              The system will reroute you to the yard for a replacement box.
            </p>
            <textarea
              value={audibleReason}
              onChange={(e) => setAudibleReason(e.target.value)}
              placeholder="Reason (optional): damage, wrong size, contaminated..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none mb-4"
            />
            <div className="space-y-2">
              <button
                onClick={callAudible}
                disabled={processing}
                className="w-full py-4 bg-red-600 text-white rounded-xl text-lg font-bold active:opacity-80 disabled:opacity-50"
              >
                {processing ? "Rerouting..." : "Confirm Audible"}
              </button>
              <button
                onClick={() => setShowAudible(false)}
                className="w-full py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────── PULL FROM SERVICE FLOW ────── */}

      {pullStep > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
            {pullStep === 1 && (
              <>
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-center mb-2">Pull From Service?</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                  This will mark the dumpster as Grade F and remove it from all scheduling.
                </p>
                <button
                  onClick={() => setPullStep(2)}
                  className="w-full py-4 bg-red-600 text-white rounded-xl text-lg font-bold active:opacity-80 mb-2"
                >
                  Yes, Pull It
                </button>
                <button
                  onClick={() => setPullStep(0)}
                  className="w-full py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
              </>
            )}

            {pullStep === 2 && (
              <>
                <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-bold text-center mb-2">Are You Sure?</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                  This action cannot be easily undone. The dumpster will be flagged Grade F and sent for repair.
                </p>
                <button
                  onClick={() => setPullStep(3)}
                  className="w-full py-4 bg-red-700 text-white rounded-xl text-lg font-bold active:opacity-80 mb-2"
                >
                  Confirm Pull From Service
                </button>
                <button
                  onClick={() => setPullStep(0)}
                  className="w-full py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
              </>
            )}

            {pullStep === 3 && (
              <>
                <h2 className="text-lg font-bold text-center mb-2">Add Required Note</h2>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Describe why this dumpster is being pulled from service.
                </p>
                <textarea
                  value={pullNote}
                  onChange={(e) => setPullNote(e.target.value)}
                  placeholder="Describe the damage or issue..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none mb-4"
                  autoFocus
                />
                <button
                  onClick={handlePullFromService}
                  disabled={!pullNote.trim() || processing}
                  className="w-full py-4 bg-red-700 text-white rounded-xl text-lg font-bold active:opacity-80 disabled:opacity-40 mb-2"
                >
                  {processing ? "Submitting..." : "Submit & Pull"}
                </button>
                <button
                  onClick={() => setPullStep(0)}
                  className="w-full py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ────── MAIN ACTION BUTTONS (fixed at bottom) ────── */}

      <div className="fixed bottom-20 left-4 right-4 space-y-2 z-20">
        {/* EN ROUTE → ARRIVED */}
        {(phase === "en_route" || phase === "dump_en_route") && (
          <button
            onClick={phase === "dump_en_route" ? handleDumpArrived : handleArrived}
            disabled={processing}
            className="w-full py-5 bg-tippd-blue text-white rounded-2xl text-xl font-bold active:opacity-80 shadow-lg disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : phase === "dump_en_route" ? (
              "ARRIVED AT DUMP"
            ) : (
              "ARRIVED"
            )}
          </button>
        )}

        {/* AT CUSTOMER → DROP/PICKUP */}
        {phase === "at_customer" && segment.type === "drop" && (
          <button
            onClick={handleDropped}
            disabled={processing}
            className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-xl font-bold active:opacity-80 shadow-lg disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "DROPPED"}
          </button>
        )}

        {phase === "at_customer" && segment.type === "pickup" && (
          <button
            onClick={handlePickedUp}
            disabled={processing}
            className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-xl font-bold active:opacity-80 shadow-lg disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "PICKED UP"}
          </button>
        )}

        {/* DUMP ARRIVED → Enter weight → DUMP COMPLETE */}
        {phase === "dump_arrived" && (
          <div className="space-y-3">
            {/* Weight entry from scale ticket */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Scale Ticket Weight</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Enter weight"
                  className="flex-1 h-14 px-4 rounded-xl border-2 border-gray-200 text-2xl font-bold text-center"
                  inputMode="numeric"
                />
                <div className="flex items-center px-4 bg-gray-100 rounded-xl text-sm font-medium text-gray-600">
                  lbs
                </div>
              </div>
              {weight && parseInt(weight) > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {segment?.box_size || "20yd"} includes {
                    segment?.box_size === "10yd" ? "4,000" :
                    segment?.box_size === "30yd" ? "10,000" : "8,000"
                  } lbs
                </p>
              )}
            </div>

            {/* Overage warning */}
            {weightOverageInfo?.is_over && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold text-amber-800">⚠ Weight Overage</p>
                <p className="text-lg font-bold text-amber-900 mt-1">
                  {weightOverageInfo.overage_lbs.toLocaleString()} lbs over ({weightOverageInfo.overage_tons} tons)
                </p>
                <p className="text-sm font-semibold text-red-600 mt-1">
                  Additional charge: ${weightOverageInfo.overage_charge.toFixed(2)}
                </p>
              </div>
            )}

            <button
              onClick={handleDumpComplete}
              disabled={processing || !weight}
              className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-xl font-bold active:opacity-80 shadow-lg disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "DUMP COMPLETE"}
            </button>
            {!weight && (
              <p className="text-xs text-red-500 text-center">Enter the scale ticket weight before completing</p>
            )}
          </div>
        )}

        {/* COMPLETE → NEXT STOP */}
        {phase === "complete" && (
          <button
            onClick={goToNextSegment}
            className="w-full py-5 bg-tippd-blue text-white rounded-2xl text-xl font-bold active:opacity-80 shadow-lg flex items-center justify-center gap-2"
          >
            NEXT STOP
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Pull from service — always visible during active phases */}
        {phase !== "complete" &&
          phase !== "loading" &&
          phase !== "grading" &&
          phase !== "audible_check" &&
          (segment.type === "drop" || segment.type === "pickup") && (
            <button
              onClick={() => setPullStep(1)}
              className="w-full py-3 border-2 border-red-200 text-red-600 rounded-2xl text-sm font-semibold active:bg-red-50"
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Pull From Service
            </button>
          )}

        {/* Audible button — always visible during pickup phases */}
        {segment.type === "pickup" &&
          phase === "at_customer" && (
            <button
              onClick={() => setShowAudible(true)}
              className="w-full py-3 border-2 border-orange-200 text-orange-600 rounded-2xl text-sm font-semibold active:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4 inline mr-2" />
              Box Can&apos;t Be Reused
            </button>
          )}
      </div>
    </div>
  );
}
