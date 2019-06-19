export function timeToString(milliseconds: number): string {
  const t = new Date(null);
  t.setSeconds(milliseconds / 1000.0);
  return t.toISOString().substr(11, 8);
}
