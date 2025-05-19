import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import './ProfilePage.css';
import { API_BASE_URL } from "../config";

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setEmail(data.email || '');
          setFullName(data.full_name || '');
        } else {
          localStorage.removeItem('accessToken');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Greška pri dohvaćanju korisnika:', error);
        localStorage.removeItem('accessToken');
        navigate('/auth');
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/auth');
  };

  const handleChangePassword = () => {
    setShowChangePassword((prev) => !prev);
  };

  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm('Jesi li siguran da želiš obrisati račun?');
    if (confirmDelete) {
      alert('Tvoj račun je obrisan (simulacija).');
      localStorage.removeItem('accessToken');
      navigate('/auth');
    }
  };

  const submitPasswordChange = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
      });

      if (res.ok) {
        alert('Lozinka uspješno promijenjena!');
        setShowChangePassword(false);
        setOldPass('');
        setNewPass('');
      } else {
        const err = await res.json();
        alert('Greška: ' + err.detail);
      }
    } catch (err) {
      alert('Došlo je do greške.');
    }
  };

  const submitProfileUpdate = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, full_name: fullName }),
      });

      if (res.ok) {
        alert('Profil je uspješno ažuriran.');
      } else {
        const err = await res.json();
        alert('Greška: ' + err.detail);
      }
    } catch (err) {
      alert('Došlo je do greške.');
    }
  };

  return (
    <div className="profile-container">
      {user ? (
        <div className="profile-card">
          <FaUserCircle className="profile-icon" size={80} />
          <h2 className="profile-title">Bok, {user.username}!</h2>
          <div className="profile-info">
            <label>Email:</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />

            <label>Puno ime:</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <button className="profile-button" onClick={submitProfileUpdate}>
              Ažuriraj profil
            </button>
          </div>

          <div className="profile-actions">
            <button className="profile-button" onClick={handleChangePassword}>
              {showChangePassword ? 'Zatvori promjenu lozinke' : 'Promijeni lozinku'}
            </button>

            {showChangePassword && (
              <div className="change-password-form">
                <h4>Promjena lozinke</h4>

                <div className="password-field">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    placeholder="Trenutna lozinka"
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowOldPassword((prev) => !prev)}
                    aria-label="Toggle old password visibility"
                  >
                    {showOldPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                <div className="password-field">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Nova lozinka"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label="Toggle new password visibility"
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                <button className="profile-button" onClick={submitPasswordChange}>
                  Potvrdi promjenu
                </button>
              </div>
            )}

            <button className="profile-button danger" onClick={handleDeleteAccount}>
              Obriši račun
            </button>
            <button className="profile-button" onClick={handleLogout}>
              Odjavi se
            </button>
          </div>
        </div>
      ) : (
        <p className="loading-text">Učitavanje podataka korisnika...</p>
      )}
    </div>
  );
}

export default ProfilePage;