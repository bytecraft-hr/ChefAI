// src/hooks/useAuth.js
const useAuth = () => {
  const getToken = () => localStorage.getItem('accessToken')

  const isExpired = () => {
    const token = getToken()
    if (!token) return true
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch (e) {
      console.error('Token decode error:', e)
      return true
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('loggedInUser')
  }

  return { getToken, isExpired, logout } // ✅ Use getToken dynamically elsewhere
}

export default useAuth
