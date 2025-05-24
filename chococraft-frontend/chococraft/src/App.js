import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Favorites from './components/Favorites';
import About from './components/About';
import Contact from './components/Contact';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import OrderSuccess from './components/OrderSuccess'; // Import OrderSuccess component
import Admin from './components/Admin';
import Navbar from './components/Navbar';
import OrderList from './components/OrderList';
import Home from './components/Home';
import ManageSpecialCategories from './components/admin/ManageSpecialCategories';
import './App.css';

function App() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (term) => {
    console.log('App handleSearch:', term);
    setSearchTerm(term);
  };

  return (
    <Router>
      <Navbar onSearch={handleSearch} />
      <Routes>
        <Route path="/" element={<Home searchTerm={searchTerm} />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} /> {/* Use OrderSuccess component */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/user-orders" element={<OrderList />} />
        {/* Admin Routes */}
        <Route path="/admin" element={<Admin section="add-product" />} />
        <Route path="/admin/:section?" element={<Admin />} />
        <Route path="/admin/add-product" element={<Admin section="add-product" />} />
        <Route path="/admin/manage-updates" element={<Admin section="manage-updates" />} />
        <Route path="/admin/manage-about-us" element={<Admin section="manage-about-us" />} />
        <Route path="/admin/manage-contact-us" element={<Admin section="manage-contact-us" />} />
        <Route path="/admin/existing-products" element={<Admin section="existing-products" />} />
        <Route path="/admin/orders" element={<Admin section="orders" />} />
        <Route path="/admin/manage-categories" element={<Admin section="manage-categories" />} />
        <Route path="/admin/manage-special-categories" element={<ManageSpecialCategories />} />
        {/* Fallback Route */}
        <Route path="*" element={<div><h2>404 - Page Not Found</h2></div>} />
      </Routes>
    </Router>
  );
}

export default App;