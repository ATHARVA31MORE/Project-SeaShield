import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, 'users', result.user.uid);
    const docSnap = await getDoc(userRef);

    // If new user, ask for role and create profile
    if (!docSnap.exists()) {
      const role = prompt("Are you a Volunteer or Organizer?");
      await setDoc(userRef, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        role: role || 'Volunteer',
        ecoScore: 0
      });
      setUserProfile({ ...result.user, role, ecoScore: 0 });
    } else {
      setUserProfile(docSnap.data());
    }

    setUser(result.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        setUserProfile(docSnap.exists() ? docSnap.data() : null);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
