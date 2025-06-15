import React from 'react';
import { useEffect, useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Camera, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  Plus,
  Edit3,
  Share2,
  Download,
  Mail,
  Bell,
  Award,
  TrendingUp,
  Eye,
  Filter,
  Search,
  Bot,
  Wand2,
  Image,
  FileText,
  Send,
  Globe,
  Target,
  Zap
} from 'lucide-react';
import { collection, getDocs, addDoc, doc, getDoc, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../utils/firebase';
import { writeBatch, increment } from 'firebase/firestore';

const OrganizerDashboard = () => {
  // Authentication states
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Existing states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    gearNeeded: '',
    location: '',
    wasteTarget: ''
  });

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Get user document from Firestore to check userType
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && userDoc.data().userType === 'organizer') {
            setUser(currentUser);
            setUserType('organizer');
          } else {
            setUser(null);
            setUserType(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
          setUserType(null);
        }
      } else {
        setUser(null);
        setUserType(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch events
  useEffect(() => {
    if (user) {
      const fetchEvents = async () => {
        try {
          const snapshot = await getDocs(collection(db, 'events'));
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setEvents(data);
        } catch (error) {
          console.error('Error fetching events:', error);
        }
      };
      fetchEvents();
    }
  }, [modalOpen, user]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Authentication check - not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full w-20 h-20 mx-auto mb-6">
            <Zap className="text-white w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-8">Please log in as an organizer to access the dashboard.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Authentication check - not an organizer
  if (user && userType !== 'organizer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-500 p-4 rounded-full w-20 h-20 mx-auto mb-6">
            <Settings className="text-white w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Unauthorized Access</h2>
          <p className="text-gray-600 mb-8">This page is only accessible to registered organizers.</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { title: 'Active Events', value: '8', icon: Calendar, color: 'bg-blue-500' },
    { title: 'Total Volunteers', value: '247', icon: Users, color: 'bg-green-500' },
    { title: 'Beaches Cleaned', value: '15', icon: MapPin, color: 'bg-purple-500' },
    { title: 'Waste Collected', value: '2.3T', icon: Award, color: 'bg-orange-500' }
  ];

    

  const TabButton = ({ id, label, icon: Icon, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const StatCard = ({ stat }) => (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
        </div>
        <div className={`${stat.color} p-3 rounded-lg`}>
          <stat.icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );

  const EventCard = ({ event }) => (
    <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900">{event.name}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          event.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {event.status}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-600">
          <Calendar size={16} className="mr-2" />
          <span>{event.date}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Users size={16} className="mr-2" />
          <span>{event.volunteers} volunteers registered</span>
        </div>
      </div>
      <div className="flex space-x-2">
        <button className="flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
          <Edit3 size={16} className="mr-1" />
          Edit
        </button>
        <button className="flex items-center px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
          <Eye size={16} className="mr-1" />
          View
        </button>
        <button className="flex items-center px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors">
          <Share2 size={16} className="mr-1" />
          Share
        </button>
      </div>
    </div>
  );

  const AIFeatureCard = ({ title, description, icon: Icon, action, color }) => (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-gray-200">
      <div className={`${color} p-3 rounded-lg w-fit mb-4`}>
        <Icon className="text-white" size={24} />
      </div>
      <h3 className="font-semibold text-lg text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <button 
        onClick={action}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
      >
        Generate Now
      </button>
    </div>
  );

  const cancelEvent = async (eventId, reason) => {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: reason || 'Event cancelled by organizer'
      });
      
      alert('Event cancelled successfully');
      // Refresh the events list
      const snapshot = await getDocs(collection(db, 'events'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event');
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
        <button 
          onClick={() => setShowEventModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus size={20} />
          <span>Create Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setShowAIModal(true)}
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Bot className="text-blue-600 mb-2" size={24} />
              <span className="text-sm font-medium text-blue-800">AI Assistant</span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <BarChart3 className="text-green-600 mb-2" size={24} />
              <span className="text-sm font-medium text-green-800">Analytics</span>
            </button>
            <button 
              onClick={() => setActiveTab('messaging')}
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Mail className="text-purple-600 mb-2" size={24} />
              <span className="text-sm font-medium text-purple-800">Send Messages</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <Download className="text-orange-600 mb-2" size={24} />
              <span className="text-sm font-medium text-orange-800">Export Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEventManagement = () => {
    const handleCreateEvent = async () => {
      if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.location || !newEvent.wasteTarget) return;

      try {
        await addDoc(collection(db, 'events'), {
          ...newEvent,
          wasteTarget: Number(newEvent.wasteTarget), // Ensure it's stored as number
          createdAt: new Date().toISOString(),
          organizerId: user.uid
        });

        setModalOpen(false);
        setNewEvent({ title: '', date: '', time: '', gearNeeded: '', location: '', wasteTarget: '' });
      } catch (error) {
        console.error('Error creating event:', error);
      }
    };

    const deleteEventWithCleanup = async (eventId) => {
      const checkinsQuery = query(collection(db, 'checkins'), where('eventId', '==', eventId));
      const checkinsSnapshot = await getDocs(checkinsQuery);
      
      const batch = writeBatch(db);
      checkinsSnapshot.forEach((docSnap) => {
        const checkinData = docSnap.data();
        batch.delete(docSnap.ref);
        const userRef = doc(db, 'users', checkinData.userId);
        batch.update(userRef, {
          ecoScore: increment(-10),
          totalCheckIns: increment(-1)
        });
      });

      batch.delete(doc(db, 'events', eventId));
      await batch.commit();
    };

    const getEventStatus = (eventDate) => {
      const today = new Date();
      const eventDateObj = new Date(eventDate);
      
      if (eventDateObj < today) {
        return 'past';
      } else if (eventDateObj.toDateString() === today.toDateString()) {
        return 'today';
      } else {
        return 'upcoming';
      }
    };

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upcoming Events</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Create Event
          </button>
        </div>

        <ul className="space-y-4">
          {events.map(ev => {
            const eventStatus = getEventStatus(ev.date);
            
            return (
              <li
  key={ev.id}
  className={`p-4 rounded shadow ${
    ev.status === 'cancelled' ? 'bg-gray-100 opacity-70 border border-gray-300' : 'bg-white'
  }`}
>
  <div className="flex justify-between items-start">
    <div className="flex-1">
      <h3 className="text-lg font-bold">{ev.title}</h3>
      <p className="text-sm text-gray-500">
        {ev.date} @ {ev.time} — {ev.location}
      </p>
      <p className="text-sm mt-1">Gear: {ev.gearNeeded || 'Standard Kit'}</p>
      <p className="text-sm mt-1">Target: {ev.wasteTarget || 0} kg waste</p>

      {/* Status Badge */}
      <span
        className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
          ev.status === 'cancelled'
            ? 'bg-red-100 text-red-700'
            : eventStatus === 'past'
            ? 'bg-gray-100 text-gray-600'
            : eventStatus === 'today'
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}
      >
        {ev.status === 'cancelled'
          ? '❌ Cancelled'
          : eventStatus === 'past'
          ? '✅ Completed'
          : eventStatus === 'today'
          ? '🔥 Today'
          : '📅 Upcoming'}
      </span>
    </div>

    {/* Cancel Button — only if event is not cancelled */}
    {ev.status !== 'cancelled' && eventStatus === 'upcoming' && (
      <button
        onClick={() => {
          const reason = prompt('Reason for cancellation (optional):');
          if (confirm('Are you sure you want to cancel this event?')) {
            cancelEvent(ev.id, reason);
          }
        }}
        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
      >
        Cancel Event
      </button>
    )}
  </div>
</li>

            );
          })}
          {events.length === 0 && <p className="text-gray-500">No events yet.</p>}
        </ul>

        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Create New Event</h3>
              <input
                className="w-full mb-3 p-2 border rounded"
                placeholder="Event Title"
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
              />
              <input
                className="w-full mb-3 p-2 border rounded"
                type="date"
                value={newEvent.date}
                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
              />
              <input
                className="w-full mb-3 p-2 border rounded"
                type="time"
                value={newEvent.time}
                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
              />
              <input
                className="w-full mb-3 p-2 border rounded"
                placeholder="Location"
                value={newEvent.location}
                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
              />
              <input
                className="w-full mb-3 p-2 border rounded"
                type="number"
                placeholder="Waste Target (kg)"
                value={newEvent.wasteTarget}
                onChange={e => setNewEvent({ ...newEvent, wasteTarget: Number(e.target.value) })}
              />
              <input
                className="w-full mb-4 p-2 border rounded"
                placeholder="Gear Needed (optional)"
                value={newEvent.gearNeeded}
                onChange={e => setNewEvent({ ...newEvent, gearNeeded: e.target.value })}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAITools = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">AI-Powered Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AIFeatureCard
          title="Content Generator"
          description="Generate flyers, social posts, and email campaigns with Claude 3.5"
          icon={FileText}
          color="bg-blue-500"
          action={() => setShowAIModal(true)}
        />
        <AIFeatureCard
          title="Smart Recommendations"
          description="Get AI suggestions for equipment, volunteer count, and logistics"
          icon={Target}
          color="bg-green-500"
          action={() => setShowAIModal(true)}
        />
        <AIFeatureCard
          title="Impact Reports"
          description="Auto-generate cleanup summaries and impact stories"
          icon={BarChart3}
          color="bg-purple-500"
          action={() => setShowAIModal(true)}
        />
        <AIFeatureCard
          title="Volunteer Matching"
          description="AI matches volunteers to events based on skills and availability"
          icon={Users}
          color="bg-orange-500"
          action={() => setShowAIModal(true)}
        />
        <AIFeatureCard
          title="Natural Language Queries"
          description="Ask questions about your data in plain English"
          icon={MessageSquare}
          color="bg-pink-500"
          action={() => setShowAIModal(true)}
        />
        <AIFeatureCard
          title="Multi-language Support"
          description="Auto-translate content for global reach"
          icon={Globe}
          color="bg-indigo-500"
          action={() => setShowAIModal(true)}
        />
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8">
        <div className="flex items-center mb-4">
          <Bot className="text-blue-600 mr-3" size={32} />
          <h2 className="text-2xl font-bold text-gray-900">Claude AI Assistant</h2>
        </div>
        <p className="text-gray-700 mb-6">
          Your intelligent companion for beach cleanup organization. Claude helps with everything from event planning to post-cleanup analysis.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Sample Queries:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "Which beaches need the most attention?"</li>
              <li>• "Create a social media post for next cleanup"</li>
              <li>• "Suggest optimal volunteer team size"</li>
              <li>• "Generate impact report for last month"</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">AI Capabilities:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Content generation & translation</li>
              <li>• Data analysis & insights</li>
              <li>• Volunteer communication drafts</li>
              <li>• Logistical recommendations</li>
            </ul>
          </div>
        </div>
        <button 
          onClick={() => setShowAIModal(true)}
          className="mt-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
        >
          Start Chat with Claude
        </button>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Performance</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">Average Volunteers per Event</span>
              <span className="text-2xl font-bold text-blue-600">48</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">Completion Rate</span>
              <span className="text-2xl font-bold text-green-600">94%</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">Average Waste Collected</span>
              <span className="text-2xl font-bold text-purple-600">150kg</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="text-blue-600" size={20} />
              <span className="text-sm">New event created: Marine Drive Cleanup</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <Users className="text-green-600" size={20} />
              <span className="text-sm">23 new volunteer registrations</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <Award className="text-purple-600" size={20} />
              <span className="text-sm">Juhu Beach event completed successfully</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMessaging = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Communication Center</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Notification</h2>
          <div className="space-y-4">
            <select className="w-full p-3 border border-gray-300 rounded-lg">
              <option>Select Event</option>
              <option>Juhu Beach Cleanup</option>
              <option>Marine Drive Initiative</option>
              <option>Versova Beach Drive</option>
            </select>
            <input 
              type="text" 
              placeholder="Subject"
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
            <textarea 
              placeholder="Message content..."
              rows="4"
              className="w-full p-3 border border-gray-300 rounded-lg"
            ></textarea>
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Send Message
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Message Templates</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 font-medium mb-1">Volunteer Reminder</p>
              <p className="text-sm text-gray-600">"Hi [Name], just a reminder about your upcoming beach cleanup event on [Date] at [Location]. See you there! 🌊"</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 font-medium mb-1">Event Cancellation</p>
              <p className="text-sm text-gray-600">"We regret to inform you that the event [Event Name] scheduled on [Date] has been cancelled due to unforeseen circumstances. Thank you for your understanding."</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 font-medium mb-1">Thank You Message</p>
              <p className="text-sm text-gray-600">"Thank you for making a difference! 🌍 Your contribution to the [Event Name] helped clean up [X kg] of waste. Together we create impact!"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex space-x-4 mb-6">
        <TabButton id="dashboard" label="Dashboard" icon={Zap} active={activeTab === 'dashboard'} onClick={setActiveTab} />
        <TabButton id="eventManagement" label="Manage Events" icon={Calendar} active={activeTab === 'eventManagement'} onClick={setActiveTab} />
        <TabButton id="analytics" label="Analytics" icon={BarChart3} active={activeTab === 'analytics'} onClick={setActiveTab} />
        <TabButton id="messaging" label="Messaging" icon={Mail} active={activeTab === 'messaging'} onClick={setActiveTab} />
        <TabButton id="ai" label="AI Tools" icon={Wand2} active={activeTab === 'ai'} onClick={setActiveTab} />
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'eventManagement' && renderEventManagement()}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'messaging' && renderMessaging()}
      {activeTab === 'ai' && renderAITools()}
    </div>
  );
};

export default OrganizerDashboard;