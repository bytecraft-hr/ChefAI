// src/pages/PreferencesPage.jsx
import React, { useState, useEffect } from 'react'
import './PreferencesPage.css'
import { Trash2 } from 'lucide-react'
import { API_BASE_URL } from "../config"

const allergensList = ['Gluten', 'Laktoza', 'Jaja', 'Orašasti plodovi', 'Plodovi mora', 'Soja']
const dietaryOptions = ['Vegetarijanska', 'Veganska', 'Bez glutena', 'Keto', 'Niskokalorična', 'Proteinska']

export default function PreferencesPage() {
  const [selectedAllergens, setSelectedAllergens] = useState([])
  const [dislikedIngredients, setDislikedIngredients] = useState([])
  const [newDislike, setNewDislike] = useState('')
  const [preferences, setPreferences] = useState([])
  const [favoriteItem, setFavoriteItem] = useState('')
  const [favorites, setFavorites] = useState([])

  // load existing settings
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    fetch(`${API_BASE_URL}/settings/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        // guard each field to be an array
        setSelectedAllergens(Array.isArray(data.allergies) ? data.allergies : [])
        setDislikedIngredients(Array.isArray(data.dislikes) ? data.dislikes : [])
        setPreferences(Array.isArray(data.preferences) ? data.preferences : [])
        setFavorites(Array.isArray(data.favorites) ? data.favorites : [])
      })
      .catch(err => console.error("Greška kod dohvaćanja postavki:", err))
  }, [])

  // helper to toggle a value in an array-state
  const toggleItem = (setter, value) => {
    setter(prev => {
      const arr = Array.isArray(prev) ? prev : []
      return arr.includes(value)
        ? arr.filter(x => x !== value)
        : [...arr, value]
    })
  }

  const addDislike = () => {
    const item = newDislike.trim()
    if (!item) return
    setDislikedIngredients(prev => prev.includes(item) ? prev : [...prev, item])
    setNewDislike('')
  }

  const removeDislike = item => {
    setDislikedIngredients(prev => prev.filter(x => x !== item))
  }

  const addFavorite = () => {
    const item = favoriteItem.trim()
    if (!item) return
    setFavorites(prev => prev.includes(item) ? prev : [...prev, item])
    setFavoriteItem('')
  }

  const removeFavorite = item => {
    setFavorites(prev => prev.filter(x => x !== item))
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return alert("Nisi prijavljen.")

    try {
      const res = await fetch(`${API_BASE_URL}/settings/`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          allergies: selectedAllergens,
          dislikes: dislikedIngredients,
          preferences,
          favorites
        })
      })
      if (!res.ok) throw new Error("Greška prilikom spremanja.")
      alert("Postavke spremljene!")
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="preferences-grid">
      <h2>Prehrambeni profil</h2>

      {/* Allergies */}
      <section>
        <h3>Alergije</h3>
        <div className="checkbox-group">
          {allergensList.map(item => (
            <label key={item}>
              <input
                type="checkbox"
                checked={selectedAllergens.includes(item)}
                onChange={() => toggleItem(setSelectedAllergens, item)}
              />
              {item}
            </label>
          ))}
        </div>
      </section>

      {/* Dislikes */}
      <section>
        <h3>Ne volim / Ne jedem</h3>
        <ul className="styled-list">
          {dislikedIngredients.map(item => (
            <li key={item} className="option-with-remove">
              <span>{item}</span>
              <button onClick={() => removeDislike(item)} className="icon-button">
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
        <div className="dislike-input">
          <input
            type="text"
            placeholder="Npr. tikvice, patlidžan..."
            value={newDislike}
            onChange={e => setNewDislike(e.target.value)}
          />
          <button onClick={addDislike}>Dodaj</button>
        </div>
      </section>

      {/* Dietary preferences */}
      <section>
        <h3>Prehrambene preferencije</h3>
        <div className="checkbox-group">
          {dietaryOptions.map(item => (
            <label key={item}>
              <input
                type="checkbox"
                checked={preferences.includes(item)}
                onChange={() => toggleItem(setPreferences, item)}
              />
              {item}
            </label>
          ))}
        </div>
      </section>

      {/* Favorites */}
      <section>
        <h3>Omiljeni sastojci / jela (opcionalno)</h3>
        <p>Dodaj stvari koje voliš – koristit ćemo ih za preporuke recepata.</p>
        <ul className="styled-list">
          {favorites.map(item => (
            <li key={item} className="option-with-remove">
              <span>{item}</span>
              <button onClick={() => removeFavorite(item)} className="icon-button">
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
        <div className="favorite-form">
          <input
            type="text"
            placeholder="Npr. čevapi, špagete, pizza..."
            value={favoriteItem}
            onChange={e => setFavoriteItem(e.target.value)}
          />
          <button onClick={addFavorite}>Dodaj</button>
        </div>
      </section>

      <button className="save-button" onClick={handleSave}>
        Spremi postavke
      </button>
    </div>
  )
}
