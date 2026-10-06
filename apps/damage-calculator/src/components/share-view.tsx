
import { useEffect, useId, useRef, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { BIOME_NAME } from "@/data/biomes";
import { arrows, bolts, CLASS_LABELS, targets } from "@/lib/data";
import { buildViewUrl, type ViewState } from "@/lib/view-url";
import { cn } from "@/lib/utils";

const TARGET_NAME = new Map(targets.map((t) => [t.slug, t.name] as const));
const AMMO_NAME = new Map(
  [...arrows, ...bolts].map((a) => [a.slug, a.name] as const),
);

/** Copy text, falling back to a hidden textarea when the async Clipboard API
 *  is unavailable (an insecure origin, or an older browser). */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Handled by the fallback below. */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Share button with a copy-the-link popup.
 *
 * The URL is built when the popup opens rather than during render: it needs
 * window.location, which does not exist in the static prerender.
 */
export function ShareViewButton({
  view,
  className,
}: {
  view: ViewState;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  const toggle = () => {
    setCopied(false);
    setUrl((current) => (open ? current : buildViewUrl(view)));
    setOpen((wasOpen) => !wasOpen);
  };

  /* Close on Escape or a click outside, like every other transient popup. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  /* Selecting the text on open makes the manual copy path obvious when the
   * clipboard API is blocked, and it is the fastest way to retry. */
  useEffect(() => {
    if (open) inputRef.current?.select();
  }, [open]);

  /* Drop the "Copied" badge after a moment so a re-copy is visible. */
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    const ok = await writeClipboard(url);
    if (ok) setCopied(true);
    inputRef.current?.select();
  };

  const summary = [
    BIOME_NAME[view.biome],
    TARGET_NAME.get(view.target) ?? view.target,
    view.cls === "all" ? "All classes" : CLASS_LABELS[view.cls],
  ].join(" · ");

  /* The settings that decide the numbers, spelled out so it is obvious what a
   * link is about to reproduce. Only the non-default ones are worth naming. */
  const settings = [
    `★${view.level}`,
    `skill ${view.skill}${view.roll === "avg" ? "" : ` (${view.roll} roll)`}`,
    view.attack === "secondary" ? "secondary attack" : null,
    view.backstab ? "unalerted enemy" : null,
    ...[view.arrow, view.bolt]
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => AMMO_NAME.get(slug) ?? slug),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Share2 className="size-3.5" />
        Share
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Copy a link to this view"
          className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border bg-popover p-3 text-popover-foreground shadow-md"
        >
          <p className="text-xs font-medium">Copy a link to this view</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {summary}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {settings}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={inputRef}
              readOnly
              value={url}
              aria-label="Link to this view"
              onFocus={(event) => event.currentTarget.select()}
              className="h-8 w-full min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <button
              type="button"
              onClick={copy}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                copied
                  ? "bg-primary/15 text-primary"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Link2 className="size-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            The link carries the whole view — biome, target, weapon and class
            filter plus the upgrade level, skill, attack, enemy state and
            ammo — so it opens on exactly these numbers.
          </p>
        </div>
      ) : null}
    </div>
  );
}
