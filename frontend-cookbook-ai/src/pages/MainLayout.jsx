import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import ProSidebarMenu from '../components/ProSidebarMenu'
import './MainLayout.css'

function MainLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900)
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 900
      setIsMobile(mobile)
      setSidebarOpen(!mobile)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="layout-container">
      {isMobile && sidebarOpen && (
        <div
          className="overlay"
          style={{ zIndex: 1001 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : 'closed'}`}>
        <ProSidebarMenu />
      </div>

      {/* Main content */}
      <div className="main-content">
        {isMobile && (
          <header className="topbar">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="menu-button"
            >
              ☰
            </button>
          </header>
        )}

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
