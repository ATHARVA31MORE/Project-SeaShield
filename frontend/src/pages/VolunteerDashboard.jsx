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
  const [unreadCount, setUnreadCount] = useState(0);

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
        let notificationsData = [];
        
        try {
          const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const notificationsSnapshot = await getDocs(notificationsQuery);
          notificationsData = notificationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (orderError) {
          console.log('OrderBy failed, trying without orderBy:', orderError);
          
          // Fallback: query without orderBy  
          const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid)
          );
          const notificationsSnapshot = await getDocs(notificationsQuery);
          notificationsData = notificationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort manually
          notificationsData.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate - aDate;
          });
        }
        
        console.log('Dashboard notifications:', notificationsData);
        setNotifications(notificationsData);
        
        // Count unread notifications
        const unread = notificationsData.filter(notif => !notif.read).length;
        setUnreadCount(unread);

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

      {/* Quick Messages Preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-800">
            📬 Recent Messages
          </h2>
          <Link
            to="/messages"
            className="text-blue-600 text-sm hover:underline flex items-center gap-1"
          >
            View All Messages
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-1">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>
        
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.slice(0, 2).map((notification) => (
              <div
                key={notification.id}
                className={`border-l-4 p-4 rounded ${
                  notification.read 
                    ? 'bg-gray-50 border-gray-400' 
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      notification.read ? 'text-gray-800' : 'text-blue-800'
                    }`}>
                      {notification.subject || 'No Subject'}
                      {!notification.read && (
                        <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      notification.read ? 'text-gray-700' : 'text-blue-700'
                    }`}>
                      {notification.message.length > 100 
                        ? `${notification.message.substring(0, 100)}...` 
                        : notification.message
                      }
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      👤 From: {notification.organiserName || 'Unknown Organizer'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No messages yet. Stay tuned for updates from organizers.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/events"
          className="block bg-white shadow p-4 rounded-lg hover:bg-blue-50 transition-colors"
        >
          📍 <strong>Discover Cleanup Events</strong>
          <p className="text-sm text-gray-500 mt-1">
            Join nearby drives and earn points.
          </p>
        </Link>

        <Link
          to="/checkin"
          className="block bg-white shadow p-4 rounded-lg hover:bg-green-50 transition-colors"
        >
          ✅ <strong>Check-In to an Event</strong>
          <p className="text-sm text-gray-500 mt-1">
            Scan QR or enter Event ID to register.
          </p>
        </Link>

        <Link
          to="/messages"
          className="block bg-white shadow p-4 rounded-lg hover:bg-purple-50 transition-colors relative"
        >
          📬 <strong>Messages from Organizers</strong>
          <p className="text-sm text-gray-500 mt-1">
            View updates and announcements.
          </p>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/my-checkins"
          className="block bg-white shadow p-4 rounded-lg hover:bg-yellow-50 transition-colors"
        >
          📅 <strong>My Event Participation</strong>
          <p className="text-sm text-gray-500 mt-1">
            Track your check-in history.
          </p>
        </Link>

        <Link
          to="/profile"
          className="block bg-white shadow p-4 rounded-lg hover:bg-gray-100 transition-colors"
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