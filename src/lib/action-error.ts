/**
 * Extracts a user-readable message from a server action error.
 *
 * In production, Next.js strips error messages from server actions.
 * We prefix our intentional errors with "APP_ERROR:" so the client
 * can recover the original message even in production.
 */
export function getActionError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(err instanceof Error)) return fallback;
  if (err.message.startsWith("APP_ERROR:")) {
    return err.message.slice("APP_ERROR:".length);
  }
  // In production, Next.js replaces the message with a digest string.
  // If we see that, return the fallback.
  if (err.message.includes("digest") || err.message.includes("Server Components")) {
    return fallback;
  }
  return err.message || fallback;
}
