import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import EventList from './pages/EventList';
import Navbar from './components/Navbar';
import QRScan from './pages/QRScan';
import MyCheckIns from './pages/MyCheckIns';
import VolunteerDashboard from './pages/VolunteerDashboard';
import OrganiserLayout from './pages/organiser/OrganiserLayout';
import Dashboard from './pages/organiser/Dashboard';
import Events from './pages/organiser/Events';
import Analytics from './pages/organiser/Analytics';
import Messaging from './pages/organiser/Messaging';
import ContentTemplates from './pages/organiser/ContentTemplates';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './utils/firebase';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import GlobalLeaderboard from './components/GlobalLeaderboard';
import VolunteerAssistant from './components/VolunteerAssistant';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [notifications, setNotifications] = useState([]);

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
            setUserType('volunteer');
          }
        } catch (error) {
          console.error('Error fetching user type:', error);
          setUserType('volunteer');
        } finally {
          setUserDataLoading(false);
        }
      } else if (!user) {
        setUserType(null);
        setUserDataLoading(false);
      }
    };

    const fetchOrganizerData = async () => {
      if (user && userType === 'organizer') {
        try {
          const [eventSnap, volunteerSnap, checkinSnap, notificationSnap] = await Promise.all([
            getDocs(collection(db, 'events')),
            getDocs(query(collection(db, 'users'), where('userType', '==', 'volunteer'))),
            getDocs(collection(db, 'checkins')),
            getDocs(collection(db, 'notifications'))
          ]);

          const eventsData = eventSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const volunteersData = volunteerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const checkinsData = checkinSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const notificationsData = notificationSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          setEvents(eventsData);
          setVolunteers(volunteersData);
          setCheckins(checkinsData);
          setNotifications(notificationsData);
        } catch (error) {
          console.error('Error fetching organizer data:', error);
        }
      }
    };

    if (!loading) {
      fetchUserType();
    }
    if (user && userType === 'organizer') {
      fetchOrganizerData();
    }
  }, [user, loading, userType]);

  // Function to refresh all data
  const refreshOrganizerData = async () => {
    if (user && userType === 'organizer') {
      try {
        const [eventSnap, volunteerSnap, checkinSnap, notificationSnap] = await Promise.all([
          getDocs(collection(db, 'events')),
          getDocs(query(collection(db, 'users'), where('userType', '==', 'volunteer'))),
          getDocs(collection(db, 'checkins')),
          getDocs(collection(db, 'notifications'))
        ]);

        const eventsData = eventSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const volunteersData = volunteerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const checkinsData = checkinSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const notificationsData = notificationSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setEvents(eventsData);
        setVolunteers(volunteersData);
        setCheckins(checkinsData);
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Error refreshing organizer data:', error);
      }
    }
  };

  const isLoading = loading || (user && userDataLoading);

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
      <Route 
  path="/leaderboard" 
  element={
    user && userType === 'volunteer' ? (
      <>
        <Navbar />
        <GlobalLeaderboard />
      </>
    ) : (
      <Navigate to="/" replace />
    )
  }
/>
<Route 
  path="/assistant" 
  element={
    user && userType === 'volunteer' ? (
      <>
        <Navbar />
        <VolunteerAssistant />
      </>
    ) : (
      <Navigate to="/" replace />
    )
  }
/>



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

      <Route 
        path="/organiser" 
        element={
          user ? (
            userType === 'organizer' ? 
              <OrganiserLayout 
                events={events}
                volunteers={volunteers}
                checkins={checkins}
                notifications={notifications}
                refreshData={refreshOrganizerData}
              /> : 
              <Navigate to="/volunteer-dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      >
        <Route 
          index 
          element={
            <Dashboard 
              events={events} 
              volunteers={volunteers} 
              checkins={checkins} 
              refreshData={refreshOrganizerData}
            />
          } 
        />
        <Route 
          path="events" 
          element={
            <Events 
              events={events}
              checkins={checkins}
              volunteers={volunteers}
              user={user}
              refreshData={refreshOrganizerData}
            />
          } 
        />
        <Route 
          path="analytics" 
          element={
            <Analytics 
              events={events} 
              volunteers={volunteers} 
              checkins={checkins}
            />
          } 
        />
        <Route 
          path="messaging" 
          element={
            <Messaging 
              events={events} 
              volunteers={volunteers}
              checkins={checkins}
              notifications={notifications}
              user={user}
              refreshData={refreshOrganizerData}
            />
          } 
        />
        <Route 
          path="templates" 
          element={
            <ContentTemplates 
              events={events}
              volunteers={volunteers}
              checkins={checkins}
            />
          } 
        />
      </Route>

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

      

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;