import Navbar from './components/Navbar'
import Home from './pages/Home'
import Scan from './pages/Scan'
import { Route, Routes } from 'react-router-dom'
import './App.css'

const App = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="app-shell">
            <Navbar />
            <Home />
          </div>
        }
      />
      <Route
        path="/scan"
        element={
          <div className="app-shell">
            <Navbar />
            <Scan />
          </div>
        }
      />
    </Routes>
  )
}

export default App
