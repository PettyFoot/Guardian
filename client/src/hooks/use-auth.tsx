import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check for stored user session on app start
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      // Try to validate the stored user
      apiRequest('GET', `/api/user/${storedUserId}`)
        .then(res => res.json())
        .then(userData => {
          setUser(userData);
          setIsInitialized(true);
        })
        .catch(() => {
          // Invalid stored user, clear it
          localStorage.removeItem('user_id');
          setIsInitialized(true);
        });
    } else {
      setIsInitialized(true);
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user_id', userData.id);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_id');
  };

  const isAuthenticated = !!user && !!user.gmailAccessToken;
  const isLoading = !isInitialized;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};