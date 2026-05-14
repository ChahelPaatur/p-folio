/* ============================================================
   Portfolio UI Kit · Primitives
   Small reusable atoms: Eyebrow, BlockHeader, StatusPill,
   RoleChip, TagChip, Button, ArrowGlyph, DotMark, CornerBrackets,
   LogoChip. All match the live portfolio's CSS classes so they
   compose cleanly with styles.css.
   ============================================================ */
const _p = React;

/* DotMark — the 45° square that is the brand's primitive */
function DotMark({ size = 6, accent = false }) {
  return (
    <span style={{
      display: "inline-block",
      width: size, height: size,
      background: accent ? "var(--accent)" : "var(--text)",
      transform: "rotate(45deg)"
    }} />
  );
}

/* ArrowGlyph — the hand-rolled up-right arrow used in CTAs */
function ArrowGlyph({ size = 14, stroke = 1.5 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke}>
      <path d="M5 11 L11 5 M6 5 H11 V10" />
    </svg>
  );
}

/* DownloadGlyph */
function DownloadGlyph({ size = 14 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2 V11 M4 7 L8 11 L12 7 M3 14 H13" />
    </svg>
  );
}

/* Eyebrow — accent bar + mono caps. Above headings + chips. */
function Eyebrow({ children, accent = false, mono = true, bar = true }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 12,
    fontFamily: mono ? "var(--font-mono, 'Geist Mono', monospace)" : "var(--font-sans)",
    fontSize: mono ? 11 : 11.5,
    color: accent ? "var(--accent)" : "var(--text-mute)",
    letterSpacing: accent ? "0.16em" : "0.12em",
    textTransform: "uppercase"
  };
  return (
    <div style={base}>
      {bar && <span style={{ width: accent ? 18 : 28, height: 1, background: "var(--accent)" }} />}
      {children}
    </div>
  );
}

/* BlockHeader — the 1fr/2fr section header used between every section */
function BlockHeader({ tag, title }) {
  return (
    <div className="block-head reveal">
      <div className="block-tag mono">{tag}</div>
      <h2 className="block-title">{title}</h2>
    </div>
  );
}

/* StatusPill — mono caps pill with status dot. kind: 'live' | 'r' | undefined */
function StatusPill({ kind, children }) {
  return <span className={`status ${kind || ""}`}>{children}</span>;
}

/* RoleChip — sans pill for hero role strip */
function RoleChip({ accent = false, children }) {
  return <span className={`chip ${accent ? "accent" : ""}`}>{children}</span>;
}

/* TagChip — small mono uppercase tag used in project / role lists */
function TagChip({ children }) {
  return <span className="mono">{children}</span>;
}

/* Button — pill button. variant: 'primary' | 'ghost' */
function Button({ variant = "ghost", href, onClick, target, children, glyph = "arrow" }) {
  const cls = `btn ${variant === "primary" ? "btn-primary" : "btn-ghost"}`;
  const G = glyph === "download" ? DownloadGlyph : ArrowGlyph;
  const inner = (<>{children}<G /></>);
  if (href) return <a className={cls} href={href} target={target} rel={target ? "noreferrer" : undefined}>{inner}</a>;
  return <button className={cls} onClick={onClick}>{inner}</button>;
}

/* CornerBrackets — four 14px L-shapes; absolute inside a position: relative parent */
function CornerBrackets({ accent = true, inset = 12, size = 14 }) {
  const base = {
    position: "absolute",
    width: size, height: size,
    border: `1px solid ${accent ? "var(--accent)" : "var(--text)"}`,
    zIndex: 4
  };
  return (
    <>
      <span style={{ ...base, top: inset, left: inset, borderRight: 0, borderBottom: 0 }} />
      <span style={{ ...base, top: inset, right: inset, borderLeft: 0, borderBottom: 0 }} />
      <span style={{ ...base, bottom: inset, left: inset, borderRight: 0, borderTop: 0 }} />
      <span style={{ ...base, bottom: inset, right: inset, borderLeft: 0, borderTop: 0 }} />
    </>
  );
}

/* LogoChip — bordered square with a logo or mono mark inside */
function LogoChip({ src, alt, mono, size = 52, crestClass = "" }) {
  const style = { width: size, height: size };
  return (
    <div className={`crest ${crestClass}`} style={style}>
      {src ? <img src={src} alt={alt} /> : <span className="mono">{mono}</span>}
    </div>
  );
}

/* ArrowRight — research-row glyph */
function ArrowRight({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M6 16 L16 6 M8 6 H16 V14" />
    </svg>
  );
}

Object.assign(window, {
  DotMark, ArrowGlyph, ArrowRight, DownloadGlyph,
  Eyebrow, BlockHeader,
  StatusPill, RoleChip, TagChip,
  Button, CornerBrackets, LogoChip
});
