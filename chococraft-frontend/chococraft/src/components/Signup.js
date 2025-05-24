import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style.css';

const Signup = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);
  const toggleConfirmPasswordVisibility = () => setConfirmPasswordVisible(!confirmPasswordVisible);

  const handleSignup = async (e) => {
    e.preventDefault();
    console.log("Form submitted!");
    const username = e.target.username.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    const confirmPassword = e.target['confirm-password'].value.trim();

    if (!username || !email || !password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      console.log("Sending request to API...");
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
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
        throw new Error(data.error || `Signup failed with status ${response.status}`);
      }

      setMessage('Signup successful!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error("Signup error:", err);
      setMessage(err.message || 'An unexpected error occurred.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="signup-content">
      <h2>Sign Up</h2>
      {message && (
        <div
          className={`error-message ${message.includes('successful') ? 'success' : 'error'}`}
          style={{ display: message ? 'block' : 'none' }}
        >
          {message}
        </div>
      )}
      <form id="signupForm" onSubmit={handleSignup}>
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
          <label htmlFor="email">Email Address:</label>
          <input
            type="email"
            id="email"
            name="email"
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
        <div>
          <label htmlFor="confirm-password">Confirm Password:</label>
          <div className="password-wrapper">
            <input
              type={confirmPasswordVisible ? 'text' : 'password'}
              id="confirm-password"
              name="confirm-password"
              required
            />
            <span
              className="password-toggle"
              onClick={toggleConfirmPasswordVisibility}
            >
              {confirmPasswordVisible ? '👁️‍🗨️' : '👁️'}
            </span>
          </div>
        </div>
        <button type="submit" className="btn">
          Sign Up
        </button>
      </form>
      <p>
        Already have an account?{' '}
        <a href="/login">
          Login
        </a>
      </p>
    </div>
  );
};

export default Signup;