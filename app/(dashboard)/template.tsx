/** Re-mounts on every page change, so each page eases in instead of snapping. */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
