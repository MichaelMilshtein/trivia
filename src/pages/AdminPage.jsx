import { useEffect, useMemo, useState } from 'react'
import { insertInto, selectFrom, updateRows } from '../lib/supabaseClient'

const QUESTION_COLUMNS =
  'id,question_text,choice_a,choice_b,choice_c,choice_d,correct_index,difficulty,is_active,source_id,section'

function AdminPage() {
  const [categories, setCategories] = useState([])
  const [sources, setSources] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [sourceSection, setSourceSection] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceIsActive, setSourceIsActive] = useState(true)
  const [sourceSubmitMessage, setSourceSubmitMessage] = useState('')
  const [sourceSubmitError, setSourceSubmitError] = useState('')
  const [isSubmittingSource, setIsSubmittingSource] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [batchSection, setBatchSection] = useState('')
  const [questionsJson, setQuestionsJson] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [categoryQuestions, setCategoryQuestions] = useState([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [questionsError, setQuestionsError] = useState('')
  const [editingQuestionId, setEditingQuestionId] = useState('')
  const [editQuestionText, setEditQuestionText] = useState('')
  const [editChoiceA, setEditChoiceA] = useState('')
  const [editChoiceB, setEditChoiceB] = useState('')
  const [editChoiceC, setEditChoiceC] = useState('')
  const [editChoiceD, setEditChoiceD] = useState('')
  const [editCorrectIndex, setEditCorrectIndex] = useState('0')
  const [editDifficulty, setEditDifficulty] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editSection, setEditSection] = useState('')
  const [editSourceId, setEditSourceId] = useState('')
  const [isUpdatingQuestion, setIsUpdatingQuestion] = useState(false)
  const [questionUpdateMessage, setQuestionUpdateMessage] = useState('')
  const [questionUpdateError, setQuestionUpdateError] = useState('')
  const [isTogglingQuestionActive, setIsTogglingQuestionActive] = useState(false)
  const [questionActiveMessage, setQuestionActiveMessage] = useState('')
  const [questionActiveError, setQuestionActiveError] = useState('')

  const sourceTitlesById = useMemo(
    () =>
      sources.reduce((accumulator, source) => {
        accumulator[source.id] = source.title
        return accumulator
      }, {}),
    [sources]
  )

  async function loadCategories() {
    setError('')

    const rows = await selectFrom('categories', {
      columns: 'id,name,description,is_active'
    })

    setCategories(rows)
  }

  async function loadSources() {
    const rows = await selectFrom('sources', {
      columns: 'id,title,source_type,section,url,is_active'
    })

    setSources(rows)
  }

  async function fetchCategoryQuestions(categoryId) {
    return selectFrom('questions', {
      columns: QUESTION_COLUMNS,
      filters: {
        category_id: `eq.${categoryId}`
      }
    })
  }

  async function refreshCategoryQuestions(categoryId = selectedCategoryId) {
    if (!categoryId) {
      setCategoryQuestions([])
      return
    }

    const rows = await fetchCategoryQuestions(categoryId)
    setCategoryQuestions(rows)
  }

  function resetQuestionEditForm() {
    setEditingQuestionId('')
    setEditQuestionText('')
    setEditChoiceA('')
    setEditChoiceB('')
    setEditChoiceC('')
    setEditChoiceD('')
    setEditCorrectIndex('0')
    setEditDifficulty('')
    setEditIsActive(true)
    setEditSection('')
    setEditSourceId('')
  }

  function loadQuestionIntoEditForm(question) {
    setEditingQuestionId(question.id)
    setEditQuestionText(question.question_text || '')
    setEditChoiceA(question.choice_a || '')
    setEditChoiceB(question.choice_b || '')
    setEditChoiceC(question.choice_c || '')
    setEditChoiceD(question.choice_d || '')
    setEditCorrectIndex(String(question.correct_index ?? 0))
    setEditDifficulty(question.difficulty || '')
    setEditIsActive(Boolean(question.is_active))
    setEditSection(question.section || '')
    setEditSourceId(question.source_id || '')
    setQuestionUpdateMessage('')
    setQuestionUpdateError('')
  }

  useEffect(() => {
    async function initializeCategories() {
      try {
        await Promise.all([loadCategories(), loadSources()])
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load categories and sources.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    initializeCategories()
  }, [])

  useEffect(() => {
    async function loadQuestionsForCategory() {
      if (!selectedCategoryId) {
        setCategoryQuestions([])
        setQuestionsError('')
        resetQuestionEditForm()
        return
      }

      setIsLoadingQuestions(true)
      setQuestionsError('')

      try {
        const rows = await fetchCategoryQuestions(selectedCategoryId)
        setCategoryQuestions(rows)
      } catch (err) {
        setQuestionsError(err instanceof Error ? err.message : 'Failed to load questions.')
      } finally {
        setIsLoadingQuestions(false)
      }
    }

    loadQuestionsForCategory()
  }, [selectedCategoryId])

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

  async function handleImportQuestions(event) {
    event.preventDefault()
    setImportMessage('')
    setImportError('')

    if (!selectedCategoryId) {
      setImportError('Please choose a category before importing questions.')
      return
    }

    setIsImporting(true)

    try {
      const parsed = JSON.parse(questionsJson)
      const sourceQuestions = parsed?.questions

      if (!Array.isArray(sourceQuestions) || sourceQuestions.length === 0) {
        throw new Error('JSON must include a non-empty "questions" array.')
      }

      const validationErrors = []
      const questionRows = sourceQuestions.map((question, index) => {
        const questionNumber = index + 1
        const questionText =
          typeof question.question_text === 'string' ? question.question_text.trim() : ''
        const choices = Array.isArray(question.choices) ? question.choices : []
        const correctIndex = question.correct_index
        const questionSection =
          typeof question.section === 'string' ? question.section.trim() : ''
        const resolvedSection = questionSection || batchSection.trim()

        if (!questionText) {
          validationErrors.push(`Question ${questionNumber}: "question_text" is required.`)
        }

        if (choices.length !== 4) {
          validationErrors.push(`Question ${questionNumber}: "choices" must have exactly 4 items.`)
        }

        if (
          !Number.isInteger(correctIndex) ||
          correctIndex < 0 ||
          correctIndex > 3
        ) {
          validationErrors.push(
            `Question ${questionNumber}: "correct_index" must be an integer from 0 to 3.`
          )
        }

        return {
          category_id: selectedCategoryId,
          question_text: questionText,
          choice_a: typeof choices[0] === 'string' ? choices[0] : '',
          choice_b: typeof choices[1] === 'string' ? choices[1] : '',
          choice_c: typeof choices[2] === 'string' ? choices[2] : '',
          choice_d: typeof choices[3] === 'string' ? choices[3] : '',
          correct_index: correctIndex,
          difficulty: question.difficulty ?? null,
          is_active: question.is_active ?? true,
          source_id: selectedSourceId || null,
          section: resolvedSection || null
        }
      })

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(' '))
      }

      await insertInto('questions', questionRows)

      setImportMessage(`Imported ${questionRows.length} question(s) successfully.`)
      setQuestionsJson('')
      setBatchSection('')

      await refreshCategoryQuestions(selectedCategoryId)
    } catch (err) {
      if (err instanceof SyntaxError) {
        setImportError('Invalid JSON. Please paste valid JSON and try again.')
      } else {
        setImportError(err instanceof Error ? err.message : 'Failed to import questions.')
      }
    } finally {
      setIsImporting(false)
    }
  }

  async function handleUpdateQuestion(event) {
    event.preventDefault()
    setQuestionUpdateMessage('')
    setQuestionUpdateError('')

    if (!editingQuestionId) {
      setQuestionUpdateError('Select a question to edit first.')
      return
    }

    const parsedCorrectIndex = Number(editCorrectIndex)

    if (!Number.isInteger(parsedCorrectIndex) || parsedCorrectIndex < 0 || parsedCorrectIndex > 3) {
      setQuestionUpdateError('Correct index must be an integer from 0 to 3.')
      return
    }

    if (!editQuestionText.trim()) {
      setQuestionUpdateError('Question text is required.')
      return
    }

    setIsUpdatingQuestion(true)

    try {
      await updateRows(
        'questions',
        {
          question_text: editQuestionText.trim(),
          choice_a: editChoiceA.trim(),
          choice_b: editChoiceB.trim(),
          choice_c: editChoiceC.trim(),
          choice_d: editChoiceD.trim(),
          correct_index: parsedCorrectIndex,
          difficulty: editDifficulty.trim() || null,
          is_active: editIsActive,
          section: editSection.trim() || null,
          source_id: editSourceId || null
        },
        { id: `eq.${editingQuestionId}` }
      )

      setQuestionUpdateMessage('Question updated successfully.')
      await refreshCategoryQuestions(selectedCategoryId)
    } catch (err) {
      setQuestionUpdateError(err instanceof Error ? err.message : 'Failed to update question.')
    } finally {
      setIsUpdatingQuestion(false)
    }
  }

  async function handleCreateSource(event) {
    event.preventDefault()
    setSourceSubmitMessage('')
    setSourceSubmitError('')
    setIsSubmittingSource(true)

    try {
      await insertInto('sources', {
        title: sourceTitle.trim(),
        source_type: sourceType.trim(),
        section: sourceSection.trim(),
        url: sourceUrl.trim(),
        is_active: sourceIsActive
      })

      setSourceSubmitMessage('Source created successfully.')
      setSourceTitle('')
      setSourceType('')
      setSourceSection('')
      setSourceUrl('')
      setSourceIsActive(true)
      await loadSources()
    } catch (err) {
      setSourceSubmitError(err instanceof Error ? err.message : 'Failed to create source.')
    } finally {
      setIsSubmittingSource(false)
    }
  }

  async function handleToggleQuestionActive(question) {
    setQuestionActiveMessage('')
    setQuestionActiveError('')
    setIsTogglingQuestionActive(true)

    try {
      await updateRows(
        'questions',
        {
          is_active: !question.is_active
        },
        { id: `eq.${question.id}` }
      )

      setQuestionActiveMessage(
        question.is_active ? 'Question deactivated successfully.' : 'Question reactivated successfully.'
      )
      await refreshCategoryQuestions(selectedCategoryId)
    } catch (err) {
      setQuestionActiveError(
        err instanceof Error ? err.message : 'Failed to update question active status.'
      )
    } finally {
      setIsTogglingQuestionActive(false)
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

      <h3>Create Source</h3>
      <form onSubmit={handleCreateSource}>
        <label htmlFor="source-title">Title</label>
        <input
          id="source-title"
          name="title"
          type="text"
          value={sourceTitle}
          onChange={(event) => setSourceTitle(event.target.value)}
          required
        />

        <label htmlFor="source-type">Source type</label>
        <input
          id="source-type"
          name="source_type"
          type="text"
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value)}
          required
        />

        <label htmlFor="source-section">Section</label>
        <input
          id="source-section"
          name="section"
          type="text"
          value={sourceSection}
          onChange={(event) => setSourceSection(event.target.value)}
          required
        />

        <label htmlFor="source-url">URL</label>
        <input
          id="source-url"
          name="url"
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          required
        />

        <label htmlFor="source-active">Is active</label>
        <input
          id="source-active"
          name="is_active"
          type="checkbox"
          checked={sourceIsActive}
          onChange={(event) => setSourceIsActive(event.target.checked)}
        />

        <button type="submit" disabled={isSubmittingSource}>
          {isSubmittingSource ? 'Creating...' : 'Create source'}
        </button>
      </form>

      {sourceSubmitMessage ? <p>{sourceSubmitMessage}</p> : null}
      {sourceSubmitError ? <p>{sourceSubmitError}</p> : null}

      <h3>Admin Sources (Read Only)</h3>
      {isLoading ? <p>Loading sources...</p> : null}
      {!isLoading && !error ? (
        sources.length > 0 ? (
          <ul>
            {sources.map((source) => (
              <li key={source.id}>
                <p>
                  <strong>{source.title}</strong>
                </p>
                <p>Source type: {source.source_type || 'N/A'}</p>
                <p>Section: {source.section || 'N/A'}</p>
                <p>URL: {source.url || 'N/A'}</p>
                <p>Active: {source.is_active ? 'Yes' : 'No'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No sources found.</p>
        )
      ) : null}

      <h3>Admin Questions Import</h3>
      <form onSubmit={handleImportQuestions}>
        <label htmlFor="question-category">Category</label>
        <select
          id="question-category"
          name="category_id"
          value={selectedCategoryId}
          onChange={(event) => setSelectedCategoryId(event.target.value)}
          required
        >
          <option value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label htmlFor="question-source">Source (optional)</label>
        <select
          id="question-source"
          name="source_id"
          value={selectedSourceId}
          onChange={(event) => setSelectedSourceId(event.target.value)}
        >
          <option value="">No source</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title}
            </option>
          ))}
        </select>

        <label htmlFor="question-batch-section">Batch section (optional)</label>
        <input
          id="question-batch-section"
          name="batch_section"
          type="text"
          value={batchSection}
          onChange={(event) => setBatchSection(event.target.value)}
          placeholder="Used when a question does not include section"
        />

        <label htmlFor="questions-json">Questions JSON</label>
        <textarea
          id="questions-json"
          name="questions_json"
          rows={16}
          value={questionsJson}
          onChange={(event) => setQuestionsJson(event.target.value)}
          placeholder={`{
  "questions": [
    {
      "question_text": "...",
      "choices": ["A", "B", "C", "D"],
      "correct_index": 0,
      "section": "Round 1",
      "difficulty": "medium",
      "is_active": true
    }
  ]
}`}
          required
        />

        <button type="submit" disabled={isImporting}>
          {isImporting ? 'Importing...' : 'Import questions'}
        </button>
      </form>

      {importMessage ? <p>{importMessage}</p> : null}
      {importError ? <p>{importError}</p> : null}

      <h3>Question Editor</h3>
      {!editingQuestionId ? <p>Click Edit on a question to load it into this form.</p> : null}
      <form onSubmit={handleUpdateQuestion}>
        <label htmlFor="edit-question-text">Question text</label>
        <textarea
          id="edit-question-text"
          name="question_text"
          value={editQuestionText}
          onChange={(event) => setEditQuestionText(event.target.value)}
          required
        />

        <label htmlFor="edit-choice-a">Choice A</label>
        <input
          id="edit-choice-a"
          name="choice_a"
          type="text"
          value={editChoiceA}
          onChange={(event) => setEditChoiceA(event.target.value)}
          required
        />

        <label htmlFor="edit-choice-b">Choice B</label>
        <input
          id="edit-choice-b"
          name="choice_b"
          type="text"
          value={editChoiceB}
          onChange={(event) => setEditChoiceB(event.target.value)}
          required
        />

        <label htmlFor="edit-choice-c">Choice C</label>
        <input
          id="edit-choice-c"
          name="choice_c"
          type="text"
          value={editChoiceC}
          onChange={(event) => setEditChoiceC(event.target.value)}
          required
        />

        <label htmlFor="edit-choice-d">Choice D</label>
        <input
          id="edit-choice-d"
          name="choice_d"
          type="text"
          value={editChoiceD}
          onChange={(event) => setEditChoiceD(event.target.value)}
          required
        />

        <label htmlFor="edit-correct-index">Correct index</label>
        <input
          id="edit-correct-index"
          name="correct_index"
          type="number"
          min={0}
          max={3}
          value={editCorrectIndex}
          onChange={(event) => setEditCorrectIndex(event.target.value)}
          required
        />

        <label htmlFor="edit-difficulty">Difficulty</label>
        <input
          id="edit-difficulty"
          name="difficulty"
          type="text"
          value={editDifficulty}
          onChange={(event) => setEditDifficulty(event.target.value)}
        />

        <label htmlFor="edit-active">Is active</label>
        <input
          id="edit-active"
          name="is_active"
          type="checkbox"
          checked={editIsActive}
          onChange={(event) => setEditIsActive(event.target.checked)}
        />

        <label htmlFor="edit-section">Section</label>
        <input
          id="edit-section"
          name="section"
          type="text"
          value={editSection}
          onChange={(event) => setEditSection(event.target.value)}
        />

        <label htmlFor="edit-source">Source</label>
        <select
          id="edit-source"
          name="source_id"
          value={editSourceId}
          onChange={(event) => setEditSourceId(event.target.value)}
        >
          <option value="">No source</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title}
            </option>
          ))}
        </select>

        <button type="submit" disabled={!editingQuestionId || isUpdatingQuestion}>
          {isUpdatingQuestion ? 'Saving...' : 'Save question changes'}
        </button>
      </form>

      {questionUpdateMessage ? <p>{questionUpdateMessage}</p> : null}
      {questionUpdateError ? <p>{questionUpdateError}</p> : null}

      <h3>Category Questions (Read Only)</h3>
      {!selectedCategoryId ? <p>Select a category to view questions.</p> : null}
      {isLoadingQuestions ? <p>Loading questions...</p> : null}
      {questionsError ? <p>{questionsError}</p> : null}
      {questionActiveMessage ? <p>{questionActiveMessage}</p> : null}
      {questionActiveError ? <p>{questionActiveError}</p> : null}

      {selectedCategoryId && !isLoadingQuestions && !questionsError ? (
        categoryQuestions.length > 0 ? (
          <ul>
            {categoryQuestions.map((question) => (
              <li key={question.id}>
                <p>
                  <strong>{question.question_text}</strong>
                </p>
                <p>
                  A: {question.choice_a} | B: {question.choice_b} | C: {question.choice_c} | D:{' '}
                  {question.choice_d}
                </p>
                <p>
                  Correct index: {question.correct_index} | Difficulty:{' '}
                  {question.difficulty || 'unknown'} | Active: {question.is_active ? 'Yes' : 'No'}
                </p>
                <p>
                  Source: {sourceTitlesById[question.source_id] || 'No source'}
                </p>
                {question.section ? <p>Section: {question.section}</p> : null}
                <button type="button" onClick={() => loadQuestionIntoEditForm(question)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleQuestionActive(question)}
                  disabled={isTogglingQuestionActive}
                >
                  {question.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No questions found for this category.</p>
        )
      ) : null}
    </section>
  )
}

export default AdminPage
