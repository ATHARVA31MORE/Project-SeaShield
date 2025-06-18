import React, { useState } from 'react';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const Events = ({ events, checkins, fetchAllData, user }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // Add this state
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    gearNeeded: '',
    location: '',
    wasteTarget: ''
  });

  const cancelEvent = async (eventId, reason) => {
  try {
    await updateDoc(doc(db, 'events', eventId), {
      status: 'cancelled',
      cancelReason: reason || '',
      cancelledAt: new Date().toISOString()
    });
    alert('Event cancelled successfully!');
    if (typeof fetchAllData === 'function') {
      await fetchAllData();
    }
  } catch (error) {
    console.error('Error cancelling event:', error);
    alert('Failed to cancel event');
  }
};

  const getEventStatus = (eventDate) => {
    const today = new Date();
    const eventDateObj = new Date(eventDate);
    if (eventDateObj < today) return 'past';
    if (eventDateObj.toDateString() === today.toDateString()) return 'today';
    return 'upcoming';
  };

  const handleCreateEvent = async () => {
  if (!newEvent.title || !newEvent.date || !newEvent.time || !newEvent.location || !newEvent.wasteTarget) {
    alert('Please fill in all required fields');
    return;
  }

  try {
    if (editingEvent) {
      // Update existing event
      await updateDoc(doc(db, 'events', editingEvent.id), {
        ...newEvent,
        wasteTarget: Number(newEvent.wasteTarget),
        updatedAt: new Date().toISOString(),
      });
      alert('Event updated successfully!');
    } else {
      // Create new event
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        wasteTarget: Number(newEvent.wasteTarget),
        createdAt: new Date().toISOString(),
        organizerId: user?.uid,
        status: 'active',
      });
      alert('Event created successfully!');
    }

    setModalOpen(false);
    setEditingEvent(null);
    setNewEvent({ title: '', date: '', time: '', gearNeeded: '', location: '', wasteTarget: '' });

    if (typeof fetchAllData === 'function') {
      await fetchAllData(); // ✅ Safe call with await
    }
  } catch (error) {
    console.error('Error saving event:', error);
    alert('Failed to save event');
  }
};


  const deleteEventWithCleanup = async (eventId) => {
  try {
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

    if (typeof fetchAllData === 'function') {
      await fetchAllData();  // ✅ Safe check added
    }

    alert('Event deleted successfully');
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete event');
  }
};

  const handleEdit = (event) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      date: event.date,
      time: event.time,
      gearNeeded: event.gearNeeded || '',
      location: event.location,
      wasteTarget: event.wasteTarget.toString()
    });
    setModalOpen(true);
  };

  const handleView = (event) => {
    console.log('Viewing event:', event);
    // e.g., navigate(`/organiser/events/${event.id}`) if routing
  };

  const handleShare = (event) => {
    const url = `${window.location.origin}/volunteer/events/${event.id}`;
    navigator.clipboard.writeText(url);
    alert('Event link copied to clipboard!');
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEvent(null);
    setNewEvent({ title: '', date: '', time: '', gearNeeded: '', location: '', wasteTarget: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
        >
          <span>+ Create Event</span>
        </button>
      </div>

      <div className="grid gap-6">
        {events && events.length > 0 ? events.map(event => {
          const eventStatus = getEventStatus(event.date);
          const volunteerCount = checkins?.filter(checkin => checkin.eventId === event.id).length || 0;

          return (
            <div
              key={event.id}
              className={`bg-white rounded-xl p-6 shadow-lg border ${
                event.status === 'cancelled' ? 'bg-gray-50 opacity-70 border-gray-300' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <div className="space-y-2 text-gray-600">
                    <p className="flex items-center">
                      <span className="font-medium">📅 Date:</span>
                      <span className="ml-2">{event.date} at {event.time}</span>
                    </p>
                    <p className="flex items-center">
                      <span className="font-medium">📍 Location:</span>
                      <span className="ml-2">{event.location}</span>
                    </p>
                    <p className="flex items-center">
                      <span className="font-medium">🎯 Target:</span>
                      <span className="ml-2">{event.wasteTarget || 0} kg waste</span>
                    </p>
                    <p className="flex items-center">
                      <span className="font-medium">🧤 Gear:</span>
                      <span className="ml-2">{event.gearNeeded || 'Standard Kit'}</span>
                    </p>
                    <p className="flex items-center">
                      <span className="font-medium">👥 Volunteers:</span>
                      <span className="ml-2">{volunteerCount} registered</span>
                    </p>
                  </div>

                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-4 ${
                    event.status === 'cancelled'
                      ? 'bg-red-100 text-red-700'
                      : eventStatus === 'past'
                      ? 'bg-gray-100 text-gray-600'
                      : eventStatus === 'today'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {event.status === 'cancelled'
                      ? '❌ Cancelled'
                      : eventStatus === 'past'
                      ? '✅ Completed'
                      : eventStatus === 'today'
                      ? '🔥 Today'
                      : '📅 Upcoming'}
                  </span>

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleView(event)}
                      className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => handleShare(event)}
                      className="text-sm px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      🔗 Share
                    </button>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  {event.status !== 'cancelled' && eventStatus === 'upcoming' && (
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for cancellation (optional):');
                        if (confirm('Are you sure you want to cancel this event?')) {
                          cancelEvent(event.id, reason);
                        }
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Cancel Event
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this event? This will also remove all associated check-ins.')) {
                        deleteEventWithCleanup(event.id);
                      }
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Delete Event
                  </button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="bg-white rounded-xl p-12 shadow-lg text-center">
            <p className="text-gray-500 text-lg">No events created yet</p>
            <p className="text-gray-400 mt-2">Click "Create Event" to get started</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </h3>
            
            <div className="space-y-4">
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Event Title *"
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
                placeholder="Location *"
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
                placeholder="Waste Target (kg) *"
                value={newEvent.wasteTarget}
                onChange={e => setNewEvent({ ...newEvent, wasteTarget: e.target.value })}
              />
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCreateEvent}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
              >
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
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

export default Events;