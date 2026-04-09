import React from 'react';
import './Sidebar.css';
import { FiMenu, FiX, FiLogOut, FiHome, FiPhone, FiCheckSquare } from 'react-icons/fi';

const Sidebar = ({ isOpen, toggleSidebar, onLogout }) => {
  return (
    <>
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Call Audit</h2>
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <FiHome size={20} />
            <span>Dashboard</span>
          </a>
          <a href="/calls" className="nav-item">
            <FiPhone size={20} />
            <span>Calls</span>
          </a>
          <a href="/audits" className="nav-item">
            <FiCheckSquare size={20} />
            <span>Audits</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="logout-btn">
            <FiLogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
