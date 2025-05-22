import React, { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../config'
import useAuth from '../hooks/useAuth'
import './ChatPage.css'

export default function ChatPage() {
  const { getToken, isExpired, logout } = useAuth()
  const token = getToken()

  const [messages, setMessages] = useState([
    { from: 'bot', text: 'How can I help you cook today?', timestamp: new Date().toLocaleTimeString() }
  ])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [mode, setMode] = useState('online')
  const [loading, setLoading] = useState(false)
  const [modalRecipe, setModalRecipe] = useState(null)
  const [notification, setNotification] = useState(null)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const sendMessage = async () => {
    if (!input.trim()) return
    if (!token || isExpired()) {
      alert('Your session expired—please log in again.')
      logout()
      return
    }

    const userMsg = { from: 'user', text: input, timestamp: new Date().toLocaleTimeString() }
    setMessages(prev => [...prev, userMsg])
    const payload = { query: input, mode, session_id: sessionId }
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/chat/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { message, recommendations, session_id } = await res.json()
      if (session_id) setSessionId(session_id)

      const botMsg = {
        from: 'bot',
        text: message,
        timestamp: new Date().toLocaleTimeString(),
        recipes: recommendations
      }

      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [
        ...prev,
        { from: 'bot', text: 'Sorry, something went wrong. Try again later.', timestamp: new Date().toLocaleTimeString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const saveRecipe = async (recipe) => {
    try {
      const payload = {
        title: recipe.title,
        image: recipe.image,
        ready_in_minutes: recipe.ready_in_minutes,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
      }

      const res = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setNotification({ type: 'success', message: 'Recept spremljen u favorite!' })
      } else {
        const err = await res.json()
        setNotification({ type: 'error', message: 'Greška: ' + err.detail })
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Neuspješno spremanje.' })
    }
  }

  return (
    <div className="chatpage-container">
      <div className="chat-header">
        <h1>Chef AI</h1>
        <p>Your smart assistant for recipe ideas</p>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`message-bubble ${m.from}`}>
            <div className="avatar">{m.from === 'bot' ? '👨‍🍳' : '👤'}</div>
            <div className={`bubble-content ${m.recipes?.length > 0 ? 'with-recipes' : ''}`}>
              <p>{m.text}</p>
              {m.timestamp && <div className="timestamp">{m.timestamp}</div>}

              {m.recipes?.length > 0 && (
                <>
                  <p>I found these recipes for you:</p>
                  <div className="recipe-list">
                    {m.recipes.map((r, idx) => (
                      <div key={idx} className="recipe-card">
                        <strong>{r.title}</strong>
                        {r.image && <img src={r.image} alt={r.title} className="recipe-image" />}
                        <div className="recipe-meta">
                          <span>Prep: {r.ready_in_minutes} min</span>
                          <span>Serves: {r.servings}</span>
                        </div>
                        <div className="recipe-actions">
                          <button className="recipe-button view" onClick={() => setModalRecipe(r)}>Pogledaj</button>
                          <button className="recipe-button save" onClick={() => saveRecipe(r)}>Spremi</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message-bubble bot">
            <div className="avatar">👨‍🍳</div>
            <div className="bubble-content">
              <p>Typing...</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-container">
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="rule">Rule-based</option>
          <option value="rag">AI (RAG)</option>
          <option value="online">Online</option>
        </select>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask me for recipe ideas…"
        />
        <button onClick={sendMessage}>Send</button>
      </div>

      {modalRecipe && (
        <div className="recipe-modal-overlay" onClick={() => setModalRecipe(null)}>
          <div className="recipe-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setModalRecipe(null)}>×</button>
            <h2>{modalRecipe.title}</h2>
            {modalRecipe.image && <img src={modalRecipe.image} alt={modalRecipe.title} />}
            <p><strong>Prep:</strong> {modalRecipe.ready_in_minutes} min</p>
            <p><strong>Serves:</strong> {modalRecipe.servings}</p>
            <p><strong>Ingredients:</strong></p>
            <ul className="ingredients-list">
              {modalRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
            </ul>
            <div className="instructions" dangerouslySetInnerHTML={{ __html: modalRecipe.instructions }} />
          </div>
        </div>
      )}
    </div>
  )
}
