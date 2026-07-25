import { AuthConfig, Header } from '@/types'

/**
 * Applies authentication settings to request headers
 * @param headers Current request headers
 * @param auth Authentication configuration
 * @returns Headers with authentication applied
 */
export function applyAuthToRequest(headers: Header[], auth: AuthConfig): Header[] {
  // Create a copy of the headers to avoid modifying the original
  const headersWithAuth = [...headers]
  
  if (!auth || auth.type === 'none') {
    return headersWithAuth
  }

  // Handle each auth type
  switch (auth.type) {
    case 'basic': {
      if (auth.username) {
        const credentials = auth.password 
          ? `${auth.username}:${auth.password}`
          : auth.username
        
        const encodedCredentials = btoa(credentials)
        
        // Check if authorization header already exists
        const existingAuthHeader = headersWithAuth.findIndex(
          header => header.key.toLowerCase() === 'authorization'
        )
        
        if (existingAuthHeader >= 0) {
          headersWithAuth[existingAuthHeader] = {
            ...headersWithAuth[existingAuthHeader],
            value: `Basic ${encodedCredentials}`,
            enabled: true
          }
        } else {
          headersWithAuth.push({
            key: 'Authorization',
            value: `Basic ${encodedCredentials}`,
            enabled: true
          })
        }
      }
      break
    }
    
    case 'bearer': {
      if (auth.token) {
        // Check if authorization header already exists
        const existingAuthHeader = headersWithAuth.findIndex(
          header => header.key.toLowerCase() === 'authorization'
        )
        
        if (existingAuthHeader >= 0) {
          headersWithAuth[existingAuthHeader] = {
            ...headersWithAuth[existingAuthHeader],
            value: `Bearer ${auth.token}`,
            enabled: true
          }
        } else {
          headersWithAuth.push({
            key: 'Authorization',
            value: `Bearer ${auth.token}`,
            enabled: true
          })
        }
      }
      break
    }
    
    case 'api-key': {
      if (auth.key && auth.value && auth.addTo === 'header') {
        const existingHeader = headersWithAuth.findIndex(
          header => header.key.toLowerCase() === auth.key?.toLowerCase()
        )

        if (existingHeader >= 0) {
          headersWithAuth[existingHeader] = {
            ...headersWithAuth[existingHeader],
            value: auth.value,
            enabled: true
          }
        } else if (auth.key) {
          headersWithAuth.push({
            key: auth.key,
            value: auth.value,
            enabled: true
          })
        }
      }
      break
    }

    case 'oauth2': {
      if (auth.oauth2?.accessToken) {
        const tokenType = auth.oauth2.tokenType || 'Bearer'
        const value = `${tokenType} ${auth.oauth2.accessToken}`
        const existingAuthHeader = headersWithAuth.findIndex(
          header => header.key.toLowerCase() === 'authorization'
        )

        if (existingAuthHeader >= 0) {
          headersWithAuth[existingAuthHeader] = {
            ...headersWithAuth[existingAuthHeader],
            value,
            enabled: true
          }
        } else {
          headersWithAuth.push({
            key: 'Authorization',
            value,
            enabled: true
          })
        }
      }
      break
    }
  }
  
  return headersWithAuth
} 