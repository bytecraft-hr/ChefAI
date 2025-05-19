// src/pages/ChatPage.jsx
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
  const [darkMode, setDarkMode] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim()) return
    const token = getToken()
    if (!token || isExpired()) {
      alert('Your session expired—please log in again.')
      logout()
      return
    }

    const userMsg = { from: 'user', text: input, timestamp: new Date().toLocaleTimeString() }
    setMessages((msgs) => [...msgs, userMsg])
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
      const botMsg = {
        from: 'bot',
        text: message,
        timestamp: new Date().toLocaleTimeString(),
        recipes: recommendations
      }

      if (session_id) setSessionId(session_id)
      setMessages((msgs) => [...msgs, botMsg])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((msgs) => [
        ...msgs,
        { from: 'bot', text: 'Sorry, something went wrong. Try again later.', timestamp: new Date().toLocaleTimeString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`chatpage-container ${darkMode ? 'dark' : ''}`}>
      <div className="chat-header">
        <h1>Chef AI</h1>
        <p>Your smart assistant for recipe ideas</p>
        <button
  className={`dark-toggle ${darkMode ? 'dark' : ''}`}
  onClick={() => setDarkMode(prev => !prev)}
>
  {darkMode ? 'Light Mode' : 'Dark Mode'}
</button>

      </div>

      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`message-bubble ${m.from}`}>
            <div className="avatar">{m.from === 'bot' ? '🤖' : '👤'}</div>
            <div className="bubble-content">
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
                        <div><strong>Ingredients:</strong>
                          <ul className="ingredients-list">
                            {r.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                          </ul>
                        </div>
                        <div className="instructions" dangerouslySetInnerHTML={{ __html: r.instructions }} />
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
            <div className="avatar">🤖</div>
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
    </div>
  )
}
