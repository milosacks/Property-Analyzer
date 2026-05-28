import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home           from './pages/Home'
import Analyzer       from './pages/Analyzer'
import PropertyDetail from './pages/PropertyDetail'
import Compare        from './pages/Compare'

function NavItem({ to, label, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-lg text-brand-700">Property Analyzer</span>
            <span className="hidden sm:inline ml-2 text-xs text-gray-400 font-normal">Raleigh-Durham Underwriting</span>
          </div>
          <nav className="flex gap-1">
            <NavItem to="/"        label="Dashboard" exact />
            <NavItem to="/analyze" label="Analyze"   />
            <NavItem to="/compare" label="Compare"   />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/"                  element={<Home />} />
          <Route path="/analyze"           element={<Analyzer />} />
          <Route path="/properties/:id"    element={<PropertyDetail />} />
          <Route path="/compare"           element={<Compare />} />
        </Routes>
      </main>
    </div>
  )
}
