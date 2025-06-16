import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function Messages() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (!user?.uid) return;

        // First try with orderBy, if it fails, try without
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
          
          // Sort manually by createdAt if available
          notificationsData.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate - aDate;
          });
        }
        
        console.log('Loaded notifications:', notificationsData);
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user?.uid]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: new Date()
      });
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true, readAt: new Date() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.read);
      const updatePromises = unreadNotifications.map(notif =>
        updateDoc(doc(db, 'notifications', notif.id), {
          read: true,
          readAt: new Date()
        })
      );
      
      await Promise.all(updatePromises);
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(notif => !notif.read).length;

  if (loading) {
    return (
      <div className="text-center mt-10 text-gray-600">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link 
            to="/volunteer-dashboard" 
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          📬 Messages from Organizers
        </h1>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* Filter and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'read'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {/* Messages List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                notification.read
                  ? 'bg-white border-gray-200'
                  : 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-semibold ${
                      notification.read ? 'text-gray-800' : 'text-blue-800'
                    }`}>
                      {notification.subject || 'No Subject'}
                    </h3>
                    {!notification.read && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm mb-3 ${
                    notification.read ? 'text-gray-700' : 'text-blue-700'
                  }`}>
                    {notification.message}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      👤 From: {notification.organiserName || 'Unknown Organizer'}
                    </span>
                    <span className="flex items-center gap-1">
                      📍 Event: {notification.eventName || 'General'}
                    </span>
                    <span className="flex items-center gap-1">
                      📅 {(notification.createdAt?.toDate
                        ? notification.createdAt.toDate()
                        : new Date(notification.createdAt)
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📪</div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {filter === 'unread' 
              ? 'No unread messages' 
              : filter === 'read' 
                ? 'No read messages' 
                : 'No messages yet'
            }
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'Stay tuned for updates from event organizers.'
              : `Switch to a different filter to see ${filter === 'unread' ? 'read' : 'unread'} messages.`
            }
          </p>
        </div>
      )}
    </div>
  );
}