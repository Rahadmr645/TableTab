/** Shared Gmail validation for public subscription flows (server). */

export function getGmailFieldError(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "Enter your Gmail address.";
  if (/\s/.test(s)) return "Remove spaces from the email.";
  const lower = s.toLowerCase();
  const parts = lower.split("@");
  if (parts.length !== 2) return "Use exactly one @.";
  const [local, domain] = parts;
  if (!local || !domain) return "Invalid email.";
  if (domain !== "gmail.com" && domain !== "googlemail.com") {
    return "Only @gmail.com or @googlemail.com is allowed.";
  }
  if (local.length > 64) return "Local part too long.";
  const localOk =
    /^[a-z0-9]$/.test(local) ||
    /^[a-z0-9][a-z0-9._+-]*[a-z0-9]$/.test(local);
  if (!localOk) return "Invalid characters before @.";
  return "";
}
