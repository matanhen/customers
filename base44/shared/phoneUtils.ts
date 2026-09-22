// Shared phone normalization utility.
// All phone numbers in the system are stored in local Israeli format: 05XXXXXXXX.
// This function converts any input format (972..., +972..., 0XX...) to local format.

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.toString().trim().replace(/[\s\-()]/g, '');
  if (!cleaned) return '';
  // Remove leading + if present
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('00972')) cleaned = '0' + cleaned.slice(5);
  // else: already starts with 0 or other format — keep as-is
  return cleaned;
}