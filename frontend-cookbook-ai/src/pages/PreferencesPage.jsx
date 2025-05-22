import { useState, useEffect } from 'react'
import './PreferencesPage.css'
import { Trash2 } from 'lucide-react';
import { Tag } from 'antd'

const allergensList = ['Gluten', 'Laktoza', 'Jaja', 'Orašasti plodovi', 'Plodovi mora', 'Soja']
const dietaryOptions = ['Vegetarijanska', 'Veganska', 'Bez glutena', 'Keto', 'Niskokalorična', 'Proteinska']

function PreferencesPage() {
  const [selectedAllergens, setSelectedAllergens] = useState([])
  const [dislikedIngredients, setDislikedIngredients] = useState([])
  const [newDislike, setNewDislike] = useState('')
  const [preferences, setPreferences] = useState([])
  const [favoriteItem, setFavoriteItem] = useState('')
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    fetch("http://localhost:8000/settings", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setSelectedAllergens(data.allergies || [])
        setDislikedIngredients(data.dislikes || [])
        setPreferences(data.preferences || [])
        setFavorites(data.favorites || [])
      })
      .catch((err) => console.error("Greška kod dohvaćanja postavki:", err))
  }, [])

  const toggle = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }

  const addDislike = () => {
    const cleaned = newDislike.trim()
    if (cleaned && !dislikedIngredients.includes(cleaned)) {
      setDislikedIngredients([...dislikedIngredients, cleaned])
      setNewDislike('')
    }
  }

  const removeDislike = (item) => {
    setDislikedIngredients(prev => prev.filter(i => i !== item))
  }

  const addFavorite = () => {
    const trimmed = favoriteItem.trim()
    if (trimmed && !favorites.includes(trimmed)) {
      setFavorites([...favorites, trimmed])
      setFavoriteItem('')
    }
  }

  const removeFavorite = (item) => {
    setFavorites(prev => prev.filter(fav => fav !== item))
  }

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return alert("Nisi prijavljen.")

    try {
      const res = await fetch('http://localhost:8000/settings', {
        method: 'PUT',
        headers: {
    "Content-Type": "application/json; charset=UTF-8",
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

      <section>
        <h3>Alergije</h3>
        <div className="checkbox-group">
          {allergensList.map(item => (
            <label key={item}>
              <input
                type="checkbox"
                checked={selectedAllergens.includes(item)}
                onChange={() => toggle(selectedAllergens, setSelectedAllergens, item)}
              />
              {item}
            </label>
          ))}
        </div>
      </section>


    <section>
  <h3>Ne volim / Ne jedem</h3>

  <div className="pantry-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
    {dislikedIngredients.map((item) => (
      <Tag
        key={item}
        closable
        onClose={(e) => {
          e.preventDefault()
          removeDislike(item)
        }}
      >
        {item}
      </Tag>
    ))}
  </div>

  <div className="dislike-input">
    <input
      type="text"
      placeholder="Npr. tikvice, patlidžan..."
      value={newDislike}
      onChange={(e) => setNewDislike(e.target.value)}
    />
    <button onClick={addDislike}>Dodaj</button>
  </div>
</section>


      <section>
        <h3>Prehrambene preferencije</h3>
        <div className="checkbox-group">
          {dietaryOptions.map(item => (
            <label key={item}>
              <input
                type="checkbox"
                checked={preferences.includes(item)}
                onChange={() => toggle(preferences, setPreferences, item)}
              />
              {item}
            </label>
          ))}
        </div>
      </section>

      <section>
  <h3>Omiljeni sastojci / jela (opcionalno)</h3>
  <p>Dodaj stvari koje voliš – koristit ćemo ih za preporuke recepata.</p>

  <div className="pantry-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
    {favorites.map((item) => (
      <Tag
        key={item}
        closable
        onClose={(e) => {
          e.preventDefault()
          removeFavorite(item)
        }}
      >
        {item}
      </Tag>
    ))}
  </div>

  <div className="favorite-form">
    <input
      type="text"
      placeholder="Npr. čevapi, špagete, pizza..."
      value={favoriteItem}
      onChange={(e) => setFavoriteItem(e.target.value)}
    />
    <button onClick={addFavorite}>Dodaj</button>
  </div>
</section>



      <button className="save-button" onClick={handleSave}>Spremi postavke</button>
    </div>
  )
}

export default PreferencesPage
