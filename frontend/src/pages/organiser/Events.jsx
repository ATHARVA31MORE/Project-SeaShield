import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, writeBatch, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Calendar, MapPin, Users, Target, Wrench, Share2, Eye, Edit3, Trash2, Plus, X } from 'lucide-react';
import EventViewModal from './EventViewModal';

const Events = ({ user }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    gearNeeded: '',
    location: '',
    wasteTarget: '',
    description: '',
    maxVolunteers: ''
  });

  // Fetch events and checkins on component mount
  useEffect(() => {
    if (user?.uid) {
      fetchEvents();
      fetchCheckins();
    }
  }, [user]);

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
        maxVolunteers: parseInt(newEvent.maxVolunteers) || null
      };

      if (editingEvent) {
        // Update existing event
        await updateDoc(doc(db, 'events', editingEvent.id), {
          ...eventData,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new event
        await addDoc(collection(db, 'events'), eventData);
      }

      // Reset form and close modal
      setNewEvent({
        title: '',
        date: '',
        time: '',
        gearNeeded: '',
        location: '',
        wasteTarget: '',
        description: '',
        maxVolunteers: ''
      });
      setModalOpen(false);
      setEditingEvent(null);
      
      // Refresh events
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
      // Check if Web Share API is supported (works on mobile devices and some desktop browsers)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard with enhanced message
        const shareText = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        
        // Show success message with platform-specific instructions
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const message = isMobile 
          ? 'Event details copied to clipboard! You can now paste and share via WhatsApp, Email, SMS, or any other app.'
          : 'Event details copied to clipboard! You can now paste and share via Email, social media, or any messaging platform.';
        
        alert(message);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Final fallback: show share text in alert
      const shareText = `${shareData.title}\n\n${shareData.text}`;
      const confirmed = confirm(`Share this event:\n\n${shareText}\n\nClick OK to copy to clipboard, or Cancel to dismiss.`);
      if (confirmed) {
        try {
          await navigator.clipboard.writeText(shareText);
          alert('Copied to clipboard! You can now share via any app.');
        } catch (clipboardError) {
          console.error('Clipboard failed:', clipboardError);
          // Show share text in a new window/tab as last resort
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

  const getVolunteerCount = (eventId) => {
    return [...new Set(checkins.filter(checkin => checkin.eventId === eventId).map(checkin => checkin.userId))].length;
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

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEvents.map(event => {
          const { status, color, emoji } = getEventStatus(event);
          const volunteerCount = getVolunteerCount(event.id);

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

                  {event.gearNeeded && (
                    <div className="flex items-start text-gray-600">
                      <Wrench size={16} className="mr-2 text-gray-500 mt-0.5" />
                      <span className="text-sm line-clamp-2">{event.gearNeeded}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(event)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  
                  <button
                    onClick={() => handleShare(event)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                  
                  <button
                    onClick={() => handleEdit(event)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  >
                    <Edit3 size={14} />
                    Edit
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

      {/* Event View Modal */}
      <EventViewModal
        event={selectedEvent}
        checkins={checkins}
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
};

export default Events;