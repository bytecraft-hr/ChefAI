// src/pages/PantryPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import './PantryPage.css'
import { X } from 'lucide-react'

// Constants
const TOTAL_STEPS = 6
const STEP_NAMES = [
  'Unesi što uvijek imaš kod kuće',
  'Odaberi načine pripreme',
  'Dodaj što danas dodatno imaš',
  'Za koliko osoba kuhaš i koliko vremena imaš?',
  'Spremni za kuhanje?',
  'Predloženi recept'
]

const PREPARATION_METHODS = [
  'svi načini pripreme',
  'kuhano',
  'pečeno',
  'prženo'
]

const DAILY_TIPS = [
  'Ako imaš ostatke povrća, kombiniraj ih u brzinsku juhu ili stir-fry!',
  'Riža od jučer? Dodaj jaje i povrće za fini prženi rižoto.',
  'Kruh je star? Ispeci bruskete s maslinovim uljem i češnjakom.',
  'Kuhana jaja + jogurt + malo češnjaka = brzinski proteinski snack!',
  'Zrelo voće? Napravi smoothie ili ga dodaj u zobene pahuljice.',
  'Parmezan i tijesto u smočnici? Spreman si za brzi pasta obrok.',
  'Nemoj baciti koru sira – koristi je za dodatni okus u juhama.',
  'Kombiniraj ostatke mesa s tortiljama za brze wrapove!',
  'Tikvice i jaja = odlična fritaja bez puno truda.',
  'Kuhani krumpir? Ispeci ga s malo začina za super prilog.',
]

const API_BASE_URL = 'http://localhost:8000'

export default function PantryPage() {
  // Unified state management
  const [pantryState, setPantryState] = useState({
    alwaysHave: [],
    todayHave: [],
    preparationMethods: ['svi načini pripreme'],
    numberOfPeople: 1,
    prepTime: 20
  })

  const [uiState, setUiState] = useState({
    currentStep: 0,
    loading: false,
    error: null,
    dailyTip: '',
    newItemInputs: { alwaysHave: '', todayHave: '' }
  })

  const [recipe, setRecipe] = useState(null)
  const [userSettings, setUserSettings] = useState({
    allergies: [],
    dislikes: [],
    preferences: [],
    favorites: []
  })

  // Initialize user settings and daily tip
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    setUserSettings(settings)

    const randomTip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)]
    setUiState(prev => ({
      ...prev,
      dailyTip: randomTip,
      currentStep: 0   // 👈 This line ensures you always start at step 0
    }))
  }, [])


  // Load pantry items from backend
  useEffect(() => {
    const loadPantryItems = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      try {
        const response = await fetch(`${API_BASE_URL}/pantry`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) throw new Error('Greška pri dohvaćanju podataka')

        const data = await response.json()

        setPantryState(prev => ({
          ...prev,
          alwaysHave: data
            .filter(item => item.category === 'Kod kuće uvijek imam')
            .map(item => item.name),
          todayHave: data
            .filter(item => item.category === 'Danas dodatno imam')
            .map(item => item.name)
        }))
      } catch (error) {
        setUiState(prev => ({
          ...prev,
          error: `Greška kod dohvata sastojaka: ${error.message}`
        }))
      }
    }

    loadPantryItems()
  }, [])

  // API helper functions
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem('accessToken')
    if (!token) throw new Error('Nisi prijavljen!')

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }, [])

  // Error handling
  const handleError = useCallback((error, duration = 5000) => {
    setUiState(prev => ({ ...prev, error: error.message || error }))
    setTimeout(() => {
      setUiState(prev => ({ ...prev, error: null }))
    }, duration)
  }, [])

  // Pantry item management
  const addPantryItem = useCallback(async (category, value) => {
    if (!value.trim()) return

    const categoryKey = category === 'Kod kuće uvijek imam' ? 'alwaysHave' : 'todayHave'
    const inputKey = category === 'Kod kuće uvijek imam' ? 'alwaysHave' : 'todayHave'

    if (pantryState[categoryKey].includes(value.trim())) {
      handleError('Ovaj sastojak već postoji!', 3000)
      return
    }

    try {
      await apiCall('/pantry', {
        method: 'POST',
        body: JSON.stringify({ name: value.trim(), category })
      })

      setPantryState(prev => ({
        ...prev,
        [categoryKey]: [...prev[categoryKey], value.trim()]
      }))

      setUiState(prev => ({
        ...prev,
        newItemInputs: {
          ...prev.newItemInputs,
          [inputKey]: ''
        }
      }))
    } catch (error) {
      handleError(error)
    }
  }, [pantryState, apiCall, handleError])

  const removePantryItem = useCallback(async (category, item) => {
    const categoryKey = category === 'Kod kuće uvijek imam' ? 'alwaysHave' : 'todayHave'

    try {
      await apiCall(`/pantry/${encodeURIComponent(item)}`, {
        method: 'DELETE'
      })

      setPantryState(prev => ({
        ...prev,
        [categoryKey]: prev[categoryKey].filter(i => i !== item)
      }))
    } catch (error) {
      handleError(error)
    }
  }, [apiCall, handleError])

  // Step navigation
  const goToStep = useCallback((step) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setUiState(prev => ({ ...prev, currentStep: step, error: null }))
    }
  }, [])

  // Recipe generation
  const generateRecipe = useCallback(async () => {
    try {
      setUiState(prev => ({ ...prev, loading: true, error: null }))

      const payload = {
        always_have: pantryState.alwaysHave,
        extras_today: pantryState.todayHave,
        allowed_methods: pantryState.preparationMethods,
        prep_time: pantryState.prepTime,
        people: pantryState.numberOfPeople,
        allergies: userSettings.allergies,
        dislikes: userSettings.dislikes,
        preferences: userSettings.preferences,
        favorites: userSettings.favorites
      }

      const data = await apiCall('/cook/rag', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      setRecipe(data)
      goToStep(5)
    } catch (error) {
      handleError(error)
    } finally {
      setUiState(prev => ({ ...prev, loading: false }))
    }
  }, [pantryState, userSettings, apiCall, handleError, goToStep])

  // Toggle preparation method
  const togglePreparationMethod = useCallback((method) => {
    setPantryState(prev => ({
      ...prev,
      preparationMethods: prev.preparationMethods.includes(method)
        ? prev.preparationMethods.filter(m => m !== method)
        : [...prev.preparationMethods, method]
    }))
  }, [])

  // Input handlers
  const handleInputChange = useCallback((field, value) => {
    if (field === 'newItemInput') {
      const [category, inputValue] = value
      setUiState(prev => ({
        ...prev,
        newItemInputs: {
          ...prev.newItemInputs,
          [category]: inputValue
        }
      }))
    } else {
      setPantryState(prev => ({ ...prev, [field]: value }))
    }
  }, [])

  // Step validation
  const canProceedToNext = useCallback((step) => {
    switch (step) {
      case 1: return pantryState.preparationMethods.length > 0
      default: return true
    }
  }, [pantryState.preparationMethods])

  // Reset function
  const resetSearch = useCallback(() => {
    setRecipe(null)
    goToStep(0)
  }, [goToStep])

  const progressPercentage = (uiState.currentStep / (TOTAL_STEPS - 1)) * 100

  return (
    <div className="pantry-grid">
      {uiState.loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Generiram recept i sliku...</p>
          </div>
        </div>
      )}

      {uiState.error && (
        <div className="error-message">
          <span>{uiState.error}</span>
          <button
            onClick={() => setUiState(prev => ({ ...prev, error: null }))}
            className="error-close"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="step-title">
        <h2>{STEP_NAMES[uiState.currentStep]}</h2>
      </div>

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{ width: `${progressPercentage}%` }}
        />
        <span className="progress-text">
          {uiState.currentStep + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Step 0: Always Have Items */}
      {uiState.currentStep === 0 && (
        <div className="filter-group">
          <div className="items-container">
            {pantryState.alwaysHave.length === 0 ? (
              <div className="empty-hint">
                <p>Ovdje možete dodati stavke koje uvijek imate kod kuće.</p>
              </div>
            ) : (
              <div className="items-grid">
                {pantryState.alwaysHave.map(item => (
                  <div key={item} className="item-tag">
                    <span>{item}</span>
                    <button
                      onClick={() => removePantryItem('Kod kuće uvijek imam', item)}
                      className="remove-btn"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="add-item-section">
            <input
              type="text"
              placeholder="Dodaj sastojak..."
              value={uiState.newItemInputs.alwaysHave}
              onChange={(e) => handleInputChange('newItemInput', ['alwaysHave', e.target.value])}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addPantryItem('Kod kuće uvijek imam', uiState.newItemInputs.alwaysHave)
                }
              }}
            />
            <button
              onClick={() => addPantryItem('Kod kuće uvijek imam', uiState.newItemInputs.alwaysHave)}
              className="add-btn"
            >
              Dodaj
            </button>
          </div>

          <div className="navigation-buttons">
            <button onClick={() => goToStep(1)}>Sljedeće</button>
          </div>
        </div>
      )}

      {/* Step 1: Preparation Methods */}
      {uiState.currentStep === 1 && (
        <div className="filter-group">
          <div className="preparation-methods">
            {PREPARATION_METHODS.map(method => (
              <label key={method} className="method-option">
                <input
                  type="checkbox"
                  checked={pantryState.preparationMethods.includes(method)}
                  onChange={() => togglePreparationMethod(method)}
                />
                <span>{method}</span>
              </label>
            ))}
          </div>

          <div className="navigation-buttons">
            <button onClick={() => goToStep(0)}>Natrag</button>
            <button
              onClick={() => goToStep(2)}
              disabled={!canProceedToNext(1)}
            >
              Sljedeće
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Today's Items */}
      {uiState.currentStep === 2 && (
        <div className="filter-group">
          <div className="daily-tip">
            <p><em>{uiState.dailyTip}</em></p>
          </div>

          <div className="items-container">
            {pantryState.todayHave.length === 0 ? (
              <div className="empty-hint">
                <p>Dodajte sastojke koje danas imate pri ruci.</p>
              </div>
            ) : (
              <div className="items-grid">
                {pantryState.todayHave.map(item => (
                  <div key={item} className="item-tag today-item">
                    <span>{item}</span>
                    <button
                      onClick={() => removePantryItem('Danas dodatno imam', item)}
                      className="remove-btn"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="add-item-section">
            <input
              type="text"
              placeholder="Dodaj novi sastojak..."
              value={uiState.newItemInputs.todayHave}
              onChange={(e) => handleInputChange('newItemInput', ['todayHave', e.target.value])}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addPantryItem('Danas dodatno imam', uiState.newItemInputs.todayHave)
                }
              }}
            />
            <button
              onClick={() => addPantryItem('Danas dodatno imam', uiState.newItemInputs.todayHave)}
              className="add-btn"
            >
              Dodaj
            </button>
          </div>

          <div className="navigation-buttons">
            <button onClick={() => goToStep(1)}>Natrag</button>
            <button onClick={() => goToStep(3)}>Sljedeće</button>
          </div>
        </div>
      )}

      {/* Step 3: Cooking Parameters */}
      {uiState.currentStep === 3 && (
        <div className="cooking-params">
          <div className="param-group">
            <label htmlFor="peopleCount">Kuham za:</label>
            <input
              id="peopleCount"
              type="number"
              min="1"
              max="20"
              value={pantryState.numberOfPeople}
              onChange={(e) => handleInputChange('numberOfPeople', parseInt(e.target.value, 10) || 1)}
            />
            <span>osoba</span>
          </div>

          <div className="param-group">
            <label htmlFor="prepTime">
              Vrijeme pripreme: {pantryState.prepTime} min
            </label>
            <input
              id="prepTime"
              type="range"
              min="5"
              max="120"
              step="5"
              value={pantryState.prepTime}
              onChange={(e) => handleInputChange('prepTime', parseInt(e.target.value, 10))}
            />
          </div>

          <div className="navigation-buttons">
            <button onClick={() => goToStep(2)}>Natrag</button>
            <button onClick={() => goToStep(4)}>Dalje</button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {uiState.currentStep === 4 && (
        <div className="filter-group">
          <div className="review-section">
            <div className="review-item">
              <strong>Uvijek imam:</strong>
              <span>{pantryState.alwaysHave.join(', ') || 'Ništa odabrano'}</span>
            </div>
            <div className="review-item">
              <strong>Danas imam:</strong>
              <span>{pantryState.todayHave.join(', ') || 'Ništa odabrano'}</span>
            </div>
            <div className="review-item">
              <strong>Metode:</strong>
              <span>{pantryState.preparationMethods.join(', ')}</span>
            </div>
            <div className="review-item">
              <strong>Za:</strong>
              <span>{pantryState.numberOfPeople} osoba, {pantryState.prepTime} min</span>
            </div>
          </div>

          <div className="navigation-buttons">
            <button onClick={() => goToStep(3)}>Natrag</button>
            <button
              onClick={generateRecipe}
              disabled={uiState.loading}
              className="primary-btn"
            >
              {uiState.loading ? 'Generiram...' : 'Idemo kuhati!'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Recipe Result */}
      {uiState.currentStep === 5 && recipe && (
        <div className="filter-group recipe-result">
          {recipe.image_url && (
            <img
              src={`${API_BASE_URL}${recipe.image_url}`}
              alt="Predloženo jelo"
              className="recipe-image"
            />
          )}

          <div className="recipe-content">
            <pre>{recipe.result}</pre>
          </div>

          <div className="navigation-buttons">
            <button onClick={() => goToStep(4)}>Natrag na pregled</button>
            <button
              onClick={generateRecipe}
              disabled={uiState.loading}
            >
              {uiState.loading ? 'Generiram...' : 'Generiraj novi recept'}
            </button>
            <button onClick={resetSearch} className="secondary-btn">
              Nova potraga
            </button>
          </div>
        </div>
      )}
    </div>
  )
}