/** Server-side input parsing, independent of the UI's convenience validation. */
export function textField(data: FormData, name: string, max = 240, min = 0) {
  const raw = data.get(name);
  if (typeof raw !== "string" && raw !== null) throw new Error(`Invalid ${name.replaceAll("_", " ")}.`);
  const value = (raw ?? "").trim();
  if (value.length < min || value.length > max) throw new Error(`Check ${name.replaceAll("_", " ")} (${min}–${max} characters).`);
  return value;
}
export function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid record identifier.");
  return value;
}
export function optionalUuid(value: string) { return value && value !== "__unset" ? uuid(value) : null; }
export function dateField(data: FormData, name: string, required = false) {
  const value = textField(data, name, 10);
  if (!value && !required) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`Enter a valid ${name.replaceAll("_", " ")} date.`);
  }
  return value;
}
export function emailField(data: FormData) {
  const value = textField(data, "email", 320);
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid email address.");
  return value;
}
export function urlField(data: FormData, name: string, httpsOnly = false) {
  const value = textField(data, name, 2048);
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((httpsOnly ? url.protocol !== "https:" : !["https:", "http:"].includes(url.protocol)) || url.username || url.password) throw new Error();
  } catch { throw new Error(`Enter a valid ${httpsOnly ? "HTTPS" : "HTTP or HTTPS"} link.`); }
  return value;
}
