// src/pages/PantryPage.jsx
import React, { useState, useEffect } from 'react'
import './PantryPage.css'
import { Trash2 } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import hr from 'date-fns/locale/hr'
import { Tag } from 'antd'
import 'antd/dist/reset.css'

registerLocale('hr', hr)

const initialFilterGroups = [
  {
    groupName: 'Kod kuće uvijek imam',
    options: [],
    allowCustomAdd: true,
  },
  {
    groupName: 'Dozvoljen način pripreme',
    options: ['svi načini pripreme', 'kuhano', 'pečeno', 'prženo'],
    allowCustomAdd: false,
  },
  {
    groupName: 'Danas dodatno imam',
    options: [],
    allowCustomAdd: true,
  },
]

const dailyTips = [
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

export default function PantryPage() {
  const [validationMessage, setValidationMessage] = useState('')
  const [filterSelections, setFilterSelections] = useState({
    'Kod kuće uvijek imam': [],
    'Dozvoljen način pripreme': ['svi načini pripreme'],
    'Danas dodatno imam': [],
  })
  const [filterGroups, setFilterGroups] = useState(initialFilterGroups)
  const [newFilterValues, setNewFilterValues] = useState({})
  const [numberOfPeople, setNumberOfPeople] = useState(1)
  const [prepTime, setPrepTime] = useState(20)
  const [currentStep, setCurrentStep] = useState(0)
  const [dailyTip, setDailyTip] = useState('')
  const [ragRecipe, setRagRecipe] = useState(null)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [loading, setLoading] = useState(false)

  // pick a random tip on mount
  useEffect(() => {
    const tip = dailyTips[Math.floor(Math.random() * dailyTips.length)]
    setDailyTip(tip)
  }, [])

  // load pantry items from backend
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    fetch('http://localhost:8000/pantry', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        const updated = [...initialFilterGroups]
        updated[0].options = data
          .filter(i => i.category === 'Kod kuće uvijek imam')
          .map(i => i.name)
        updated[2].options = data
          .filter(i => i.category === 'Danas dodatno imam')
          .map(i => i.name)

        setFilterGroups(updated)
        setFilterSelections(prev => ({
          ...prev,
          'Kod kuće uvijek imam': updated[0].options,
          'Danas dodatno imam': updated[2].options,
        }))
      })
      .catch(err => console.error('Greška kod dohvata sastojaka:', err))
  }, [])

  const toggleFilter = (groupName, option) => {
    setFilterSelections(prev => {
      const current = prev[groupName] || []
      if (current.includes(option)) {
        return { ...prev, [groupName]: current.filter(i => i !== option) }
      } else {
        return { ...prev, [groupName]: [...current, option] }
      }
    })
  }

  const handleAddCustomFilter = groupIndex => {
    const group = filterGroups[groupIndex]
    const groupName = group.groupName
    const value = newFilterValues[groupName]?.trim()
    if (!value) return

    if (group.options.includes(value)) {
      setValidationMessage('Ovaj sastojak već postoji!')
      setTimeout(() => setValidationMessage(''), 3000)
      return
    }

    // update groups
    setFilterGroups(prev => {
      const updated = [...prev]
      updated[groupIndex] = {
        ...updated[groupIndex],
        options: [...updated[groupIndex].options, value],
      }
      return updated
    })
    // select it
    setFilterSelections(prev => ({
      ...prev,
      [groupName]: [...(prev[groupName] || []), value],
    }))
    // clear input
    setNewFilterValues(prev => ({ ...prev, [groupName]: '' }))

    // persist
    const token = localStorage.getItem('accessToken')
    if (token) {
      fetch('http://localhost:8000/pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: value, category: groupName }),
      }).catch(err => console.error('Greška kod spremanja:', err))
    }
  }

  const removeFilterOption = (groupIndex, option) => {
    const groupName = filterGroups[groupIndex].groupName
    setFilterGroups(prev => {
      const updated = [...prev]
      updated[groupIndex] = {
        ...updated[groupIndex],
        options: updated[groupIndex].options.filter(o => o !== option),
      }
      return updated
    })
    setFilterSelections(prev => ({
      ...prev,
      [groupName]: (prev[groupName] || []).filter(i => i !== option),
    }))

    const token = localStorage.getItem('accessToken')
    if (token) {
      fetch(`http://localhost:8000/pantry/${encodeURIComponent(option)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(err => console.error('Greška kod brisanja:', err))
    }
  }

  const goToStep = step => {
    setCurrentStep(step)
    setValidationMessage('')
  }

  const handleRecipeSearch = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setValidationMessage('Nisi prijavljen!')
      setTimeout(() => setValidationMessage(''), 3000)
      return
    }

    const userSettings =
      JSON.parse(localStorage.getItem('userSettings') || '{}')

    const payload = {
      always_have: filterSelections['Kod kuće uvijek imam'] || [],
      extras_today: filterSelections['Danas dodatno imam'] || [],
      allowed_methods:
        filterSelections['Dozvoljen način pripreme'] || [],
      prep_time: prepTime,
      people: numberOfPeople,
      allergies: userSettings.allergies || [],
      dislikes: userSettings.dislikes || [],
      preferences: userSettings.preferences || [],
      favorites: userSettings.favorites || [],
    }

    try {
      setLoading(true)
      setValidationMessage('')

      const res = await fetch('http://localhost:8000/cook/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Greška kod generiranja recepta.')
      const data = await res.json()
      setRagRecipe(data)
      setGeneratedImage(data.image_url || null)
      setCurrentStep(5)
    } catch (e) {
      setValidationMessage('Greška: ' + e.message)
      setTimeout(() => setValidationMessage(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const startNewSearch = () => {
    setCurrentStep(0)
    setRagRecipe(null)
    setGeneratedImage(null)
    setValidationMessage('')
  }

  return (
    <div className="pantry-grid">
      {loading && (
        <div className="loading-overlay">
          Generiram recept i sliku...
        </div>
      )}

      {validationMessage && (
        <div className="validation-message">
          {validationMessage}
        </div>
      )}

      <div className="step-title">
        {currentStep === 0 && (
          <p>Unesi što uvijek imaš kod kuće</p>
        )}
        {currentStep === 1 && (
          <p>Odaberi načine pripreme</p>
        )}
        {currentStep === 2 && (
          <p>Dodaj što danas dodatno imaš</p>
        )}
        {currentStep === 3 && (
          <p>Za koliko osoba kuhaš i koliko vremena imaš?</p>
        )}
        {currentStep === 4 && <p>Spremni za kuhanje?</p>}
        {currentStep === 5 && <p>Predloženi recept</p>}
      </div>

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{
            width: `${(currentStep / 5) * 100}%`,
          }}
        />
      </div>

      {/* STEP 0 */}
      {currentStep === 0 && (
        <div className="filter-group">
          <strong>{filterGroups[0].groupName}</strong>

          {filterGroups[0].options.length === 0 && (
            <div className="empty-hint">
              <p>
                Ovdje možete dodati stavke koje uvijek imate
                kod kuće.
              </p>
            </div>
          )}

          <div className="filter-options pantry-tags">
            {filterGroups[0].options.map(opt => (
              <Tag
                key={opt}
                closable
                onClose={() => removeFilterOption(0, opt)}
                color={
                  filterSelections['Kod kuće uvijek imam']?.includes(
                    opt
                  )
                    ? 'blue'
                    : 'default'
                }
              >
                {opt}
              </Tag>
            ))}
          </div>

          <div className="add-custom-filter">
            <input
              type="text"
              placeholder="Dodaj sastojak..."
              value={
                newFilterValues[filterGroups[0].groupName] || ''
              }
              onChange={e =>
                setNewFilterValues({
                  ...newFilterValues,
                  [filterGroups[0].groupName]: e.target.value,
                })
              }
              onKeyPress={e =>
                e.key === 'Enter' && handleAddCustomFilter(0)
              }
            />
            <button onClick={() => handleAddCustomFilter(0)}>
              +
            </button>
          </div>

          <div className="navigation-buttons">
            <button onClick={() => goToStep(1)}>
              Sljedeće
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 */}
      {currentStep === 1 && (
        <div className="filter-group">
          <strong>{filterGroups[1].groupName}</strong>
          <div className="preparation-options">
            {filterGroups[1].options.map(opt => (
              <label key={opt} className="option">
                <input
                  type="checkbox"
                  checked={
                    filterSelections[
                      filterGroups[1].groupName
                    ]?.includes(opt) || false
                  }
                  onChange={() =>
                    toggleFilter(
                      filterGroups[1].groupName,
                      opt
                    )
                  }
                />
                {opt}
              </label>
            ))}
          </div>
          <div className="navigation-buttons">
            <button onClick={() => goToStep(0)}>Natrag</button>
            <button onClick={() => goToStep(2)}>Sljedeće</button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {currentStep === 2 && (
        <div className="filter-group">
          <strong>{filterGroups[2].groupName}</strong>
          <div className="daily-tip">
            <em>{dailyTip}</em>
          </div>
          <div className="filter-options pantry-tags">
            {filterGroups[2].options.map(opt => (
              <Tag
                key={opt}
                closable
                onClose={() => removeFilterOption(2, opt)}
                color={
                  filterSelections['Danas dodatno imam']?.includes(
                    opt
                  )
                    ? 'green'
                    : 'default'
                }
              >
                {opt}
              </Tag>
            ))}
          </div>
          <div className="add-custom-filter">
            <input
              type="text"
              placeholder="Dodaj novi sastojak..."
              value={
                newFilterValues[filterGroups[2].groupName] || ''
              }
              onChange={e =>
                setNewFilterValues({
                  ...newFilterValues,
                  [filterGroups[2].groupName]: e.target.value,
                })
              }
              onKeyPress={e =>
                e.key === 'Enter' && handleAddCustomFilter(2)
              }
            />
            <button onClick={() => handleAddCustomFilter(2)}>
              +
            </button>
          </div>
          <div className="navigation-buttons">
            <button onClick={() => goToStep(1)}>Natrag</button>
            <button onClick={() => goToStep(3)}>Sljedeće</button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {currentStep === 3 && (
        <div className="cooking-params">
          <h3>Detalji pripreme</h3>
          <div className="cooking-param">
            <label htmlFor="peopleCount">Kuham za:</label>
            <input
              id="peopleCount"
              type="number"
              min="1"
              max="20"
              value={numberOfPeople}
              onChange={e =>
                setNumberOfPeople(
                  parseInt(e.target.value) || 1
                )
              }
            />
            <span>osoba</span>
          </div>
          <div className="cooking-param">
            <label htmlFor="prepTime">
              Vrijeme pripreme: {prepTime} min
            </label>
            <input
              id="prepTime"
              type="range"
              min="5"
              max="120"
              step="5"
              value={prepTime}
              onChange={e =>
                setPrepTime(parseInt(e.target.value))
              }
            />
          </div>
          <div className="navigation-buttons">
            <button onClick={() => goToStep(2)}>Natrag</button>
            <button onClick={() => goToStep(4)}>Dalje</button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {currentStep === 4 && (
        <div className="filter-group">
          <strong>Tvoj pregled prije kuhanja</strong>
          <ul>
            <li>
              <b>Uvijek imam:</b>{' '}
              {(filterSelections[
                'Kod kuće uvijek imam'
              ] || []).join(', ') || 'Ništa odabrano'}
            </li>
            <li>
              <b>Danas imam:</b>{' '}
              {(filterSelections[
                'Danas dodatno imam'
              ] || []).join(', ') || 'Ništa odabrano'}
            </li>
            <li>
              <b>Metode:</b>{' '}
              {(filterSelections[
                'Dozvoljen način pripreme'
              ] || []).join(', ')}
            </li>
            <li>
              <b>Za:</b> {numberOfPeople} osoba,{' '}
              <b>vrijeme:</b> {prepTime} min
            </li>
          </ul>
          <div className="navigation-buttons">
            <button onClick={() => goToStep(3)}>Natrag</button>
            <button
              onClick={handleRecipeSearch}
              disabled={loading}
            >
              {loading ? 'Generiram...' : 'Idemo kuhati!'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {currentStep === 5 && ragRecipe && (
        <div className="filter-group">
          <strong>Predloženi recept</strong>
          {generatedImage && (
            <img
              src={`http://localhost:8000${generatedImage}`}
              alt="Predloženo jelo"
              style={{
                width: '100%',
                margin: '1rem 0',
                borderRadius: '8px',
              }}
            />
          )}
          <div className="recipe-content">
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: '14px',
                lineHeight: '1.5',
              }}
            >
              {ragRecipe.result}
            </pre>
          </div>
          <div className="navigation-buttons">
            <button onClick={() => goToStep(4)}>
              Natrag na pregled
            </button>
            <button
              onClick={handleRecipeSearch}
              disabled={loading}
            >
              {loading
                ? 'Generiram...'
                : 'Generiraj novi recept'}
            </button>
            <button onClick={startNewSearch}>
              Nova potraga
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
