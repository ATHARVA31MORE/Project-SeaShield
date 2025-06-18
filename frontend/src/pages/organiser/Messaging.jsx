import React, { useState } from 'react';
import { collection, getDoc, doc, addDoc, Timestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Send, MessageCircle, Users, Calendar } from 'lucide-react';
import { db, auth } from '../../utils/firebase';

const Messaging = ({ events, checkins, volunteers, fetchAllData }) => {
  const [selectedEventForMessage, setSelectedEventForMessage] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get volunteer count for selected event
  const getVolunteerCountForEvent = (eventId) => {
    if (!eventId || !checkins) return 0;
    const eventCheckins = checkins.filter(checkin => checkin.eventId === eventId);
    return [...new Set(eventCheckins.map(checkin => checkin.userId))].length;
  };

  // Get event details
  const getEventDetails = (eventId) => {
    return events?.find(event => event.id === eventId);
  };

  const sendMessageToVolunteers = async () => {
    if (!selectedEventForMessage || !messageSubject || !messageContent) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const eventCheckins = checkins?.filter(checkin => checkin.eventId === selectedEventForMessage) || [];
      const volunteerIds = [...new Set(eventCheckins.map(checkin => checkin.userId))];

      if (volunteerIds.length === 0) {
        alert('No volunteers registered for this event');
        setLoading(false);
        return;
      }

      const eventRef = doc(db, 'events', selectedEventForMessage);
      const eventSnap = await getDoc(eventRef);

      let eventName = 'Unknown Event';
      if (eventSnap.exists()) {
        const eventData = eventSnap.data();
        eventName = eventData.title || 'Unknown Event';
      }

      const user = auth.currentUser;
      const organiserName = user?.displayName || user?.email || 'Organizer';
      const organiserId = user?.uid;

      // Send notifications to all volunteers
      const notificationPromises = volunteerIds.map(userId => 
        addDoc(collection(db, 'notifications'), {
          userId,
          eventId: selectedEventForMessage,
          eventName,
          organiserName,
          organiserId,
          subject: messageSubject,
          message: messageContent,
          createdAt: Timestamp.now(),
          read: false,
          type: 'event_message'
        })
      );

      await Promise.all(notificationPromises);

      alert(`Message sent to ${volunteerIds.length} volunteer${volunteerIds.length !== 1 ? 's' : ''} successfully!`);
      setSelectedEventForMessage('');
      setMessageSubject('');
      setMessageContent('');
      
      // Refresh notifications with a longer delay to ensure Firebase consistency
      setTimeout(() => {
        fetchRecentNotifications();
      }, 2000); // Increased delay for better consistency
      
      if (fetchAllData) fetchAllData();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('Fetching notifications for user:', user.uid);

      // First try to get all notifications without ordering to avoid index issues
      let notificationsData = [];
      
      try {
        // Try the primary query with organiserId
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('organiserId', '==', user.uid)
        );
        
        const notificationsSnapshot = await getDocs(notificationsQuery);
        notificationsData = notificationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Found notifications with organiserId:', notificationsData.length);
      } catch (indexError) {
        console.log('organiserId query failed, trying organiserName:', indexError.message);
        
        // Fallback to organiserName query
        try {
          const organiserName = user?.displayName || user?.email || 'Organizer';
          const fallbackQuery = query(
            collection(db, 'notifications'),
            where('organiserName', '==', organiserName)
          );
          
          const fallbackSnapshot = await getDocs(fallbackQuery);
          notificationsData = fallbackSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('Found notifications with organiserName:', notificationsData.length);
        } catch (fallbackError) {
          console.error('Both queries failed:', fallbackError);
          
          // Last resort: get all notifications and filter client-side
          try {
            const allNotificationsSnapshot = await getDocs(collection(db, 'notifications'));
            const allNotifications = allNotificationsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            notificationsData = allNotifications.filter(notification => 
              notification.organiserId === user.uid || 
              notification.organiserName === (user?.displayName || user?.email || 'Organizer')
            );
            
            console.log('Found notifications with client-side filtering:', notificationsData.length);
          } catch (clientError) {
            console.error('Client-side filtering failed:', clientError);
            return;
          }
        }
      }

      // Sort notifications by creation time (client-side sorting)
      notificationsData.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
        return timeB - timeA; // Descending order (newest first)
      });
      
      // Group notifications by subject and eventId to show unique messages
      const uniqueNotifications = [];
      const seen = new Set();
      
      notificationsData.forEach(notification => {
        const timestamp = notification.createdAt instanceof Timestamp 
          ? notification.createdAt.seconds 
          : Math.floor(new Date(notification.createdAt).getTime() / 1000);
        const key = `${notification.subject}-${notification.eventId}-${timestamp}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          uniqueNotifications.push(notification);
        }
      });
      
      console.log('Setting unique notifications:', uniqueNotifications.length);
      setNotifications(uniqueNotifications);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch notifications on component mount
  React.useEffect(() => {
    fetchRecentNotifications();
  }, []);

  // Refresh notifications when new data comes in
  React.useEffect(() => {
    if (events && checkins) {
      fetchRecentNotifications();
    }
  }, [events, checkins]);

  // Filter active events (not cancelled)
  const activeEvents = events?.filter(event => event.status !== 'cancelled') || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Message Volunteers</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Users size={16} />
            <span>{volunteers?.length || 0} Total Volunteers</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar size={16} />
            <span>{activeEvents.length} Active Events</span>
          </div>
        </div>
      </div>

      {/* Message Composition */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Send className="text-white" size={20} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Send Event Message</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event *
            </label>
            <select
              value={selectedEventForMessage}
              onChange={(e) => setSelectedEventForMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={loading}
            >
              <option value="">Choose an event...</option>
              {activeEvents.map(event => {
                const volunteerCount = getVolunteerCountForEvent(event.id);
                return (
                  <option key={event.id} value={event.id}>
                    {event.title} - {event.date} ({volunteerCount} volunteer{volunteerCount !== 1 ? 's' : ''})
                  </option>
                );
              })}
            </select>
            {selectedEventForMessage && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-800 font-medium">
                    Selected: {getEventDetails(selectedEventForMessage)?.title}
                  </span>
                  <span className="text-blue-600">
                    {getVolunteerCountForEvent(selectedEventForMessage)} recipients
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              placeholder="e.g., Important Update for Beach Cleanup Event"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Enter your message to volunteers..."
              rows="6"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              disabled={loading}
            />
            <div className="mt-2 text-xs text-gray-500">
              {messageContent.length}/1000 characters
            </div>
          </div>

          <button
            onClick={sendMessageToVolunteers}
            disabled={loading || !selectedEventForMessage || !messageSubject || !messageContent}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
            <span>{loading ? 'Sending...' : 'Send Message'}</span>
          </button>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <MessageCircle className="text-white" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Recent Messages</h2>
          </div>
          <button
            onClick={fetchRecentNotifications}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.slice(0, 10).map(notification => (
              <div key={notification.id} className="p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{notification.subject}</h3>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {notification.eventName}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{notification.message}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        📅 {(notification.createdAt instanceof Timestamp
                            ? notification.createdAt.toDate()
                            : new Date(notification.createdAt)
                          ).toLocaleString()}
                      </span>
                      <span>👤 To volunteers of {notification.eventName}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No messages sent yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Send your first message to volunteers using the form above
              </p>
            </div>
          )}
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs">
            <p className="text-yellow-800">
              Debug: Found {notifications.length} notifications
            </p>
          </div>
        )}
      </div>

      {/* Message Templates/Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Message Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => {
              setMessageSubject("Event Reminder - Don't Miss Out!");
              setMessageContent("Hi there! 👋\n\nThis is a friendly reminder about our upcoming beach cleanup event. We're excited to see you there!\n\nPlease bring:\n• Water bottle\n• Sun protection\n• Enthusiasm!\n\nSee you soon! 🌊");
            }}
            className="p-4 text-left bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <h4 className="font-medium text-blue-900">Event Reminder</h4>
            <p className="text-blue-700 text-sm mt-1">Remind volunteers about upcoming events</p>
          </button>
          
          <button 
            onClick={() => {
              setMessageSubject("Thank You for Your Amazing Work!");
              setMessageContent("Dear volunteers! 🙏\n\nThank you for your incredible dedication to keeping our beaches clean. Your efforts make a real difference!\n\nTogether we're protecting marine life and creating cleaner communities.\n\nKeep up the fantastic work! 💪🌊");
            }}
            className="p-4 text-left bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <h4 className="font-medium text-green-900">Thank You Note</h4>
            <p className="text-green-700 text-sm mt-1">Appreciate volunteers' contributions</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messaging;