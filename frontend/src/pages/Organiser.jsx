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
import { collection, getDocs, addDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../utils/firebase';

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

  const upcomingEvents = [
    { id: 1, name: 'Juhu Beach Cleanup', date: '2025-06-18', volunteers: 45, status: 'Published' },
    { id: 2, name: 'Marine Drive Initiative', date: '2025-06-22', volunteers: 32, status: 'Draft' },
    { id: 3, name: 'Versova Beach Drive', date: '2025-06-25', volunteers: 67, status: 'Published' }
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
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Bot className="text-blue-600 mb-2" size={24} />
              <span className="text-sm font-medium text-blue-800">AI Assistant</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <BarChart3 className="text-green-600 mb-2" size={24} />
              <span className="text-sm font-medium text-green-800">Analytics</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
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

const handleDeleteEvent = async (eventId, eventDate) => {
  // Check if event is upcoming
  const today = new Date();
  const eventDateObj = new Date(eventDate);
  
  if (eventDateObj <= today) {
    alert('Cannot delete past or ongoing events');
    return;
  }

  if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      // Refresh events list
      const snapshot = await getDocs(collection(db, 'events'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
    }
  }
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
      <li key={ev.id} className="p-4 bg-white rounded shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-bold">{ev.title}</h3>
            <p className="text-sm text-gray-500">{ev.date} @ {ev.time} — {ev.location}</p>
            <p className="text-sm mt-1">Gear: {ev.gearNeeded || 'Standard Kit'}</p>
            <p className="text-sm mt-1">Target: {ev.wasteTarget || 0} kg waste</p>
            
            {/* Status Badge */}
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
              eventStatus === 'past' ? 'bg-gray-100 text-gray-600' :
              eventStatus === 'today' ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {eventStatus === 'past' ? '✅ Completed' :
               eventStatus === 'today' ? '🔥 Today' :
               '📅 Upcoming'}
            </span>
          </div>
          
          {/* Delete Button - Only for upcoming events */}
          {eventStatus === 'upcoming' && (
            <button
              onClick={() => handleDeleteEvent(ev.id, ev.date)}
              className="ml-4 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center"
              title="Delete Event"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
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
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Total Impact</h3>
            <TrendingUp className="text-green-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-green-600">2.3 Tons</p>
          <p className="text-sm text-gray-600">Waste collected this year</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Volunteer Growth</h3>
            <Users className="text-blue-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-blue-600">+34%</p>
          <p className="text-sm text-gray-600">Increase in last 3 months</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Event Success</h3>
            <Award className="text-purple-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-purple-600">94%</p>
          <p className="text-sm text-gray-600">Average attendance rate</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Beach Coverage</h3>
            <MapPin className="text-orange-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-orange-600">15</p>
          <p className="text-sm text-gray-600">Beaches cleaned regularly</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">AI-Powered Insights</h2>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <Bot className="text-blue-600 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Claude's Recommendations</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>Juhu Beach</strong> shows 25% reduction in plastic waste - consider expanding events here</li>
                <li>• <strong>Weekend events</strong> have 40% higher attendance than weekdays</li>
                <li>• <strong>Monsoon season</strong> approaching - plan indoor backup activities</li>
                <li>• <strong>Corporate partnerships</strong> could increase volunteer base by 60%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Beaches</h2>
          <div className="space-y-4">
            {['Juhu Beach', 'Marine Drive', 'Versova Beach'].map((beach, index) => (
              <div key={beach} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{beach}</span>
                <span className="text-green-600 font-semibold">{(85 - index * 5)}% clean</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Options</h2>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center space-x-2 bg-green-50 text-green-700 py-3 px-4 rounded-lg hover:bg-green-100 transition-colors">
              <Download size={20} />
              <span>Export CSV Report</span>
            </button>
            <button className="w-full flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-100 transition-colors">
              <FileText size={20} />
              <span>Generate PDF Summary</span>
            </button>
            <button className="w-full flex items-center justify-center space-x-2 bg-purple-50 text-purple-700 py-3 px-4 rounded-lg hover:bg-purple-100 transition-colors">
              <Share2 size={20} />
              <span>Share Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'events', label: 'Event Management', icon: Calendar },
    { id: 'ai-tools', label: 'AI Tools', icon: Bot },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'volunteers', label: 'Volunteers', icon: Users },
    { id: 'messages', label: 'Communications', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Logout handler
  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Seashield Organizer</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                <button 
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <TabButton
                  key={tab.id}
                  id={tab.id}
                  label={tab.label}
                  icon={tab.icon}
                  active={activeTab === tab.id}
                  onClick={setActiveTab}
                />
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'events' && renderEventManagement()}
            {activeTab === 'ai-tools' && renderAITools()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'volunteers' && <VolunteerManagement />}
            {activeTab === 'messages' && (
                <div className="bg-white rounded-xl p-8 shadow-lg text-center">
                <MessageSquare className="mx-auto mb-4 text-gray-400" size={48} />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Communications Hub</h2>
                <p className="text-gray-600">Send AI-generated messages to volunteers and stakeholders</p>
                </div>
            )}
            {activeTab === 'settings' && (
                <div className="bg-white rounded-xl p-8 shadow-lg text-center">
                <Settings className="mx-auto mb-4 text-gray-400" size={48} />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Organization Settings</h2>
                <p className="text-gray-600">Configure your organization profile and preferences</p>
                </div>
            )}
            </div>
        </div>
      </div>

      {/* Modals */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Event</h2>
            <p className="text-gray-600 mb-4">Use Claude AI to help you create the perfect beach cleanup event.</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all">
                Start with AI
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <Bot className="text-blue-600 mr-3" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">AI Assistant</h2>
            </div>
            <p className="text-gray-600 mb-4">Claude is ready to help! What would you like to generate or analyze?</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowAIModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all">
                Let's Go!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function VolunteerManagement() {
  const [volunteers, setVolunteers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchVolunteers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const filtered = snapshot.docs
        .map(doc => doc.data())
        .filter(user => user.userType === 'volunteer');
      setVolunteers(filtered);
    };
    fetchVolunteers();
  }, []);

  const filteredVolunteers = volunteers.filter(v =>
    v.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4">
      <input
        className="w-full p-2 mb-4 border border-gray-300 rounded"
        type="text"
        placeholder="Search volunteers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full table-auto border text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">EcoScore</th>
              <th className="px-3 py-2 text-left">Check-Ins</th>
            </tr>
          </thead>
          <tbody>
            {filteredVolunteers.map((v, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{v.displayName || `${v.firstName} ${v.lastName}`}</td>
                <td className="px-3 py-2">{v.email}</td>
                <td className="px-3 py-2">{v.ecoScore || 0}</td>
                <td className="px-3 py-2">{v.totalCheckIns || 0}</td>
              </tr>
            ))}
            {filteredVolunteers.length === 0 && (
              <tr>
                <td colSpan="4" className="px-3 py-4 text-center text-gray-500">No volunteers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default OrganizerDashboard;