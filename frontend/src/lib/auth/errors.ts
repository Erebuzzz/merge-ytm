export function getAuthErrorMessage(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : null;

  if (!rawMessage) {
    return "Authentication request failed. Please try again.";
  }

  if (rawMessage.toLowerCase().includes("invalid origin")) {
    if (typeof window !== "undefined") {
      return `Authentication is blocked for ${window.location.origin}. Add this URL to Neon Auth trusted origins.`;
    }

    return "Authentication is blocked because this app origin is not trusted by Neon Auth.";
  }

  return rawMessage;
}
