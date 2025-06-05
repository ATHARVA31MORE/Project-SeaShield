import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import QRCode from 'react-qr-code';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [checkInCounts, setCheckInCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventsAndCheckIns();
  }, []);

  const loadEventsAndCheckIns = async () => {
    try {
      // Load events
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsList = eventsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Load check-in counts for each event
      const counts = {};
      for (const event of eventsList) {
        const checkInsQuery = query(
          collection(db, 'checkins'),
          where('eventId', '==', event.id)
        );
        const checkInsSnapshot = await getDocs(checkInsQuery);
        counts[event.id] = checkInsSnapshot.size;
      }

      setEvents(eventsList);
      setCheckInCounts(counts);
    } catch (error) {
      console.error('Error loading events and check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (eventDate) => {
    const today = new Date();
    const eventDateObj = new Date(eventDate);
    
    if (eventDateObj < today) {
      return { status: 'completed', color: 'text-gray-500', bg: 'bg-gray-100' };
    } else if (eventDateObj.toDateString() === today.toDateString()) {
      return { status: 'today', color: 'text-green-600', bg: 'bg-green-100' };
    } else {
      return { status: 'upcoming', color: 'text-blue-600', bg: 'bg-blue-100' };
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-600">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">🌊 Beach Cleanup Events</h1>
      
      {events.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No events available</div>
          <div className="text-gray-400">Check back later for upcoming beach cleanups!</div>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map(event => {
            const eventStatus = getEventStatus(event.date);
            const participantCount = checkInCounts[event.id] || 0;
            
            return (
              <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-blue-900 mb-2">{event.title}</h3>
                      <p className="text-gray-700 mb-3">{event.description}</p>
                      
                      {/* Event Details */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>👥</span>
                          <span>{participantCount} participants</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${eventStatus.bg} ${eventStatus.color}`}>
                        {eventStatus.status === 'completed' && '✅ Completed'}
                        {eventStatus.status === 'today' && '🔥 Happening Today'}
                        {eventStatus.status === 'upcoming' && '📅 Upcoming'}
                      </span>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="border-t pt-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* QR Code */}
                      <div className="flex flex-col items-center">
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                          <QRCode value={event.id} size={120} />
                        </div>
                        <div className="mt-3 text-center">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            📸 Scan for Check-in
                          </p>
                          <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                            ID: {event.id}
                          </p>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-2">How to Check In:</h4>
                        <ol className="text-sm text-gray-600 space-y-1">
                          <li>1. Arrive at the event location</li>
                          <li>2. Scan this QR code or use the Event ID</li>
                          <li>3. Earn +10 EcoScore points! 🌟</li>
                          <li>4. Help make our oceans cleaner! 🌊</li>
                        </ol>
                        
                        {eventStatus.status === 'today' && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-800 font-medium">
                              🎉 Event is happening today! Don't forget to check in when you arrive.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Participant Preview */}
                  {participantCount > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {participantCount} volunteer{participantCount !== 1 ? 's' : ''} joined
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(Math.min(participantCount, 5))].map((_, i) => (
                            <div key={i} className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                              👤
                            </div>
                          ))}
                          {participantCount > 5 && (
                            <span className="text-xs text-gray-500 ml-1">+{participantCount - 5} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}