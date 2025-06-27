import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, writeBatch, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Calendar, MapPin, Users, Target, Wrench, Share2, Eye, Edit3, Trash2, Plus, X, Clock, Award, Camera, CheckCircle, AlertCircle, Download, Filter, Search, Activity, ImageIcon } from 'lucide-react';
import EventViewModal from './EventViewModal';

const Events = ({ user }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [volunteerTrackingOpen, setVolunteerTrackingOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [teamTrackingOpen, setTeamTrackingOpen] = useState(false);
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    gearNeeded: '',
    location: '',
    wasteTarget: '',
    description: '',
    maxVolunteers: ''
  });

  // Fetch all data on component mount
  useEffect(() => {
  if (user?.uid) {
    fetchEvents();
    fetchCheckins();
    fetchUsers(); // 👈 Add this line
  }
}, [user]);

  const fetchUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(usersData);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

  const fetchEvents = async () => {
    try {
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizerId', '==', user.uid)
      );
      const snapshot = await getDocs(eventsQuery);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchCheckins = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'checkins'));
      const checkinsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCheckins(checkinsData);
    } catch (error) {
      console.error('Error fetching checkins:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const eventData = {
        ...newEvent,
        organizerId: user.uid,
        organizerName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        wasteTarget: parseFloat(newEvent.wasteTarget) || 0,
        maxVolunteers: parseInt(newEvent.maxVolunteers) || null,
        endDate: newEvent.endDate || '',
        endTime: newEvent.endTime || ''
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), {
          ...eventData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'events'), eventData);
      }

      setNewEvent({
        title: '',
        date: '',
        time: '',
        endDate: '',
        endTime: '',
        gearNeeded: '',
        location: '',
        wasteTarget: '',
        description: '',
        maxVolunteers: ''
      });
      setModalOpen(false);
      setEditingEvent(null);
      
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event. Please try again.');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title || '',
      date: event.date || '',
      time: event.time || '',
      endDate: event.endDate || '',
      endTime: event.endTime || '',
      gearNeeded: event.gearNeeded || '',
      location: event.location || '',
      wasteTarget: event.wasteTarget?.toString() || '',
      description: event.description || '',
      maxVolunteers: event.maxVolunteers?.toString() || ''
    });
    setModalOpen(true);
  };

  const handleView = (event) => {
    setSelectedEvent(event);
    setViewModalOpen(true);
  };

  const handleTrackVolunteers = (event) => {
    setSelectedEvent(event);
    setVolunteerTrackingOpen(true);
  };
  const handleTrackTeams = (event) => {
  setSelectedEvent(event);
  setTeamTrackingOpen(true);
};


  const handleShare = async (event) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const shareData = {
      title: `Join us for ${event.title}`,
      text: `🌱 Environmental Cleanup Event\n\n📅 ${formatDate(event.date)} at ${event.time}\n📍 ${event.location}\n🎯 Target: ${event.wasteTarget}kg waste collection\n\nJoin us in making a difference! Help us clean up our environment and build a sustainable future together.`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const shareText = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const message = isMobile 
          ? 'Event details copied to clipboard! You can now paste and share via WhatsApp, Email, SMS, or any other app.'
          : 'Event details copied to clipboard! You can now paste and share via Email, social media, or any messaging platform.';
        
        alert(message);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      const shareText = `${shareData.title}\n\n${shareData.text}`;
      const confirmed = confirm(`Share this event:\n\n${shareText}\n\nClick OK to copy to clipboard, or Cancel to dismiss.`);
      if (confirmed) {
        try {
          await navigator.clipboard.writeText(shareText);
          alert('Copied to clipboard! You can now share via any app.');
        } catch (clipboardError) {
          console.error('Clipboard failed:', clipboardError);
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`<pre style="padding: 20px; font-family: Arial;">${shareText}</pre>`);
            newWindow.document.title = 'Share Event Details';
          } else {
            alert(`Please copy this text to share:\n\n${shareText}`);
          }
        }
      }
    }
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await updateDoc(doc(db, 'events', eventId), {
          status: 'cancelled',
          cancelReason: 'Event deleted by organizer',
          cancelledAt: new Date().toISOString()
        });
        fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event. Please try again.');
      }
    }
  };

  const getEventStatus = (event) => {
    if (event.status === 'cancelled') {
      return { status: 'Cancelled', color: 'bg-red-100 text-red-800', emoji: '❌' };
    }
    
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    
    if (eventDate.getTime() === today.getTime()) {
      return { status: 'Today', color: 'bg-orange-100 text-orange-800', emoji: '🔥' };
    } else if (eventDate > today) {
      return { status: 'Upcoming', color: 'bg-blue-100 text-blue-800', emoji: '📅' };
    } else {
      return { status: 'Completed', color: 'bg-green-100 text-green-800', emoji: '✅' };
    }
  };

  // FIXED: Get volunteer count from checkins collection
  const getVolunteerCount = (eventId) => {
    const eventCheckins = checkins.filter(checkin => checkin.eventId === eventId);
    const uniqueVolunteers = [...new Set(eventCheckins.map(checkin => checkin.userId))];
    return uniqueVolunteers.length;
  };

  // FIXED: Get event progress from checkins collection
  const getEventProgress = (eventId) => {
    const eventCheckins = checkins.filter(checkin => checkin.eventId === eventId);
    const totalWasteCollected = eventCheckins.reduce((sum, checkin) => sum + (checkin.wasteCollected || 0), 0);
    const uniqueVolunteers = [...new Set(eventCheckins.map(checkin => checkin.userId))].length;
    const proofPhotos = eventCheckins.filter(checkin => checkin.proofPhoto).length;
    
    return {
      totalWasteCollected,
      activeVolunteers: uniqueVolunteers,
      proofSubmissions: proofPhotos
    };
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    // Handle different timestamp formats
    let date;
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      // ISO string
      date = new Date(timestamp);
    } else {
      // Assume it's already a Date object
      date = new Date(timestamp);
    }
    
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVolunteerActivitiesForEvent = (eventId) => {
  return checkins
    .filter(checkin => checkin.eventId === eventId)
    .map(checkin => {
      const userInfo = users.find(u => u.uid === checkin.userId);
      return {
        ...checkin,
        userName: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || userInfo.displayName : 'Eco Hero',
        userEmail: userInfo?.email || checkin.userEmail,
      };
    });
};


  const sortedEvents = events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
        <button
          onClick={() => {
            setEditingEvent(null);
            setNewEvent({
              title: '',
              date: '',
              time: '',
              endDate: '',
              endTime: '',
              gearNeeded: '',
              location: '',
              wasteTarget: '',
              description: '',
              maxVolunteers: ''
            });
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Create Event
        </button>
      </div>

      {/* Debug Information - You can remove this in production */}
      

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEvents.map(event => {
          const { status, color, emoji } = getEventStatus(event);
          const volunteerCount = getVolunteerCount(event.id);
          const progress = getEventProgress(event.id);

          return (
            <div key={event.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-6">
                {/* Event Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">{event.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${color} whitespace-nowrap ml-2`}>
                    {emoji} {status}
                  </span>
                </div>

                {/* Event Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Calendar size={16} className="mr-2 text-blue-500" />
                    <span className="text-sm">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                      {event.time && ` at ${event.time}`}
                    </span>
                  </div>
                  
                  <div className="flex items-start text-gray-600">
                    <MapPin size={16} className="mr-2 text-red-500 mt-0.5" />
                    <span className="text-sm line-clamp-2">{event.location}</span>
                  </div>

                  {event.wasteTarget && (
                    <div className="flex items-center text-gray-600">
                      <Target size={16} className="mr-2 text-orange-500" />
                      <span className="text-sm">Target: {event.wasteTarget}kg</span>
                    </div>
                  )}

                  <div className="flex items-center text-gray-600">
                    <Users size={16} className="mr-2 text-purple-500" />
                    <span className="text-sm">{volunteerCount} volunteers registered</span>
                  </div>

                  {/* Progress Summary */}
                  {progress.totalWasteCollected > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-700 font-medium">Progress:</span>
                        <span className="text-green-600">{progress.totalWasteCollected}kg collected</span>
                      </div>
                      {progress.proofSubmissions > 0 && (
                        <div className="flex items-center mt-1 text-xs text-green-600">
                          <Camera size={12} className="mr-1" />
                          {progress.proofSubmissions} proof photos
                        </div>
                      )}
                    </div>
                  )}

                  {event.gearNeeded && (
                    <div className="flex items-start text-gray-600">
                      <Wrench size={16} className="mr-2 text-gray-500 mt-0.5" />
                      <span className="text-sm line-clamp-2">{event.gearNeeded}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className={`flex flex-wrap gap-2 ${event.status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <button 
                    onClick={() => handleView(event)} 
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Eye size={14} /> View
                  </button>
                  <button 
                    onClick={() => handleTrackVolunteers(event)} 
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                  >
                    <Activity size={14} /> Track
                  </button>

                  <button 
                    onClick={() => handleTrackTeams(event)} 
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                  >
                    <Users size={14} /> Team Track
                  </button>

                  <button 
                    onClick={() => handleShare(event)} 
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    <Share2 size={14} /> Share
                  </button>
                  <button 
                    onClick={() => handleEdit(event)} 
                    className="flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(event.id)} 
                    className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-500 mb-2">No events yet</h3>
          <p className="text-gray-400 mb-4">Create your first environmental cleanup event</p>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Event
          </button>
        </div>
      )}

      {/* Create/Edit Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Waste Target (kg)</label>
                    <input
                      type="number"
                      value={newEvent.wasteTarget}
                      onChange={(e) => setNewEvent({...newEvent, wasteTarget: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Volunteers</label>
                    <input
                      type="number"
                      value={newEvent.maxVolunteers}
                      onChange={(e) => setNewEvent({...newEvent, maxVolunteers: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gear Needed</label>
                  <textarea
                    value={newEvent.gearNeeded}
                    onChange={(e) => setNewEvent({...newEvent, gearNeeded: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                    placeholder="e.g., Gloves, trash bags, water bottles..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Additional details about the event..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setEditingEvent(null);
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Tracking Modal */}
      {volunteerTrackingOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Volunteer Tracking</h2>
                  <p className="text-gray-600">{selectedEvent.title}</p>
                </div>
                <button
                  onClick={() => setVolunteerTrackingOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Event Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{getVolunteerCount(selectedEvent.id)}</div>
                    <div className="text-sm text-gray-600">Registered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{getEventProgress(selectedEvent.id).totalWasteCollected}kg</div>
                    <div className="text-sm text-gray-600">Waste Collected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{getEventProgress(selectedEvent.id).activeVolunteers}</div>
                    <div className="text-sm text-gray-600">Active Volunteers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{getEventProgress(selectedEvent.id).proofSubmissions}</div>
                    <div className="text-sm text-gray-600">Proof Photos</div>
                  </div>
                </div>
              </div>

              {/* Volunteer Activities */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Volunteer Activities</h3>
                
                {getVolunteerActivitiesForEvent(selectedEvent.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No volunteer activities recorded yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getVolunteerActivitiesForEvent(selectedEvent.id).map((activity, index) => (
                      <div key={activity.id || index} className="bg-white p-4 rounded-xl border border-gray-300 shadow-md hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {activity.userName ? activity.userName.charAt(0).toUpperCase() : 'V'}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
  {activity.userName || activity.displayName || `${activity.firstName || ''} ${activity.lastName || ''}`.trim() || 'Eco Hero'}
</h4>
                                <p className="text-sm text-gray-500">{activity.userEmail || 'No email provided'}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="text-lg font-bold text-green-600">
                                  {activity.wasteCollected || 0}kg
                                </div>
                                <div className="text-xs text-green-700">Waste Collected</div>
                              </div>
                              
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">
                                  {activity.checkInTime ? '✓' : '–'}
                                </div>
                                <div className="text-xs text-blue-700">Check-in Status</div>
                              </div>
                              
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <div className="text-lg font-bold text-purple-600">
                                  {activity.proofPhoto ? '📸' : '–'}
                                </div>
                                <div className="text-xs text-purple-700">Proof Photo</div>
                              </div>
                              
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <div className="text-lg font-bold text-orange-600">
                                  {activity.customWasteEntry ? '✏️' : '–'}
                                </div>
                                <div className="text-xs text-orange-700">Custom Entry</div>
                              </div>
                            </div>
                            
                            {/* Timestamps */}
                            <div className="mt-3 space-y-1 text-xs text-gray-600">
                              {activity.checkInTime && (
                                <p>Check-in: {formatDateTime(activity.checkInTime)}</p>
                              )}
                              {activity.timestamp && (
                                <p>Activity: {formatDateTime(activity.timestamp)}</p>
                              )}
                              {activity.photoUploadTime && (
                                <p>Photo uploaded: {formatDateTime(activity.photoUploadTime)}</p>
                              )}
                              {activity.wasteEntryTime && (
                                <p>Waste entry: {formatDateTime(activity.wasteEntryTime)}</p>
                              )}
                              {activity.lastEditTime && (
                                <p>Last edited: {formatDateTime(activity.lastEditTime)}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex gap-2">
                            {activity.proofPhoto && (
                              <button
                                onClick={() => window.open(activity.proofPhoto, '_blank')}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                title="View proof photo"
                              >
                                <ImageIcon size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Export Data Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    const eventData = {
                      event: selectedEvent,
                      volunteers: getVolunteerActivitiesForEvent(selectedEvent.id),
                      summary: getEventProgress(selectedEvent.id)
                    };
                    
                    const dataStr = JSON.stringify(eventData, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${selectedEvent.title.replace(/[^a-z0-9]/gi, '_')}_volunteer_data.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={16} />
                  Export Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

     {teamTrackingOpen && selectedEvent && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Tracking</h2>
            <p className="text-gray-600">{selectedEvent.title}</p>
          </div>
          <button
            onClick={() => setTeamTrackingOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* TEAM DISPLAY */}
        {selectedEvent ? (() => {
          const teams = {};
          checkins
            .filter(c => c.eventId === selectedEvent.id && c.teamAssigned && c.assignedTeam)
            .forEach(c => {
              if (!teams[c.assignedTeam]) teams[c.assignedTeam] = [];
              teams[c.assignedTeam].push(c);
            });

          if (Object.keys(teams).length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No teams assigned yet for this event.</p>
              </div>
            );
          }

          return Object.entries(teams).map(([teamId, members]) => (
            <div key={teamId} className="mb-6 border border-gray-300 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Team ID: {teamId}</h3>
              <div className="grid gap-4">
  {members.map((member, index) => {
    const userInfo = users.find(u => u.uid === member.userId);
    const name = userInfo?.displayName || member.userName || 'Eco Hero';
    const email = member.userEmail || userInfo?.email || 'No email';
    const avatar = name.charAt(0).toUpperCase();

    return (
      <div key={member.id || index} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {avatar}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{name}</h4>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {member.wasteCollected || 0}kg
                </div>
                <div className="text-xs text-green-700">Waste Collected</div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {member.checkInTime ? '✓' : '–'}
                </div>
                <div className="text-xs text-blue-700">Check-in Status</div>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {member.proofPhoto ? '📸' : '–'}
                </div>
                <div className="text-xs text-purple-700">Proof Photo</div>
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {member.customWasteEntry ? '✏️' : '–'}
                </div>
                <div className="text-xs text-orange-700">Custom Entry</div>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs text-gray-600">
              {member.checkInTime && (
                <p>Check-in: {formatDateTime(member.checkInTime)}</p>
              )}
              {member.timestamp && (
                <p>Activity: {formatDateTime(member.timestamp)}</p>
              )}
              {member.photoUploadTime && (
                <p>Photo uploaded: {formatDateTime(member.photoUploadTime)}</p>
              )}
              {member.wasteEntryTime && (
                <p>Waste entry: {formatDateTime(member.wasteEntryTime)}</p>
              )}
              {member.lastEditTime && (
                <p>Last edited: {formatDateTime(member.lastEditTime)}</p>
              )}
            </div>
          </div>

          {member.proofPhoto && (
            <div className="flex gap-2 ml-2 mt-2">
              <button
                onClick={() => window.open(member.proofPhoto, '_blank')}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                title="View proof photo"
              >
                <ImageIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  })}
</div>

            </div>
          ));
        })() : null}
      </div>
    </div>
  </div>
)}




      {/* View Event Modal */}
      {viewModalOpen && selectedEvent && (
        <EventViewModal
          event={selectedEvent}
          checkins={checkins}
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Events;

// Additional helper functions to fix the volunteer counting issue
const debugVolunteerCounting = (eventId, checkins) => {
  console.log('=== Debug Volunteer Counting ===');
  console.log('Event ID:', eventId);
  console.log('Total checkins:', checkins.length);
  
  const eventCheckins = checkins.filter(checkin => checkin.eventId === eventId);
  console.log('Checkins for this event:', eventCheckins.length);
  console.log('Event checkins data:', eventCheckins);
  
  const userIds = eventCheckins.map(checkin => checkin.userId);
  console.log('User IDs:', userIds);
  
  const uniqueUserIds = [...new Set(userIds)];
  console.log('Unique User IDs:', uniqueUserIds);
  console.log('Unique volunteer count:', uniqueUserIds.length);
  
  console.log('=== End Debug ===');
  
  return uniqueUserIds.length;
};