import { useMemo } from 'react'
import { useEnvironmentStore } from '@/store/environments'
import { extractTemplateVariables } from '@/utils/url'

export interface ResolvedVariable {
  token: string
  name: string
  value: string | undefined
}

/** Extract {{var}} tokens from text and resolve them against the active environment */
export function useVariablePeek(text: string) {
  const { environments, activeEnvironmentId } = useEnvironmentStore()

  return useMemo(() => {
    const tokens = extractTemplateVariables(text || '')
    const activeEnv = environments.find((env) => env.id === activeEnvironmentId)
    const resolved: ResolvedVariable[] = tokens.map((token) => {
      const name = token.slice(2, -2).trim()
      return { token, name, value: activeEnv?.variables?.[name] }
    })
    return {
      resolved,
      unresolvedCount: resolved.filter((variable) => variable.value === undefined).length,
      hasActiveEnvironment: Boolean(activeEnv),
    }
  }, [text, environments, activeEnvironmentId])
}
