import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [ecoScore, setEcoScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkInCount, setCheckInCount] = useState(0);
  const [notifications, setNotifications] = useState([]);


  // Fetch notifications for this user

  useEffect(() => {
  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();

        const checkinsQuery = query(collection(db, 'checkins'), where('userId', '==', user.uid));
        const checkinsSnapshot = await getDocs(checkinsQuery);

        let validCheckIns = 0;
        for (const checkinDoc of checkinsSnapshot.docs) {
          const checkinData = checkinDoc.data();
          const eventSnap = await getDoc(doc(db, 'events', checkinData.eventId));
          if (eventSnap.exists()) {
            validCheckIns++;
          } else {
            await deleteDoc(checkinDoc.ref); // cleanup
          }
        }

        setEcoScore(data.ecoScore || 0);
        setCheckInCount(validCheckIns);
      }

      // ✅ Fetch notifications for this user
      const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const notificationsData = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationsData);

    } catch (e) {
      console.error('Error loading volunteer data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (user?.uid) {
    loadUserData();
  }
}, [user.uid]);


  if (loading) return <div className="text-center mt-10 text-gray-600">Loading dashboard...</div>;

return (
  <div className="p-6 max-w-4xl mx-auto">
    <h1 className="text-2xl font-bold mb-4 text-blue-700">
      🌊 Welcome, {user.displayName || 'Eco Hero'}!
    </h1>

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

    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">
        📬 Messages from Organizers
      </h2>
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded"
            >
              <h3 className="font-medium text-blue-800">
  {notification.subject || 'No Subject'}
</h3>
<p className="text-blue-700 text-sm mt-1">{notification.message}</p>
<p className="text-sm text-gray-600 mt-1">
  👤 From: {notification.organiserName || 'Unknown Organizer'}
</p>
<p className="text-sm text-gray-600">
  📍 Related to: {notification.eventName || 'This Event'}
</p>


              <p className="text-xs text-blue-600 mt-2">
                {(notification.createdAt?.toDate
                  ? notification.createdAt.toDate()
                  : new Date(notification.createdAt)
                ).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No messages yet. Stay tuned for updates from organizers.
        </p>
      )}
      {notifications.length > 3 && (
        <button className="text-blue-600 text-sm mt-2 hover:underline">
          View all messages ({notifications.length})
        </button>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Link
        to="/events"
        className="block bg-white shadow p-4 rounded-lg hover:bg-blue-50"
      >
        📍 <strong>Discover Cleanup Events</strong>
        <p className="text-sm text-gray-500 mt-1">
          Join nearby drives and earn points.
        </p>
      </Link>

      <Link
        to="/checkin"
        className="block bg-white shadow p-4 rounded-lg hover:bg-green-50"
      >
        ✅ <strong>Check-In to an Event</strong>
        <p className="text-sm text-gray-500 mt-1">
          Scan QR or enter Event ID to register.
        </p>
      </Link>

      <Link
        to="/my-checkins"
        className="block bg-white shadow p-4 rounded-lg hover:bg-yellow-50"
      >
        📅 <strong>My Event Participation</strong>
        <p className="text-sm text-gray-500 mt-1">
          Track your check-in history.
        </p>
      </Link>

      <Link
        to="/profile"
        className="block bg-white shadow p-4 rounded-lg hover:bg-gray-100"
      >
        👤 <strong>View My Profile</strong>
        <p className="text-sm text-gray-500 mt-1">
          See your achievements and download certificates.
        </p>
      </Link>
    </div>
  </div>
);


}