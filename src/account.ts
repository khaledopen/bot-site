export const levels = [
  ['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced'],
] as const

export const goals = [
  ['speaking', 'Improve my speaking'],
  ['everyday', 'Learn everyday English'],
  ['professional', 'Professional English'],
  ['interviews', 'Prepare for interviews'],
  ['grammar', 'Improve grammar and vocabulary'],
] as const

export const modes = [['text', 'Text'], ['voice', 'Voice'], ['both', 'Both']] as const

export type Preferences = {
  level: typeof levels[number][0]
  goal: typeof goals[number][0]
  mode: typeof modes[number][0]
  dailyMinutes: 10 | 20 | 30
}

export type Account = { username: string; preferences: Preferences | null; admin?: boolean }

export const defaults: Preferences = { level: 'intermediate', goal: 'speaking', mode: 'both', dailyMinutes: 30 }

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

export async function accountApi<T>(route: string, body?: object, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(body && route === 'turn' ? 90000 : 25000)
  const response = await fetch(`/api/account/${route}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new ApiError(data?.error || 'Le service est temporairement indisponible.', response.status)
  }
  return data
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'La connexion a été interrompue. Réessaie.'
}
