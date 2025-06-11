import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import './ProfilePage.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa'


function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [newPass, setNewPass] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:8000/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
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
    setShowChangePassword(prev => !prev);
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
      const res = await fetch('http://localhost:8000/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPass,
          new_password: newPass
        })
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
  return (
    <div className="profile-container">
      {user ? (
        <div className="profile-card">
          <FaUserCircle className="profile-icon" size={80} />
          <h2 className="profile-title">Bok, {user.username}!</h2>
          <div className="profile-info">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Puno ime:</strong> {user.full_name}</p>
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
                
                </div>
  
                <div className="password-field">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Nova lozinka"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                 
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
