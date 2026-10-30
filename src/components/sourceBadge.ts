export function sourceTypeBadgeClass(sourceType: string): string {
  if (sourceType === "official") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }
  if (sourceType === "news") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
  return "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";
}
