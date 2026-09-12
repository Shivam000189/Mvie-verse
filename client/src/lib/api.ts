type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: { message: string }
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Something went wrong. Please try again.')
  }

  return payload.data
}
