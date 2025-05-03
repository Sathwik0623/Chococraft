// nav.js
document.addEventListener('DOMContentLoaded', () => {
  updateNavigation();
  updateCartCount();

  const hamburger = document.querySelector('.hamburger');
  const menu = document.querySelector('.menu');

  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      menu.classList.toggle('active');
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('active');
      });
    });
  }

  setTimeout(updateNavigation, 100);
  window.refreshNavigation = updateNavigation;
});

async function updateCartCount() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = '0');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch cart');
    const cart = await response.json();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
  } catch (e) {
    console.error('Error fetching cart count:', e);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = '0');
  }
}

function updateNavigation() {
  const isAdminPage = window.location.pathname.includes('admin.html');
  const userMenu = document.getElementById('menu');
  const adminMenu = document.getElementById('admin-menu');
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const logoutLink = document.getElementById('logoutLink');

  if (!userMenu) {
    console.error('User menu element not found');
    return;
  }

  const existingDynamicLinks = userMenu.querySelectorAll('a:not([href="index.html"]):not([href="about.html"]):not([href="contact.html"]):not([href="favorites.html"]):not([href="cart.html"]):not([id="logoutLink"])');
  existingDynamicLinks.forEach(link => link.remove());

  if (adminMenu) {
    adminMenu.innerHTML = '';
  }

  if (logoutLink) {
    if (userId && token) {
      logoutLink.textContent = 'Logout';
      logoutLink.href = '#';
      logoutLink.onclick = logout;
    } else {
      logoutLink.textContent = 'Login/Signup';
      logoutLink.href = '/login.html';
      logoutLink.onclick = null;
    }
  } else {
    console.error('Logout link element not found');
  }

  if (isAdminPage && isAdmin) {
    userMenu.style.display = 'none';
    if (adminMenu) {
      adminMenu.style.display = 'block';

      const manageProductsLink = document.createElement('a');
      manageProductsLink.href = '#add-product';
      manageProductsLink.textContent = 'Manage Products';
      adminMenu.appendChild(manageProductsLink);

      const manageUpdatesLink = document.createElement('a');
      manageUpdatesLink.href = '#manage-updates';
      manageUpdatesLink.textContent = 'Manage Updates';
      adminMenu.appendChild(manageUpdatesLink);

      const manageAboutUsLink = document.createElement('a');
      manageAboutUsLink.href = '#manage-about-us';
      manageAboutUsLink.textContent = 'Manage About Us';
      adminMenu.appendChild(manageAboutUsLink);

      const manageContactUsLink = document.createElement('a');
      manageContactUsLink.href = '#manage-contact-us';
      manageContactUsLink.textContent = 'Manage Contact Us';
      adminMenu.appendChild(manageContactUsLink);

      const existingProductsLink = document.createElement('a');
      existingProductsLink.href = '#existing-products';
      existingProductsLink.textContent = 'Existing Products';
      adminMenu.appendChild(existingProductsLink);

      const ordersLink = document.createElement('a');
      ordersLink.href = '#orders';
      ordersLink.textContent = 'Orders';
      adminMenu.appendChild(ordersLink);

      const adminLogoutLink = document.createElement('a');
      adminLogoutLink.href = '#';
      adminLogoutLink.textContent = 'Logout';
      adminLogoutLink.onclick = logout;
      adminMenu.appendChild(adminLogoutLink);
    }
  } else {
    userMenu.style.display = 'block';
    if (adminMenu) {
      adminMenu.style.display = 'none';
    }

    if (userId && token) {
      const ordersLink = document.createElement('a');
      ordersLink.href = '#';
      ordersLink.textContent = 'My Orders';
      ordersLink.onclick = (e) => {
        e.preventDefault();
        if (localStorage.getItem('userId') && localStorage.getItem('token')) {
          console.log('Navigating to user-orders.html');
          window.location.href = '/user-orders.html';
        } else {
          alert('Please log in to view your orders.');
          window.location.href = '/login.html';
        }
      };
      const logoutLinkElement = userMenu.querySelector('#logoutLink');
      if (logoutLinkElement) {
        userMenu.insertBefore(ordersLink, logoutLinkElement);
      } else {
        userMenu.appendChild(ordersLink);
      }

      if (isAdmin) {
        const adminLink = document.createElement('a');
        adminLink.href = '/admin.html';
        adminLink.textContent = 'Admin';
        userMenu.appendChild(adminLink);
      }
    } else {
      const adminLink = document.createElement('a');
      adminLink.href = '/admin.html';
      adminLink.textContent = 'Admin';
      userMenu.appendChild(adminLink);
    }
  }
}

function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('token');
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = '0');
  window.location.href = '/';
  updateNavigation();
}