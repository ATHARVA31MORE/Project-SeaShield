import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import EventList from './pages/EventList';
import Navbar from './components/Navbar';
import QRScan from './pages/QRScan';
import MyCheckIns from './pages/MyCheckIns';
import VolunteerDashboard from './pages/VolunteerDashboard';
import Organiser from './pages/Organiser';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './utils/firebase';
import Profile from './pages/Profile';
import Messages from './pages/Messages';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(false);

  // Fetch user type when user is authenticated
  useEffect(() => {
    const fetchUserType = async () => {
      if (user && !userType) {
        setUserDataLoading(true);
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUserType(userData?.userType || 'volunteer');
          } else {
            console.log('No user document found');
            setUserType('volunteer'); // fallback
          }
        } catch (error) {
          console.error('Error fetching user type:', error);
          setUserType('volunteer'); // fallback
        } finally {
          setUserDataLoading(false);
        }
      } else if (!user) {
        setUserType(null);
        setUserDataLoading(false);
      }
    };

    if (!loading) {
      fetchUserType();
    }
  }, [user, loading, userType]);

  // Calculate if we're still loading (must be before early return)
  const isLoading = loading || (user && userDataLoading);

  // Show loading while auth is loading or user data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root route - redirect based on auth status */}
      <Route 
        path="/" 
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : userType === 'organizer' ? (
            <Navigate to="/organiser" replace />
          ) : (
            <Navigate to="/volunteer-dashboard" replace />
          )
        } 
      />
      
      {/* Login route - only accessible when not authenticated */}
      <Route 
        path="/login" 
        element={
          !user ? (
            <Login />
          ) : userType === 'organizer' ? (
            <Navigate to="/organiser" replace />
          ) : (
            <Navigate to="/volunteer-dashboard" replace />
          )
        } 
      />
      
      {/* Organizer routes - only accessible by organizers */}
      <Route 
        path="/organiser" 
        element={
          user ? (
            userType === 'organizer' ? 
              <Organiser /> : 
              <Navigate to="/volunteer-dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      {/* Volunteer routes - only accessible by volunteers */}
<Route 
  path="/volunteer-dashboard" 
  element={
    user ? (
      userType === 'volunteer' ? 
        <>
          <Navbar />
          <VolunteerDashboard />
        </> : 
        <Navigate to="/organiser" replace />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

<Route 
  path="/profile" 
  element={
    user ? (
      userType === 'volunteer' ? 
        <>
          <Navbar />
          <Profile />
        </> : 
        <Navigate to="/organiser" replace />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>
<Route path="/messages" element={<Messages />} />

      
      {/* Protected routes accessible by both user types */}
      <Route 
        path="/events" 
        element={
          user ? (
            <>
              <Navbar />
              <EventList />
            </>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      <Route 
        path="/checkin" 
        element={
          user ? (
            <>
              <Navbar />
              <QRScan />
            </>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      <Route 
        path="/my-checkins" 
        element={
          user ? (
            <>
              <Navbar />
              <MyCheckIns />
            </>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      <Route 
        path="/home" 
        element={
          user ? (
            <>
              <Navbar />
              <Home />
            </>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;