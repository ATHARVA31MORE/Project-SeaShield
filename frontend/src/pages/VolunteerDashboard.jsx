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
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();

          const checkinsQuery = query(collection(db, 'checkins'), where('userId', '==', user.uid));
          const checkinsSnapshot = await getDocs(checkinsQuery);

          let validCheckIns = 0;
          let checkinDataList = [];

          for (const checkinDoc of checkinsSnapshot.docs) {
            const checkinData = checkinDoc.data();
            const eventSnap = await getDoc(doc(db, 'events', checkinData.eventId));
            if (eventSnap.exists()) {
              validCheckIns++;
              checkinDataList.push(checkinData);
            } else {
              await deleteDoc(checkinDoc.ref);
            }
          }

          setEcoScore(data.ecoScore || 0);
          setCheckInCount(validCheckIns);

          let totalWaste = 0;
          let streakCounter = 1, maxStreak = 1;
          const sorted = [...checkinDataList].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          let lastDate = new Date(sorted[0]?.timestamp);

          for (let i = 0; i < sorted.length; i++) {
            const currDate = new Date(sorted[i].timestamp);
            if (i > 0) {
              const diff = (currDate - lastDate) / (1000 * 60 * 60 * 24);
              if (diff <= 2) {
                streakCounter++;
                maxStreak = Math.max(maxStreak, streakCounter);
              } else {
                streakCounter = 1;
              }
            }
            lastDate = currDate;
            totalWaste += parseFloat(sorted[i].wasteCollected || 0);
          }

          const earnedBadges = [];
          if (validCheckIns >= 5) earnedBadges.push("🏅 5 Cleanups");
          if (totalWaste >= 50) earnedBadges.push("🧹 50kg Cleanup Champ");
          if (maxStreak >= 3) earnedBadges.push("🔥 3-Day Streaker");

          setBadges(earnedBadges);
        }

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

          const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid)
          );
          const notificationsSnapshot = await getDocs(notificationsQuery);
          notificationsData = notificationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          notificationsData.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate - aDate;
          });
        }

        console.log('Dashboard notifications:', notificationsData);
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter(notif => !notif.read).length);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Loading your eco dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in-down">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
            🌊 Welcome back, {user.displayName || 'Eco Hero'}!
          </h1>
          <p className="text-gray-600 text-lg">Making waves for a cleaner tomorrow</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group bg-white/70 backdrop-blur-sm border border-green-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors duration-300">
                <span className="text-2xl">🌱</span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-700 group-hover:text-green-800 transition-colors duration-300">
                  {ecoScore}
                </div>
                <p className="text-sm font-medium text-green-600">EcoScore</p>
              </div>
            </div>
            <div className="w-full bg-green-100 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{width: `${Math.min((ecoScore / 1000) * 100, 100)}%`}}
              ></div>
            </div>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm border border-blue-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors duration-300">
                <span className="text-2xl">📅</span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-700 group-hover:text-blue-800 transition-colors duration-300">
                  {checkInCount}
                </div>
                <p className="text-sm font-medium text-blue-600">Events Attended</p>
              </div>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{width: `${Math.min((checkInCount / 20) * 100, 100)}%`}}
              ></div>
            </div>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm border border-yellow-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-full group-hover:bg-yellow-200 transition-colors duration-300">
                <span className="text-2xl">🏆</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-yellow-700 group-hover:text-yellow-800 transition-colors duration-300">
                  Badges Earned
                </div>
                <p className="text-sm font-medium text-yellow-600">{badges.length} Unlocked</p>
              </div>
            </div>
            {badges.length > 0 ? (
              <div className="space-y-2">
                {badges.slice(0, 2).map((badge, index) => (
                  <div key={index} className="text-sm bg-yellow-50 rounded-lg p-2 border border-yellow-200 transform hover:scale-105 transition-transform duration-200">
                    {badge}
                  </div>
                ))}
                {badges.length > 2 && (
                  <p className="text-xs text-yellow-600 text-center">+{badges.length - 2} more badges</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-yellow-600 text-center py-2">Start participating to earn badges!</p>
            )}
          </div>
        </div>

        {/* Messages Section */}
        <div className="mb-8 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-3xl">📬</span>
                Recent Messages
              </h2>
              <Link
                to="/messages"
                className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                View All
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
              </Link>
            </div>
            
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.slice(0, 2).map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`relative overflow-hidden rounded-xl border-l-4 p-4 transform hover:scale-[1.02] transition-all duration-300 ${
                      notification.read 
                        ? 'bg-gray-50/80 border-gray-400 hover:bg-gray-100/80' 
                        : 'bg-blue-50/80 border-blue-400 hover:bg-blue-100/80 shadow-md'
                    }`}
                    style={{animationDelay: `${0.1 * index}s`}}
                  >
                    {!notification.read && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold flex items-center gap-2 ${
                          notification.read ? 'text-gray-800' : 'text-blue-800'
                        }`}>
                          {notification.subject || 'No Subject'}
                          {!notification.read && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
                              New
                            </span>
                          )}
                        </h3>
                        <p className={`text-sm mt-2 ${
                          notification.read ? 'text-gray-700' : 'text-blue-700'
                        }`}>
                          {notification.message.length > 100 
                            ? `${notification.message.substring(0, 100)}...` 
                            : notification.message
                          }
                        </p>
                        <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                          <span className="text-base">👤</span>
                          From: {notification.organiserName || 'Unknown Organizer'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-6xl mb-4 opacity-50">📭</div>
                <p>No messages yet. Stay tuned for updates from organizers.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
          <Link
            to="/events"
            className="group bg-white/70 backdrop-blur-sm border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 hover:border-blue-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl">📍</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                  Discover Events
                </h3>
                <p className="text-sm text-gray-600">Join nearby cleanup drives</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Find your next mission</p>
              <span className="group-hover:translate-x-2 transition-transform duration-300 text-blue-500">→</span>
            </div>
          </Link>

          <Link
            to="/checkin"
            className="group bg-white/70 backdrop-blur-sm border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 hover:border-green-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl">✅</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-green-700 transition-colors duration-300">
                  Quick Check-In
                </h3>
                <p className="text-sm text-gray-600">Scan QR or enter Event ID</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Register for events</p>
              <span className="group-hover:translate-x-2 transition-transform duration-300 text-green-500">→</span>
            </div>
          </Link>

          <Link
            to="/messages"
            className="group bg-white/70 backdrop-blur-sm border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 hover:border-purple-300 relative"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-200 group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl">📬</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-purple-700 transition-colors duration-300">
                  Messages
                </h3>
                <p className="text-sm text-gray-600">Updates & announcements</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-sm px-3 py-1 rounded-full animate-bounce shadow-lg">
                {unreadCount}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Stay updated</p>
              <span className="group-hover:translate-x-2 transition-transform duration-300 text-purple-500">→</span>
            </div>
          </Link>

          <Link
            to="/my-checkins"
            className="group bg-white/70 backdrop-blur-sm border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 hover:border-yellow-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-yellow-100 rounded-full group-hover:bg-yellow-200 group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl">📅</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-yellow-700 transition-colors duration-300">
                  My Participation
                </h3>
                <p className="text-sm text-gray-600">Track your history</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">View your journey</p>
              <span className="group-hover:translate-x-2 transition-transform duration-300 text-yellow-500">→</span>
            </div>
          </Link>

          <Link
            to="/profile"
            className="group bg-white/70 backdrop-blur-sm border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 hover:border-gray-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gray-100 rounded-full group-hover:bg-gray-200 group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl">👤</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-gray-700 transition-colors duration-300">
                  My Profile
                </h3>
                <p className="text-sm text-gray-600">Achievements & certificates</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Manage your account</p>
              <span className="group-hover:translate-x-2 transition-transform duration-300 text-gray-500">→</span>
            </div>
          </Link>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.6s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}