export function getRequestNameFromUrl(url: string): string {
  try {
    // Try to parse the URL
    const parsedUrl = new URL(url);
    
    // Get the pathname without leading/trailing slashes
    const path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
    
    // If there's no path, return 'Unnamed Request'
    if (!path) {
      return 'Unnamed Request';
    }
    
    // Return the path
    return path;
  } catch {
    // If URL parsing fails, try to extract path portion
    // Remove protocol if exists
    const withoutProtocol = url.replace(/^(https?:\/\/)?/, '');
    
    // Remove domain if exists (everything up to first slash)
    const withoutDomain = withoutProtocol.replace(/^[^\/]+(\/|$)/, '');
    
    // Remove query parameters and hash
    const pathOnly = withoutDomain.split(/[?#]/)[0];
    
    // Remove leading/trailing slashes
    const cleanPath = pathOnly.replace(/^\/+|\/+$/g, '');
    
    return cleanPath || 'Unnamed Request';
  }
} 