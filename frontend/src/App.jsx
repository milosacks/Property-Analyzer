import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import PropertyDetail from './pages/PropertyDetail'
import Compare from './pages/Compare'

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
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
          <span className="font-bold text-lg text-brand-700">Property Analyzer</span>
          <nav className="flex gap-1">
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/compare" label="Compare" />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>
    </div>
  )
}
