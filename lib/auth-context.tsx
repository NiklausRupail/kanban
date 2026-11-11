"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "./firebase";

interface GuestUser {
  uid: string;
  displayName: string;
  photoURL: null;
  isGuest: true;
}

type AppUser = (User & { isGuest?: false }) | GuestUser;

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const GUEST_KEY = "kanban-guest";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser as User & { isGuest?: false });
      } else {
        try {
          const saved = localStorage.getItem(GUEST_KEY);
          if (saved) setUser(JSON.parse(saved));
        } catch {}
      }
      setLoading(false);
    });
  }, []);

  async function signInWithGoogle() {
    try { localStorage.removeItem(GUEST_KEY); } catch {}
    const auth = getFirebaseAuth();
    await signInWithPopup(auth, googleProvider);
  }

  function signInAsGuest() {
    const guest: GuestUser = {
      uid: "guest",
      displayName: "Guest",
      photoURL: null,
      isGuest: true,
    };
    try { localStorage.setItem(GUEST_KEY, JSON.stringify(guest)); } catch {}
    setUser(guest);
  }

  async function logout() {
    try { localStorage.removeItem(GUEST_KEY); } catch {}
    setUser(null);
    const auth = getFirebaseAuth();
    await signOut(auth);
  }

  return (
    <AuthContext value={{ user, loading, isGuest: !!user && "isGuest" in user && !!user.isGuest, signInWithGoogle, signInAsGuest, logout }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
