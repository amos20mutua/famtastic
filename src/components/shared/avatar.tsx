import { cn } from "@/lib/cn";
import type { UserProfile } from "@/data/types";

export function Avatar({
  member,
  size = "md"
}: {
  member: UserProfile;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base"
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white shadow-[0_12px_26px_-18px_rgba(31,61,43,0.26)]",
        sizes[size]
      )}
      style={{ backgroundColor: member.avatarTone }}
    >
      {member.shortName}
    </div>
  );
}
