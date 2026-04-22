import { useEffect, useState } from 'react'
import { insertInto, selectFrom } from '../lib/supabaseClient'

function AdminPage() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function loadCategories() {
    setError('')

    const rows = await selectFrom('categories', {
      columns: 'id,name,description,is_active'
    })

    setCategories(rows)
  }

  useEffect(() => {
    async function initializeCategories() {
      try {
        await loadCategories()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories.')
      } finally {
        setIsLoading(false)
      }
    }

    initializeCategories()
  }, [])

  async function handleCreateCategory(event) {
    event.preventDefault()
    setSubmitMessage('')
    setSubmitError('')
    setIsSubmitting(true)

    try {
      await insertInto('categories', {
        name: name.trim(),
        description: description.trim(),
        is_active: isActive
      })

      setSubmitMessage('Category created successfully.')
      setName('')
      setDescription('')
      setIsActive(true)
      await loadCategories()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create category.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <h2>Admin</h2>
      <h3>Create Category</h3>
      <form onSubmit={handleCreateCategory}>
        <label htmlFor="category-name">Name</label>
        <input
          id="category-name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <label htmlFor="category-description">Description</label>
        <textarea
          id="category-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <label htmlFor="category-active">Is active</label>
        <input
          id="category-active"
          name="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create category'}
        </button>
      </form>

      {submitMessage ? <p>{submitMessage}</p> : null}
      {submitError ? <p>{submitError}</p> : null}

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
