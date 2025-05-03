document.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const loginRequiredMessage = document.getElementById('loginRequiredMessage');
  const favoritesList = document.getElementById('favorites-list');
  const favoritesMessage = document.getElementById('favoritesMessage');
  const favoritesMessageText = document.getElementById('favoritesMessageText');

  if (!userId || !token) {
    loginRequiredMessage.style.display = 'block';
    favoritesList.style.display = 'none';
    favoritesMessage.style.display = 'none';
    return;
  }

  loginRequiredMessage.style.display = 'none';
  favoritesList.style.display = 'block';

  const favorites = await fetchFavorites();
  window.renderFavorites(favorites);
  await updateCartCount();
});

async function fetchFavorites() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    return [];
  }

  const favoritesList = document.getElementById('favorites-list');
  if (favoritesList) {
    favoritesList.innerHTML = '<p>Loading...</p>';
  }

  try {
    const response = await fetch('http://localhost:3000/api/favorites', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      alert('Session expired. Please log in again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return [];
    }

    if (!response.ok) throw new Error(`Failed to fetch favorites: ${response.statusText}`);
    const favorites = await response.json();
    return favorites;
  } catch (e) {
    console.error('Error fetching favorites:', e);
    document.getElementById('favoritesMessage').style.display = 'block';
    document.getElementById('favoritesMessageText').textContent =
      'Error loading favorites. Please try again later.';
    return [];
  }
}

window.renderFavorites = function renderFavorites(favorites) {
  const favoritesList = document.getElementById('favorites-list');
  const favoritesMessage = document.getElementById('favoritesMessage');
  const favoritesMessageText = document.getElementById('favoritesMessageText');

  if (!favoritesList) return;

  favoritesList.innerHTML = '';
  favoritesMessage.style.display = 'none';

  if (favorites.length === 0) {
    favoritesMessage.style.display = 'block';
    favoritesMessageText.textContent = 'Your favorites list is empty.';
    return;
  }

  favorites.forEach(fav => {
    const imageUrl = fav.productId.image_url.startsWith('http') ? fav.productId.image_url : `http://localhost:3000/${fav.productId.image_url}`;
    const favoriteItem = document.createElement('div');
    favoriteItem.className = 'favorite-item';
    favoriteItem.innerHTML = `
      <img src="${imageUrl}" alt="${fav.productId.name}" width="100" height="100">
      <div>
        <h3>${fav.productId.name}</h3>
        <p>₹${fav.productId.price.toFixed(2)}</p>
        <p>${fav.productId.stock > 0 ? `In Stock: ${fav.productId.stock}` : 'Out of Stock'}</p>
        <button class="btn remove-from-favorites" data-id="${fav.productId._id}">Remove</button>
        <button class="btn move-to-cart" data-id="${fav.productId._id}" data-name="${fav.productId.name}" data-price="${fav.productId.price}" data-image="${imageUrl}" data-stock="${fav.productId.stock}" ${fav.productId.stock <= 0 ? 'disabled' : ''}>Move to Cart</button>
      </div>
    `;
    favoritesList.appendChild(favoriteItem);
  });

  document.querySelectorAll('.remove-from-favorites').forEach(btn => {
    btn.removeEventListener('click', removeFromFavorites);
    btn.addEventListener('click', removeFromFavorites);
  });

  document.querySelectorAll('.move-to-cart').forEach(btn => {
    btn.removeEventListener('click', moveToCart);
    btn.addEventListener('click', moveToCart);
  });
};

async function removeFromFavorites(event) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    console.log('User not logged in, redirecting to login');
    alert('Please log in.');
    window.location.href = 'login.html';
    return;
  }

  const productId = event.target.getAttribute('data-id');
  console.log('Removing favorite with productId:', productId);

  try {
    const response = await fetch(`http://localhost:3000/api/favorites/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Delete response status:', response.status);

    if (response.status === 401 || response.status === 403) {
      console.log('Session expired, redirecting to login');
      alert('Session expired. Please log in again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to remove favorite: ${response.statusText} - ${errorText}`);
    }

    console.log('Favorite removed successfully, fetching updated list');
    const updatedFavorites = await fetchFavorites();
    window.renderFavorites(updatedFavorites);
    showSuccessMessage('Removed from favorites', 'fav-success');
  } catch (e) {
    console.error('Error removing favorite:', e);
    alert('Failed to remove favorite. Please try again.');
  }
}

async function moveToCart(event) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) {
    alert('Please log in.');
    window.location.href = 'login.html';
    return;
  }

  const productId = event.target.getAttribute('data-id');
  const name = event.target.getAttribute('data-name');
  const price = parseFloat(event.target.getAttribute('data-price'));
  const image = event.target.getAttribute('data-image');
  const stock = parseInt(event.target.getAttribute('data-stock'));

  if (stock <= 0) {
    alert('Out of stock.');
    return;
  }

  try {
    // Step 1: Fetch the current cart
    let cartResponse = await fetch('http://localhost:3000/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (cartResponse.status === 401 || cartResponse.status === 403) {
      alert('Session expired. Please log in again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    if (!cartResponse.ok) throw new Error('Failed to fetch cart');
    let cart = await cartResponse.json();
    cart = cart.map(item => ({
      productId: item.productId._id,
      quantity: item.quantity,
    }));

    // Step 2: Add the product to the cart
    const cartItem = cart.find(item => item.productId === productId);
    if (cartItem) {
      if (cartItem.quantity < stock) {
        cartItem.quantity += 1;
      } else {
        alert('Stock limit reached.');
        return;
      }
    } else {
      cart.push({ productId, quantity: 1 });
    }

    const saveCartResponse = await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cart }),
    });

    if (saveCartResponse.status === 401 || saveCartResponse.status === 403) {
      alert('Session expired. Please log in again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    if (!saveCartResponse.ok) throw new Error('Failed to save cart');

    // Step 3: Remove the product from favorites
    const removeResponse = await fetch(`http://localhost:3000/api/favorites/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (removeResponse.status === 401 || removeResponse.status === 403) {
      alert('Session expired. Please log in again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    if (!removeResponse.ok) throw new Error('Failed to remove favorite');

    // Step 4: Update the UI
    const updatedFavorites = await fetchFavorites();
    window.renderFavorites(updatedFavorites);
    await updateCartCount();
    showSuccessMessage('Moved to cart', 'fav-success');
  } catch (e) {
    console.error('Error moving to cart:', e);
    alert('Failed to move to cart. Please try again.');
  }
}

async function updateCartCount() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  if (!userId || !token) return;

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
  }
}

function showSuccessMessage(message, messageClass) {
  const existingMessages = document.querySelectorAll(`.${messageClass}`);
  existingMessages.forEach(msg => msg.remove());

  const successMsg = document.createElement('div');
  successMsg.className = messageClass;
  successMsg.innerHTML = `
    <span class="success-text">${message}</span>
  `;

  if (messageClass === 'signup-success') {
    const signupContent = document.querySelector('.signup-content');
    if (signupContent) {
      signupContent.appendChild(successMsg);
    } else {
      document.body.appendChild(successMsg);
    }
  } else {
    document.body.appendChild(successMsg);
  }

  successMsg.style.display = 'flex';
  setTimeout(() => {
    successMsg.classList.add('fade-out');
    setTimeout(() => successMsg.remove(), 500);
  }, 2500);
}