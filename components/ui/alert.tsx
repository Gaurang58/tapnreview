import { cn } from "@/lib/utils";

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border hairline bg-panel",
    error: "border border-danger/40 bg-danger/5 text-danger",
    success: "border border-nfc/40 bg-nfc/5 text-nfc",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md px-3 py-2 text-sm", styles, className)}>
      {children}
    </div>
  );
}
