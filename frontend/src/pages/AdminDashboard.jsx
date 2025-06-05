import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

export default function AdminDashboard() {
  const [checkIns, setCheckIns] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    uniqueVolunteers: 0,
    totalEvents: 0,
    todayCheckIns: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load all check-ins
      const checkInsQuery = query(
        collection(db, 'checkins'),
        orderBy('timestamp', 'desc')
      );
      const checkInsSnapshot = await getDocs(checkInsQuery);
      const checkInsData = checkInsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: new Date(doc.data().timestamp)
      }));

      // Load all events
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCheckIns(checkInsData);
      setEvents(eventsData);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCheckIns = checkInsData.filter(checkIn => 
        checkIn.timestamp >= today
      ).length;

      const uniqueVolunteers = new Set(checkInsData.map(checkIn => checkIn.userId)).size;

      setStats({
        totalCheckIns: checkInsData.length,
        uniqueVolunteers,
        totalEvents: eventsData.length,
        todayCheckIns
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventCheckIns = (eventId) => {
    return checkIns.filter(checkIn => checkIn.eventId === eventId);
  };

  const getFilteredCheckIns = () => {
    if (selectedEvent === 'all') return checkIns;
    return checkIns.filter(checkIn => checkIn.eventId === selectedEvent);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div className="p-6 text-center">Loading admin dashboard...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">📊 Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-800">{stats.totalCheckIns}</div>
          <div className="text-sm text-blue-600">Total Check-ins</div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-800">{stats.uniqueVolunteers}</div>
          <div className="text-sm text-green-600">Unique Volunteers</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-800">{stats.totalEvents}</div>
          <div className="text-sm text-yellow-600">Total Events</div>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-800">{stats.todayCheckIns}</div>
          <div className="text-sm text-purple-600">Today's Check-ins</div>
        </div>
      </div>

      {/* Event Participation Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">📅 Event Participation</h2>
        <div className="grid gap-4">
          {events.map(event => {
            const eventCheckIns = getEventCheckIns(event.id);
            return (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-blue-900">{event.title}</h3>
                    <p className="text-sm text-gray-600">{event.location}</p>
                    <p className="text-sm text-gray-500">{event.date}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{eventCheckIns.length}</div>
                    <div className="text-sm text-gray-500">participants</div>
                  </div>
                </div>
                
                {eventCheckIns.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-600 mb-1">Recent participants:</div>
                    <div className="flex flex-wrap gap-1">
                      {eventCheckIns.slice(0, 5).map((checkIn, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {checkIn.userName}
                        </span>
                      ))}
                      {eventCheckIns.length > 5 && (
                        <span className="text-xs text-gray-500">+{eventCheckIns.length - 5} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Check-in Logs */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">📋 Check-in Logs</h2>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 border-b">Volunteer</th>
                <th className="text-left p-3 border-b">Event</th>
                <th className="text-left p-3 border-b">Location</th>
                <th className="text-left p-3 border-b">Check-in Time</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredCheckIns().slice(0, 20).map((checkIn, idx) => (
                <tr key={checkIn.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-3 border-b">
                    <div className="font-medium">{checkIn.userName}</div>
                    <div className="text-xs text-gray-500">{checkIn.userEmail}</div>
                  </td>
                  <td className="p-3 border-b">
                    <div className="font-medium">{checkIn.eventTitle}</div>
                    <div className="text-xs text-gray-500">ID: {checkIn.eventId}</div>
                  </td>
                  <td className="p-3 border-b text-gray-600">{checkIn.eventLocation}</td>
                  <td className="p-3 border-b text-gray-600">{formatDate(checkIn.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {getFilteredCheckIns().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No check-ins found for the selected filter.
          </div>
        )}

        {getFilteredCheckIns().length > 20 && (
          <div className="text-center mt-4 text-sm text-gray-500">
            Showing latest 20 check-ins. Total: {getFilteredCheckIns().length}
          </div>
        )}
      </div>
    </div>
  );
}