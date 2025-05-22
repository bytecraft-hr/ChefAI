import React, { useEffect, useState } from 'react'
import { API_BASE_URL } from '../config'
import useAuth from '../hooks/useAuth'
import './FavoritesPage.css'

export default function FavoritesPage() {
  const { getToken } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [expandedIndex, setExpandedIndex] = useState(null)

  useEffect(() => {
    const fetchFavorites = async () => {
      const token = getToken()
      try {
        const res = await fetch(`${API_BASE_URL}/favorites`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setFavorites(data)
      } catch (err) {
        console.error('Greška pri dohvaćanju favorita:', err)
      }
    }

    fetchFavorites()
  }, [])

  const deleteFavorite = async (recipeId) => {
    const token = getToken()
    try {
      const res = await fetch(`${API_BASE_URL}/favorites/${recipeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setFavorites(prev => prev.filter(r => r.id !== recipeId))
      } else {
        const err = await res.json()
        alert('Greška: ' + err.detail)
      }
    } catch (err) {
      console.error('Greška pri brisanju recepta:', err)
      alert('Neuspješno brisanje.')
    }
  }
  

  return (
    <div className="favorites-page">
      <h2>Omiljeni recepti</h2>

      {favorites.length === 0 ? (
        <div className="no-favorites">Nemaš spremljenih recepata.</div>
      ) : (
        <div className="favorites-grid">
          {favorites.map((recipe, index) => (
            <div key={index} className="favorite-card">
              <h3>{recipe.title}</h3>

              {recipe.image && <img src={recipe.image} alt={recipe.title} className="favorite-image" />}
              <div className="favorite-meta">
                <span><strong>Vrijeme pripreme</strong> {recipe.ready_in_minutes} min</span>
                <span> {recipe.servings} porcija</span>
              </div>

              {expandedIndex === index ? (
                <div className="recipe-details">
                  <div className="favorite-ingredients">
                    <ul>
                      {recipe.ingredients.map((ing, i) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="favorite-instructions" dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
                  <button className="toggle-button" onClick={() => setExpandedIndex(null)}>Zatvori</button>
                </div>
              ) : (
                <div className="recipe-summary">
                <button className="toggle-button" onClick={() => setExpandedIndex(index)}>Prikaži recept</button>
                <button className="delete-button" onClick={() => deleteFavorite(recipe.id)}>Ukloni</button>
              </div>
              
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
