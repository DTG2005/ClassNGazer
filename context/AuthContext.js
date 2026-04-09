'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../app/services/authService';

const AuthContext = createContext({ user: null, role: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = authService.onAuthChange((u) => {
      if (u && !u.isNewUser) {
        // Build a user object compatible with both ClassNGazer and Addition pages
        setUser({
          uid: u.uid,
          email: u.email,
          displayName: u.name || u.userName || u.email?.split('@')[0] || 'User',
          name: u.name || u.userName || '',
          photoURL: u.profilePic || null,
          emailVerified: u.emailVerified,
          role: u.role,
        });
        setRole(u.role === 'professor' ? 'teacher' : u.role);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
