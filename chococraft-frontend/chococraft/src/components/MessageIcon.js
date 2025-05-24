import React, { useState, useEffect } from 'react';
import { FaEnvelope } from 'react-icons/fa';
import './MessageIcon.css';

const MessageIcon = () => {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);

  // Fetch contact messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const response = await fetch('http://localhost:5000/api/contact-messages', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched contact messages:', data);
        setMessages(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching contact messages:', err.message);
        setError(err.message);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    console.log('Toggling message dropdown, current isOpen:', isOpen);
    setIsOpen(prev => !prev);
  };

  // Mark message as read
  const markAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await fetch(`http://localhost:5000/api/contact-messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      console.log(`Marked message ${messageId} as read`);
      setMessages(messages.map(msg =>
        msg._id === messageId ? { ...msg, isRead: true } : msg
      ));
    } catch (err) {
      console.error('Error marking message as read:', err.message);
    }
  };

  // Calculate unread count
  const unreadCount = messages.filter(msg => !msg.isRead).length;

  return (
    <div className="message-icon-container">
      <div className="message-icon" onClick={toggleDropdown}>
        <FaEnvelope size={24} />
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </div>
      {isOpen && (
        <div className="message-dropdown">
          {error && <p className="error">Error: {error}</p>}
          {messages.length === 0 ? (
            <p className="no-messages">No messages available</p>
          ) : (
            messages.map(msg => (
              <div
                key={msg._id}
                className={`message-item ${msg.isRead ? 'read' : 'unread'}`}
                onClick={() => !msg.isRead && markAsRead(msg._id)}
              >
                <strong>{msg.title}</strong>
                <p>{msg.message}</p>
                <small>From: {msg.email}</small>
                <small>Received: {new Date(msg.createdAt).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MessageIcon;