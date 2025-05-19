import ProSidebarMenu from '../components/ProSidebarMenu'
import { Outlet } from 'react-router-dom'
import './MainLayout.css'

const MainLayout = () => {
  return (
    <div className="main-layout">
      <ProSidebarMenu collapsed={false} />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}

export default MainLayout
