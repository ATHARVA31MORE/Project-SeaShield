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
  Zap,
  Copy,
  X
} from 'lucide-react';
import { collection, getDocs, addDoc, doc, getDoc, deleteDoc, query, where, updateDoc, orderBy, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../utils/firebase';
import { writeBatch, increment } from 'firebase/firestore';

const Organizer = () => {
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

  // New states for real data
  const [realStats, setRealStats] = useState({
    activeEvents: 0,
    totalVolunteers: 0,
    beachesCleaned: 0,
    wasteCollected: 0
  });
  const [volunteers, setVolunteers] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [selectedEventForMessage, setSelectedEventForMessage] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [notifications, setNotifications] = useState([]);

  // AI Tools states - simplified without API calls
  const [aiInput, setAiInput] = useState('');
  const [aiOutput, setAiOutput] = useState('');

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
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

  // Fetch all data including real stats
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [modalOpen, user]);

  const fetchAllData = async () => {
    try {
      // Fetch events
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsData);

      // Fetch volunteers
      const volunteersSnapshot = await getDocs(query(collection(db, 'users'), where('userType', '==', 'volunteer')));
      const volunteersData = volunteersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVolunteers(volunteersData);

      // Fetch check-ins
      const checkinsSnapshot = await getDocs(collection(db, 'checkins'));
      const checkinsData = checkinsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCheckins(checkinsData);

      // Fetch notifications
      const notificationsSnapshot = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')));
      const notificationsData = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notificationsData);

      // Calculate real stats
      calculateRealStats(eventsData, volunteersData, checkinsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateRealStats = (eventsData, volunteersData, checkinsData) => {
    const now = new Date();
    
    // Active events (upcoming events that are not cancelled)
    const activeEvents = eventsData.filter(event => 
      event.status !== 'cancelled' && new Date(event.date) >= now
    ).length;

    // Total volunteers registered
    const totalVolunteers = volunteersData.length;

    // Unique beaches cleaned (count unique locations from completed events)
    const completedEvents = eventsData.filter(event => 
      new Date(event.date) < now && event.status !== 'cancelled'
    );
    const uniqueBeaches = new Set(completedEvents.map(event => event.location)).size;

    // Total waste collected from completed events
    const totalWaste = completedEvents.reduce((sum, event) => {
      return sum + (event.actualWasteCollected || event.wasteTarget || 0);
    }, 0);

    setRealStats({
      activeEvents,
      totalVolunteers,
      beachesCleaned: uniqueBeaches,
      wasteCollected: (totalWaste / 1000).toFixed(1) // Convert to tons
    });
  };

  // Send message to volunteers
  const sendMessageToVolunteers = async () => {
  if (!selectedEventForMessage || !messageSubject || !messageContent) {
    alert('Please fill all fields');
    return;
  }

  try {
    // Get volunteers registered for the selected event
    const eventCheckins = checkins.filter(checkin => checkin.eventId === selectedEventForMessage);
    const volunteerIds = [...new Set(eventCheckins.map(checkin => checkin.userId))];

    // Get event name
   const eventRef = doc(db, 'events', selectedEventForMessage);
const eventSnap = await getDoc(eventRef);

let eventName = 'Unknown Event';
if (eventSnap.exists()) {
  const eventData = eventSnap.data();
  if (eventData.title) {
  eventName = eventData.title;
}else {
    console.warn('Event exists but has no "name" field:', eventData);
  }
} else {
  console.warn('No such event found with ID:', selectedEventForMessage);
}

    // Get organiser name
    const user = auth.currentUser;
    const organiserName = user?.displayName || user?.email || 'Organizer';

    // Create and send notification for each volunteer
    for (const userId of volunteerIds) {
      const notification = {
        userId,
        eventId: selectedEventForMessage,
        eventName,
        organiserName,
        subject: messageSubject,
        message: messageContent,
        createdAt: Timestamp.now(),
        read: false,
        type: 'event_message'
      };
      await addDoc(collection(db, 'notifications'), notification);
    }

    alert(`Message sent to ${volunteerIds.length} volunteers successfully!`);
    setSelectedEventForMessage('');
    setMessageSubject('');
    setMessageContent('');
    fetchAllData(); // Refresh
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message');
  }
};

  // AI Tools functionality - now generates templates instead of API calls
  const generateContent = (type) => {
    const upcomingEvents = events.filter(event => 
      event.status !== 'cancelled' && new Date(event.date) >= new Date()
    );
    
    let template = '';
    
    switch (type) {
      case 'social_post':
        template = `🌊 Join us for our upcoming beach cleanup event! 

${upcomingEvents[0] ? `📅 ${upcomingEvents[0].title}
📍 ${upcomingEvents[0].location}
🗓️ ${upcomingEvents[0].date}` : '📅 Beach Cleanup Event\n📍 Location TBD\n🗓️ Date TBD'}

Together we can make a difference! 🌍
#BeachCleanup #OceanConservation #CommunityAction #SaveOurOceans

Who's joining us? Tag a friend! 👥`;
        break;
      case 'email_campaign':
        template = `Subject: Join Our Beach Cleanup Initiative - Make a Difference!

Dear Volunteer,

We hope this message finds you well and as passionate about ocean conservation as ever!

We're excited to invite you to our upcoming beach cleanup event where we'll work together to protect our beautiful coastlines and marine life.

EVENT DETAILS:
${upcomingEvents[0] ? `• Event: ${upcomingEvents[0].title}
• Date: ${upcomingEvents[0].date}
• Location: ${upcomingEvents[0].location}
• Time: ${upcomingEvents[0].time || 'TBD'}` : '• Event details will be updated soon'}

WHAT TO EXPECT:
• Community of like-minded environmental advocates
• All cleanup supplies provided
• Refreshments and snacks
• Certificate of participation
• The satisfaction of making a real impact!

REGISTER NOW: [Registration Link]

Together, we can make our beaches cleaner and our oceans healthier. Every piece of trash collected makes a difference!

Thank you for being an ocean hero! 🌊

Best regards,
[Organization Name]`;
        break;
      case 'impact_report':
        template = `🌊 BEACH CLEANUP IMPACT REPORT 🌊

We're thrilled to share the incredible impact our community has made:

📊 KEY ACHIEVEMENTS:
• ${realStats.beachesCleaned} beaches restored and protected
• ${realStats.wasteCollected} tons of waste removed from our coastlines
• ${realStats.totalVolunteers} dedicated volunteers participated
• Countless marine animals protected from plastic pollution

🌍 ENVIRONMENTAL IMPACT:
Our collective efforts have contributed to:
- Cleaner, safer beaches for wildlife and families
- Reduced plastic pollution in marine ecosystems
- Increased community awareness about ocean conservation
- A model for sustainable environmental action

👥 COMMUNITY IMPACT:
- Stronger bonds within our environmental community
- Educational opportunities for participants
- Inspiration for future conservation efforts
- A legacy of environmental stewardship

Thank you to every volunteer who made this possible. Together, we're creating a cleaner, healthier planet! 🌱

#OceanConservation #CommunityImpact #BeachCleanup`;
        break;
      case 'volunteer_matching':
        template = `🎯 OPTIMAL VOLUNTEER TEAM COMPOSITION

For maximum efficiency with ${realStats.totalVolunteers} volunteers:

RECOMMENDED TEAM STRUCTURE:

👥 COLLECTION TEAMS (60% of volunteers)
- 4-6 volunteers per team
- Focus on debris collection and sorting
- Mix of experienced and new volunteers

🧹 SPECIALIZED ROLES (25% of volunteers)
- Data Collectors: Record waste types and quantities
- Heavy Lifting Team: Handle large debris items
- Photography Team: Document the cleanup process
- Safety Coordinators: Ensure volunteer safety

🎯 LEADERSHIP ROLES (15% of volunteers)
- Team Leaders: Guide and motivate collection teams
- Equipment Managers: Distribute and collect supplies
- Registration Coordinators: Check-in volunteers

💡 OPTIMIZATION TIPS:
- Assign experienced volunteers as team leaders
- Pair newcomers with seasoned volunteers
- Rotate roles to prevent fatigue
- Ensure clear communication channels

This structure maximizes efficiency while ensuring everyone feels engaged and valued!`;
        break;
      default:
        template = `AI Content Template

Please provide more specific details about what type of content you need, and I'll generate a relevant template for your beach cleanup organization.

Examples of content I can help with:
- Social media posts
- Email campaigns
- Impact reports
- Volunteer coordination guides
- Event announcements
- Thank you messages`;
    }
    
    setAiOutput(template);
  };

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

  // Authentication checks
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

  // Update stats with real data
  const stats = [
    { title: 'Active Events', value: realStats.activeEvents.toString(), icon: Calendar, color: 'bg-blue-500' },
    { title: 'Total Volunteers', value: realStats.totalVolunteers.toString(), icon: Users, color: 'bg-green-500' },
    { title: 'Beaches Cleaned', value: realStats.beachesCleaned.toString(), icon: MapPin, color: 'bg-purple-500' },
    { title: 'Waste Collected', value: `${realStats.wasteCollected}T`, icon: Award, color: 'bg-orange-500' }
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

  const EventCard = ({ event }) => {
    const volunteerCount = checkins.filter(checkin => checkin.eventId === event.id).length;
    const eventDate = new Date(event.date);
    const now = new Date();
    const isUpcoming = eventDate >= now;
    const status = event.status === 'cancelled' ? 'Cancelled' : isUpcoming ? 'Upcoming' : 'Completed';
    
    return (
      <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'Completed' ? 'bg-green-100 text-green-800' : 
            status === 'Cancelled' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {status}
          </span>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600">
            <Calendar size={16} className="mr-2" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Users size={16} className="mr-2" />
            <span>{volunteerCount} volunteers registered</span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin size={16} className="mr-2" />
            <span>{event.location}</span>
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
  };

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
        Generate Template
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
      fetchAllData(); // Refresh data
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event');
    }
  };

  const renderDashboard = () => {
    // Filter events for dashboard - only show active/upcoming and not cancelled
    const dashboardEvents = events.filter(event => 
      event.status !== 'cancelled' && new Date(event.date) >= new Date()
    ).slice(0, 3); // Show only first 3 for dashboard

    return (
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
              {dashboardEvents.length > 0 ? dashboardEvents.map(event => (
                <EventCard key={event.id} event={event} />
              )) : (
                <p className="text-gray-500 text-center py-8">No upcoming events</p>
              )}
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
                <span className="text-sm font-medium text-blue-800">Content Templates</span>
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
  };

  const renderEventManagement = () => {
    const handleCreateEvent = async () => {
      if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.location || !newEvent.wasteTarget) return;

      try {
        await addDoc(collection(db, 'events'), {
          ...newEvent,
          wasteTarget: Number(newEvent.wasteTarget),
          createdAt: new Date().toISOString(),
          organizerId: user.uid,
          status: 'active'
        });

        setModalOpen(false);
        setNewEvent({ title: '', date: '', time: '', gearNeeded: '', location: '', wasteTarget: '' });
        fetchAllData(); // Refresh data
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
      fetchAllData(); // Refresh data
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
          <h2 className="text-xl font-semibold">Event Management</h2>
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
            const volunteerCount = checkins.filter(checkin => checkin.eventId === ev.id).length;
            
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
                    <p className="text-sm mt-1">Volunteers: {volunteerCount} registered</p>

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
                placeholder="Gear Needed (optional)"
                value={newEvent.gearNeeded}
                onChange={e => setNewEvent({ ...newEvent, gearNeeded: e.target.value })}
              />
              <input
                className="w-full mb-3 p-2 border rounded"
                type="number"
                placeholder="Waste Target (kg)"
                value={newEvent.wasteTarget}
                onChange={e => setNewEvent({ ...newEvent, wasteTarget: e.target.value })}
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateEvent}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalytics = () => {
    // Calculate analytics data
    const completedEvents = events.filter(event => 
      new Date(event.date) < new Date() && event.status !== 'cancelled'
    );
    
    const monthlyData = {};
    completedEvents.forEach(event => {
      const month = new Date(event.date).toLocaleString('default', { month: 'short' });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    const topLocations = {};
    completedEvents.forEach(event => {
      topLocations[event.location] = (topLocations[event.location] || 0) + 1;
    });

    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Event Trends</h2>
            <div className="space-y-4">
              {Object.entries(monthlyData).map(([month, count]) => (
                <div key={month} className="flex items-center justify-between">
                  <span className="text-gray-600">{month}</span>
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-200 h-2 rounded-full" style={{width: `${count * 30}px`}}></div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Cleanup Locations</h2>
            <div className="space-y-4">
              {Object.entries(topLocations).slice(0, 5).map(([location, count]) => (
                <div key={location} className="flex items-center justify-between">
                  <span className="text-gray-600">{location}</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">{count} events</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Volunteer Engagement</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{volunteers.length}</div>
              <div className="text-gray-600">Total Volunteers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{checkins.length}</div>
              <div className="text-gray-600">Total Check-ins</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {volunteers.length > 0 ? (checkins.length / volunteers.length).toFixed(1) : 0}
              </div>
              <div className="text-gray-600">Avg. Events per Volunteer</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMessaging = () => {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Message Volunteers</h1>
        
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Event Message</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
              <select
                value={selectedEventForMessage}
                onChange={(e) => setSelectedEventForMessage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose an event...</option>
                {events.filter(event => event.status !== 'cancelled').map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {event.date}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Enter message subject"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Enter your message to volunteers"
                rows="6"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={sendMessageToVolunteers}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
            >
              <Send size={20} />
              <span>Send Message</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Notifications</h2>
          <div className="space-y-3">
            {notifications.slice(0, 10).map(notification => (
              <div key={notification.id} className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{notification.subject}</h3>
                  <span className="text-xs text-gray-500">
                    {(notification.createdAt?.toDate
  ? notification.createdAt.toDate()
  : new Date(notification.createdAt)
).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-gray-500 text-center py-8">No notifications sent yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAITools = () => {
    const handleCopyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(() => {
        alert('Content copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    };

    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Templates</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AIFeatureCard
            title="Social Media Post"
            description="Generate engaging social media content for your beach cleanup events"
            icon={Globe}
            color="bg-blue-500"
            action={() => generateContent('social_post')}
          />
          <AIFeatureCard
            title="Email Campaign"
            description="Create compelling email campaigns to recruit volunteers"
            icon={Mail}
            color="bg-green-500"
            action={() => generateContent('email_campaign')}
          />
          <AIFeatureCard
            title="Impact Report"
            description="Generate impact reports showcasing your cleanup achievements"
            icon={BarChart3}
            color="bg-purple-500"
            action={() => generateContent('impact_report')}
          />
          <AIFeatureCard
            title="Volunteer Guide"
            description="Create optimal team compositions and volunteer coordination guides"
            icon={Users}
            color="bg-orange-500"
            action={() => generateContent('volunteer_matching')}
          />
        </div>

        {aiOutput && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Generated Content</h2>
              <button
                onClick={() => handleCopyToClipboard(aiOutput)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Copy size={16} />
                <span>Copy</span>
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">{aiOutput}</pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">BeachGuard Organizer</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="text-gray-400 hover:text-gray-600 cursor-pointer" size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Welcome, {user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-2">
              <TabButton
                id="dashboard"
                label="Dashboard"
                icon={BarChart3}
                active={activeTab === 'dashboard'}
                onClick={setActiveTab}
              />
              <TabButton
                id="events"
                label="Events"
                icon={Calendar}
                active={activeTab === 'events'}
                onClick={setActiveTab}
              />
              <TabButton
                id="analytics"
                label="Analytics"
                icon={TrendingUp}
                active={activeTab === 'analytics'}
                onClick={setActiveTab}
              />
              <TabButton
                id="messaging"
                label="Messaging"
                icon={MessageSquare}
                active={activeTab === 'messaging'}
                onClick={setActiveTab}
              />
              <TabButton
                id="ai-tools"
                label="Content Templates"
                icon={Bot}
                active={activeTab === 'ai-tools'}
                onClick={setActiveTab}
              />
            </nav>
          </div>

          <div className="flex-1">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'events' && renderEventManagement()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'messaging' && renderMessaging()}
            {activeTab === 'ai-tools' && renderAITools()}
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Content Templates</h2>
              <button
                onClick={() => setShowAIModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            {renderAITools()}
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create New Event</h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Event Title"
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
              />
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                type="date"
                value={newEvent.date}
                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
              />
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                type="time"
                value={newEvent.time}
                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
              />
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Location"
                value={newEvent.location}
                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
              />
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Gear Needed (optional)"
                value={newEvent.gearNeeded}
                onChange={e => setNewEvent({ ...newEvent, gearNeeded: e.target.value })}
              />
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                type="number"
                placeholder="Waste Target (kg)"
                value={newEvent.wasteTarget}
                onChange={e => setNewEvent({ ...newEvent, wasteTarget: e.target.value })}
              />
              <div className="flex space-x-3">
                <button
                  onClick={async () => {
                    if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.location || !newEvent.wasteTarget) return;

                    try {
                      await addDoc(collection(db, 'events'), {
                        ...newEvent,
                        wasteTarget: Number(newEvent.wasteTarget),
                        createdAt: new Date().toISOString(),
                        organizerId: user.uid,
                        status: 'active'
                      });

                      setShowEventModal(false);
                      setNewEvent({ title: '', date: '', time: '', gearNeeded: '', location: '', wasteTarget: '' });
                      fetchAllData();
                    } catch (error) {
                      console.error('Error creating event:', error);
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  Create Event
                </button>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 bg-gray-400 text-white py-3 px-4 rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizer;