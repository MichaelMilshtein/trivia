import { useEffect, useMemo, useState } from 'react'
import {
  insertInto,
  selectFrom,
  signOut,
  supabase,
  updateRows
} from '../lib/supabaseClient'

const ALLOWED_ADMIN_EMAILS = ['admin@example.com', 'michael.milshtein@gmail.com']

const QUESTION_COLUMNS =
  'id,question_text,choice_a,choice_b,choice_c,choice_d,correct_index,question_type,difficulty,is_active,source_id,category_id,section'
const QUESTION_PREVIEW_LENGTH = 80
const SOURCE_DESCRIPTION_PREVIEW_LENGTH = 120
const QUESTION_MATRIX_SECTION_ORDER = [
  'World Events',
  'Culture',
  'Culture & Lifestyle',
  'Entertainment',
  'Entertainment & Media',
  'Food',
  'Technology',
  'Technology & Innovation',
  'Globalization & Economy',
  'Decade Potpourri',
  'Bonus Pages'
]
const UNSECTIONED_QUESTION_LABEL = 'Unsectioned'
const QUESTION_FETCH_PAGE_SIZE = 1000
const QUESTION_MATRIX_SECTION_MAPPINGS = {
  'world events': 'World Events & Economy',
  'globalization & economy': 'World Events & Economy',
  culture: 'Culture & Lifestyle',
  'culture & lifestyle': 'Culture & Lifestyle',
  entertainment: 'Entertainment & Media',
  'entertainment & media': 'Entertainment & Media',
  food: 'Food',
  technology: 'Technology & Innovation',
  'technology & innovation': 'Technology & Innovation',
  'bonus pages': 'Mixed Bag',
  'decade potpourri': 'Mixed Bag'
}

function getQuestionMatrixSectionMapping(sectionName) {
  return QUESTION_MATRIX_SECTION_MAPPINGS[(sectionName || '').trim().toLowerCase()] || 'Unmapped'
}

function getSourceSortTitle(source) {
  return (source.short_title || '').toLowerCase()
}

function compareSourcesByDisplayOrderThenTitle(sourceA, sourceB) {
  const hasDisplayOrderA = sourceA.display_order !== null && sourceA.display_order !== undefined
  const hasDisplayOrderB = sourceB.display_order !== null && sourceB.display_order !== undefined

  if (hasDisplayOrderA && hasDisplayOrderB) {
    const displayOrderA = Number(sourceA.display_order)
    const displayOrderB = Number(sourceB.display_order)

    if (displayOrderA !== displayOrderB) {
      return displayOrderA - displayOrderB
    }
  }

  if (hasDisplayOrderA !== hasDisplayOrderB) {
    return hasDisplayOrderA ? -1 : 1
  }

  return getSourceSortTitle(sourceA).localeCompare(getSourceSortTitle(sourceB))
}

const QUESTION_SORT_FIELDS = {
  source: 'source',
  section: 'section',
  category: 'category',
  difficulty: 'difficulty',
  active: 'active'
}

const ADMIN_NAV_ITEMS = [
  { id: 'admin-overview', href: '#admin-overview', label: 'Dashboard / Overview', icon: '▦' },
  { id: 'admin-sources', href: '#admin-sources', label: 'Book Sources', icon: '▤' },
  { id: 'admin-categories', href: '#admin-categories', label: 'Categories', icon: '◇' },
  { id: 'admin-question-import', href: '#admin-question-import', label: 'Question Import', icon: '↥' },
  { id: 'admin-questions-list', href: '#admin-questions-list', label: 'Question List', icon: '☰' }
]

function AdminPage() {
  const [authSession, setAuthSession] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [categories, setCategories] = useState([])
  const [sources, setSources] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editCategoryDescription, setEditCategoryDescription] = useState('')
  const [editCategoryIsActive, setEditCategoryIsActive] = useState(true)
  const [categoryUpdateMessage, setCategoryUpdateMessage] = useState('')
  const [categoryUpdateError, setCategoryUpdateError] = useState('')
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)
  const [categoryDrawerMode, setCategoryDrawerMode] = useState('')
  const [sourceShortTitle, setSourceShortTitle] = useState('')
  const [sourceFullTitle, setSourceFullTitle] = useState('')
  const [sourceFrontCoverImageUrl, setSourceFrontCoverImageUrl] = useState('')
  const [sourceBackCoverImageUrl, setSourceBackCoverImageUrl] = useState('')
  const [sourceDescription, setSourceDescription] = useState('')
  const [sourceStoreUrl, setSourceStoreUrl] = useState('')
  const [sourceAuthor, setSourceAuthor] = useState('')
  const [sourceDisplayOrder, setSourceDisplayOrder] = useState('0')
  const [sourceIsActive, setSourceIsActive] = useState(true)
  const [sourceSubmitMessage, setSourceSubmitMessage] = useState('')
  const [sourceSubmitError, setSourceSubmitError] = useState('')
  const [isSubmittingSource, setIsSubmittingSource] = useState(false)
  const [editingSourceId, setEditingSourceId] = useState('')
  const [editSourceShortTitle, setEditSourceShortTitle] = useState('')
  const [editSourceFullTitle, setEditSourceFullTitle] = useState('')
  const [editSourceFrontCoverImageUrl, setEditSourceFrontCoverImageUrl] = useState('')
  const [editSourceBackCoverImageUrl, setEditSourceBackCoverImageUrl] = useState('')
  const [editSourceDescription, setEditSourceDescription] = useState('')
  const [editSourceStoreUrl, setEditSourceStoreUrl] = useState('')
  const [editSourceAuthor, setEditSourceAuthor] = useState('')
  const [editSourceDisplayOrder, setEditSourceDisplayOrder] = useState('0')
  const [editSourceIsActive, setEditSourceIsActive] = useState(true)
  const [sourceUpdateMessage, setSourceUpdateMessage] = useState('')
  const [sourceUpdateError, setSourceUpdateError] = useState('')
  const [isUpdatingSource, setIsUpdatingSource] = useState(false)
  const [sourceDrawerMode, setSourceDrawerMode] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [questionsJson, setQuestionsJson] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [categoryQuestions, setCategoryQuestions] = useState([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [questionsError, setQuestionsError] = useState('')
  const [questionColumnFilters, setQuestionColumnFilters] = useState({
    question: '',
    source: '',
    section: '',
    category: '',
    type: 'all',
    difficulty: 'all',
    active: 'all'
  })
  const [editingQuestionId, setEditingQuestionId] = useState('')
  const [editQuestionText, setEditQuestionText] = useState('')
  const [editChoiceA, setEditChoiceA] = useState('')
  const [editChoiceB, setEditChoiceB] = useState('')
  const [editChoiceC, setEditChoiceC] = useState('')
  const [editChoiceD, setEditChoiceD] = useState('')
  const [editCorrectIndex, setEditCorrectIndex] = useState('0')
  const [editQuestionType, setEditQuestionType] = useState('mc_single')
  const [editDifficulty, setEditDifficulty] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editSection, setEditSection] = useState('')
  const [editSourceId, setEditSourceId] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [isUpdatingQuestion, setIsUpdatingQuestion] = useState(false)
  const [questionUpdateMessage, setQuestionUpdateMessage] = useState('')
  const [questionUpdateError, setQuestionUpdateError] = useState('')
  const [questionDrawerMode, setQuestionDrawerMode] = useState('')
  const [isTogglingQuestionActive, setIsTogglingQuestionActive] = useState(false)
  const [questionActiveMessage, setQuestionActiveMessage] = useState('')
  const [questionActiveError, setQuestionActiveError] = useState('')
  const [questionSortField, setQuestionSortField] = useState(QUESTION_SORT_FIELDS.source)
  const [questionSortDirection, setQuestionSortDirection] = useState('asc')
  const [questionMatrixQuestions, setQuestionMatrixQuestions] = useState([])
  const [isLoadingQuestionMatrix, setIsLoadingQuestionMatrix] = useState(false)
  const [questionMatrixError, setQuestionMatrixError] = useState('')
  const [openAdminSectionId, setOpenAdminSectionId] = useState('admin-overview')
  const [isAdminSidebarCollapsed, setIsAdminSidebarCollapsed] = useState(false)

  const signedInEmail = (authSession?.user?.email || '').trim().toLowerCase()
  const allowedAdminEmails = useMemo(
    () => ALLOWED_ADMIN_EMAILS.map((email) => email.trim().toLowerCase()),
    []
  )
  const isAdminAuthorized = Boolean(signedInEmail && allowedAdminEmails.includes(signedInEmail))

  const sourceShortTitlesById = useMemo(
    () =>
      sources.reduce((accumulator, source) => {
        accumulator[source.id] = source.short_title
        return accumulator
      }, {}),
    [sources]
  )

  const categoryNamesById = useMemo(
    () =>
      categories.reduce((accumulator, category) => {
        accumulator[category.id] = category.name
        return accumulator
      }, {}),
    [categories]
  )

  const sourcesByNormalizedShortTitle = useMemo(
    () =>
      sources.reduce((accumulator, source) => {
        const normalizedShortTitle = (source.short_title || '').trim().toLowerCase()
        if (normalizedShortTitle) {
          accumulator[normalizedShortTitle] = source
        }
        return accumulator
      }, {}),
    [sources]
  )

  const questionMatrix = useMemo(() => {
    const activeSources = sources.filter((source) => source.is_active)
    const activeSourceIds = new Set(activeSources.map((source) => String(source.id)))
    const sectionNamesByKey = new Map()
    const countsBySourceAndSection = new Map()
    const rowTotalsBySection = new Map()
    const columnTotalsBySource = activeSources.reduce((accumulator, source) => {
      accumulator[String(source.id)] = 0
      return accumulator
    }, {})

    questionMatrixQuestions.forEach((question) => {
      const sourceId = String(question.source_id || '')

      if (!activeSourceIds.has(sourceId) || !question.is_active) {
        return
      }

      const sectionName = (question.section || '').trim() || UNSECTIONED_QUESTION_LABEL
      const sectionKey = sectionName.toLowerCase()
      const sourceSectionKey = `${sourceId}::${sectionKey}`

      if (!sectionNamesByKey.has(sectionKey)) {
        sectionNamesByKey.set(sectionKey, sectionName)
      }

      countsBySourceAndSection.set(
        sourceSectionKey,
        (countsBySourceAndSection.get(sourceSectionKey) || 0) + 1
      )
      rowTotalsBySection.set(sectionKey, (rowTotalsBySection.get(sectionKey) || 0) + 1)
      columnTotalsBySource[sourceId] = (columnTotalsBySource[sourceId] || 0) + 1
    })

    const orderedSectionKeys = [...sectionNamesByKey.keys()].sort((sectionKeyA, sectionKeyB) => {
      const sectionNameA = sectionNamesByKey.get(sectionKeyA)
      const sectionNameB = sectionNamesByKey.get(sectionKeyB)
      const preferredIndexA = QUESTION_MATRIX_SECTION_ORDER.indexOf(sectionNameA)
      const preferredIndexB = QUESTION_MATRIX_SECTION_ORDER.indexOf(sectionNameB)
      const hasPreferredOrderA = preferredIndexA !== -1
      const hasPreferredOrderB = preferredIndexB !== -1

      if (hasPreferredOrderA && hasPreferredOrderB) {
        return preferredIndexA - preferredIndexB
      }

      if (hasPreferredOrderA) {
        return -1
      }

      if (hasPreferredOrderB) {
        return 1
      }

      if (sectionNameA === UNSECTIONED_QUESTION_LABEL && sectionNameB !== UNSECTIONED_QUESTION_LABEL) {
        return 1
      }

      if (sectionNameB === UNSECTIONED_QUESTION_LABEL && sectionNameA !== UNSECTIONED_QUESTION_LABEL) {
        return -1
      }

      return sectionNameA.localeCompare(sectionNameB)
    })

    const rows = orderedSectionKeys.map((sectionKey) => {
      const label = sectionNamesByKey.get(sectionKey)

      return {
        key: sectionKey,
        label,
        sectionMapping: getQuestionMatrixSectionMapping(label),
        total: rowTotalsBySection.get(sectionKey) || 0
      }
    })

    const grandTotal = Object.values(columnTotalsBySource).reduce(
      (total, sourceTotal) => total + sourceTotal,
      0
    )

    return {
      activeSources,
      rows,
      countsBySourceAndSection,
      columnTotalsBySource,
      grandTotal
    }
  }, [questionMatrixQuestions, sources])

  const categoriesByNormalizedName = useMemo(
    () =>
      categories.reduce((accumulator, category) => {
        const normalizedName = (category.name || '').trim().toLowerCase()
        if (normalizedName) {
          accumulator[normalizedName] = category
        }
        return accumulator
      }, {}),
    [categories]
  )

  const questionTypeOptions = useMemo(() => {
    const typeValues = new Set(categoryQuestions.map((question) => question.question_type || 'mc_single'))
    return [...typeValues].sort((typeA, typeB) => typeA.localeCompare(typeB))
  }, [categoryQuestions])

  const questionDifficultyOptions = useMemo(() => {
    const difficultyValues = new Set(
      categoryQuestions.map((question) => question.difficulty || 'unknown')
    )
    return [...difficultyValues].sort((difficultyA, difficultyB) =>
      difficultyA.localeCompare(difficultyB)
    )
  }, [categoryQuestions])

  const filteredCategoryQuestions = useMemo(() => {
    const normalizedQuestionFilter = questionColumnFilters.question.trim().toLowerCase()
    const normalizedSectionFilter = questionColumnFilters.section.trim().toLowerCase()

    const filteredQuestions = categoryQuestions.filter((question) => {
      const sourceId = String(question.source_id || '')
      const categoryId = String(question.category_id || '')
      const questionType = question.question_type || 'mc_single'
      const difficulty = question.difficulty || 'unknown'
      const isActive = Boolean(question.is_active)

      const questionColumnMatches = normalizedQuestionFilter
        ? (question.question_text || '').toLowerCase().includes(normalizedQuestionFilter)
        : true

      const sourceColumnMatches = questionColumnFilters.source
        ? sourceId === questionColumnFilters.source
        : true

      const sectionColumnMatches = normalizedSectionFilter
        ? (question.section || '').toLowerCase().includes(normalizedSectionFilter)
        : true

      const categoryColumnMatches = questionColumnFilters.category
        ? categoryId === questionColumnFilters.category
        : true

      const typeColumnMatches =
        questionColumnFilters.type === 'all' ? true : questionType === questionColumnFilters.type

      const difficultyColumnMatches =
        questionColumnFilters.difficulty === 'all'
          ? true
          : difficulty === questionColumnFilters.difficulty

      const activeColumnMatches =
        questionColumnFilters.active === 'all'
          ? true
          : questionColumnFilters.active === 'active'
            ? isActive
            : !isActive

      return (
        questionColumnMatches &&
        sourceColumnMatches &&
        sectionColumnMatches &&
        categoryColumnMatches &&
        typeColumnMatches &&
        difficultyColumnMatches &&
        activeColumnMatches
      )
    })

    return [...filteredQuestions].sort((questionA, questionB) => {
      function getSortValue(question) {
        if (questionSortField === QUESTION_SORT_FIELDS.source) {
          return (sourceShortTitlesById[question.source_id] || 'No source').toLowerCase()
        }

        if (questionSortField === QUESTION_SORT_FIELDS.section) {
          return (question.section || '').toLowerCase()
        }

        if (questionSortField === QUESTION_SORT_FIELDS.category) {
          return (categoryNamesById[question.category_id] || 'Unknown').toLowerCase()
        }

        if (questionSortField === QUESTION_SORT_FIELDS.difficulty) {
          return (question.difficulty || 'unknown').toLowerCase()
        }

        if (questionSortField === QUESTION_SORT_FIELDS.active) {
          return question.is_active ? 1 : 0
        }

        return ''
      }

      const valueA = getSortValue(questionA)
      const valueB = getSortValue(questionB)

      if (valueA < valueB) {
        return questionSortDirection === 'asc' ? -1 : 1
      }

      if (valueA > valueB) {
        return questionSortDirection === 'asc' ? 1 : -1
      }

      return String(questionA.id).localeCompare(String(questionB.id))
    })
  }, [
    categoryQuestions,
    questionColumnFilters,
    sourceShortTitlesById,
    categoryNamesById,
    questionSortField,
    questionSortDirection
  ])

  function handleQuestionSort(sortField) {
    if (questionSortField === sortField) {
      setQuestionSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
      return
    }

    setQuestionSortField(sortField)
    setQuestionSortDirection('asc')
  }

  function getSortDirectionIndicator(sortField) {
    if (questionSortField !== sortField) {
      return '↕'
    }

    return questionSortDirection === 'asc' ? '↑' : '↓'
  }

  function getQuestionPreview(questionText) {
    const trimmedText = (questionText || '').trim()

    if (trimmedText.length <= QUESTION_PREVIEW_LENGTH) {
      return trimmedText
    }

    return `${trimmedText.slice(0, QUESTION_PREVIEW_LENGTH)}…`
  }

  function getSourceDescriptionPreview(descriptionText) {
    const trimmedText = (descriptionText || '').trim()

    if (!trimmedText) {
      return 'N/A'
    }

    if (trimmedText.length <= SOURCE_DESCRIPTION_PREVIEW_LENGTH) {
      return trimmedText
    }

    return `${trimmedText.slice(0, SOURCE_DESCRIPTION_PREVIEW_LENGTH)}…`
  }

  function renderSourceLink(linkUrl, label) {
    if (!linkUrl) {
      return <span className="admin-source-meta-empty">{label}: —</span>
    }

    return (
      <a href={linkUrl} target="_blank" rel="noreferrer">
        {label}
      </a>
    )
  }

  function renderSourceCoverThumbnail(imagePath, label) {
    if (!imagePath) {
      return <span className="admin-source-meta-empty">{label}: No image</span>
    }

    return (
      <div className="admin-source-cover-thumbnail">
        <span className="admin-source-cover-label">{label}</span>
        <img src={imagePath} alt={`${label} thumbnail`} loading="lazy" />
      </div>
    )
  }

  async function handleEmailPasswordSignIn(event) {
    event.preventDefault()
    setLoginError('')
    setIsSigningIn(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      })

      if (signInError) {
        throw signInError
      }

      setAuthSession(data.session)
      setLoginPassword('')
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Unable to sign in with email and password.')
    } finally {
      setIsSigningIn(false)
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    setLoginError('')

    try {
      await signOut()
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Unable to sign out cleanly.')
    } finally {
      setAuthSession(null)
      setCategories([])
      setSources([])
      setCategoryQuestions([])
      setQuestionMatrixQuestions([])
      setIsSigningOut(false)
    }
  }

  async function loadCategories() {
    setError('')

    const rows = await selectFrom('categories', {
      columns: 'id,name,description,is_active'
    })

    setCategories(rows)
  }

  async function loadSources() {
    const rows = await selectFrom('sources', {
      columns:
        'id,short_title,full_title,front_cover_image_url,back_cover_image_url,description,store_url,author,display_order,is_active'
    })

    const sortedRows = [...rows].sort(compareSourcesByDisplayOrderThenTitle)

    setSources(sortedRows)
  }

  async function loadQuestionMatrixQuestions() {
    setIsLoadingQuestionMatrix(true)
    setQuestionMatrixError('')

    try {
      const activeQuestionRows = []
      let offset = 0
      let hasMoreQuestions = true

      while (hasMoreQuestions) {
        const questionPage = await selectFrom('questions', {
          columns: 'id,is_active,source_id,section',
          filters: {
            is_active: 'eq.true',
            order: 'id.asc',
            limit: String(QUESTION_FETCH_PAGE_SIZE),
            offset: String(offset)
          }
        })

        activeQuestionRows.push(...questionPage)
        hasMoreQuestions = questionPage.length === QUESTION_FETCH_PAGE_SIZE
        offset += QUESTION_FETCH_PAGE_SIZE
      }

      setQuestionMatrixQuestions(activeQuestionRows)
    } catch (err) {
      setQuestionMatrixError(
        err instanceof Error ? err.message : 'Failed to load question matrix.'
      )
    } finally {
      setIsLoadingQuestionMatrix(false)
    }
  }

  async function fetchCategoryQuestions() {
    const questionRows = []
    let offset = 0
    let hasMoreQuestions = true

    while (hasMoreQuestions) {
      const questionPage = await selectFrom('questions', {
        columns: QUESTION_COLUMNS,
        filters: {
          order: 'id.desc',
          limit: String(QUESTION_FETCH_PAGE_SIZE),
          offset: String(offset)
        }
      })

      questionRows.push(...questionPage)
      hasMoreQuestions = questionPage.length === QUESTION_FETCH_PAGE_SIZE
      offset += QUESTION_FETCH_PAGE_SIZE
    }

    return questionRows
  }

  async function refreshCategoryQuestions() {
    const rows = await fetchCategoryQuestions()
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
    setEditQuestionType('mc_single')
    setEditDifficulty('')
    setEditIsActive(true)
    setEditSection('')
    setEditSourceId('')
    setEditCategoryId('')
  }

  function loadQuestionIntoEditForm(question) {
    setEditingQuestionId(question.id)
    setEditQuestionText(question.question_text || '')
    setEditChoiceA(question.choice_a || '')
    setEditChoiceB(question.choice_b || '')
    setEditChoiceC(question.choice_c || '')
    setEditChoiceD(question.choice_d || '')
    setEditCorrectIndex(String(question.correct_index ?? 0))
    setEditQuestionType(question.question_type || 'mc_single')
    setEditDifficulty(question.difficulty || '')
    setEditIsActive(Boolean(question.is_active))
    setEditSection(question.section || '')
    setEditSourceId(question.source_id || '')
    setEditCategoryId(question.category_id || '')
    setQuestionUpdateMessage('')
    setQuestionUpdateError('')
  }

  function loadSourceIntoEditForm(source) {
    setEditingSourceId(source.id)
    setEditSourceShortTitle(source.short_title || '')
    setEditSourceFullTitle(source.full_title || '')
    setEditSourceFrontCoverImageUrl(source.front_cover_image_url || '')
    setEditSourceBackCoverImageUrl(source.back_cover_image_url || '')
    setEditSourceDescription(source.description || '')
    setEditSourceStoreUrl(source.store_url || '')
    setEditSourceAuthor(source.author || '')
    setEditSourceDisplayOrder(String(source.display_order ?? 0))
    setEditSourceIsActive(Boolean(source.is_active))
    setSourceUpdateMessage('')
    setSourceUpdateError('')
  }

  function loadCategoryIntoEditForm(category) {
    setEditingCategoryId(category.id)
    setEditCategoryName(category.name || '')
    setEditCategoryDescription(category.description || '')
    setEditCategoryIsActive(Boolean(category.is_active))
    setCategoryUpdateMessage('')
    setCategoryUpdateError('')
  }


  function openNewCategoryDrawer() {
    setName('')
    setDescription('')
    setIsActive(true)
    setSubmitMessage('')
    setSubmitError('')
    setCategoryUpdateMessage('')
    setCategoryUpdateError('')
    setCategoryDrawerMode('new')
  }

  function openEditCategoryDrawer(category) {
    loadCategoryIntoEditForm(category)
    setCategoryDrawerMode('edit')
  }

  function closeCategoryDrawer() {
    setCategoryDrawerMode('')
  }

  function openNewSourceDrawer() {
    setSourceShortTitle('')
    setSourceFullTitle('')
    setSourceFrontCoverImageUrl('')
    setSourceBackCoverImageUrl('')
    setSourceDescription('')
    setSourceStoreUrl('')
    setSourceAuthor('')
    setSourceDisplayOrder('0')
    setSourceIsActive(true)
    setSourceSubmitMessage('')
    setSourceSubmitError('')
    setSourceUpdateMessage('')
    setSourceUpdateError('')
    setSourceDrawerMode('new')
  }

  function openEditSourceDrawer(source) {
    loadSourceIntoEditForm(source)
    setSourceDrawerMode('edit')
  }

  function closeSourceDrawer() {
    setSourceDrawerMode('')
  }

  function openNewQuestionDrawer() {
    resetQuestionEditForm()
    setEditSourceId(selectedSourceId || '')
    setEditCategoryId(selectedCategoryId || '')
    setQuestionUpdateMessage('')
    setQuestionUpdateError('')
    setQuestionDrawerMode('new')
  }

  function openEditQuestionDrawer(question) {
    loadQuestionIntoEditForm(question)
    setQuestionDrawerMode('edit')
  }

  function closeQuestionDrawer() {
    setQuestionDrawerMode('')
  }

  function updateQuestionColumnFilter(filterName, filterValue) {
    setQuestionColumnFilters((currentFilters) => ({
      ...currentFilters,
      [filterName]: filterValue
    }))
  }

  function resetQuestionListFilters() {
    setQuestionColumnFilters({
      question: '',
      source: '',
      section: '',
      category: '',
      type: 'all',
      difficulty: 'all',
      active: 'all'
    })
  }

  useEffect(() => {
    let isMounted = true

    async function initializeAuthSession() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (isMounted) {
          setAuthSession(data.session)
        }
      } catch (err) {
        if (isMounted) {
          setLoginError(err instanceof Error ? err.message : 'Unable to check Admin session.')
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false)
        }
      }
    }

    initializeAuthSession()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isAdminAuthorized) {
      setIsLoading(false)
      return undefined
    }

    setIsLoading(true)

    async function initializeCategories() {
      try {
        await Promise.all([loadCategories(), loadSources(), loadQuestionMatrixQuestions()])
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
    return undefined
  }, [isAdminAuthorized])

  useEffect(() => {
    if (!isAdminAuthorized) {
      setIsLoadingQuestions(false)
      return undefined
    }

    async function loadQuestionsForCategory() {
      setIsLoadingQuestions(true)
      setQuestionsError('')

      try {
        const rows = await fetchCategoryQuestions()
        setCategoryQuestions(rows)
      } catch (err) {
        setQuestionsError(err instanceof Error ? err.message : 'Failed to load questions.')
      } finally {
        setIsLoadingQuestions(false)
      }
    }

    loadQuestionsForCategory()
    return undefined
  }, [isAdminAuthorized])

  useEffect(() => {
    if (!categoryDrawerMode && !sourceDrawerMode && !questionDrawerMode) {
      return undefined
    }

    function handleDrawerKeyDown(event) {
      if (event.key !== 'Escape') {
        return
      }

      if (questionDrawerMode) {
        closeQuestionDrawer()
        return
      }

      if (sourceDrawerMode) {
        closeSourceDrawer()
        return
      }

      if (categoryDrawerMode) {
        closeCategoryDrawer()
      }
    }

    window.addEventListener('keydown', handleDrawerKeyDown)

    return () => window.removeEventListener('keydown', handleDrawerKeyDown)
  }, [categoryDrawerMode, sourceDrawerMode, questionDrawerMode])

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
      setCategoryDrawerMode('')
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

  async function handleUpdateCategory(event) {
    event.preventDefault()
    setCategoryUpdateMessage('')
    setCategoryUpdateError('')

    if (!editingCategoryId) {
      setCategoryUpdateError('Select a category to edit first.')
      return
    }

    if (!editCategoryName.trim()) {
      setCategoryUpdateError('Category name is required.')
      return
    }

    setIsUpdatingCategory(true)

    try {
      await updateRows(
        'categories',
        {
          name: editCategoryName.trim(),
          description: editCategoryDescription.trim(),
          is_active: editCategoryIsActive
        },
        { id: `eq.${editingCategoryId}` }
      )

      setCategoryUpdateMessage('Category updated successfully.')
      setCategoryDrawerMode('')
      await loadCategories()
    } catch (err) {
      setCategoryUpdateError(err instanceof Error ? err.message : 'Failed to update category.')
    } finally {
      setIsUpdatingCategory(false)
    }
  }

  async function handleImportQuestions(event) {
    event.preventDefault()
    setImportMessage('')
    setImportError('')

    setIsImporting(true)

    try {
      const parsed = JSON.parse(questionsJson)
      const sourceQuestions = parsed?.questions
      const jsonSourceTitle =
        typeof parsed?.source_title === 'string' ? parsed.source_title.trim() : ''
      const fallbackSourceId = selectedSourceId || null
      const fallbackCategoryId = selectedCategoryId || null

      if (!Array.isArray(sourceQuestions) || sourceQuestions.length === 0) {
        throw new Error('JSON must include a non-empty "questions" array.')
      }

      let resolvedSourceId = fallbackSourceId

      if (jsonSourceTitle) {
        const matchedSource = sourcesByNormalizedShortTitle[jsonSourceTitle.toLowerCase()]
        if (!matchedSource) {
          throw new Error(`No source found with short title "${jsonSourceTitle}".`)
        }
        resolvedSourceId = matchedSource.id
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
        const resolvedSection = questionSection
        const questionCategoryName =
          typeof question.category === 'string' ? question.category.trim() : ''

        let resolvedCategoryId = fallbackCategoryId

        if (questionCategoryName) {
          const matchedCategory = categoriesByNormalizedName[questionCategoryName.toLowerCase()]
          if (!matchedCategory) {
            validationErrors.push(
              `Question ${questionNumber}: no category found named "${questionCategoryName}".`
            )
          } else {
            resolvedCategoryId = matchedCategory.id
          }
        }

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

        if (!resolvedCategoryId) {
          validationErrors.push(
            `Question ${questionNumber}: category is required (provide question.category or choose a fallback category in the UI).`
          )
        }

        return {
          category_id: resolvedCategoryId,
          question_text: questionText,
          choice_a: typeof choices[0] === 'string' ? choices[0] : '',
          choice_b: typeof choices[1] === 'string' ? choices[1] : '',
          choice_c: typeof choices[2] === 'string' ? choices[2] : '',
          choice_d: typeof choices[3] === 'string' ? choices[3] : '',
          correct_index: correctIndex,
          question_type:
            typeof question.question_type === 'string' && question.question_type.trim()
              ? question.question_type.trim()
              : 'mc_single',
          difficulty: question.difficulty ?? null,
          is_active: question.is_active ?? true,
          source_id: resolvedSourceId,
          section: resolvedSection || null
        }
      })

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(' '))
      }

      await insertInto('questions', questionRows)

      setImportMessage(`Imported ${questionRows.length} question(s) successfully.`)
      setQuestionsJson('')

      await refreshCategoryQuestions()
      await loadQuestionMatrixQuestions()
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

  async function handleCreateQuestion(event) {
    event.preventDefault()
    setQuestionUpdateMessage('')
    setQuestionUpdateError('')

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
      await insertInto('questions', {
        question_text: editQuestionText.trim(),
        choice_a: editChoiceA.trim(),
        choice_b: editChoiceB.trim(),
        choice_c: editChoiceC.trim(),
        choice_d: editChoiceD.trim(),
        correct_index: parsedCorrectIndex,
        question_type: editQuestionType,
        difficulty: editDifficulty.trim() || null,
        is_active: editIsActive,
        section: editSection.trim() || null,
        source_id: editSourceId || null,
        category_id: editCategoryId || null
      })

      setQuestionUpdateMessage('Question created successfully.')
      setQuestionDrawerMode('')
      resetQuestionEditForm()
      await refreshCategoryQuestions()
      await loadQuestionMatrixQuestions()
    } catch (err) {
      setQuestionUpdateError(err instanceof Error ? err.message : 'Failed to create question.')
    } finally {
      setIsUpdatingQuestion(false)
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
          question_type: editQuestionType,
          difficulty: editDifficulty.trim() || null,
          is_active: editIsActive,
          section: editSection.trim() || null,
          source_id: editSourceId || null,
          category_id: editCategoryId || null
        },
        { id: `eq.${editingQuestionId}` }
      )

      setQuestionUpdateMessage('Question updated successfully.')
      setQuestionDrawerMode('')
      await refreshCategoryQuestions()
      await loadQuestionMatrixQuestions()
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
      const parsedDisplayOrder = Number(sourceDisplayOrder)
      if (!Number.isInteger(parsedDisplayOrder)) {
        throw new Error('Display order must be an integer.')
      }

      await insertInto('sources', {
        short_title: sourceShortTitle.trim(),
        full_title: sourceFullTitle.trim() || null,
        front_cover_image_url: sourceFrontCoverImageUrl.trim() || null,
        back_cover_image_url: sourceBackCoverImageUrl.trim() || null,
        description: sourceDescription.trim() || null,
        store_url: sourceStoreUrl.trim() || null,
        author: sourceAuthor.trim() || null,
        display_order: parsedDisplayOrder,
        is_active: sourceIsActive
      })

      setSourceSubmitMessage('Source created successfully.')
      setSourceDrawerMode('')
      setSourceShortTitle('')
      setSourceFullTitle('')
      setSourceFrontCoverImageUrl('')
      setSourceBackCoverImageUrl('')
      setSourceDescription('')
      setSourceStoreUrl('')
      setSourceAuthor('')
      setSourceDisplayOrder('0')
      setSourceIsActive(true)
      await loadSources()
    } catch (err) {
      setSourceSubmitError(err instanceof Error ? err.message : 'Failed to create source.')
    } finally {
      setIsSubmittingSource(false)
    }
  }

  async function handleUpdateSource(event) {
    event.preventDefault()
    setSourceUpdateMessage('')
    setSourceUpdateError('')

    if (!editingSourceId) {
      setSourceUpdateError('Select a source to edit first.')
      return
    }

    const parsedDisplayOrder = Number(editSourceDisplayOrder)

    if (!Number.isInteger(parsedDisplayOrder)) {
      setSourceUpdateError('Display order must be an integer.')
      return
    }

    setIsUpdatingSource(true)

    try {
      await updateRows(
        'sources',
        {
          short_title: editSourceShortTitle.trim(),
          full_title: editSourceFullTitle.trim() || null,
          front_cover_image_url: editSourceFrontCoverImageUrl.trim() || null,
          back_cover_image_url: editSourceBackCoverImageUrl.trim() || null,
          description: editSourceDescription.trim() || null,
          store_url: editSourceStoreUrl.trim() || null,
          author: editSourceAuthor.trim() || null,
          display_order: parsedDisplayOrder,
          is_active: editSourceIsActive
        },
        { id: `eq.${editingSourceId}` }
      )

      setSourceUpdateMessage('Source updated successfully.')
      setSourceDrawerMode('')
      await loadSources()
    } catch (err) {
      setSourceUpdateError(err instanceof Error ? err.message : 'Failed to update source.')
    } finally {
      setIsUpdatingSource(false)
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
      await refreshCategoryQuestions()
      await loadQuestionMatrixQuestions()
    } catch (err) {
      setQuestionActiveError(
        err instanceof Error ? err.message : 'Failed to update question active status.'
      )
    } finally {
      setIsTogglingQuestionActive(false)
    }
  }

  function handleAdminSectionToggle(event, sectionId) {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.currentTarget.open) {
      setOpenAdminSectionId(sectionId)
      return
    }

    setOpenAdminSectionId((currentSectionId) =>
      currentSectionId === sectionId ? '' : currentSectionId
    )
  }

  function handleAdminNavClick(event, sectionId) {
    event.preventDefault()
    setOpenAdminSectionId(sectionId)

    window.requestAnimationFrame(() => {
      const sectionElement = document.getElementById(sectionId)

      if (!sectionElement) {
        return
      }

      sectionElement.scrollIntoView({ block: 'start' })
      sectionElement.focus({ preventScroll: true })
    })
  }

  if (isCheckingAuth) {
    return (
      <section className="admin-auth-page" aria-live="polite">
        <div className="admin-auth-card">
          <p className="admin-kicker">Admin access</p>
          <h2>Checking your Admin session…</h2>
        </div>
      </section>
    )
  }

  if (!authSession) {
    return (
      <section className="admin-auth-page">
        <div className="admin-auth-card">
          <p className="admin-kicker">Admin access</p>
          <h2>Sign in to continue</h2>
          <p className="admin-auth-copy">Use your Admin email and password to open Admin tools.</p>
          <form className="admin-auth-form" onSubmit={handleEmailPasswordSignIn}>
            <label htmlFor="admin-login-email">Email</label>
            <input
              id="admin-login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              required
            />
            <label htmlFor="admin-login-password">Password</label>
            <input
              id="admin-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              required
            />
            <button type="submit" disabled={isSigningIn}>
              {isSigningIn ? 'Signing in…' : 'Sign in'}
            </button>
            <div className="admin-auth-message" role="alert" aria-live="polite">
              {loginError}
            </div>
          </form>
        </div>
      </section>
    )
  }

  if (!isAdminAuthorized) {
    return (
      <section className="admin-auth-page">
        <div className="admin-auth-card">
          <p className="admin-kicker">Admin access</p>
          <h2>This account is not authorized for Admin access.</h2>
          <p className="admin-auth-copy">
            Signed in as <strong>{authSession.user?.email || 'unknown email'}</strong>.
          </p>
          <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
          <div className="admin-auth-message" role="alert" aria-live="polite">
            {loginError}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`admin-page${isAdminSidebarCollapsed ? ' admin-page-sidebar-collapsed' : ''}`}>
      <aside
        className={`admin-sidebar${isAdminSidebarCollapsed ? ' admin-sidebar-collapsed' : ''}`}
        aria-label="Admin section navigation"
      >
        <div className="admin-sidebar-card">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-title">
              <p className="admin-sidebar-eyebrow">Workspace</p>
              <h2>Admin</h2>
            </div>
            <button
              type="button"
              className="admin-sidebar-toggle"
              onClick={() => setIsAdminSidebarCollapsed((isCollapsed) => !isCollapsed)}
              aria-label={isAdminSidebarCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
              aria-expanded={!isAdminSidebarCollapsed}
            >
              {isAdminSidebarCollapsed ? '›' : '‹'}
            </button>
          </div>
          <nav>
            <ul className="admin-sidebar-list">
              {ADMIN_NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={openAdminSectionId === item.id ? 'is-active' : undefined}
                    aria-current={openAdminSectionId === item.id ? 'true' : undefined}
                    onClick={(event) => handleAdminNavClick(event, item.id)}
                    title={item.label}
                  >
                    <span className="admin-sidebar-icon" aria-hidden="true">{item.icon}</span>
                    <span className="admin-sidebar-label">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="admin-sidebar-auth">
            <span className="admin-sidebar-auth-email">{authSession.user?.email}</span>
            <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-content">
        <details
          id="admin-overview"
          className="admin-section"
          open={openAdminSectionId === 'admin-overview'}
          onToggle={(event) => handleAdminSectionToggle(event, 'admin-overview')}
          tabIndex="-1"
        >
          <summary className="admin-section-summary">Dashboard / Overview</summary>
          <div className="admin-hero admin-overview-panel" aria-labelledby="admin-overview-title">
          <div>
            <p className="admin-kicker">Content management</p>
            <h2 id="admin-overview-title">Dashboard / Overview</h2>
            <p>Manage books, categories, imports, questions, and coverage from one workspace.</p>
          </div>
          <div className="admin-stat-grid" aria-label="Admin content totals">
            <div className="admin-stat-card">
              <span>Categories</span>
              <strong>{categories.length}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Book sources</span>
              <strong>{sources.length}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Active sources</span>
              <strong>{sources.filter((source) => source.is_active).length}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Matrix questions</span>
              <strong>{questionMatrixQuestions.length}</strong>
            </div>
          </div>
          </div>

        <details id="admin-question-matrix" className="admin-section admin-section-wide" open>
        <summary className="admin-section-summary">Question Matrix — Active Questions</summary>
        <p className="admin-row-count">
          Counts include active questions only for active book sources. Columns follow source display order, then title.
        </p>
        {isLoadingQuestionMatrix ? <p>Loading question matrix...</p> : null}
        {questionMatrixError ? <p>{questionMatrixError}</p> : null}
        {!isLoadingQuestionMatrix && !questionMatrixError ? (
          questionMatrix.activeSources.length > 0 ? (
            questionMatrix.rows.length > 0 ? (
              <div className="admin-matrix-scroll">
                <table className="admin-simple-table admin-question-matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">Book Section</th>
                      <th scope="col">Section Mapping</th>
                      {questionMatrix.activeSources.map((source) => (
                        <th key={source.id} scope="col">
                          {source.short_title || 'Untitled source'}
                        </th>
                      ))}
                      <th scope="col">Row total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionMatrix.rows.map((sectionRow) => (
                      <tr key={sectionRow.key}>
                        <th scope="row">{sectionRow.label}</th>
                        <td>{sectionRow.sectionMapping}</td>
                        {questionMatrix.activeSources.map((source) => {
                          const matrixCellKey = `${source.id}::${sectionRow.key}`
                          return (
                            <td key={source.id} className="admin-matrix-number-cell">
                              {questionMatrix.countsBySourceAndSection.get(matrixCellKey) || 0}
                            </td>
                          )
                        })}
                        <td className="admin-matrix-number-cell admin-matrix-total-cell">
                          {sectionRow.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Column total</th>
                      <td aria-label="Section mapping totals not applicable">—</td>
                      {questionMatrix.activeSources.map((source) => (
                        <td key={source.id} className="admin-matrix-number-cell admin-matrix-total-cell">
                          {questionMatrix.columnTotalsBySource[String(source.id)] || 0}
                        </td>
                      ))}
                      <td className="admin-matrix-number-cell admin-matrix-total-cell">
                        {questionMatrix.grandTotal}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p>No active questions found for active sources.</p>
            )
          ) : (
            <p>No active book sources found.</p>
          )
        ) : null}
      </details>
        </details>

        <details
          id="admin-sources"
          className="admin-section"
          open={openAdminSectionId === 'admin-sources'}
          onToggle={(event) => handleAdminSectionToggle(event, 'admin-sources')}
          tabIndex="-1"
        >
        <summary className="admin-section-summary">Book Sources</summary>
        <div className="admin-section-heading-row">
          <div>
            <h3>Sources / Books</h3>
            <p>Create or edit book/source metadata in the drawer.</p>
          </div>
          <button type="button" onClick={openNewSourceDrawer}>New book/source</button>
        </div>


        {sourceSubmitMessage ? <p>{sourceSubmitMessage}</p> : null}
        {sourceSubmitError ? <p>{sourceSubmitError}</p> : null}
        {sourceUpdateMessage ? <p>{sourceUpdateMessage}</p> : null}
        {sourceUpdateError ? <p>{sourceUpdateError}</p> : null}
        {isLoading ? <p>Loading sources...</p> : null}
        {!isLoading && !error ? (
          sources.length > 0 ? (
            <>
              <p className="admin-row-count">Rows: {sources.length}</p>
              <table className="admin-simple-table">
                <thead>
                  <tr>
                    <th scope="col">Short title</th>
                    <th scope="col">Full title</th>
                    <th scope="col">Author</th>
                    <th scope="col">Description</th>
                    <th scope="col">Metadata</th>
                    <th scope="col">Display order</th>
                    <th scope="col">Active</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id}>
                      <td>{source.short_title}</td>
                      <td>{source.full_title || 'N/A'}</td>
                      <td>{source.author || 'N/A'}</td>
                      <td title={source.description || ''}>
                        {getSourceDescriptionPreview(source.description)}
                      </td>
                      <td>
                        <div className="admin-source-meta-list">
                          {renderSourceCoverThumbnail(source.front_cover_image_url, 'Front cover')}
                          {renderSourceCoverThumbnail(source.back_cover_image_url, 'Back cover')}
                          {renderSourceLink(source.front_cover_image_url, 'Front cover')}
                          {renderSourceLink(source.back_cover_image_url, 'Back cover')}
                          {renderSourceLink(source.store_url, 'Store')}
                        </div>
                      </td>
                      <td>{source.display_order ?? 0}</td>
                      <td>{source.is_active ? 'Yes' : 'No'}</td>
                      <td>
                        <button type="button" onClick={() => openEditSourceDrawer(source)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>No sources found.</p>
          )
        ) : null}

      </details>

        <details
          id="admin-categories"
          className="admin-section"
          open={openAdminSectionId === 'admin-categories'}
          onToggle={(event) => handleAdminSectionToggle(event, 'admin-categories')}
          tabIndex="-1"
        >
        <summary className="admin-section-summary">Categories</summary>
        <div className="admin-section-heading-row">
          <div>
            <h3>Categories</h3>
            <p>Create or edit category names, descriptions, and active status in the drawer.</p>
          </div>
          <button type="button" onClick={openNewCategoryDrawer}>New category</button>
        </div>


        {submitMessage ? <p>{submitMessage}</p> : null}
        {submitError ? <p>{submitError}</p> : null}
        {categoryUpdateMessage ? <p>{categoryUpdateMessage}</p> : null}
        {categoryUpdateError ? <p>{categoryUpdateError}</p> : null}
        {isLoading ? <p>Loading categories...</p> : null}
        {error ? <p>{error}</p> : null}

        {!isLoading && !error ? (
          categories.length > 0 ? (
            <>
              <p className="admin-row-count">Rows: {categories.length}</p>
              <table className="admin-simple-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Description</th>
                    <th scope="col">Active</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{category.description || 'No description'}</td>
                      <td>{category.is_active ? 'Yes' : 'No'}</td>
                      <td>
                        <button type="button" onClick={() => openEditCategoryDrawer(category)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>No categories found.</p>
          )
        ) : null}

        </details>

        <details
          id="admin-question-import"
          className="admin-section"
          open={openAdminSectionId === 'admin-question-import'}
          onToggle={(event) => handleAdminSectionToggle(event, 'admin-question-import')}
          tabIndex="-1"
        >
        <summary className="admin-section-summary">Question Import</summary>
        <details className="admin-helper-note">
          <summary>JSON import rules</summary>
          <p>Use this format when importing question batches.</p>
          <p>Important rules:</p>
          <ul>
            <li>Use a top-level object with a "questions" array.</li>
            <li>Each question must be standalone and read like normal trivia.</li>
            <li>Do not use wording like “from the puzzle,” “matches this clue,” “answer list,” or “complete the blank.”</li>
            <li>Correct answer must always be the first item in "choices".</li>
            <li>Set "correct_index" to 0.</li>
            <li>Use "question_type": "mc_single".</li>
            <li>Each question must include "section", "category", "difficulty", and "is_active".</li>
            <li>Use only approved categories from the category list.</li>
            <li>Section should match the raw book section, not the public mapped section.</li>
            <li>For book bonus content, use "Bonus Pages" as the section.</li>
          </ul>
          <pre>{`{
  "questions": [
    {
      "question_text": "...",
      "category": "History",
      "choices": ["Correct answer", "Wrong answer", "Wrong answer", "Wrong answer"],
      "correct_index": 0,
      "question_type": "mc_single",
      "section": "World Events",
      "difficulty": "medium",
      "is_active": true
    }
  ]
}`}</pre>
        </details>
        <form onSubmit={handleImportQuestions}>
          <label htmlFor="question-category">Category fallback</label>
          <select
            id="question-category"
            name="category_id"
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
          >
            <option value="">No fallback category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <label htmlFor="question-source">Import into book/source</label>
          <select
            id="question-source"
            name="source_id"
            value={selectedSourceId}
            onChange={(event) => setSelectedSourceId(event.target.value)}
          >
            <option value="">No source</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.short_title}
              </option>
            ))}
          </select>


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
      "category": "History",
      "choices": ["Correct answer", "Wrong answer", "Wrong answer", "Wrong answer"],
      "correct_index": 0,
      "question_type": "mc_single",
      "section": "World Events",
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
      </details>


        <details
          id="admin-questions-list"
          className="admin-section admin-section-wide"
          open={openAdminSectionId === 'admin-questions-list'}
          onToggle={(event) => handleAdminSectionToggle(event, 'admin-questions-list')}
          tabIndex="-1"
        >
        <summary className="admin-section-summary">Question List</summary>
        <div className="admin-section-heading-row">
          <div>
            <h3>Questions</h3>
            <p>Create a new question or edit an existing row without leaving the list.</p>
          </div>
          <div className="admin-heading-actions">
            <button type="button" className="admin-secondary-button" onClick={resetQuestionListFilters}>
              Reset filters
            </button>
            <button type="button" onClick={openNewQuestionDrawer}>New question</button>
          </div>
        </div>
        {!isLoadingQuestions && !questionsError ? (
          <p className="admin-row-count">
            Rows: {filteredCategoryQuestions.length} of {categoryQuestions.length} loaded
          </p>
        ) : null}

        {isLoadingQuestions ? <p>Loading questions...</p> : null}
        {questionsError ? <p>{questionsError}</p> : null}
        {questionActiveMessage ? <p>{questionActiveMessage}</p> : null}
        {questionActiveError ? <p>{questionActiveError}</p> : null}

        <div id="admin-question-editor" className="admin-editor-anchor">
          {questionUpdateMessage ? <p>{questionUpdateMessage}</p> : null}
          {questionUpdateError ? <p>{questionUpdateError}</p> : null}
        </div>

        {!isLoadingQuestions && !questionsError ? (
          <table className="admin-question-table">
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col">
                    <button
                      type="button"
                      className="admin-sort-button"
                      onClick={() => handleQuestionSort(QUESTION_SORT_FIELDS.source)}
                    >
                      Source {getSortDirectionIndicator(QUESTION_SORT_FIELDS.source)}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="admin-sort-button"
                      onClick={() => handleQuestionSort(QUESTION_SORT_FIELDS.section)}
                    >
                      Section {getSortDirectionIndicator(QUESTION_SORT_FIELDS.section)}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="admin-sort-button"
                      onClick={() => handleQuestionSort(QUESTION_SORT_FIELDS.category)}
                    >
                      Category {getSortDirectionIndicator(QUESTION_SORT_FIELDS.category)}
                    </button>
                  </th>
                  <th scope="col">Type</th>
                  <th scope="col">
                    <button
                      type="button"
                      className="admin-sort-button"
                      onClick={() => handleQuestionSort(QUESTION_SORT_FIELDS.difficulty)}
                    >
                      Difficulty {getSortDirectionIndicator(QUESTION_SORT_FIELDS.difficulty)}
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="admin-sort-button"
                      onClick={() => handleQuestionSort(QUESTION_SORT_FIELDS.active)}
                    >
                      Active {getSortDirectionIndicator(QUESTION_SORT_FIELDS.active)}
                    </button>
                  </th>
                  <th scope="col">Actions</th>
                </tr>
                <tr className="admin-question-filter-row">
                  <th scope="col">
                    <label className="admin-sr-only" htmlFor="question-column-filter-question">Filter question</label>
                    <input
                      id="question-column-filter-question"
                      type="text"
                      value={questionColumnFilters.question}
                      onChange={(event) => updateQuestionColumnFilter('question', event.target.value)}
                      placeholder="Filter question"
                    />
                  </th>
                  <th scope="col">
                    <label className="admin-sr-only" htmlFor="question-column-filter-source">Filter source</label>
                    <select
                      id="question-column-filter-source"
                      value={questionColumnFilters.source}
                      onChange={(event) => updateQuestionColumnFilter('source', event.target.value)}
                    >
                      <option value="">All sources</option>
                      {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.short_title}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th scope="col">
                    <label className="admin-sr-only" htmlFor="question-column-filter-section">Filter section</label>
                    <input
                      id="question-column-filter-section"
                      type="text"
                      value={questionColumnFilters.section}
                      onChange={(event) => updateQuestionColumnFilter('section', event.target.value)}
                      placeholder="Filter section"
                    />
                  </th>
                  <th scope="col">
                    <label className="admin-sr-only" htmlFor="question-column-filter-category">Filter category</label>
                    <select
                      id="question-column-filter-category"
                      value={questionColumnFilters.category}
                      onChange={(event) => updateQuestionColumnFilter('category', event.target.value)}
                    >
                      <option value="">All categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th scope="col">
                    <label className="admin-sr-only" htmlFor="question-column-filter-type">Filter type</label>
                    <select
                      id="question-column-filter-type"
                      value={questionColumnFilters.type}
                      onChange={(event) => updateQuestionColumnFilter('type', event.target.value)}
                    >
                      <option value="all">All types</option>
                      {questionTypeOptions.map((questionType) => (
                        <option key={questionType} value={questionType}>
                          {questionType}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th scope="col">
                    <label className="admin-sr-only" htmlFor="question-column-filter-difficulty">Filter difficulty</label>
                    <select
                      id="question-column-filter-difficulty"
                      value={questionColumnFilters.difficulty}
                      onChange={(event) => updateQuestionColumnFilter('difficulty', event.target.value)}
                    >
                      <option value="all">All difficulties</option>
                      {questionDifficultyOptions.map((difficulty) => (
                        <option key={difficulty} value={difficulty}>
                          {difficulty}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th scope="col">
                    <label className="admin-sr-only" htmlFor="question-column-filter-active">Filter active status</label>
                    <select
                      id="question-column-filter-active"
                      value={questionColumnFilters.active}
                      onChange={(event) => updateQuestionColumnFilter('active', event.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </th>
                  <th scope="col">
                    <button type="button" className="admin-secondary-button" onClick={resetQuestionListFilters}>
                      Reset
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategoryQuestions.length === 0 ? (
                  <tr>
                    <td className="admin-question-empty-cell" colSpan="8">
                      No questions match the current filters.
                    </td>
                  </tr>
                ) : null}
                {filteredCategoryQuestions.map((question) => (
                  <tr key={question.id}>
                    <td title={question.question_text || ''} className="admin-question-cell-preview">
                      {getQuestionPreview(question.question_text) || '—'}
                    </td>
                    <td>{sourceShortTitlesById[question.source_id] || 'No source'}</td>
                    <td>{question.section || '—'}</td>
                    <td>{categoryNamesById[question.category_id] || 'Unknown'}</td>
                    <td>{question.question_type || 'mc_single'}</td>
                    <td>{question.difficulty || 'unknown'}</td>
                    <td>{question.is_active ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="admin-question-actions">
                        <button type="button" onClick={() => openEditQuestionDrawer(question)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionActive(question)}
                          disabled={isTogglingQuestionActive}
                        >
                          {question.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        ) : null}
      </details>

      </div>

      {categoryDrawerMode ? (
        <div className="admin-drawer-overlay" role="presentation">
          <aside className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-category-drawer-title">
            <div className="admin-drawer-header">
              <h3 id="admin-category-drawer-title">
                {categoryDrawerMode === 'edit' ? 'Edit category' : 'New category'}
              </h3>
              <button type="button" className="admin-drawer-close" onClick={closeCategoryDrawer} aria-label="Close category drawer">
                ×
              </button>
            </div>
            <form
              className="admin-drawer-form"
              onSubmit={categoryDrawerMode === 'edit' ? handleUpdateCategory : handleCreateCategory}
            >
              {categoryDrawerMode === 'edit' && categoryUpdateError ? (
                <p className="admin-drawer-message">{categoryUpdateError}</p>
              ) : null}
              {categoryDrawerMode === 'new' && submitError ? (
                <p className="admin-drawer-message">{submitError}</p>
              ) : null}
              <label htmlFor={categoryDrawerMode === 'edit' ? 'edit-category-name' : 'category-name'}>Name</label>
              <input
                id={categoryDrawerMode === 'edit' ? 'edit-category-name' : 'category-name'}
                name={categoryDrawerMode === 'edit' ? 'edit_category_name' : 'name'}
                type="text"
                value={categoryDrawerMode === 'edit' ? editCategoryName : name}
                onChange={(event) =>
                  categoryDrawerMode === 'edit'
                    ? setEditCategoryName(event.target.value)
                    : setName(event.target.value)
                }
                required
              />

              <label htmlFor={categoryDrawerMode === 'edit' ? 'edit-category-description' : 'category-description'}>Description</label>
              <textarea
                id={categoryDrawerMode === 'edit' ? 'edit-category-description' : 'category-description'}
                name={categoryDrawerMode === 'edit' ? 'edit_category_description' : 'description'}
                value={categoryDrawerMode === 'edit' ? editCategoryDescription : description}
                onChange={(event) =>
                  categoryDrawerMode === 'edit'
                    ? setEditCategoryDescription(event.target.value)
                    : setDescription(event.target.value)
                }
              />

              <label htmlFor={categoryDrawerMode === 'edit' ? 'edit-category-active' : 'category-active'}>Is active</label>
              <input
                id={categoryDrawerMode === 'edit' ? 'edit-category-active' : 'category-active'}
                name={categoryDrawerMode === 'edit' ? 'edit_category_is_active' : 'is_active'}
                type="checkbox"
                checked={categoryDrawerMode === 'edit' ? editCategoryIsActive : isActive}
                onChange={(event) =>
                  categoryDrawerMode === 'edit'
                    ? setEditCategoryIsActive(event.target.checked)
                    : setIsActive(event.target.checked)
                }
              />

              <div className="admin-drawer-actions">
                <button
                  type="submit"
                  disabled={categoryDrawerMode === 'edit' ? !editingCategoryId || isUpdatingCategory : isSubmitting}
                >
                  {categoryDrawerMode === 'edit'
                    ? isUpdatingCategory
                      ? 'Saving...'
                      : 'Save'
                    : isSubmitting
                      ? 'Saving...'
                      : 'Save'}
                </button>
                <button type="button" className="admin-secondary-button" onClick={closeCategoryDrawer}>
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {sourceDrawerMode ? (
        <div className="admin-drawer-overlay" role="presentation">
          <aside className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-source-drawer-title">
            <div className="admin-drawer-header">
              <h3 id="admin-source-drawer-title">
                {sourceDrawerMode === 'edit' ? 'Edit book/source' : 'New book/source'}
              </h3>
              <button type="button" className="admin-drawer-close" onClick={closeSourceDrawer} aria-label="Close book/source drawer">
                ×
              </button>
            </div>
            <form
              className="admin-drawer-form"
              onSubmit={sourceDrawerMode === 'edit' ? handleUpdateSource : handleCreateSource}
            >
              {sourceDrawerMode === 'edit' && sourceUpdateError ? (
                <p className="admin-drawer-message">{sourceUpdateError}</p>
              ) : null}
              {sourceDrawerMode === 'new' && sourceSubmitError ? (
                <p className="admin-drawer-message">{sourceSubmitError}</p>
              ) : null}
              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-short-title' : 'source-short-title'}>Short title</label>
              <input id={sourceDrawerMode === 'edit' ? 'edit-source-short-title' : 'source-short-title'} name={sourceDrawerMode === 'edit' ? 'edit_short_title' : 'short_title'} type="text" value={sourceDrawerMode === 'edit' ? editSourceShortTitle : sourceShortTitle} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceShortTitle(event.target.value) : setSourceShortTitle(event.target.value)} required />

              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-full-title' : 'source-full-title'}>Full title</label>
              <input id={sourceDrawerMode === 'edit' ? 'edit-source-full-title' : 'source-full-title'} name={sourceDrawerMode === 'edit' ? 'edit_full_title' : 'full_title'} type="text" value={sourceDrawerMode === 'edit' ? editSourceFullTitle : sourceFullTitle} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceFullTitle(event.target.value) : setSourceFullTitle(event.target.value)} />

              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-author' : 'source-author'}>Author</label>
              <input id={sourceDrawerMode === 'edit' ? 'edit-source-author' : 'source-author'} name={sourceDrawerMode === 'edit' ? 'edit_author' : 'author'} type="text" value={sourceDrawerMode === 'edit' ? editSourceAuthor : sourceAuthor} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceAuthor(event.target.value) : setSourceAuthor(event.target.value)} />

              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-display-order' : 'source-display-order'}>Display order</label>
              <input id={sourceDrawerMode === 'edit' ? 'edit-source-display-order' : 'source-display-order'} name={sourceDrawerMode === 'edit' ? 'edit_display_order' : 'display_order'} type="number" value={sourceDrawerMode === 'edit' ? editSourceDisplayOrder : sourceDisplayOrder} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceDisplayOrder(event.target.value) : setSourceDisplayOrder(event.target.value)} required />

              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-front-cover-image-url' : 'source-front-cover-image-url'}>Front cover image URL/path</label>
              <input id={sourceDrawerMode === 'edit' ? 'edit-source-front-cover-image-url' : 'source-front-cover-image-url'} name={sourceDrawerMode === 'edit' ? 'edit_front_cover_image_url' : 'front_cover_image_url'} type="text" value={sourceDrawerMode === 'edit' ? editSourceFrontCoverImageUrl : sourceFrontCoverImageUrl} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceFrontCoverImageUrl(event.target.value) : setSourceFrontCoverImageUrl(event.target.value)} />

              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-back-cover-image-url' : 'source-back-cover-image-url'}>Back cover image URL/path</label>
              <input id={sourceDrawerMode === 'edit' ? 'edit-source-back-cover-image-url' : 'source-back-cover-image-url'} name={sourceDrawerMode === 'edit' ? 'edit_back_cover_image_url' : 'back_cover_image_url'} type="text" value={sourceDrawerMode === 'edit' ? editSourceBackCoverImageUrl : sourceBackCoverImageUrl} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceBackCoverImageUrl(event.target.value) : setSourceBackCoverImageUrl(event.target.value)} />

              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-store-url' : 'source-store-url'}>Store URL</label>
              <input id={sourceDrawerMode === 'edit' ? 'edit-source-store-url' : 'source-store-url'} name={sourceDrawerMode === 'edit' ? 'edit_store_url' : 'store_url'} type="url" value={sourceDrawerMode === 'edit' ? editSourceStoreUrl : sourceStoreUrl} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceStoreUrl(event.target.value) : setSourceStoreUrl(event.target.value)} />

              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-description' : 'source-description'}>Description</label>
              <textarea id={sourceDrawerMode === 'edit' ? 'edit-source-description' : 'source-description'} name={sourceDrawerMode === 'edit' ? 'edit_description' : 'description'} value={sourceDrawerMode === 'edit' ? editSourceDescription : sourceDescription} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceDescription(event.target.value) : setSourceDescription(event.target.value)} />

              <label htmlFor={sourceDrawerMode === 'edit' ? 'edit-source-active' : 'source-active'}>Is active</label>
              <input id={sourceDrawerMode === 'edit' ? 'edit-source-active' : 'source-active'} name={sourceDrawerMode === 'edit' ? 'edit_is_active' : 'is_active'} type="checkbox" checked={sourceDrawerMode === 'edit' ? editSourceIsActive : sourceIsActive} onChange={(event) => sourceDrawerMode === 'edit' ? setEditSourceIsActive(event.target.checked) : setSourceIsActive(event.target.checked)} />

              <div className="admin-drawer-actions">
                <button type="submit" disabled={sourceDrawerMode === 'edit' ? !editingSourceId || isUpdatingSource : isSubmittingSource}>
                  {sourceDrawerMode === 'edit'
                    ? isUpdatingSource
                      ? 'Saving...'
                      : 'Save'
                    : isSubmittingSource
                      ? 'Saving...'
                      : 'Save'}
                </button>
                <button type="button" className="admin-secondary-button" onClick={closeSourceDrawer}>
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {questionDrawerMode ? (
        <div className="admin-drawer-overlay" role="presentation">
          <aside className="admin-drawer admin-drawer-wide" role="dialog" aria-modal="true" aria-labelledby="admin-question-drawer-title">
            <div className="admin-drawer-header">
              <h3 id="admin-question-drawer-title">
                {questionDrawerMode === 'edit' ? 'Edit question' : 'New question'}
              </h3>
              <button type="button" className="admin-drawer-close" onClick={closeQuestionDrawer} aria-label="Close question drawer">
                ×
              </button>
            </div>
            <form
              className="admin-drawer-form"
              onSubmit={questionDrawerMode === 'edit' ? handleUpdateQuestion : handleCreateQuestion}
            >
              {questionUpdateError ? <p className="admin-drawer-message">{questionUpdateError}</p> : null}
              <label htmlFor="edit-question-text">Question text</label>
              <textarea id="edit-question-text" name="question_text" value={editQuestionText} onChange={(event) => setEditQuestionText(event.target.value)} required />
              <label htmlFor="edit-choice-a">Choice A</label>
              <input id="edit-choice-a" name="choice_a" type="text" value={editChoiceA} onChange={(event) => setEditChoiceA(event.target.value)} required />
              <label htmlFor="edit-choice-b">Choice B</label>
              <input id="edit-choice-b" name="choice_b" type="text" value={editChoiceB} onChange={(event) => setEditChoiceB(event.target.value)} required />
              <label htmlFor="edit-choice-c">Choice C</label>
              <input id="edit-choice-c" name="choice_c" type="text" value={editChoiceC} onChange={(event) => setEditChoiceC(event.target.value)} required />
              <label htmlFor="edit-choice-d">Choice D</label>
              <input id="edit-choice-d" name="choice_d" type="text" value={editChoiceD} onChange={(event) => setEditChoiceD(event.target.value)} required />
              <label htmlFor="edit-correct-index">Correct index</label>
              <input id="edit-correct-index" name="correct_index" type="number" min={0} max={3} value={editCorrectIndex} onChange={(event) => setEditCorrectIndex(event.target.value)} required />
              <label htmlFor="edit-difficulty">Difficulty</label>
              <input id="edit-difficulty" name="difficulty" type="text" value={editDifficulty} onChange={(event) => setEditDifficulty(event.target.value)} />
              <label htmlFor="edit-question-type">Question type</label>
              <select id="edit-question-type" name="question_type" value={editQuestionType} onChange={(event) => setEditQuestionType(event.target.value)}>
                <option value="mc_single">mc_single</option>
              </select>
              <label htmlFor="edit-category">Category</label>
              <select id="edit-category" name="category_id" value={editCategoryId} onChange={(event) => setEditCategoryId(event.target.value)}>
                <option value="">No category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <label htmlFor="edit-source">Source</label>
              <select id="edit-source" name="source_id" value={editSourceId} onChange={(event) => setEditSourceId(event.target.value)}>
                <option value="">No source</option>
                {sources.map((source) => <option key={source.id} value={source.id}>{source.short_title}</option>)}
              </select>
              <label htmlFor="edit-section">Section</label>
              <input id="edit-section" name="section" type="text" value={editSection} onChange={(event) => setEditSection(event.target.value)} />
              <label htmlFor="edit-active">Is active</label>
              <input id="edit-active" name="is_active" type="checkbox" checked={editIsActive} onChange={(event) => setEditIsActive(event.target.checked)} />

              <div className="admin-drawer-actions">
                <button type="submit" disabled={questionDrawerMode === 'edit' ? !editingQuestionId || isUpdatingQuestion : isUpdatingQuestion}>
                  {isUpdatingQuestion ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="admin-secondary-button" onClick={closeQuestionDrawer}>
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  )
}

export default AdminPage
