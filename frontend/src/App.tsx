// import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './components/home/home.tsx';
import Auth from './components/auth/auth.tsx';

function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path = '/' element = {<Navigate to = '/auth' replace />} />
        <Route path="/auth" element={<Auth/>} />
        <Route path="/home" element={<Home/>} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
