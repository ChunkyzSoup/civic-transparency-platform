import Image from "next/image";
import type { Person } from "@/types/domain";
import { cn } from "@/lib/formatting";

const FALLBACK_PHOTO = "/images/placeholders/lawmaker-neutral.svg";

export function LawmakerPhoto({
  person,
  size = 80,
  className
}: {
  person: Person;
  size?: number;
  className?: string;
}) {
  const src = person.photo?.url || FALLBACK_PHOTO;
  const alt = person.photo?.altText || `Portrait for ${person.displayName}`;

  return (
    <div
      className={cn("lawmaker-photo-frame", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="lawmaker-photo"
        unoptimized={src.startsWith("/")}
      />
    </div>
  );
}

