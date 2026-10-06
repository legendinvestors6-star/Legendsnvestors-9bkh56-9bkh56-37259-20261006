import { useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser } from '@/lib/storage';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(getCurrentUser());

  const refreshUser = () => {
    setUser(getCurrentUser());
  };

  const logout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  useEffect(() => {
    const interval = setInterval(refreshUser, 2000);
    return () => clearInterval(interval);
  }, []);

  return { user, refreshUser, logout };
}
