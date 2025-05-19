// src/components/ProSidebarMenu.jsx
import { useState, useEffect } from 'react'
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FaComments,
  FaCarrot,
  FaCogs,
  FaUser,
  FaSignOutAlt
} from 'react-icons/fa'
import './ProSidebarMenu.css'
import useAuth from '../hooks/useAuth'

const ProSidebarMenu = ({ collapsed }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { getToken, isExpired, logout } = useAuth()
  const token = getToken()
  const isLoggedIn = !!token && !isExpired()
  const isAuthPage = location.pathname === '/auth'

  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!token) return

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiry = payload.exp * 1000

      const interval = setInterval(() => {
        const now = Date.now()
        const diff = expiry - now

        if (diff <= 0) {
          setTimeLeft('Isteklo')
          clearInterval(interval)
          logout()
          alert('Sesija je istekla. Molimo prijavi se ponovno.')
          navigate('/auth')
        } else {
          const minutes = Math.floor(diff / 60000)
          const seconds = Math.floor((diff % 60000) / 1000)
          setTimeLeft(`${minutes} min ${seconds < 10 ? '0' : ''}${seconds} sek`)
        }
      }, 1000)

      return () => clearInterval(interval)
    } catch (e) {
      console.error('Greška kod dekodiranja tokena:', e)
    }
  }, [navigate, token, logout])

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <Sidebar collapsed={collapsed} className="custom-sidebar">
      <div className="sidebar-title">{!collapsed && 'Bytecraft kuharica'}</div>
      <Menu>
        <MenuItem
          disabled={!isLoggedIn || isAuthPage}
          icon={<FaComments />}
          active={location.pathname === '/'}
          component={!isAuthPage && isLoggedIn ? <Link to="/" /> : undefined}
        >
          {!collapsed && 'Chat'}
        </MenuItem>
        <MenuItem
          disabled={!isLoggedIn || isAuthPage}
          icon={<FaCarrot />}
          active={location.pathname === '/pantry'}
          component={!isAuthPage && isLoggedIn ? <Link to="/pantry" /> : undefined}
        >
          {!collapsed && 'Ajmo kuhati'}
        </MenuItem>
        <MenuItem
          disabled={!isLoggedIn || isAuthPage}
          icon={<FaCogs />}
          active={location.pathname === '/preferences'}
          component={!isAuthPage && isLoggedIn ? <Link to="/preferences" /> : undefined}
        >
          {!collapsed && 'Moje preferencije'}
        </MenuItem>
        <MenuItem
          disabled={!isLoggedIn || isAuthPage}
          icon={<FaUser />}
          active={location.pathname === '/profile'}
          component={!isAuthPage && isLoggedIn ? <Link to="/profile" /> : undefined}
        >
          {!collapsed && 'Moj profil'}
        </MenuItem>
        {isLoggedIn && !isAuthPage && (
          <MenuItem icon={<FaSignOutAlt />} onClick={handleLogout}>
            {!collapsed && 'Odjava'}
          </MenuItem>
        )}
      </Menu>

      {isLoggedIn && timeLeft && (
        <div className="logout-time">
          {!collapsed && <p>Sesija istječe za: <strong>{timeLeft}</strong></p>}
        </div>
      )}
    </Sidebar>
  )
}

export default ProSidebarMenu