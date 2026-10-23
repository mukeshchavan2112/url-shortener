import React from 'react';
import { NavLink, Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          URL Shortener
        </Link>
        <nav className="navbar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Shorten
          </NavLink>
          <NavLink
            to="/links"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Recent links
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
