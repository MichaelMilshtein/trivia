import { useEffect, useState } from 'react'
import { selectFrom } from '../lib/supabaseClient'

function AdminPage() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCategories() {
      try {
        const rows = await selectFrom('categories', {
          columns: 'id,name,description,is_active'
        })

        setCategories(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories.')
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()
  }, [])

  return (
    <section>
      <h2>Admin</h2>
      <h3>Admin Categories</h3>

      {isLoading ? <p>Loading categories...</p> : null}
      {error ? <p>{error}</p> : null}

      {!isLoading && !error ? (
        categories.length > 0 ? (
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <h4>{category.name}</h4>
                <p>{category.description || 'No description'}</p>
                <p>Active: {category.is_active ? 'Yes' : 'No'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No categories found.</p>
        )
      ) : null}
    </section>
  )
}

export default AdminPage
