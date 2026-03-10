export function generateString(length?: number) {
  const size = length || 16;
  // Keep generated IDs URL-safe because they are embedded in public asset URLs.
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint32Array(size);
  globalThis.crypto.getRandomValues(randomValues);

  let result = "";
  for (let i = 0; i < size; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }

  return result;
}
