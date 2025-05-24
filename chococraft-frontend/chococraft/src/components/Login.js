import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../style.css';

const Login = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectReason = params.get('redirectReason');
    if (redirectReason === 'favorites') {
      setNotificationMessage('Please login to check your wishlist.');
    } else if (redirectReason === 'addFavorite') {
      setNotificationMessage('Please login to add to wishlist.');
    }
  }, [location]);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Form submitted!");
    const username = e.target.username.value.trim();
    const password = e.target.password.value.trim();

    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      console.log("Sending request to API...");
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      console.log("Response received:", response);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse response as JSON:", text);
        throw new Error('Server returned an invalid response: ' + text);
      }
      console.log("Data:", data);

      if (!response.ok) {
        throw new Error(data.error || `Login failed with status ${response.status}`);
      }

      setErrorMessage('Login successful!');
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', data.isAdmin);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('username', username);
      console.log("Username stored in localStorage:", localStorage.getItem('username')); // Debugging

      setTimeout(() => {
        const params = new URLSearchParams(location.search);
        const redirectReason = params.get('redirectReason');
        if (data.isAdmin === true) {
          navigate('/admin');
        } else if (redirectReason === 'favorites') {
          navigate('/favorites');
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  return (
    <div>
      <header>
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-20 mx-auto my-10" />
        <h1 className="text-center text-3xl font-bold text-[#4b2e2e] uppercase">Login to ChocoCraft</h1>
        <h2 className="text-center text-xl text-[#4b2e2e] uppercase mb-4">Access Your Account</h2>
      </header>

      <main>
        {notificationMessage && (
          <div className="notification-message animate-fade-out">
            {notificationMessage}
          </div>
        )}
        <div className="login-content">
          <h3>Login</h3>
          <form id="login-form" onSubmit={handleLogin}>
            <div>
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                name="username"
                required
              />
            </div>
            <div>
              <label htmlFor="password">Password:</label>
              <div className="password-wrapper">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                />
                <span
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  {passwordVisible ? '👁️‍🗨️' : '👁️'}
                </span>
              </div>
            </div>
            <button type="submit" className="btn">
              Login
            </button>
          </form>
          {errorMessage && (
            <div
              className={`error-message ${errorMessage.includes('successful') ? 'success' : 'error'}`}
              style={{ display: errorMessage ? 'block' : 'none' }}
            >
              {errorMessage}
            </div>
          )}
          <p>
            Don't have an account?{' '}
            <a href="/signup">
              Sign Up
            </a>
          </p>
        </div>
      </main>

      <footer>
        <img src="/assets/images/logo.png" alt="ChocoCraft Logo" className="h-10 mx-auto mb-2" />
        <p>© 2025 ChocoCraft. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-facebook-f" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-twitter" />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Login;