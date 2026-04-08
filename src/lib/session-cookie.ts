export function shouldUseSecureCookies(appUrl: string, nodeEnv: string | undefined) {
  return nodeEnv === "production" && appUrl.startsWith("https://");
}
