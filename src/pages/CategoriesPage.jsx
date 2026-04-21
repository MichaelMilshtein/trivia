import { useEffect, useState } from 'react'
import { selectFrom } from '../lib/supabaseClient'

function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCategories() {
      try {
        const rows = await selectFrom('categories', {
          columns: 'id,name,description',
          filters: {
            is_active: 'eq.true'
          }
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
      <h2>Categories</h2>

      {isLoading ? <p>Loading categories...</p> : null}
      {error ? <p>{error}</p> : null}

      {!isLoading && !error ? (
        categories.length > 0 ? (
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No active categories found.</p>
        )
      ) : null}
    </section>
  )
}

export default CategoriesPage
