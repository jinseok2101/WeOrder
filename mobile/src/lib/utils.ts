// cn()은 NativeWind에서는 불필요하지만, 웹과 호환성을 위해 유지합니다.
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

export function formatRelativeTime(dateStr: string | Date): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return "마감됨";

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days + "일 후 마감";
  if (hours > 0) return hours + "시간 후 마감";
  if (minutes > 0) return minutes + "분 후 마감";
  return "곧 마감";
}

export function formatTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
