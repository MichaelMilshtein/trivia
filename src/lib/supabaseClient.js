const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const SUPABASE_AUTH_SESSION_STORAGE_KEY = 'trivia.admin.supabaseAuthSession'

function getStoredAuthSession() {
  if (typeof window === 'undefined') {
    return null
  }

  const storedSession = window.localStorage.getItem(SUPABASE_AUTH_SESSION_STORAGE_KEY)

  if (!storedSession) {
    return null
  }

  try {
    return JSON.parse(storedSession)
  } catch {
    window.localStorage.removeItem(SUPABASE_AUTH_SESSION_STORAGE_KEY)
    return null
  }
}

function storeAuthSession(session) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SUPABASE_AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
}

function clearStoredAuthSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(SUPABASE_AUTH_SESSION_STORAGE_KEY)
}

function getAuthSessionWithExpiry(authResponse) {
  const expiresAt = authResponse.expires_at || Math.floor(Date.now() / 1000) + authResponse.expires_in

  return {
    access_token: authResponse.access_token,
    refresh_token: authResponse.refresh_token,
    expires_at: expiresAt,
    user: authResponse.user
  }
}

function getSupabaseErrorMessage(errorBody, fallbackMessage) {
  try {
    const parsedError = JSON.parse(errorBody)
    return parsedError.error_description || parsedError.msg || parsedError.message || fallbackMessage
  } catch {
    return errorBody || fallbackMessage
  }
}

async function requestSupabaseAuthToken(body, grantType) {
  const { supabaseUrl: url, supabasePublishableKey: key } = getSupabaseConfig()

  const response = await fetch(`${url}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(getSupabaseErrorMessage(errorBody, 'Supabase Auth request failed.'))
  }

  const authResponse = await response.json()
  const session = getAuthSessionWithExpiry(authResponse)
  storeAuthSession(session)

  return session
}

export async function signInWithPassword(email, password) {
  return requestSupabaseAuthToken({ email, password }, 'password')
}

export async function refreshAuthSession() {
  const currentSession = getStoredAuthSession()

  if (!currentSession?.refresh_token) {
    return null
  }

  return requestSupabaseAuthToken({ refresh_token: currentSession.refresh_token }, 'refresh_token')
}

export async function getCurrentAuthSession() {
  const currentSession = getStoredAuthSession()

  if (!currentSession?.access_token) {
    return null
  }

  const expiresAt = Number(currentSession.expires_at || 0)

  if (expiresAt && expiresAt * 1000 <= Date.now() + 60000) {
    try {
      return await refreshAuthSession()
    } catch {
      clearStoredAuthSession()
      return null
    }
  }

  return currentSession
}

export async function signOut() {
  const currentSession = getStoredAuthSession()

  try {
    if (currentSession?.access_token) {
      const { supabaseUrl: url, supabasePublishableKey: key } = getSupabaseConfig()

      await fetch(`${url}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json'
        }
      })
    }
  } finally {
    clearStoredAuthSession()
  }
}

function getSupabaseConfig() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  return { supabaseUrl, supabasePublishableKey }
}

export async function selectFrom(table, { columns = '*', filters = {} } = {}) {
  const { supabaseUrl: url, supabasePublishableKey: key } = getSupabaseConfig()

  const queryParams = new URLSearchParams({ select: columns })

  for (const [field, value] of Object.entries(filters)) {
    queryParams.set(field, value)
  }

  const response = await fetch(`${url}/rest/v1/${table}?${queryParams.toString()}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Supabase request failed (${response.status}): ${errorBody}`)
  }

  return response.json()
}

export async function insertInto(table, values) {
  const { supabaseUrl: url, supabasePublishableKey: key } = getSupabaseConfig()

  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(values)
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Supabase request failed (${response.status}): ${errorBody}`)
  }

  return response.json()
}


export async function updateRows(table, values, filters = {}) {
  const { supabaseUrl: url, supabasePublishableKey: key } = getSupabaseConfig()

  const queryParams = new URLSearchParams()

  for (const [field, value] of Object.entries(filters)) {
    queryParams.set(field, value)
  }

  const response = await fetch(`${url}/rest/v1/${table}?${queryParams.toString()}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(values)
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Supabase request failed (${response.status}): ${errorBody}`)
  }

  return response.json()
}
