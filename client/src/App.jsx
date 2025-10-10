import React from 'react'

import './App.css'
import { Routes, Route } from 'react-router-dom'
import AdminDashboard from './pages/AdminDashboard'

const App = () => {
  return (
    <>
      <div>Home</div>
      <a href='/addmin' >Go addmin </a>

      <Routes>
        <Route path='/addmin' element={<AdminDashboard />} />
      </Routes>
    </>
  )
}

export default App