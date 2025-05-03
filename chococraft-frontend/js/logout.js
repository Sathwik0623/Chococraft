function logout() {
  console.log('Logging out user');
  localStorage.removeItem('token');
  localStorage.removeItem('isAdmin');
  alert('You have been logged out.');
  window.location.href = '../html/index.html';
}