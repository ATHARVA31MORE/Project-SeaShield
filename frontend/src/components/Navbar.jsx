import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [userType, setUserType] = useState('');
  const location = useLocation();

  useEffect(() => {
    const fetchUserType = async () => {
      if (user?.uid) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserType(docSnap.data().userType || '');
        }
      }
    };
    fetchUserType();
  }, [user]);

  return (
    <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center fixed top-0 w-full z-50">
      <div className="text-lg font-bold text-blue-700">
        🌊 Project-SeaShield
      </div>
      <div className="space-x-6 text-sm font-medium text-gray-700">
        <Link to="/">🏠 Home</Link>
        {userType === 'organizer' && <Link to="/organizer">📋 Organizer Dashboard</Link>}
        {userType === 'volunteer' && (
          <>
            
            <Link to="/leaderboard">🌍 Leaderboard</Link>
            <Link to="/assistant">💬 Ask Assistant</Link>
          </>
        )}
        <Link to="/events">📅 Events</Link>
        {user && <button onClick={logout} className="text-red-500 ml-4">Logout</button>}
      </div>
    </nav>
  );
}
