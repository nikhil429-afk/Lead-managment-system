// import type React from 'react'
import { BrowserRouter, Route, Routes, } from 'react-router-dom';
import ProtectedRoute from './components/Protectedroute';
import Register from "./components/register";
import LogIn from './components/login';
import User from './components/user';
import Admin from './components/admin';
import Manager from './components/manager';


function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/register' element={<Register />} />

        <Route path='/login' element={<LogIn />} />

        <Route path='/user' element={ <ProtectedRoute allowedRole="User"> <User /> </ProtectedRoute>} />

        <Route path="/admin" element={ <ProtectedRoute allowedRole="Admin"> <Admin /> </ProtectedRoute>} />

        <Route path="/manager" element={ <ProtectedRoute allowedRole="Manager"> <Manager /> </ProtectedRoute>} />
      </Routes>
    </BrowserRouter >
  )
}


export default App;
