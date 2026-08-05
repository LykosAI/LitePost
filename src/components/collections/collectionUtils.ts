import { Collection, SavedRequest, Tab } from "@/types"
import { resolveRequestAuth } from "@/utils/collectionAuth"

export const methodColors: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-500",
  POST: "bg-green-500/10 text-green-500",
  PUT: "bg-yellow-500/10 text-yellow-500",
  PATCH: "bg-orange-500/10 text-orange-500",
  DELETE: "bg-red-500/10 text-red-500",
  HEAD: "bg-purple-500/10 text-purple-500",
  OPTIONS: "bg-cyan-500/10 text-cyan-500",
}

/**
 * Open a saved request as a tab.
 *
 * The collection is optional so existing callers keep working, but pass it
 * where you can: it is what lets a request inherit the collection's auth.
 * Resolution happens here rather than at send time so the Auth panel shows what
 * will actually go out, instead of an empty form for a request that is in fact
 * authenticated.
 */
export function savedRequestToTab(request: SavedRequest, collection?: Collection): Tab {
  return {
    id: crypto.randomUUID(),
    name: request.name,
    method: request.method,
    url: request.url,
    rawUrl: request.rawUrl,
    params: request.params,
    headers: request.headers,
    body: request.body,
    contentType: request.contentType,
    auth: resolveRequestAuth(request, collection),
    cookies: request.cookies,
    loading: false,
    response: null,
    isEditing: false,
    testScripts: request.testScripts || [],
    preRequestScripts: request.preRequestScripts || [],
    testAssertions: request.testAssertions || [],
    testResults: request.testResults || null,
    extractionRules: request.extractionRules || [],
    graphqlQuery: request.graphqlQuery,
    graphqlVariables: request.graphqlVariables,
    graphqlOperationName: request.graphqlOperationName,
    isGraphQL: request.isGraphQL,
    formDataEntries: request.formDataEntries,
  }
}
