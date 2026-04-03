import { createServerSupabase } from "@/lib/supabase/server";
import { CPI_CATEGORIES } from "@/lib/constants";
import { CPICategory } from "@/types";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  Calendar,
  Award,
  Fingerprint,
} from "lucide-react";

export default async function VerifyPage({
  params,
}: {
  params: { code: string };
}) {
  const supabase = createServerSupabase();

  const { data: credential } = await supabase
    .from("credentials")
    .select(
      `
      *,
      user:users(*),
      outcome:recognition_outcomes(
        *,
        nomination:nominations(*)
      )
    `
    )
    .eq("unique_code", params.code)
    .single();

  if (!credential) {
    notFound();
  }

  const category = CPI_CATEGORIES[credential.category as CPICategory];
  const isRevoked = credential.revoked_at !== null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Verification Header */}
        <div
          className={`rounded-t-3xl px-6 py-5 text-center ${
            isRevoked
              ? "bg-red-600"
              : "bg-gradient-to-r from-indigo-600 to-purple-600"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {isRevoked ? (
              <Shield className="w-5 h-5 text-white/80" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-white/80" />
            )}
            <span className="text-sm font-medium text-white/80">
              {isRevoked
                ? "Credential Revoked"
                : "Verified CPI Credential"}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">
            Clinical Performance Index
          </h1>
        </div>

        {/* Credential Card */}
        <div className="bg-white rounded-b-3xl shadow-lg p-6 space-y-5">
          {/* Recipient */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              {credential.user?.full_name}
            </h2>
            {credential.user?.title && (
              <p className="text-sm text-gray-500">{credential.user.title}</p>
            )}
          </div>

          {/* Category Badge */}
          <div
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: `${category.color}10` }}
          >
            <p className="text-xs font-medium text-gray-500 mb-1">
              Category
            </p>
            <p
              className="text-lg font-bold"
              style={{ color: category.color }}
            >
              {category.label}
            </p>
            <p className="text-xs text-gray-500 mt-1">{category.description}</p>
          </div>

          {/* Citation */}
          {credential.citation && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Citation
              </p>
              <p className="text-sm text-gray-700 italic">
                &ldquo;{credential.citation}&rdquo;
              </p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Issued</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(credential.issued_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Recognition Level</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {credential.level}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Fingerprint className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Credential ID</p>
                <p className="text-sm font-mono font-medium text-gray-900">
                  {credential.unique_code}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Footer */}
          <div className="border-t border-gray-100 pt-4 text-center">
            <p className="text-xs text-gray-400">
              This credential is verified and stored in the CPI database.
              <br />
              Image alone is not valid — verification requires this URL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
