import { useState, useEffect } from 'react';

/**
 * Hook to track network connectivity status
 * Returns current online status and provides callbacks for status changes
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (process.env.NODE_ENV === 'development') {
        console.log('🟢 Network: RECONNECTED');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('🔴 Network: DISCONNECTED');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};
