import { useEffect, useMemo, useState } from 'react'
import { selectFrom } from '../lib/supabaseClient'

function shuffleItems(items) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

function GamePage() {
  const [sources, setSources] = useState([])
  const [sourceQuestions, setSourceQuestions] = useState([])
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [gameQuestions, setGameQuestions] = useState([])
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [isLoadingSources, setIsLoadingSources] = useState(true)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSources() {
      setError('')

      try {
        const rows = await selectFrom('sources', {
          columns: 'id,short_title,display_order',
          filters: {
            is_active: 'eq.true'
          }
        })

        const sortedRows = [...rows].sort((sourceA, sourceB) => {
          const displayOrderA = Number(sourceA.display_order ?? 0)
          const displayOrderB = Number(sourceB.display_order ?? 0)

          if (displayOrderA !== displayOrderB) {
            return displayOrderA - displayOrderB
          }

          return (sourceA.short_title || '').localeCompare(sourceB.short_title || '')
        })

        setSources(sortedRows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sources.')
      } finally {
        setIsLoadingSources(false)
      }
    }

    loadSources()
  }, [])

  useEffect(() => {
    if (!selectedSourceId) {
      setSourceQuestions([])
      setSelectedSection('')
      setGameQuestions([])
      setSelectedAnswers({})
      return
    }

    async function loadQuestionsForSource() {
      setIsLoadingQuestions(true)
      setError('')

      try {
        const rows = await selectFrom('questions', {
          columns: 'id,question_text,choice_a,choice_b,choice_c,choice_d,correct_index,question_type,section',
          filters: {
            is_active: 'eq.true',
            source_id: `eq.${selectedSourceId}`,
            question_type: 'eq.mc_single'
          }
        })

        setSourceQuestions(rows)
        setSelectedSection('')
        setGameQuestions([])
        setSelectedAnswers({})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions.')
      } finally {
        setIsLoadingQuestions(false)
      }
    }

    loadQuestionsForSource()
  }, [selectedSourceId])

  const availableSections = useMemo(() => {
    const sections = sourceQuestions
      .map((question) => question.section?.trim() || '')
      .filter((section) => Boolean(section))

    return [...new Set(sections)]
  }, [sourceQuestions])

  const filteredQuestions = useMemo(() => {
    if (!selectedSection) {
      return sourceQuestions
    }

    return sourceQuestions.filter((question) => (question.section || '').trim() === selectedSection)
  }, [sourceQuestions, selectedSection])

  const maxQuestionCount = filteredQuestions.length

  useEffect(() => {
    if (!maxQuestionCount) {
      setQuestionCount(1)
      return
    }

    setQuestionCount((currentCount) => {
      if (currentCount < 1) {
        return 1
      }

      if (currentCount > maxQuestionCount) {
        return maxQuestionCount
      }

      return currentCount
    })
  }, [maxQuestionCount])

  function handleAnswerClick(questionId, choiceIndex, correctIndex) {
    setSelectedAnswers((previous) => ({
      ...previous,
      [questionId]: {
        choiceIndex,
        isCorrect: choiceIndex === Number(correctIndex)
      }
    }))
  }

  function handleStartGame() {
    if (!filteredQuestions.length) {
      return
    }

    const normalizedCount = Math.max(1, Math.min(Number(questionCount) || 1, filteredQuestions.length))
    const nextQuestions = shuffleItems(filteredQuestions).slice(0, normalizedCount)

    setGameQuestions(nextQuestions)
    setSelectedAnswers({})
  }

  return (
    <section>
      <h2>Game</h2>

      {isLoadingSources ? <p>Loading sources...</p> : null}
      {error ? <p>{error}</p> : null}

      {!isLoadingSources ? (
        sources.length > 0 ? (
          <div>
            <p>1) Choose a source to begin.</p>
            <label>
              Source:{' '}
              <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
                <option value="">Select a source</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.short_title}
                  </option>
                ))}
              </select>
            </label>

            {selectedSourceId ? (
              <div>
                {isLoadingQuestions ? <p>Loading source questions...</p> : null}

                {!isLoadingQuestions ? (
                  <>
                    <p>2) Optional: choose a section.</p>
                    <label>
                      Section:{' '}
                      <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)}>
                        <option value="">All sections</option>
                        {availableSections.map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </label>

                    <p>3) Set question count and start.</p>
                    <label>
                      Number of questions:{' '}
                      <input
                        type="number"
                        min="1"
                        max={maxQuestionCount || 1}
                        value={questionCount}
                        onChange={(event) => setQuestionCount(Number(event.target.value))}
                      />
                    </label>

                    <button type="button" onClick={handleStartGame} disabled={!filteredQuestions.length}>
                      {gameQuestions.length > 0 ? 'Start new game' : 'Start game'}
                    </button>

                    {!filteredQuestions.length ? <p>No active questions found for this source/section.</p> : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <p>No active sources found.</p>
        )
      ) : null}

      {gameQuestions.length > 0 ? (
        <div>
          <h3>Questions</h3>
          <ul>
            {gameQuestions.map((question) => {
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
        </div>
      ) : null}
    </section>
  )
}

export default GamePage
