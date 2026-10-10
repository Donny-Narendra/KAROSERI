import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export const useIdleTimer = (timeoutMs: number = 15 * 60 * 1000) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect with a notification state
      navigate('/login', { 
        replace: true, 
        state: { message: 'Sesi Anda telah berakhir karena tidak ada aktivitas.' } 
      });
    } catch (error) {
      console.error('Error logging out on idle timeout:', error);
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Only set timer if user is logged in
    if (user) {
      timeoutRef.current = setTimeout(handleLogout, timeoutMs);
    }
  };

  useEffect(() => {
    // Only attach listeners if user is logged in
    if (!user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleUserActivity = () => {
      resetTimer();
    };

    // Initial setup
    resetTimer();

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [user, timeoutMs, navigate]);
};
