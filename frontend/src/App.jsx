import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import EventList from './pages/EventList';
import Navbar from './components/Navbar';
import SeedEvents from './components/SeedEvents';
import QRScan from './pages/QRScan';
import MyCheckIns from './pages/MyCheckIns';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-20 text-gray-700">Loading...</div>;
  }

  return (
    <Router>
      {/* Temporary Seeder Component - remove after seeding */}
      

      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <>
                <Navbar />
                <Home />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/events"
          element={
            user ? (
              <>
                <Navbar />
                <EventList />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/checkin" element={user ? <QRScan /> : <Navigate to="/login" />} />
        <Route path="/my-checkins" element={user ? <MyCheckIns /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
