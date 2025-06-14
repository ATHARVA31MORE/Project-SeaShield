import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [ecoScore, setEcoScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkInCount, setCheckInCount] = useState(0);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setEcoScore(data.ecoScore || 0);
          setCheckInCount(data.totalCheckIns || 0);
        }
      } catch (e) {
        console.error('Error loading volunteer data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, [user.uid]);

  if (loading) return <div className="text-center mt-10 text-gray-600">Loading dashboard...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">🌊 Welcome, {user.displayName || 'Eco Hero'}!</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded-lg text-center">
          <div className="text-3xl font-bold text-green-800">{ecoScore}</div>
          <p className="text-sm text-green-700">EcoScore</p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg text-center">
          <div className="text-3xl font-bold text-blue-800">{checkInCount}</div>
          <p className="text-sm text-blue-700">Events Attended</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg text-center">
          <div className="text-3xl font-bold text-yellow-800">🏅</div>
          <p className="text-sm text-yellow-700">Badges Earned</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/events" className="block bg-white shadow p-4 rounded-lg hover:bg-blue-50">
          📍 <strong>Discover Cleanup Events</strong>
          <p className="text-sm text-gray-500 mt-1">Join nearby drives and earn points.</p>
        </Link>

        <Link to="/checkin" className="block bg-white shadow p-4 rounded-lg hover:bg-green-50">
          ✅ <strong>Check-In to an Event</strong>
          <p className="text-sm text-gray-500 mt-1">Scan QR or enter Event ID to register.</p>
        </Link>

        <Link to="/my-checkins" className="block bg-white shadow p-4 rounded-lg hover:bg-yellow-50">
          📅 <strong>My Event Participation</strong>
          <p className="text-sm text-gray-500 mt-1">Track your check-in history.</p>
        </Link>

        <Link to="/profile" className="block bg-white shadow p-4 rounded-lg hover:bg-gray-100">
          👤 <strong>View My Profile</strong>
          <p className="text-sm text-gray-500 mt-1">See your achievements and download certificates.</p>
        </Link>
      </div>
    </div>
  );
}
