/**
 * Client-side UUID v4 for waste-entry idempotency keys. These are collision-avoidance ids for
 * offline replays, not secrets, so Math.random is sufficient — do not reuse this for tokens.
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
