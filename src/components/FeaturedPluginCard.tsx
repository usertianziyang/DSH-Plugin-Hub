
import type { ResolvedFeaturedPlugin } from "../data/featuredPlugins";
import type { Translate } from "../ui-types";
import { PluginCard } from "./PluginCard";

export interface FeaturedPluginCardProps {
  readonly plugin: ResolvedFeaturedPlugin;
  readonly t: Translate;
}

export function FeaturedPluginCard({ plugin, t }: FeaturedPluginCardProps) {
  /*
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(plugin.installCommand);
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. non-secure context); ignore.
    }
  };

  const footer = (
    <div className="featured-install">
      <span className="featured-version">
        {plugin.version ? `v${plugin.version}` : t("featuredLatest")}
      </span>
      <code className="featured-install-command" title={plugin.installCommand}>{plugin.installCommand}</code>
      <button
        type="button"
        className={`copy-button${copied ? " is-copied" : ""}`}
        onClick={copyCommand}
        aria-label={t(copied ? "copiedLabel" : "copyLabel")}
      >
        {copied ? (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        <span>{t(copied ? "copied" : "copy")}</span>
      </button>
    </div>
  );

  */
  return <PluginCard item={plugin.item} t={t} />;
}
