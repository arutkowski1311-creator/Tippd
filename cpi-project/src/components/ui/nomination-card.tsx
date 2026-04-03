import { Nomination } from "@/types";
import { CategoryBadge } from "./category-badge";
import { StatusBadge } from "./status-badge";
import { formatDate } from "@/lib/utils";

interface NominationCardProps {
  nomination: Nomination;
  showNominator?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}

export function NominationCard({
  nomination,
  showNominator = true,
  onAction,
  actionLabel,
}: NominationCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {nomination.nominee?.full_name || "Unknown"}
            </h3>
            {nomination.nominee?.title && (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                {nomination.nominee.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <CategoryBadge category={nomination.category} size="sm" />
            <StatusBadge status={nomination.status} />
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">
            {nomination.ai_text || nomination.raw_text}
          </p>

          <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
            <span>{formatDate(nomination.created_at)}</span>
            {showNominator && !nomination.is_anonymous && nomination.nominator && (
              <span>by {nomination.nominator.full_name}</span>
            )}
            {nomination.is_anonymous && <span>Anonymous</span>}
            {nomination.reviews && nomination.reviews.length > 0 && (
              <span>{nomination.reviews.length} review(s)</span>
            )}
          </div>
        </div>

        {onAction && (
          <button
            onClick={onAction}
            className="shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {actionLabel || "Review"}
          </button>
        )}
      </div>
    </div>
  );
}
