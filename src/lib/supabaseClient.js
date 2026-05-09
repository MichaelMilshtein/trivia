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
  const expiresAt = authResponse.expires_at || Math.floor(Date.now() / 1000) + Number(authResponse.expires_in || 0)

  return {
    access_token: authResponse.access_token,
    refresh_token: authResponse.refresh_token,
    expires_at: expiresAt,
    expires_in: authResponse.expires_in,
    token_type: authResponse.token_type || 'bearer',
    provider_token: authResponse.provider_token,
    provider_refresh_token: authResponse.provider_refresh_token,
    user: authResponse.user
  }
}

function getSupabaseErrorMessage(errorBody, fallbackMessage) {
  try {
    const parsedError = JSON.parse(errorBody)
    const message = parsedError.error_description || parsedError.msg || parsedError.message
    const detail = parsedError.details || parsedError.hint

    if (message && detail) {
      return `${message} ${detail}`
    }

    return message || detail || fallbackMessage
  } catch {
    return errorBody || fallbackMessage
  }
}

async function getSupabaseRestHeaders(extraHeaders = {}) {
  const { supabasePublishableKey: key } = getSupabaseConfig()
  const session = await getCurrentAuthSession()
  const bearerToken = session?.access_token || key

  return {
    apikey: key,
    Authorization: `Bearer ${bearerToken}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  }
}

async function throwSupabaseRestError(response, fallbackMessage) {
  const errorBody = await response.text()
  const errorMessage = getSupabaseErrorMessage(errorBody, fallbackMessage)
  throw new Error(`Supabase request failed (${response.status}): ${errorMessage}`)
}

function getSupabaseConfig() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  return { supabaseUrl, supabasePublishableKey }
}

function getAuthRedirectSessionParams() {
  if (typeof window === 'undefined') {
    return null
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const searchParams = new URLSearchParams(window.location.search)
  const params = hashParams.has('access_token') ? hashParams : searchParams

  if (params.get('error') || params.get('error_description')) {
    throw new Error(params.get('error_description') || params.get('error') || 'Unable to complete sign-in.')
  }

  if (!params.has('access_token')) {
    return null
  }

  return params
}

function removeAuthRedirectParamsFromUrl() {
  if (typeof window === 'undefined') {
    return
  }

  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
}

async function getUser(accessToken) {
  const { supabaseUrl: url, supabasePublishableKey: key } = getSupabaseConfig()

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(getSupabaseErrorMessage(errorBody, 'Unable to load signed-in user.'))
  }

  return response.json()
}

async function getSessionFromRedirect() {
  const params = getAuthRedirectSessionParams()

  if (!params) {
    return null
  }

  try {
    const accessToken = params.get('access_token')
    const session = getAuthSessionWithExpiry({
      access_token: accessToken,
      refresh_token: params.get('refresh_token'),
      expires_at: Number(params.get('expires_at')) || undefined,
      expires_in: Number(params.get('expires_in')) || 3600,
      token_type: params.get('token_type') || 'bearer',
      provider_token: params.get('provider_token'),
      provider_refresh_token: params.get('provider_refresh_token'),
      user: await getUser(accessToken)
    })

    storeAuthSession(session)

    return session
  } finally {
    removeAuthRedirectParamsFromUrl()
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

async function signInWithPassword({ email, password }) {
  try {
    const session = await requestSupabaseAuthToken({ email, password }, 'password')
    return { data: { session, user: session.user }, error: null }
  } catch (error) {
    return { data: { session: null, user: null }, error }
  }
}

async function getSession() {
  const session = await getCurrentAuthSession()
  return { data: { session }, error: null }
}

export const supabase = {
  auth: {
    signInWithPassword,
    getSession,
    signOut
  }
}

export async function refreshAuthSession() {
  const currentSession = getStoredAuthSession()

  if (!currentSession?.refresh_token) {
    return null
  }

  return requestSupabaseAuthToken({ refresh_token: currentSession.refresh_token }, 'refresh_token')
}

export async function getCurrentAuthSession() {
  const redirectSession = await getSessionFromRedirect()

  if (redirectSession) {
    return redirectSession
  }

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

export async function selectFrom(table, { columns = '*', filters = {} } = {}) {
  const { supabaseUrl: url } = getSupabaseConfig()

  const queryParams = new URLSearchParams({ select: columns })

  for (const [field, value] of Object.entries(filters)) {
    queryParams.set(field, value)
  }

  const response = await fetch(`${url}/rest/v1/${table}?${queryParams.toString()}`, {
    headers: await getSupabaseRestHeaders()
  })

  if (!response.ok) {
    await throwSupabaseRestError(response, 'Unable to load Supabase rows.')
  }

  return response.json()
}

export async function insertInto(table, values) {
  const { supabaseUrl: url } = getSupabaseConfig()

  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: await getSupabaseRestHeaders({
      Prefer: 'return=representation'
    }),
    body: JSON.stringify(values)
  })

  if (!response.ok) {
    await throwSupabaseRestError(response, 'Unable to insert Supabase rows.')
  }

  const rows = await response.json()

  if (Array.isArray(rows) && rows.length === 0) {
    throw new Error('Supabase request did not insert any rows. Check your Admin sign-in and RLS policies.')
  }

  return rows
}

export async function updateRows(table, values, filters = {}) {
  const { supabaseUrl: url } = getSupabaseConfig()

  const queryParams = new URLSearchParams()

  for (const [field, value] of Object.entries(filters)) {
    queryParams.set(field, value)
  }

  const response = await fetch(`${url}/rest/v1/${table}?${queryParams.toString()}`, {
    method: 'PATCH',
    headers: await getSupabaseRestHeaders({
      Prefer: 'return=representation'
    }),
    body: JSON.stringify(values)
  })

  if (!response.ok) {
    await throwSupabaseRestError(response, 'Unable to update Supabase rows.')
  }

  const rows = await response.json()

  if (Array.isArray(rows) && rows.length === 0) {
    throw new Error('Supabase request did not update any rows. Check your Admin sign-in and RLS policies.')
  }

  return rows
}

export async function upsertInto(table, values, { onConflict = 'id' } = {}) {
  const { supabaseUrl: url } = getSupabaseConfig()
  const queryParams = new URLSearchParams({ on_conflict: onConflict })

  const response = await fetch(`${url}/rest/v1/${table}?${queryParams.toString()}`, {
    method: 'POST',
    headers: await getSupabaseRestHeaders({
      Prefer: 'resolution=merge-duplicates,return=representation'
    }),
    body: JSON.stringify(values)
  })

  if (!response.ok) {
    await throwSupabaseRestError(response, 'Unable to upsert Supabase rows.')
  }

  const rows = await response.json()

  if (Array.isArray(rows) && rows.length === 0) {
    throw new Error('Supabase request did not save any rows. Check your Admin sign-in and RLS policies.')
  }

  return rows
}
