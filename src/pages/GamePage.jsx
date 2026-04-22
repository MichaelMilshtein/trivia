import { useEffect, useState } from 'react'
import { selectFrom } from '../lib/supabaseClient'

function GamePage() {
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [questions, setQuestions] = useState([])
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCategories() {
      try {
        const rows = await selectFrom('categories', {
          columns: 'id,name',
          filters: {
            is_active: 'eq.true'
          }
        })

        setCategories(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories.')
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [])

  useEffect(() => {
    if (!selectedCategoryId) {
      setQuestions([])
      setSelectedAnswers({})
      return
    }

    async function loadQuestions() {
      setIsLoadingQuestions(true)
      setError('')

      try {
        const rows = await selectFrom('questions', {
          columns: 'id,question_text,choice_a,choice_b,choice_c,choice_d,correct_index',
          filters: {
            is_active: 'eq.true',
            category_id: `eq.${selectedCategoryId}`
          }
        })

        setQuestions(rows)
        setSelectedAnswers({})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions.')
      } finally {
        setIsLoadingQuestions(false)
      }
    }

    loadQuestions()
  }, [selectedCategoryId])

  function handleAnswerClick(questionId, choiceIndex, correctIndex) {
    setSelectedAnswers((previous) => ({
      ...previous,
      [questionId]: {
        choiceIndex,
        isCorrect: choiceIndex === Number(correctIndex)
      }
    }))
  }

  return (
    <section>
      <h2>Game</h2>

      {isLoadingCategories ? <p>Loading categories...</p> : null}
      {error ? <p>{error}</p> : null}

      {!isLoadingCategories ? (
        categories.length > 0 ? (
          <label>
            Category:{' '}
            <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>No active categories found.</p>
        )
      ) : null}

      {selectedCategoryId ? (
        <div>
          {isLoadingQuestions ? <p>Loading questions...</p> : null}

          {!isLoadingQuestions ? (
            questions.length > 0 ? (
              <ul>
                {questions.map((question) => {
                  const answer = selectedAnswers[question.id]
                  const choiceEntries = [
                    [0, 'A', question.choice_a],
                    [1, 'B', question.choice_b],
                    [2, 'C', question.choice_c],
                    [3, 'D', question.choice_d]
                  ]

                  return (
                    <li key={question.id}>
                      <p>{question.question_text}</p>

                      <div>
                        {choiceEntries.map(([choiceIndex, choiceKey, choiceText]) => (
                          <button
                            key={choiceKey}
                            type="button"
                            onClick={() => handleAnswerClick(question.id, choiceIndex, question.correct_index)}
                            disabled={!choiceText}
                          >
                            {choiceKey}: {choiceText ?? 'Unavailable'}
                          </button>
                        ))}
                      </div>

                      {answer ? <p>{answer.isCorrect ? 'Correct!' : 'Incorrect.'}</p> : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p>No active questions found for this category.</p>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default GamePage
