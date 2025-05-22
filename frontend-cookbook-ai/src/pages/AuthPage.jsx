import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };


  

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!formData.username || !formData.password || (!isLogin && (!formData.email || !formData.full_name))) {
      setMessage('Molimo popuni sva polja.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const response = await fetch('http://localhost:8000/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            username: formData.username,
            password: formData.password
          })
        });
      
        const result = await response.json();
      
        if (response.ok) {
          localStorage.setItem('accessToken', result.access_token);
          const payload = JSON.parse(atob(result.access_token.split('.')[1]))
          localStorage.setItem('loggedInUser', JSON.stringify(payload))
          setMessage('Uspješna prijava!');
          console.log(result);
          navigate('/');
        } else {
          setMessage(result.detail || 'Greška pri prijavi.');
        }
      }
      
     else {
        try {
          const response = await fetch("http://localhost:8000/users/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              username: formData.username,
              email: formData.email,
              password: formData.password,
              full_name: formData.full_name  
            })
          });
        
          if (response.ok) {
            setMessage("Registracija uspješna! Sad se možeš prijaviti.");
            setIsLogin(true);
            setFormData({ username: '', email: '', password: '' });
          } else {
            const data = await response.json();
            setMessage(data.detail || "Nešto je pošlo po zlu.");
          }
        } catch (error) {
          setMessage("Greška pri slanju zahtjeva.");
        } finally {
          setLoading(false);
        }
      }

    } catch (err) {
      setMessage('Greška u komunikaciji s poslužiteljem.');
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <h2 className="auth-title">{isLogin ? 'Prijava' : 'Registracija'}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            name="username"
            placeholder="Korisničko ime"
            value={formData.username}
            onChange={handleChange}
            className="auth-input"
          />

          {!isLogin && (
            <>
              <input
                type="text"
                name="full_name"
                placeholder="Puno ime"
                value={formData.full_name}
                onChange={handleChange}
                className="auth-input"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="auth-input"
              />
            </>
          )}

          <input
            type="password"
            name="password"
            placeholder="Lozinka"
            value={formData.password}
            onChange={handleChange}
            className="auth-input"
          />

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Čekaj...' : isLogin ? 'Prijavi se' : 'Registriraj se'}
          </button>
        </form>

        {message && <div className="auth-message">{message}</div>}

        <div className="auth-toggle">
          {isLogin ? 'Nemaš račun?' : 'Već imaš račun?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage('');
            }}
          >
            {isLogin ? 'Registriraj se' : 'Prijavi se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
