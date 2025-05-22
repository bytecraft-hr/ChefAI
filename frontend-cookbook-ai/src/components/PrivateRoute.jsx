import { Navigate } from 'react-router-dom'

const PrivateRoute = ({ children }) => {
  const user = localStorage.getItem('loggedInUser')
  return user ? children : <Navigate to="/login" replace />
}

export default PrivateRoute
