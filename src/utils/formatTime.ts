/**
 * Format time "HH:mm" (24h) to 12-hour Arabic display: "9:30 ص" / "3:00 م"
 */
export function formatTime12(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  const suffix = h < 12 ? ' ص' : ' م';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${String(m).padStart(2, '0')}${suffix}`;
}

/**
 * Format time range for display: "9:30 ص - 10:00 ص" (12h) or "09:30 - 10:00" (24h)
 */
export function formatTimeRange12(time: string, durationMinutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalM = (h ?? 0) * 60 + (m ?? 0) + (durationMinutes ?? 30);
  const endH = Math.floor(totalM / 60) % 24;
  const endM = totalM % 60;
  const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  return `${formatTime12(time)} - ${formatTime12(end)}`;
}

export function formatTime24(time: string): string {
  return time;
}

export function formatTimeRange24(time: string, durationMinutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalM = (h ?? 0) * 60 + (m ?? 0) + (durationMinutes ?? 30);
  const endH = Math.floor(totalM / 60) % 24;
  const endM = totalM % 60;
  const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  return `${time} - ${end}`;
}
