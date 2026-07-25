import { SavedRequest, Tab } from "@/types"

export const methodColors: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-500",
  POST: "bg-green-500/10 text-green-500",
  PUT: "bg-yellow-500/10 text-yellow-500",
  PATCH: "bg-orange-500/10 text-orange-500",
  DELETE: "bg-red-500/10 text-red-500",
  HEAD: "bg-purple-500/10 text-purple-500",
  OPTIONS: "bg-cyan-500/10 text-cyan-500",
}

export function savedRequestToTab(request: SavedRequest): Tab {
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
    auth: request.auth,
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
