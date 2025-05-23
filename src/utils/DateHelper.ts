export function formatDateTime(date: Date): { lettericDate: string, numericDate: string } {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1); // Aylar 0-indexli
  const year = date.getFullYear();

  const monthNameTR = date.toLocaleString("tr-TR", { month: "long" });
  const dayNameTR = date.toLocaleString("tr-TR", { weekday: "long" });

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const lettericDate = `${day} ${monthNameTR} ${year}-${dayNameTR}`;
  const numericDate = `${day}.${month}.${year}-${hours}:${minutes}:${seconds}`;

  // 22 Mayıs 2025-Perşembe
  // 22.05.2025-11:54:49
  return { lettericDate, numericDate };
}
