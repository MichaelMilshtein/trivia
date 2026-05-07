import { useEffect, useMemo, useState } from 'react'
import { getCoverVariantPath } from '../lib/bookCovers'
import { selectFrom } from '../lib/supabaseClient'

const GAME_MODES = {
  sprint: {
    id: 'sprint',
    name: '60-Second Sprint',
    shortName: 'Sprint',
    tagline: 'Race the clock',
    description: 'You have 20 seconds to answer as many questions as possible.',
    statusLabel: 'Timer',
    icon: 'stopwatch'
  },
  lives: {
    id: 'lives',
    name: 'Three Lives Challenge',
    shortName: 'Three Lives',
    tagline: 'Protect your streak',
    description: 'No timer. Your third wrong answer ends the game.',
    statusLabel: 'Lives',
    icon: 'heart'
  }
}

const SPRINT_SECONDS = 20
const MAX_MISTAKES_IN_LIVES_MODE = 2
const SHOW_CORRECT_ANSWER_DEBUG = true
const CHOICE_KEYS = ['A', 'B', 'C', 'D']

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

function getSourceTitle(source) {
  return source?.short_title || source?.full_title || 'Untitled book'
}

function getSectionKey(question) {
  return question.section?.trim() || 'General'
}

function getBaseCoverImageUrl(source) {
  return source?.front_cover_image_url || source?.back_cover_image_url || ''
}

function getCoverImageUrl(source, variant) {
  return getCoverVariantPath(getBaseCoverImageUrl(source), variant)
}

function getChoiceEntries(question) {
  if (question.shuffledChoices) {
    return question.shuffledChoices.map((choice, displayIndex) => ({
      ...choice,
      key: CHOICE_KEYS[displayIndex]
    }))
  }

  return [question.choice_a, question.choice_b, question.choice_c, question.choice_d].map((choiceText, index) => ({
    index,
    key: CHOICE_KEYS[index],
    text: choiceText || 'Unavailable'
  }))
}

function prepareQuestionForPlay(question) {
  return {
    ...question,
    shuffledChoices: shuffleItems(getChoiceEntries(question))
  }
}

function getResultMessage(percentCorrect) {
  if (percentCorrect >= 90) {
    return 'A shelf-worthy finish. You clearly know this chapter by heart.'
  }

  if (percentCorrect >= 70) {
    return 'Nicely played. Your bookmark landed near the answer key.'
  }

  if (percentCorrect >= 40) {
    return 'A solid read-through. Try another pass and chase a higher score.'
  }

  return 'Try another pass and chase a higher score.'
}

function getSectionIconType(sectionKey, index) {
  const normalizedSection = sectionKey.toLowerCase()

  if (normalizedSection.includes('culture')) {
    return 'culture'
  }

  if (normalizedSection.includes('entertainment')) {
    return 'entertainment'
  }

  if (normalizedSection.includes('food')) {
    return 'food'
  }

  if (normalizedSection.includes('technology') || normalizedSection.includes('tech')) {
    return 'technology'
  }

  if (normalizedSection.includes('world') || normalizedSection.includes('event')) {
    return 'worldEvents'
  }

  return ['culture', 'entertainment', 'food', 'technology', 'worldEvents'][index % 5]
}

function SectionIcon({ type }) {
  const commonProps = {
    className: 'section-card-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
  }

  if (type === 'culture') {
    return (
      <svg {...commonProps}>
        <path d="M4 9h16" />
        <path d="M5.5 19h13" />
        <path d="M7 9v8" />
        <path d="M12 9v8" />
        <path d="M17 9v8" />
        <path d="M12 4 5 9h14l-7-5Z" />
      </svg>
    )
  }

  if (type === 'entertainment') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 5v14" />
        <path d="M16 5v14" />
        <path d="M4 10h16" />
        <path d="M4 14h16" />
      </svg>
    )
  }

  if (type === 'food') {
    return (
      <svg {...commonProps}>
        <path d="M7 4v16" />
        <path d="M4.5 4v5a2.5 2.5 0 0 0 5 0V4" />
        <path d="M15 4v16" />
        <path d="M15 4c3 1.4 4.5 4 4.5 7.5H15" />
      </svg>
    )
  }

  if (type === 'technology') {
    return (
      <svg {...commonProps}>
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M10 10h4v4h-4z" />
        <path d="M9 3v4" />
        <path d="M15 3v4" />
        <path d="M9 17v4" />
        <path d="M15 17v4" />
        <path d="M3 9h4" />
        <path d="M3 15h4" />
        <path d="M17 9h4" />
        <path d="M17 15h4" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4a12 12 0 0 1 0 16" />
      <path d="M12 4a12 12 0 0 0 0 16" />
      <path d="M15 15h5v5h-5z" />
      <path d="M16.5 17h2" />
    </svg>
  )
}

function ChallengeIcon({ type }) {
  const commonProps = {
    className: 'challenge-card-icon-svg',
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '4',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
  }

  if (type === 'stopwatch') {
    return (
      <svg {...commonProps}>
        <path d="M25 8h14" />
        <path d="M32 8v8" />
        <path d="m45 17 5 5" />
        <circle cx="32" cy="36" r="20" />
        <path d="M32 24v13l9 5" />
        <path d="M18 36h3" />
        <path d="M43 36h3" />
        <path d="M32 49v3" />
      </svg>
    )
  }

  return (
    <svg {...commonProps} fill="currentColor" stroke="none">
      <path d="M32 54S10 41.3 10 24.8C10 15.7 15.8 10 23.3 10c4.5 0 7.3 2.2 8.7 4.1C33.4 12.2 36.2 10 40.7 10 48.2 10 54 15.7 54 24.8 54 41.3 32 54 32 54Z" />
    </svg>
  )
}

function GamePage() {
  const [sources, setSources] = useState([])
  const [sourceQuestions, setSourceQuestions] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [selectedSectionKey, setSelectedSectionKey] = useState('')
  const [selectedModeId, setSelectedModeId] = useState('')
  const [questionQueue, setQuestionQueue] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null)
  const [lastAnswerWasCorrect, setLastAnswerWasCorrect] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [attemptedCount, setAttemptedCount] = useState(0)
  const [livesRemaining, setLivesRemaining] = useState(MAX_MISTAKES_IN_LIVES_MODE + 1)
  const [secondsRemaining, setSecondsRemaining] = useState(SPRINT_SECONDS)
  const [shouldEndAfterFeedback, setShouldEndAfterFeedback] = useState(false)
  const [results, setResults] = useState(null)
  const [step, setStep] = useState('book')
  const [isLoadingSources, setIsLoadingSources] = useState(true)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSetupData() {
      setError('')

      try {
        const [sourceRows, categoryRows] = await Promise.all([
          selectFrom('sources', {
            columns:
              'id,short_title,full_title,front_cover_image_url,back_cover_image_url,description,author,display_order,is_active',
            filters: {
              is_active: 'eq.true'
            }
          }),
          selectFrom('categories', {
            columns: 'id,name,is_active',
            filters: {
              is_active: 'eq.true'
            }
          })
        ])

        const sortedSources = [...sourceRows].sort((sourceA, sourceB) => {
          const displayOrderA = Number(sourceA.display_order ?? 0)
          const displayOrderB = Number(sourceB.display_order ?? 0)

          if (displayOrderA !== displayOrderB) {
            return displayOrderA - displayOrderB
          }

          return getSourceTitle(sourceA).localeCompare(getSourceTitle(sourceB))
        })

        setSources(sortedSources)
        setCategories(categoryRows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game setup.')
      } finally {
        setIsLoadingSources(false)
      }
    }

    loadSetupData()
  }, [])

  useEffect(() => {
    if (step !== 'play' || selectedModeId !== GAME_MODES.sprint.id) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setSecondsRemaining((currentSeconds) => Math.max(0, currentSeconds - 1))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [selectedModeId, step])

  useEffect(() => {
    if (step === 'play' && selectedModeId === GAME_MODES.sprint.id && secondsRemaining === 0) {
      finishGame()
    }
  }, [secondsRemaining, selectedModeId, step])

  const selectedSource = useMemo(
    () => sources.find((source) => String(source.id) === selectedSourceId),
    [selectedSourceId, sources]
  )

  const selectedMode = selectedModeId ? GAME_MODES[selectedModeId] : null

  const categoriesById = useMemo(
    () =>
      categories.reduce((accumulator, category) => {
        accumulator[String(category.id)] = category.name
        return accumulator
      }, {}),
    [categories]
  )

  const sectionCards = useMemo(() => {
    const sectionMap = sourceQuestions.reduce((accumulator, question) => {
      const sectionKey = getSectionKey(question)
      const existingSection = accumulator.get(sectionKey) || { key: sectionKey, questionCount: 0 }
      accumulator.set(sectionKey, {
        ...existingSection,
        questionCount: existingSection.questionCount + 1
      })
      return accumulator
    }, new Map())

    return [...sectionMap.values()].sort((sectionA, sectionB) => sectionA.key.localeCompare(sectionB.key))
  }, [sourceQuestions])

  const selectedSectionQuestions = useMemo(
    () => sourceQuestions.filter((question) => getSectionKey(question) === selectedSectionKey),
    [selectedSectionKey, sourceQuestions]
  )

  const currentQuestion = questionQueue[currentQuestionIndex]

  async function handleChooseSource(sourceId) {
    setSelectedSourceId(String(sourceId))
    setSelectedSectionKey('')
    setSelectedModeId('')
    setQuestionQueue([])
    setResults(null)
    setError('')
    setIsLoadingQuestions(true)

    try {
      const rows = await selectFrom('questions', {
        columns:
          'id,question_text,choice_a,choice_b,choice_c,choice_d,correct_index,question_type,difficulty,section,category_id',
        filters: {
          is_active: 'eq.true',
          source_id: `eq.${sourceId}`,
          question_type: 'eq.mc_single'
        }
      })

      setSourceQuestions(rows)
      setStep('section')
    } catch (err) {
      setSourceQuestions([])
      setError(err instanceof Error ? err.message : 'Failed to load questions for this book.')
    } finally {
      setIsLoadingQuestions(false)
    }
  }

  function handleChooseSection(sectionKey) {
    setSelectedSectionKey(sectionKey)
    setSelectedModeId('')
    setResults(null)
    setStep('mode')
  }

  function handleChooseMode(modeId) {
    setSelectedModeId(modeId)
    setResults(null)
  }

  function startGame() {
    if (!selectedSource || !selectedSectionKey || !selectedModeId || !selectedSectionQuestions.length) {
      return
    }

    setQuestionQueue(shuffleItems(selectedSectionQuestions).map(prepareQuestionForPlay))
    setCurrentQuestionIndex(0)
    setSelectedAnswerIndex(null)
    setLastAnswerWasCorrect(null)
    setCorrectCount(0)
    setAttemptedCount(0)
    setLivesRemaining(MAX_MISTAKES_IN_LIVES_MODE + 1)
    setSecondsRemaining(SPRINT_SECONDS)
    setShouldEndAfterFeedback(false)
    setResults(null)
    setStep('play')
  }

  function buildResults(nextCorrectCount = correctCount, nextAttemptedCount = attemptedCount) {
    return {
      challengeName: GAME_MODES[selectedModeId]?.name || 'Trivia game',
      sourceTitle: getSourceTitle(selectedSource),
      sectionName: selectedSectionKey || 'General',
      correctCount: nextCorrectCount,
      attemptedCount: nextAttemptedCount,
      percentCorrect: nextAttemptedCount ? Math.round((nextCorrectCount / nextAttemptedCount) * 100) : 0
    }
  }

  function finishGame(nextCorrectCount = correctCount, nextAttemptedCount = attemptedCount) {
    setResults(buildResults(nextCorrectCount, nextAttemptedCount))
    setStep('results')
  }

  function handleAnswer(choiceIndex) {
    if (!currentQuestion || selectedAnswerIndex !== null) {
      return
    }

    const isCorrect = choiceIndex === Number(currentQuestion.correct_index)
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0)
    const nextAttemptedCount = attemptedCount + 1
    const nextLivesRemaining =
      selectedModeId === GAME_MODES.lives.id && !isCorrect ? Math.max(0, livesRemaining - 1) : livesRemaining
    const isLastQuestion = currentQuestionIndex >= questionQueue.length - 1
    const shouldEndForLives = selectedModeId === GAME_MODES.lives.id && nextLivesRemaining === 0

    setSelectedAnswerIndex(choiceIndex)
    setLastAnswerWasCorrect(isCorrect)
    setCorrectCount(nextCorrectCount)
    setAttemptedCount(nextAttemptedCount)
    setLivesRemaining(nextLivesRemaining)
    setShouldEndAfterFeedback(shouldEndForLives || isLastQuestion)
  }

  function moveToNextQuestion() {
    if (shouldEndAfterFeedback) {
      finishGame()
      return
    }

    setCurrentQuestionIndex((currentIndex) => currentIndex + 1)
    setSelectedAnswerIndex(null)
    setLastAnswerWasCorrect(null)
    setShouldEndAfterFeedback(false)
  }

  function chooseAnotherBook() {
    setSelectedSourceId('')
    setSelectedSectionKey('')
    setSelectedModeId('')
    setQuestionQueue([])
    setSourceQuestions([])
    setResults(null)
    setStep('book')
  }

  function chooseAnotherSection() {
    setSelectedSectionKey('')
    setSelectedModeId('')
    setQuestionQueue([])
    setResults(null)
    setStep(selectedSourceId ? 'section' : 'book')
  }

  function playAgain() {
    startGame()
  }

  const selectedSourceTitle = getSourceTitle(selectedSource)
  const stepLabels = {
    book: 'Pick a book',
    section: 'Pick a section',
    mode: 'Pick a challenge',
    play: selectedMode?.shortName || 'Challenge',
    results: 'Game over'
  }
  const stepOrder = ['book', 'section', 'mode']
  const activeStepIndex = Math.max(0, stepOrder.indexOf(step))

  return (
    <section className="game-page">
      <div className="game-arcade-frame">
        <header className="game-arcade-header">
          <button
            className="game-back-button"
            type="button"
            onClick={step === 'book' ? undefined : step === 'section' ? chooseAnotherBook : chooseAnotherSection}
            aria-label="Go back"
            disabled={step === 'book' || step === 'play'}
          >
            ←
          </button>
          <div className="game-title-lockup">
            <p className="game-eyebrow">Nostalgic Decades Trivia</p>
            <h2>{stepLabels[step]}</h2>
          </div>
        </header>

      {error ? <p className="game-error">{error}</p> : null}

      {step !== 'play' && step !== 'results' ? (
        <ol className="game-stepper" aria-label="Game setup steps">
          {[
            ['01', 'Book'],
            ['02', 'Section'],
            ['03', 'Challenge']
          ].map(([number, label], index) => (
            <li
              className={index < activeStepIndex ? 'game-step-complete' : index === activeStepIndex ? 'game-step-active' : ''}
              key={label}
            >
              <span className="game-step-number">{number}</span>
              <span className="game-step-label">{label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {step === 'book' ? (
        <div className="game-panel">
          <div className="game-panel-heading">
            <p className="game-eyebrow">Step 1 · Library shelf</p>
            <p>Tap a cover to open that book’s question shelves.</p>
          </div>

          {isLoadingSources ? <p>Loading books...</p> : null}

          {!isLoadingSources && sources.length > 0 ? (
            <div className="book-card-grid" aria-label="Available trivia books">
              {sources.map((source) => {
                const baseCoverImageUrl = getBaseCoverImageUrl(source)
                const coverImageUrl = getCoverImageUrl(source, 'medium')

                return (
                  <button
                    className="book-card"
                    key={source.id}
                    type="button"
                    onClick={() => handleChooseSource(source.id)}
                  >
                    <div className="book-cover-frame">
                      {coverImageUrl ? (
                        <img
                          src={coverImageUrl}
                          alt={`${getSourceTitle(source)} cover`}
                          loading="lazy"
                          onError={(event) => {
                            if (baseCoverImageUrl && !event.currentTarget.dataset.coverFallbackApplied) {
                              event.currentTarget.dataset.coverFallbackApplied = 'true'
                              event.currentTarget.src = baseCoverImageUrl
                            }
                          }}
                        />
                      ) : (
                        <span>No cover yet</span>
                      )}
                    </div>
                    <span className="book-card-copy">
                      <span className="book-card-kicker">Open volume</span>
                      <span className="book-card-title">{getSourceTitle(source)}</span>
                      {source.author ? <span className="book-card-author">{source.author}</span> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}

          {!isLoadingSources && !sources.length ? <p>No active books found.</p> : null}
          {isLoadingQuestions ? <p>Loading sections...</p> : null}
        </div>
      ) : null}

      {step === 'section' ? (
        <div className="game-panel">
          {selectedSource ? (
            <div className="selected-book-banner">
              <div className="selected-book-cover">
                {getCoverImageUrl(selectedSource, 'medium') ? (
                  <img src={getCoverImageUrl(selectedSource, 'medium')} alt={`${selectedSourceTitle} cover`} />
                ) : null}
              </div>
              <div>
                <p className="game-eyebrow">Now reading</p>
                <h3>{selectedSourceTitle}</h3>
              </div>
            </div>
          ) : null}

          <div className="game-panel-heading">
            <p className="game-eyebrow">Step 2 · Pick any topic</p>
          </div>

          {isLoadingQuestions ? <p>Loading sections...</p> : null}

          {!isLoadingQuestions && sectionCards.length > 0 ? (
            <div className="section-card-grid">
              {sectionCards.map((section, index) => (
                <button
                  className="section-card"
                  key={section.key}
                  type="button"
                  onClick={() => handleChooseSection(section.key)}
                >
                  <span className="section-card-mark" aria-hidden="true">
                    <SectionIcon type={getSectionIconType(section.key, index)} />
                  </span>
                  <span className="section-card-title">{section.key}</span>
                  <small>{section.questionCount} questions</small>
                </button>
              ))}
            </div>
          ) : null}

          {!isLoadingQuestions && !sectionCards.length ? <p>No active sections found for this book.</p> : null}

          <button className="game-secondary-button" type="button" onClick={chooseAnotherBook}>
            Choose another book
          </button>
        </div>
      ) : null}

      {step === 'mode' ? (
        <div className="game-panel">
          <div className="game-panel-heading">
            <p className="game-eyebrow">Step 3 · Last step</p>
          </div>

          <div className="mode-card-grid">
            {Object.values(GAME_MODES).map((mode) => (
              <button
                className={selectedModeId === mode.id ? 'mode-card mode-card-selected' : 'mode-card'}
                key={mode.id}
                type="button"
                onClick={() => handleChooseMode(mode.id)}
              >
                <span className="mode-card-icon" aria-hidden="true"><ChallengeIcon type={mode.icon} /></span>
                <span className="mode-card-tagline">{mode.tagline}</span>
                <strong>{mode.name}</strong>
                <small>{mode.description}</small>
              </button>
            ))}
          </div>

          <button
            className="game-primary-button"
            type="button"
            onClick={startGame}
            disabled={!selectedModeId || !selectedSectionQuestions.length}
          >
            Start playing
          </button>
          <button className="game-secondary-button" type="button" onClick={chooseAnotherSection}>
            Choose another section
          </button>
        </div>
      ) : null}

      {step === 'play' && currentQuestion ? (
        <div className="play-screen">
          <div className="play-status-bar">
            <button className="play-exit-button" type="button" onClick={chooseAnotherSection} aria-label="Exit challenge">×</button>
            <div>
              <span>{selectedModeId === GAME_MODES.sprint.id ? 'Timer' : 'Lives'}</span>
              <strong>
                {selectedModeId === GAME_MODES.sprint.id
                  ? `${secondsRemaining}s`
                  : '♥'.repeat(livesRemaining)}
              </strong>
            </div>
            <div>
              <span>Score</span>
              <strong>
                {correctCount}/{attemptedCount}
              </strong>
            </div>
          </div>
          <div className="play-progress-track" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.max(8, ((currentQuestionIndex + 1) / Math.max(1, questionQueue.length)) * 100))}%` }} />
          </div>

          <article className="question-card">
            <div className="question-pill-row">
              {categoriesById[String(currentQuestion.category_id)] ? (
                <span className="category-pill">{categoriesById[String(currentQuestion.category_id)]}</span>
              ) : null}
              {currentQuestion.difficulty ? (
                <span className="difficulty-pill">{currentQuestion.difficulty}</span>
              ) : null}
            </div>
            <p className="question-count-label">
              Question {currentQuestionIndex + 1}
            </p>
            <h3>{currentQuestion.question_text}</h3>

            <div className="answer-grid">
              {getChoiceEntries(currentQuestion).map((choice) => {
                const isSelected = selectedAnswerIndex === choice.index
                const isCorrectChoice = choice.index === Number(currentQuestion.correct_index)
                let buttonClassName = 'answer-button'

                if ((selectedAnswerIndex !== null || SHOW_CORRECT_ANSWER_DEBUG) && isCorrectChoice) {
                  buttonClassName += ' answer-button-correct'
                } else if (isSelected && !isCorrectChoice) {
                  buttonClassName += ' answer-button-incorrect'
                }

                return (
                  <button
                    className={buttonClassName}
                    key={`${choice.key}-${choice.index}`}
                    type="button"
                    onClick={() => handleAnswer(choice.index)}
                    disabled={selectedAnswerIndex !== null || choice.text === 'Unavailable'}
                  >
                    <span>{choice.key}</span>
                    {choice.text}
                  </button>
                )
              })}
            </div>

            {selectedAnswerIndex !== null ? (
              <div className={lastAnswerWasCorrect ? 'answer-feedback correct' : 'answer-feedback incorrect'}>
                <strong>{lastAnswerWasCorrect ? 'Correct!' : 'Not quite.'}</strong>
                {shouldEndAfterFeedback ? <span>Review your result when you are ready.</span> : null}
              </div>
            ) : null}
          </article>

          {selectedAnswerIndex !== null ? (
            <button className="game-primary-button" type="button" onClick={moveToNextQuestion}>
              {shouldEndAfterFeedback ? 'Show results' : 'Next question'}
            </button>
          ) : null}
        </div>
      ) : null}

      {step === 'results' && results ? (
        <div className="results-screen">
          <p className="game-eyebrow">Challenge complete</p>
          <div className="result-stars" aria-hidden="true">★★★</div>
          <h3><span>{results.percentCorrect}</span>%</h3>
          <p className="results-scoreline">{results.correctCount} of {results.attemptedCount} correct</p>
          <p className="results-summary">{getResultMessage(results.percentCorrect)}</p>
          <dl className="results-list">
            <div>
              <dt>Challenge played</dt>
              <dd>{results.challengeName}</dd>
            </div>
            <div>
              <dt>Book</dt>
              <dd>{results.sourceTitle}</dd>
            </div>
            <div>
              <dt>Section</dt>
              <dd>{results.sectionName}</dd>
            </div>
            <div>
              <dt>Correct answers</dt>
              <dd>{results.correctCount}</dd>
            </div>
            <div>
              <dt>Attempted questions</dt>
              <dd>{results.attemptedCount}</dd>
            </div>
            <div>
              <dt>Percent correct</dt>
              <dd>{results.percentCorrect}%</dd>
            </div>
          </dl>

          <div className="result-actions">
            <button className="game-primary-button" type="button" onClick={playAgain}>
              Play again
            </button>
            <button className="game-secondary-button" type="button" onClick={chooseAnotherSection}>
              Choose another section
            </button>
            <button className="game-secondary-button" type="button" onClick={chooseAnotherBook}>
              Choose another book
            </button>
          </div>
        </div>
      ) : null}
      </div>
    </section>
  )
}

export default GamePage
