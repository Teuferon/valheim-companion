
import { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Item art is downloaded once by the scraper into `public/items/` and served
 * from there, so the app needs no network at runtime. A plain <img> is used on
 * purpose: no image optimiser, no outbound requests. `src` can be empty (a few
 * pages carry no artwork at all), in which case a placeholder is drawn instead.
 */

/** The datasets store public paths as `/items/…`, written for a domain-root
 *  deployment; resolve them against this section's Vite base so they also work
 *  under `/damage-calculator/`. */
const resolveSrc = (src: string) =>
  src.startsWith("/") ? `${import.meta.env.BASE_URL}${src.slice(1)}` : src;

export function ItemImage({
  src,
  alt,
  size = 48,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        <ImageOff className="size-1/2" />
      </div>
    );
  }

  return (
    <img
      src={resolveSrc(src)}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Small anchor that opens the item's wiki page in a new tab. */
export function WikiLink({
  href,
  name,
  className,
}: {
  href: string;
  name: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${name} on the Valheim wiki`}
      aria-label={`Open ${name} on the Valheim wiki`}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <ExternalLink className="size-3.5" />
    </a>
  );
}
