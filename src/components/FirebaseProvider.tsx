import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, db, collection, addDoc, doc, setDoc } from "@/src/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>; /* Google */
  registerWithEmail: (e: string, p: string) => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Track current session ID to ping lastActive
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Start a new session
        const sessionRef = await addDoc(collection(db, "user_sessions"), {
          userId: currentUser.uid,
          email: currentUser.email,
          loginTime: new Date().toISOString(),
          lastActive: new Date().toISOString()
        }).catch(err => {
          console.error("Failed to start session tracking:", err);
          return null;
        });

        if (sessionRef) {
          sessionIdRef.current = sessionRef.id;
        }
      } else {
        sessionIdRef.current = null;
      }
    });

    return () => unsubscribe();
  }, []);

  // Heartbeat for usage duration (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && sessionIdRef.current) {
        setDoc(doc(db, "user_sessions", sessionIdRef.current), {
          lastActive: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    }, 60000); 
    
    return () => clearInterval(interval);
  }, [user]);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === "auth/popup-blocked") {
        alert("Please enable popups for this site to sign in.");
      } else if (error.code === "auth/cancelled-popup-request") {
        console.log("Popup request cancelled by user or browser.");
      } else {
        console.error("Login failed:", error);
        alert(`Google 登录识别失败: ${error.message || "未知错误"}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const registerWithEmail = async (e: string, p: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await createUserWithEmailAndPassword(auth, e, p);
    } catch (error: any) {
      console.error("Reg failed:", error);
      alert(`注册失败: ${error.message || "未知错误"}`);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithEmail = async (e: string, p: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, e, p);
    } catch (error: any) {
      console.error("Login failed:", error);
      alert(`登录失败: ${error.message || "未知错误"}`);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerWithEmail, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a FirebaseProvider");
  }
  return context;
}
