document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const togglePassword = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  const errorDisplay = document.getElementById('error-message');

  console.log('login.js loaded');

  // Check for redirectReason query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const redirectReason = urlParams.get('redirectReason');
  if (redirectReason === 'favorites') {
    displayNotification('Please login to check your wishlist.');
  } else if (redirectReason === 'addFavorite') {
    displayNotification('Please login to add to wishlist.');
  }

  // Toggle password visibility
  togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.classList.toggle('active');
  });

  // Form submission handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = passwordInput.value.trim();

    console.log('Login form submitted:', { username, password });

    if (!username || !password) {
      displayMessage('Please enter both username and password.', 'error');
      return;
    }

    try {
      console.log('Sending fetch request to /api/login');
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      console.log('Fetch response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      displayMessage('Login successful!', 'success');

      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', data.isAdmin);
      localStorage.setItem('userId', data.userId);
      console.log('Stored in localStorage:', { token: data.token, isAdmin: data.isAdmin, userId: data.userId });

      // Refresh navigation to update logout link
      if (window.refreshNavigation) {
        window.refreshNavigation();
      } else {
        console.warn('refreshNavigation not available, navigation may not update immediately');
      }

      setTimeout(() => {
        if (data.isAdmin === true) {
          window.location.href = '../html/admin.html';
        } else if (redirectReason === 'favorites') {
          window.location.href = '../html/favorites.html';
        } else {
          window.location.href = '../html/index.html';
        }
      }, 2000);
    } catch (err) {
      console.error('Login error:', err.message);
      displayMessage(err.message, 'error');
    }
  });

  // Function to display form messages
  function displayMessage(message, type) {
    errorDisplay.textContent = message;
    errorDisplay.className = `error-message ${type === 'success' ? 'success' : 'error'}`;
    errorDisplay.style.display = 'block';
    setTimeout(() => {
      errorDisplay.style.display = 'none';
    }, 3000);
  }

  // Function to display notification
  function displayNotification(message) {
    const notificationDisplay = document.getElementById('notification-message');
    notificationDisplay.textContent = message;
    notificationDisplay.style.display = 'block';
    setTimeout(() => {
      notificationDisplay.style.opacity = '0';
      setTimeout(() => {
        notificationDisplay.style.display = 'none';
        notificationDisplay.style.opacity = '1'; // Reset for future use
      }, 500); // Match transition duration
    }, 3000);
  }

  // Display update in marquee
  async function displayUpdateMarquee() {
    const updateMarquee = document.getElementById('update-marquee');
    if (updateMarquee) {
      try {
        const response = await fetch('http://localhost:3000/updates/latest');
        const update = await response.json();
        updateMarquee.textContent = update.text;
      } catch (error) {
        console.error('Error fetching update:', error);
        updateMarquee.textContent = 'Welcome to ChocoCraft! Check out our latest chocolates.';
      }
    }
  }

  // Initialize marquee
  displayUpdateMarquee();
});