document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const errorDisplay = document.getElementById('successMessage');
  const togglePassword = document.getElementById('toggle-password');
  const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');

  // Toggle password visibility for password field
  togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.classList.toggle('active');
  });

  // Toggle password visibility for confirm password field
  toggleConfirmPassword.addEventListener('click', () => {
    const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    confirmPasswordInput.setAttribute('type', type);
    toggleConfirmPassword.classList.toggle('active');
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (!username || !email || !password || !confirmPassword) {
      displayMessage('Please fill in all fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      displayMessage('Passwords do not match.', 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      displayMessage('Signup successful!', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } catch (err) {
      console.error('Signup error:', err.message);
      displayMessage(err.message, 'error');
    }
  });

  function displayMessage(message, type) {
    errorDisplay.textContent = message;
    errorDisplay.className = `success-message ${type === 'success' ? 'success' : 'error'}`;
    errorDisplay.style.display = 'block';
    setTimeout(() => {
      errorDisplay.style.display = 'none';
    }, 3000);
  }
});