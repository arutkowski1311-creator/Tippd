import { CPICategory } from "@/types";
import { CPI_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Zap,
  Brain,
  Stethoscope,
  Shield,
  Settings,
} from "lucide-react";

const iconMap = {
  Zap,
  Brain,
  Stethoscope,
  Shield,
  Settings,
};

interface CategoryBadgeProps {
  category: CPICategory;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function CategoryBadge({
  category,
  size = "md",
  showLabel = true,
}: CategoryBadgeProps) {
  const cat = CPI_CATEGORIES[category];
  const Icon = iconMap[cat.icon as keyof typeof iconMap];

  const sizes = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        sizes[size]
      )}
      style={{
        backgroundColor: `${cat.color}15`,
        color: cat.color,
      }}
    >
      <Icon size={iconSizes[size]} />
      {showLabel && cat.label}
    </span>
  );
}
