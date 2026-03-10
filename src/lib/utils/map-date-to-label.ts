export function mapDateToLabel(isoDate: string): string {
  if (!isoDate) {
    return "";
  }

  const parsedDate = new Date(isoDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const diffMs = Date.now() - parsedDate.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} h ago`;
  }

  return `${Math.floor(diffHours / 24)} d ago`;
}
