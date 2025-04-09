import React, { useEffect, useState, useRef } from 'react';
import { useLottery } from '../contexts/LotteryContext';
import './Notifications.css';

const Notifications = () => {
  const { notification, clearNotification } = useLottery();
  const [isVisible, setIsVisible] = useState(false);
  const [exitAnimation, setExitAnimation] = useState(false);
  const timeoutRef = useRef(null);
  
  // Clear any existing timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // Clear any previous timeout to prevent race conditions
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (notification) {
      // Show the notification immediately
      setIsVisible(true);
      setExitAnimation(false);
      
      // For auto-dismissing notifications, set a timeout (e.g., 5 seconds)
      // Remove this if you want notifications to stay until manually closed
      if (notification.autoDismiss !== false) {
        const dismissTime = notification.dismissTime || 5000; // Default to 5 seconds
        timeoutRef.current = setTimeout(() => {
          // Start the exit animation
          setExitAnimation(true);
          
          // Remove the notification after animation completes
          timeoutRef.current = setTimeout(() => {
            clearNotification();
            setIsVisible(false);
          }, 300); // Match this with your CSS transition duration
        }, dismissTime);
      }
    } else if (isVisible) {
      // Start exit animation
      setExitAnimation(true);
      
      // Remove component after animation completes
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match with CSS transition duration
    }
  }, [notification, isVisible, clearNotification]);

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setExitAnimation(true);
    
    timeoutRef.current = setTimeout(() => {
      clearNotification();
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible && !notification) {
    return null;
  }

  // Map notification types to class names
  const getNotificationClass = (type) => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'info':
      default: return 'info';
    }
  };

  return (
    <div className={`notification-container ${exitAnimation ? 'fade-out' : ''}`}>
      {notification && (
        <div className={`notification-toast ${getNotificationClass(notification.type)}`}>
          <div className="notification-content">
            <div className="notification-message">{notification.message}</div>
          </div>
          <button className="notification-close" onClick={handleClose}>×</button>
        </div>
      )}
    </div>
  );
};

export default Notifications;