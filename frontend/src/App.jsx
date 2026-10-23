import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Links from './pages/Links.jsx';
import Stats from './pages/Stats.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/links" element={<Links />} />
            <Route path="/stats/:code" element={<Stats />} />
            <Route
              path="*"
              element={
                <div className="card text-center">
                  <h1 className="page-title">Page Not Found</h1>
                  <p className="page-subtitle">The page you are looking for does not exist.</p>
                  <Link to="/" className="btn btn-primary">
                    Go to Home
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
