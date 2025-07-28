import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={
              <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1 bg-light">
                  <Dashboard />
                </main>
              </div>
            } />
            <Route path="/dashboard" element={
              <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1 bg-light">
                  <Dashboard />
                </main>
              </div>
            } />
            <Route path="/materials" element={
              <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1 bg-light">
                  <Materials />
                </main>
              </div>
            } />
            <Route path="/transactions" element={
              <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1 bg-light">
                  <Transactions />
                </main>
              </div>
            } />
            <Route path="/reports" element={
              <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1 bg-light">
                  <ErrorBoundary>
                    <Reports />
                  </ErrorBoundary>
                </main>
              </div>
            } />
            <Route path="/users" element={
              <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1 bg-light">
                  <Users />
                </main>
              </div>
            } />
            <Route path="/profile" element={
              <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1 bg-light">
                  <Profile />
                </main>
              </div>
            } />
            <Route path="/settings" element={
              <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-grow-1 bg-light">
                  <Settings />
                </main>
              </div>
            } />
          </Routes>
          
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
    </Router>
  );
}

export default App;