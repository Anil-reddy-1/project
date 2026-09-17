import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

const API_URL = 'http://localhost:5000/api/v1'; // v2 - fixed URL

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  firebaseUid: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from backend
  const fetchUserProfile = async (idToken: string): Promise<User | null> => {
    try {
      console.log('🔍 Fetching user profile from:', `${API_URL}/auth/me`);
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch user profile:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('✅ User profile fetched:', data.data?.user);
      return data.data?.user || null;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken(true);
      const userData = await fetchUserProfile(idToken);
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    }
  };

  useEffect(() => {
    console.log('🔐 AuthContext: Setting up Firebase auth listener');
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Firebase auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
      try {
        if (firebaseUser) {
          // User is signed in, fetch profile from backend
          console.log('🎫 Getting Firebase ID token...');
          const idToken = await firebaseUser.getIdToken();
          console.log('✅ Firebase token obtained');
          
          const userData = await fetchUserProfile(idToken);
          
          if (userData) {
            console.log('✅ User authenticated:', userData);
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // Failed to fetch user data, sign out
            console.warn('⚠️ Failed to fetch user data from backend, signing out');
            await firebaseSignOut(auth);
            setUser(null);
            localStorage.removeItem('user');
          }
        } else {
          // User is signed out
          console.log('👋 User signed out');
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('❌ Auth state change error:', error);
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      // Call backend logout
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Backend logout error:', error);
    } finally {
      // Always sign out from Firebase
      await firebaseSignOut(auth);
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
