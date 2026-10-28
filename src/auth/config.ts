export interface OidcConfig {
  url: string
  realm: string
  clientId: string
}

export const oidcConfig: OidcConfig | null = (() => {
  const url = import.meta.env.VITE_OIDC_URL
  const realm = import.meta.env.VITE_OIDC_REALM
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID

  if (!url && !realm && !clientId) return null
  if (!url || !realm || !clientId) return null

  return { url: url.replace(/\/$/, ''), realm, clientId }
})()

export const oidcConfigError = (() => {
  const values = [
    import.meta.env.VITE_OIDC_URL,
    import.meta.env.VITE_OIDC_REALM,
    import.meta.env.VITE_OIDC_CLIENT_ID,
  ]
  return values.some(Boolean) && values.some((value) => !value)
})()
