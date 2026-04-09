import React from 'react';
import './Header.css';
import { FiUser, FiLogOut } from 'react-icons/fi';

const Header = ({ user, onLogout }) => {
  return (
    <header className="header">
      <div className="header-left">
        <h1>Call Audit System</h1>
      </div>

      <div className="header-right">
        <div className="user-info">
          <FiUser size={20} />
          <span>{user?.username}</span>
        </div>
        <button onClick={onLogout} className="logout-btn-header">
          <FiLogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
