import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { updateCartCount, getNotifications, markNotificationAsRead, showSuccessMessage } from '../utils';
import '../style.css';

// Import icons from react-icons
import { 
  FaHome, 
  FaInfoCircle, 
  FaAddressBook, 
  FaHeart, 
  FaShoppingCart, 
  FaShoppingBag, 
  FaUserShield, 
  FaUserCircle, 
  FaUser, 
  FaSignOutAlt, 
  FaBars, 
  FaSearch, 
  FaBell,
  FaEnvelope
} from 'react-icons/fa';

const Navbar = ({ onSearch }) => {
  const [isMenuActive, setIsMenuActive] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [messageCount, setMessageCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef(null);
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const isAdminPage = location.pathname.startsWith('/admin');

  const updateNavigation = () => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    const storedUsername = localStorage.getItem('username');
    console.log("Retrieved username from localStorage:", storedUsername);
    setIsLoggedIn(!!userId && !!token);
    setIsAdmin(adminStatus);
    setUsername(storedUsername || '');
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('username');
    setCartCount(0);
    setNotificationCount(0);
    setNotifications([]);
    setMessageCount(0);
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUsername('');
    navigate('/');
  };

  const fetchCartCount = async () => {
    try {
      const count = await updateCartCount();
      setCartCount(count);
    } catch (err) {
      console.error('Error fetching cart count:', err.message);
    }
  };

  const fetchNotifications = async () => {
    if (!userId || !token) {
      console.log('No userId or token, skipping notifications fetch');
      return;
    }
    try {
      const data = await getNotifications();
      setNotifications(data);
      const unreadCount = data.filter(notification => !notification.isRead).length;
      setNotificationCount(unreadCount);
      setErrorMessage(''); // Clear any previous error
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
      setErrorMessage('Failed to load notifications. Please try again.');
      showSuccessMessage('Failed to load notifications. Please try again.', setErrorMessage);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    if (!userId || !token) {
      console.log('No userId or token, cannot mark notification as read');
      return;
    }
    try {
      await markNotificationAsRead(notificationId);
      await fetchNotifications(); // Refresh notifications
    } catch (err) {
      console.error('Error marking notification as read:', err.message);
      setErrorMessage('Failed to mark notification as read. Please try again.');
      showSuccessMessage('Failed to mark notification as read. Please try again.', setErrorMessage);
    }
  };

  const fetchMessageCount = async () => {
    // Keep existing mock or replace with actual API call if available
    const mockCount = Math.floor(Math.random() * 3);
    setMessageCount(mockCount);
  };

  useEffect(() => {
    updateNavigation();
    fetchCartCount();
    fetchNotifications();
    fetchMessageCount();
    const interval = setInterval(() => {
      updateNavigation();
      fetchCartCount();
      fetchNotifications();
      fetchMessageCount();
    }, 10000);
    return () => clearInterval(interval);
  }, [location, userId, token]);

  useEffect(() => {
    const handleStorageChange = () => {
      updateNavigation();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = () => {
    setIsMenuActive(!isMenuActive);
  };

  const handleSearchInput = (e) => {
    if (onSearch) {
      onSearch(e.target.value.trim());
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo and Search Container */}
        <div className="logo-search">
          <div className="logo">
            <Link to="/">
              <img
                src="/assets/images/logo.png"
                alt="ChocoCraft Logo"
                style={{ height: '40px' }}
              />
            </Link>
          </div>

          <div className="search">
            <FaSearch className="search-icon" />
            <input
              type="text"
              id="searchInput"
              placeholder="Search…"
              onChange={handleSearchInput}
            />
          </div>
        </div>

        {/* Icons Container */}
        <div className="menu-container">
          {isAdminPage ? (
            <>
              <div className="nav-icon notification" ref={notificationRef}>
                <FaBell
                  className="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{ cursor: 'pointer' }}
                />
                {notificationCount > 0 && (
                  <span className="count wave-color wave-position">{notificationCount}</span>
                )}
                {showNotifications && (
                  <div className="notification-dropdown">
                    <div className="notification-header">
                      <h4>Notifications</h4>
                    </div>
                    {errorMessage ? (
                      <div className="notification-empty">{errorMessage}</div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">No notifications available.</div>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification._id}
                          className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkNotificationAsRead(notification._id);
                            }
                          }}
                        >
                          <strong>{notification.title}</strong>
                          <p>{notification.message}</p>
                          <small>{new Date(notification.createdAt).toLocaleString()}</small>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="nav-icon messages">
                <FaEnvelope className="icon" />
                {messageCount > 0 && (
                  <span className="count static-color">{messageCount}</span>
                )}
              </div>

              <div className="hamburger" onClick={toggleMenu}>
                <FaBars className="text-2xl" />
              </div>

              <div className={`profile-section ${isMenuActive ? 'active' : ''}`}>
                <div className="profile-dropdown">
                  <span className="profile-name">
                    <FaUserCircle className="icon" /> {username || 'Admin'}
                  </span>
                  <div className="dropdown-content">
                    <button onClick={handleLogout}>
                      <FaSignOutAlt className="icon" /> Logout
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/cart" className="nav-icon">
                <FaShoppingCart className="icon" />
                <span className="count static-color">{cartCount}</span>
              </Link>

              <div className="nav-icon notification" ref={notificationRef}>
                <FaBell
                  className="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{ cursor: 'pointer' }}
                />
                {notificationCount > 0 && (
                  <span className="count static-color">{notificationCount}</span>
                )}
                {showNotifications && (
                  <div className="notification-dropdown">
                    <div className="notification-header">
                      <h4>Notifications</h4>
                    </div>
                    {errorMessage ? (
                      <div className="notification-empty">{errorMessage}</div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">No notifications available.</div>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification._id}
                          className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkNotificationAsRead(notification._id);
                            }
                          }}
                        >
                          <strong>{notification.title}</strong>
                          <p>{notification.message}</p>
                          <small>{new Date(notification.createdAt).toLocaleString()}</small>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="hamburger" onClick={toggleMenu}>
                <FaBars className="text-2xl" />
              </div>

              <div className={`profile-section ${isMenuActive ? 'active' : ''}`}>
                {isLoggedIn ? (
                  <div className="profile-dropdown">
                    <span className="profile-name">
                      <FaUserCircle className="icon" /> {username}
                    </span>
                    <div className="dropdown-content">
                      <button onClick={handleLogout}>
                        <FaSignOutAlt className="icon" /> Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link to="/login" className="login-link">
                    <FaUserCircle className="icon" /> Login
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .navbar {
          background-color: #4b2e2e;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          position: fixed;
          top: 0;
          width: 100%;
          z-index: 1000;
          height: 60px;
        }

        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          max-width: 1200px;
          margin: 0 auto;
          height: 100%;
        }

        .logo-search {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .search {
          position: relative;
          flex-grow: 1;
          max-width: 300px;
          background-color: #fff;
          border-radius: 20px;
          padding: 2px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: box-shadow 0.3s ease;
        }

        .search:hover {
          box-shadow: inset 0 1px 5px rgba(0, 0, 0, 0.2);
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #4b2e2e;
          font-size: 16px;
          transition: color 0.3s ease, transform 0.3s ease;
        }

        .search:hover .search-icon {
          color: #532A02;
          transform: translateY(-50%) scale(1.1);
        }

        .search input {
          width: 100%;
          padding: 8px 8px 8px 50px;
          border: none;
          border-radius: 20px;
          font-size: 16px;
          background-color: transparent;
          color: #4b2e2e;
          outline: none;
        }

        .search input::placeholder {
          color: #888;
          font-size: 18px;
        }

        .menu-container {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .nav-icon {
          position: relative;
          display: flex;
          align-items: center;
          color: #fff;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .nav-icon:hover {
          color: #FFD700;
        }

        .nav-icon:hover .icon {
          transform: scale(1.1);
        }

        .nav-icon .icon {
          font-size: 20px;
          transition: transform 0.3s ease;
        }

        .nav-icon .count {
          position: absolute;
          top: -5px;
          right: -10px;
          color: #fff;
          border-radius: 50%;
          padding: 2px 6px;
          font-size: 12px;
          font-weight: bold;
        }

        .static-color {
          background-color: #e53e3e;
        }

        .wave-color {
          background: linear-gradient(45deg, #e53e3e, #ff8787);
          background-size: 200%;
          animation: waveColor 3s linear infinite;
        }

        .wave-position {
          animation: wavePosition 2s infinite;
        }

        @keyframes waveColor {
          0% { background-position: 0%; }
          50% { background-position: 100%; }
          100% { background-position: 0%; }
        }

        @keyframes wavePosition {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .hamburger {
          display: none;
        }

        .hamburger .text-2xl {
          color: #fff;
          font-size: 24px;
        }

        .icon {
          margin-right: 8px;
          font-size: 18px;
          transition: transform 0.3s ease;
        }

        .profile-section {
          position: relative;
        }

        .profile-dropdown {
          position: relative;
        }

        .profile-name {
          color: #fff;
          font-size: 16px;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .profile-name:hover {
          color: #FFD700;
        }

        .profile-name:hover .icon {
          transform: scale(1.2);
        }

        .login-link {
          color: #fff;
          text-decoration: none;
          font-size: 16px;
          display: flex;
          align-items: center;
          transition: color 0.3s ease;
        }

        .login-link:hover {
          color: #FFD700;
        }

        .dropdown-content {
          display: none;
          position: absolute;
          right: 0;
          background-color: #4b2e2e;
          min-width: 200px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          z-index: 1;
          border-radius: 5px;
        }

        .profile-section:hover .dropdown-content {
          display: block;
        }

        .dropdown-content a, .dropdown-content button {
          color: #fff;
          padding: 10px 15px;
          text-decoration: none;
          display: flex;
          align-items: center;
          font-size: 14px;
          transition: background-color 0.3s ease;
        }

        .dropdown-content a:hover, .dropdown-content button:hover {
          color: #FFD700;
          background-color: #5a3a3a;
        }

        .dropdown-content a:hover .icon, .dropdown-content button:hover .icon {
          transform: scale(1.2);
        }

        .dropdown-content button {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
        }

        .notification-dropdown {
          position: absolute;
          top: 40px;
          right: 0;
          background-color: #fff;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 1000;
          width: 300px;
          max-height: 400px;
          overflow-y: auto;
          color: #333;
        }

        .notification-header {
          padding: 10px;
          border-bottom: 1px solid #ccc;
        }

        .notification-header h4 {
          margin: 0;
          font-size: 16px;
          color: #4b2e2e;
        }

        .notification-empty {
          padding: 10px;
          text-align: center;
          color: #888;
        }

        .notification-item {
          padding: 10px;
          border-bottom: 1px solid #ccc;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .notification-item.unread {
          background-color: #e6f3ff;
        }

        .notification-item.read {
          background-color: #f9f9f9;
        }

        .notification-item:hover {
          background-color: #f0f0f0;
        }

        .notification-item strong {
          display: block;
          font-size: 14px;
          color: #4b2e2e;
        }

        .notification-item p {
          margin: 5px 0;
          font-size: 13px;
          color: #555;
        }

        .notification-item small {
          font-size: 12px;
          color: #888;
        }

        @media (max-width: 768px) {
          .navbar {
            height: 50px;
          }

          .hamburger {
            display: block;
          }

          .search {
            max-width: 150px;
          }

          .nav-icon .icon {
            font-size: 18px;
          }

          .nav-icon .count {
            top: -3px;
            right: -8px;
            padding: 1px 4px;
            font-size: 10px;
          }

          .profile-section {
            display: none;
          }

          .profile-section.active {
            display: block;
            position: absolute;
            top: 50px;
            right: 0;
            background-color: #4b2e2e;
            width: 200px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 10px;
          }

          .profile-section.active .dropdown-content {
            display: block;
            position: static;
            background-color: transparent;
            box-shadow: none;
            width: 100%;
          }

          .search input::placeholder {
            font-size: 16px;
          }

          .notification-dropdown {
            width: 100%;
            right: 10px;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;