const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

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
