import React, { useState, useEffect } from 'react';
import { FaEnvelope } from 'react-icons/fa'; // Assuming react-icons for the envelope
import './MessageIcon.css'; // CSS for styling

const MessageIcon = () => {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);

  // Fetch contact messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token'); // Adjust based on your auth setup
        const response = await fetch('http://localhost:5000/api/contact-messages', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        console.log('Fetched messages:', data);
        setMessages(data);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err.message);
      }
    };

    fetchMessages();
    // Optional: Poll for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mark message as read
  const markAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/contact-messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to mark message as read');
      }
      // Update local state
      setMessages(messages.map(msg =>
        msg._id === messageId ? { ...msg, isRead: true } : msg
      ));
      console.log(`Marked message ${messageId} as read`);
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Calculate unread count for badge
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
            <p>No messages</p>
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