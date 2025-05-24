import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ManageSpecialCategories = () => {
  const [specialCategories, setSpecialCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSpecialCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/public/special-categories');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch special categories');
      }
      const data = await response.json();
      setSpecialCategories(data);
    } catch (err) {
      console.error('Error fetching special categories:', err.message);
      setError('Failed to load special categories. Please try again.');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch products');
      }
      const data = await response.json();
      console.log('Fetched products for selection:', data.map(p => ({ id: p._id, name: p.name })));
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err.message);
      setError('Failed to load products. Please try again.');
    }
  };

  useEffect(() => {
    fetchSpecialCategories();
    fetchProducts();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to add a special category.');
      return;
    }

    if (!newCategoryName.trim()) {
      setError('Category name is required.');
      return;
    }

    if (selectedProductIds.length === 0) {
      setError('Please select at least one product.');
      return;
    }

    try {
      console.log('Creating special category with productIds:', selectedProductIds);
      const response = await fetch('http://localhost:5000/api/special-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategoryName,
          productIds: selectedProductIds,
          isVisible: true, // Set default visibility to true
        }),
      });

      if (response.status === 401 || response.status === 403) {
        setError('Unauthorized. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add special category');
      }

      setSuccessMessage('Special category added successfully!');
      setNewCategoryName('');
      setSelectedProductIds([]);
      fetchSpecialCategories();
      setError('');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      console.error('Error adding special category:', err.message);
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to delete a special category.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this special category?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/special-categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        setError('Unauthorized. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete special category');
      }

      setSuccessMessage('Special category deleted successfully!');
      fetchSpecialCategories();
      setError('');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      console.error('Error deleting special category:', err.message);
      setError(err.message);
    }
  };

  const handleProductSelection = (productId) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Manage Special Categories</h1>
      <Link to="/admin" style={{ display: 'inline-block', marginBottom: '20px', color: '#007bff' }}>
        Back to Admin Dashboard
      </Link>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}
      {successMessage && (
        <div style={{ color: 'green', marginBottom: '10px' }}>
          {successMessage}
        </div>
      )}

      <h2>Add Special Category</h2>
      <form onSubmit={handleAddCategory} style={{ marginBottom: '40px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="categoryName">Category Name:</label>
          <input
            type="text"
            id="categoryName"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Select Products:</label>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {products.map(product => (
              <div key={product._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  id={`product-${product._id}`}
                  checked={selectedProductIds.includes(product._id)}
                  onChange={() => handleProductSelection(product._id)}
                />
                <label htmlFor={`product-${product._id}`} style={{ marginLeft: '5px' }}>
                  {product.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn" style={{ padding: '10px 20px' }}>
          Add Category
        </button>
      </form>

      <h2>Special Categories</h2>
      {specialCategories.length === 0 ? (
        <p>No special categories found.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {specialCategories.map(category => (
            <li
              key={category._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                borderBottom: '1px solid #ccc',
              }}
            >
              <span>{category.name} (Products: {category.productIds.length})</span>
              <button
                onClick={() => handleDeleteCategory(category._id)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ManageSpecialCategories;