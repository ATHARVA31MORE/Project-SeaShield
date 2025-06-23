import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../utils/firebase';
import { addDoc, collection, doc, getDoc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { fetchGeminiResponse } from '../utils/gemini';
import { uploadBytes, uploadString, ref, getDownloadURL } from 'firebase/storage';
import axios from 'axios';

export default function QRScan() {
  const { user } = useAuth();
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [eventDetails, setEventDetails] = useState(null);
  const [ecoScore, setEcoScore] = useState(0);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [currentCheckInId, setCurrentCheckInId] = useState(null);
  const [eventStatus, setEventStatus] = useState('');

  // Post-checkin features
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customWasteAmount, setCustomWasteAmount] = useState('');
  const [showWasteEntry, setShowWasteEntry] = useState(false);
  const [showEventProgress, setShowEventProgress] = useState(false);
  const [eventProgress, setEventProgress] = useState(null);
  const [originalWasteAmount, setOriginalWasteAmount] = useState(0);

  // Time-based states
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [timeMessage, setTimeMessage] = useState('');
  const [eventHasEnded, setEventHasEnded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // New states for event activity restrictions
  const [eventIsActive, setEventIsActive] = useState(false);
  const [eventActivityMessage, setEventActivityMessage] = useState('');

  // New states for edit functionality
  const [editMode, setEditMode] = useState(false);
  const [activeCheckIns, setActiveCheckIns] = useState([]);
  const [currentCheckInData, setCurrentCheckInData] = useState(null);
  const [formData, setFormData] = useState({
    wasteCollected: '',
    proofPhotoURL: '',
    notes: '',
  });

  // Check if event is currently active (between start and end time)
  const checkEventActivityStatus = (eventData) => {
    const now = new Date();
    const eventStart = new Date(eventData.date + ' ' + eventData.time);
    const eventEnd = new Date(eventData.endDate + ' ' + (eventData.endTime || '23:59'));
    
    console.log('Event Activity Check:', {
      now: now.toISOString(),
      eventStart: eventStart.toISOString(),
      eventEnd: eventEnd.toISOString(),
      isActive: now >= eventStart && now <= eventEnd
    });

    if (now < eventStart) {
      const msUntilStart = eventStart - now;
      const hoursUntilStart = Math.ceil(msUntilStart / (1000 * 60 * 60));
      const minutesUntilStart = Math.ceil(msUntilStart / (1000 * 60));
      
      setEventIsActive(false);
      if (hoursUntilStart > 1) {
        setEventActivityMessage(`⏳ Event starts in ${hoursUntilStart} hours. Photo uploads and waste logging will be available once the event begins.`);
      } else {
        setEventActivityMessage(`⏳ Event starts in ${minutesUntilStart} minutes. Photo uploads and waste logging will be available once the event begins.`);
      }
      return false;
    } else if (now > eventEnd) {
      setEventIsActive(false);
      setEventActivityMessage('⏰ Event has ended. Photo uploads and waste logging are no longer available.');
      return false;
    } else {
      setEventIsActive(true);
      setEventActivityMessage('✅ Event is active! You can now upload photos and log waste amounts.');
      return true;
    }
  };

  // Load user's current EcoScore
  useEffect(() => {
    const loadUserScore = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setEcoScore(userDoc.data().ecoScore || 0);
        }
      } catch (error) {
        console.error('Error loading user score:', error);
      }
    };
    loadUserScore();
  }, [user.uid]);

  // Load active check-ins for the user
  useEffect(() => {
    const loadActiveCheckIns = async () => {
      try {
        const q = query(
          collection(db, 'checkins'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const checkIns = [];
        
        for (const docSnap of snapshot.docs) {
          const checkInData = { id: docSnap.id, ...docSnap.data() };
          
          // Check if the event is still ongoing
          const eventDoc = await getDoc(doc(db, 'events', checkInData.eventId));
          if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            const now = new Date();
            const eventEnd = new Date(eventData.endDate + ' ' + (eventData.endTime || '23:59'));
            
            if (now <= eventEnd && eventData.status !== 'completed' && eventData.status !== 'cancelled') {
              checkIns.push({
                ...checkInData,
                eventData,
                canEdit: true
              });
            }
          }
        }
        
        setActiveCheckIns(checkIns);
      } catch (error) {
        console.error('Error loading active check-ins:', error);
      }
    };

    if (user?.uid) {
      loadActiveCheckIns();
    }
  }, [user.uid, checkInSuccess]);

  useEffect(() => {
    const loadCheckInDetails = async () => {
      if (!currentCheckInId) return;

      const docRef = doc(db, 'checkins', currentCheckInId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setCurrentCheckInData(snap.data());
      }
    };

    loadCheckInDetails();
  }, [currentCheckInId]);

  // Update event activity status whenever eventDetails changes
  useEffect(() => {
    if (eventDetails) {
      checkEventActivityStatus(eventDetails);
      
      // Set up interval to check event status every minute
      const interval = setInterval(() => {
        checkEventActivityStatus(eventDetails);
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [eventDetails]);

  const handleWasteUpdate = async () => {
    if (!currentCheckInId) return;
    try {
      const checkInRef = doc(db, 'checkins', currentCheckInId);
      await updateDoc(checkInRef, {
        wasteCollected: Number(formData.wasteCollected),
        proofPhoto: formData.proofPhotoURL,
        notes: formData.notes
      });
      setEditMode(false);
      toast.success("Check-in details updated successfully!");
    } catch (error) {
      console.error("Error updating check-in:", error);
      toast.error("Failed to update check-in.");
    }
  };

  const uploadToImgBB = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await axios.post(
      `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
      formData
    );

    return res.data.data.url;
  };

  // Updated time restrictions - Only 2 hours before event
  const checkTimeRestrictions = (eventData) => {
    const now = new Date();
    const eventDateTime = new Date(eventData.date + ' ' + eventData.time);
    const endDateTime = new Date(eventData.endDate + ' ' + (eventData.endTime || '23:59'));
    const eventEndTime = new Date(eventDateTime.getTime() + (eventData.duration || 4) * 60 * 60 * 1000);
    const checkInWindowStart = new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before

    console.log('Time Check:', {
      now: now.toISOString(),
      eventStart: eventDateTime.toISOString(),
      eventEnd: eventEndTime.toISOString(),
      checkInStart: checkInWindowStart.toISOString()
    });

    // Check if event has ended
    if (now > eventEndTime) {
      setEventHasEnded(true);
      setCanCheckIn(false);
      setTimeMessage('🕒 Event has ended.');
      return { canCheckIn: false, hasEnded: true };
    }

    // Check if it's too early to check in (more than 2 hours before event)
    if (now < checkInWindowStart) {
      const msUntilCheckIn = checkInWindowStart - now;
      const hoursUntilCheckIn = Math.ceil(msUntilCheckIn / (1000 * 60 * 60));
      const minutesUntilCheckIn = Math.ceil(msUntilCheckIn / (1000 * 60));
      
      setCanCheckIn(false);
      
      if (hoursUntilCheckIn > 24) {
        const daysUntilCheckIn = Math.ceil(hoursUntilCheckIn / 24);
        setTimeMessage(`⏰ Check-in opens 2 hours before the event (in ${daysUntilCheckIn} days)`);
      } else if (hoursUntilCheckIn > 1) {
        setTimeMessage(`⏰ Check-in opens 2 hours before the event (in ${hoursUntilCheckIn} hours)`);
      } else {
        setTimeMessage(`⏰ Check-in opens in ${minutesUntilCheckIn} minutes`);
      }
      
      return { canCheckIn: false, hasEnded: false };
    }

    // Check if event is currently active or within check-in window
    if (now >= checkInWindowStart && now <= eventEndTime) {
      setCanCheckIn(true);
      setEventHasEnded(false);
      
      if (now < eventDateTime) {
        const msUntilStart = eventDateTime - now;
        const hoursUntilStart = Math.ceil(msUntilStart / (1000 * 60 * 60));
        const minutesUntilStart = Math.ceil(msUntilStart / (1000 * 60));
        
        if (hoursUntilStart > 1) {
          setTimeMessage(`✅ Check-in available! Event starts in ${hoursUntilStart} hours.`);
        } else {
          setTimeMessage(`✅ Check-in available! Event starts in ${minutesUntilStart} minutes.`);
        }
      } else {
        setTimeMessage('✅ Event is currently active. Check-in available!');
      }
      return { canCheckIn: true, hasEnded: false };
    }

    return { canCheckIn: false, hasEnded: false };
  };

  const checkDuplicateCheckIn = async (eventId) => {
    const q = query(
      collection(db, 'checkins'),
      where('userId', '==', user.uid),
      where('eventId', '==', eventId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const generateMotivationalMessage = async (eventTitle, userName) => {
    const prompt = `
      Generate a short, enthusiastic message for ${userName} who just checked into a beach cleanup event "${eventTitle}". 
      Mention ocean protection and make it emotionally uplifting. Keep it under 50 words.
      Include an ocean or environmental emoji.
    `;
    try {
      const message = await fetchGeminiResponse(prompt);
      return message;
    } catch (error) {
      return `🌊 Amazing work, ${userName}! Your participation in ${eventTitle} is making a real difference for our oceans. Every action counts! 💙`;
    }
  };

  const loadEventProgress = async (eventId) => {
  try {
    const checkInsQuery = query(
      collection(db, 'checkins'),
      where('eventId', '==', eventId)
    );
    const checkInsSnapshot = await getDocs(checkInsQuery);

    let totalWaste = 0;
    const uniqueUserIds = new Set();
    const participants = [];

    checkInsSnapshot.forEach((doc) => {
      const data = doc.data();
      totalWaste += Number(data.wasteCollected) || 0;
      if (data.userId) uniqueUserIds.add(data.userId);
      participants.push({
        name: data.userName,
        waste: Number(data.wasteCollected) || 0,
        timestamp: data.timestamp
      });
    });

    participants.sort((a, b) => b.waste - a.waste);

    setEventProgress({
      totalParticipants: uniqueUserIds.size,
      totalWaste: Math.round(totalWaste * 100) / 100,
      topParticipants: participants.slice(0, 5)
    });
  } catch (error) {
    console.error('Error loading event progress:', error);
  }
};


  const handlePhotoUpload = async (file) => {
    if (!file || !currentCheckInId) return;

    // Check if event is currently active before allowing upload
    if (!eventIsActive) {
      setStatus('❌ Photo uploads are only allowed during the event period.');
      return;
    }

    setIsUploading(true);
    try {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setStatus('❌ File size too large. Please choose a file under 5MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setStatus('❌ Please select a valid image file.');
        return;
      }

      // Upload to ImgBB
      const photoUrl = await uploadToImgBB(file);

      // Save URL to Firestore
      const checkInRef = doc(db, 'checkins', currentCheckInId);
      await updateDoc(checkInRef, {
        proofPhoto: photoUrl,
        photoUploadTime: new Date().toISOString(),
        lastEditTime: new Date().toISOString()
      });

      setUploadedPhoto(photoUrl);
      setStatus('✅ Proof photo uploaded successfully!');

      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);

      // Refresh active check-ins
      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const checkIns = [];
      
      for (const docSnap of snapshot.docs) {
        const checkInData = { id: docSnap.id, ...docSnap.data() };
        
        const eventDoc = await getDoc(doc(db, 'events', checkInData.eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const now = new Date();
          const eventEnd = new Date(eventData.endDate + ' ' + (eventData.endTime || '23:59'));
          
          if (now <= eventEnd && eventData.status !== 'completed' && eventData.status !== 'cancelled') {
            checkIns.push({
              ...checkInData,
              eventData,
              canEdit: true
            });
          }
        }
      }
      
      setActiveCheckIns(checkIns);

    } catch (error) {
      console.error('❌ Upload error:', error);
      setStatus(`❌ Upload failed. Please try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  const submitCustomWaste = async () => {
    if (!customWasteAmount.trim() || !currentCheckInId) return;

    // Check if event is currently active before allowing waste logging
    if (!eventIsActive) {
      setStatus('❌ Waste logging is only allowed during the event period.');
      return;
    }

    try {
      const newWasteAmount = Number(customWasteAmount);
      if (isNaN(newWasteAmount) || newWasteAmount < 0) {
        setStatus('❌ Please enter a valid waste amount.');
        return;
      }

      const checkInRef = doc(db, 'checkins', currentCheckInId);
      await updateDoc(checkInRef, {
        wasteCollected: newWasteAmount,
        customWasteEntry: true,
        wasteEntryTime: new Date().toISOString(),
        lastEditTime: new Date().toISOString()
      });

      setOriginalWasteAmount(newWasteAmount);
      setShowWasteEntry(false);
      setCustomWasteAmount('');
      setStatus(`✅ Waste collection updated to ${newWasteAmount}kg!`);
      
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);

      // Refresh active check-ins
      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const checkIns = [];
      
      for (const docSnap of snapshot.docs) {
        const checkInData = { id: docSnap.id, ...docSnap.data() };
        
        const eventDoc = await getDoc(doc(db, 'events', checkInData.eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const now = new Date();
          const eventEnd = new Date(eventData.endDate + ' ' + (eventData.endTime || '23:59'));
          
          if (now <= eventEnd && eventData.status !== 'completed' && eventData.status !== 'cancelled') {
            checkIns.push({
              ...checkInData,
              eventData,
              canEdit: true
            });
          }
        }
      }
      
      setActiveCheckIns(checkIns);

    } catch (error) {
      console.error('Error updating waste amount:', error);
      setStatus('❌ Error updating waste amount. Please try again.');
    }
  };

  const enterEditMode = (checkInData) => {
    setCurrentCheckInId(checkInData.id);
    setEventDetails(checkInData.eventData);
    setOriginalWasteAmount(checkInData.wasteCollected);
    setUploadedPhoto(checkInData.proofPhoto || null);
    setCurrentCheckInData(checkInData);
    setEditMode(true);
    setCheckInSuccess(true);
    setStatus('');
    setMotivationalMessage('');
    
    // Check if this event is currently active for uploads/logging
    checkEventActivityStatus(checkInData.eventData);
  };

  const exitEditMode = () => {
    setEditMode(false);
    setCheckInSuccess(false);
    setEventDetails(null);
    setCurrentCheckInId(null);
    setCurrentCheckInData(null);
    setOriginalWasteAmount(0);
    setUploadedPhoto(null);
    setStatus('');
    setMotivationalMessage('');
    setShowProofUpload(false);
    setShowWasteEntry(false);
    setCustomWasteAmount('');
    setShowEventProgress(false);
    setEventProgress(null);
    setEventIsActive(false);
    setEventActivityMessage('');
  };

  const handleCheckIn = async () => {
    if (!eventId.trim()) {
      setStatus('❌ Please enter a valid event ID.');
      return;
    }

    setIsProcessing(true);
    setStatus('🔄 Processing check-in...');

    try {
      // 1. Verify event exists and get current data
      const eventDoc = await getDoc(doc(db, 'events', eventId.trim()));
      if (!eventDoc.exists()) {
        setStatus('❌ Event not found.');
        setIsProcessing(false);
        return;
      }

      const eventData = eventDoc.data();
      if (eventData.status === 'cancelled') {
        setStatus('❌ This event has been cancelled by the organizer.');
        setIsProcessing(false);
        return;
      }

      setEventStatus('ongoing');

      const now = new Date();
      const eventEnd = new Date(eventData.endDate + ' ' + (eventData.endTime || '23:59'));
      if (now > eventEnd && eventData.status !== 'completed') {
        await updateDoc(doc(db, 'events', eventId.trim()), {
          status: 'completed'
        });
        eventData.status = 'completed';
      }
      
      setEventDetails(eventData);

      // 2. Check time restrictions
      const timeCheck = checkTimeRestrictions(eventData);
      if (!timeCheck.canCheckIn) {
        setIsProcessing(false);
        return;
      }

      // 3. Check for duplicate check-in
      const isDuplicate = await checkDuplicateCheckIn(eventId.trim());
      if (isDuplicate) {
        setStatus('⚠️ You have already checked in to this event!');
        setIsProcessing(false);
        return;
      }

      // 4. Get current participant count from existing check-ins
      const checkInsQuery = query(
        collection(db, 'checkins'),
        where('eventId', '==', eventId.trim())
      );
      const checkInsSnapshot = await getDocs(checkInsQuery);
      const currentParticipants = checkInsSnapshot.size;
      
      // 5. Calculate waste
      const wasteAvailable = Number(eventData.wasteAvailable) || 0;
      const totalParticipants = currentParticipants + 1;
      
      let wastePerVolunteer = 0;
      
      if (wasteAvailable > 0 && totalParticipants > 0) {
        wastePerVolunteer = wasteAvailable / totalParticipants;
        wastePerVolunteer = Math.round(wastePerVolunteer * 100) / 100;
      }
      
      if (wasteAvailable > 0 && wastePerVolunteer < 0.1) {
        wastePerVolunteer = Math.max(1, wasteAvailable / 10);
      }

      setOriginalWasteAmount(wastePerVolunteer);

      // 6. Create the check-in document
      const checkInData = {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        eventId: eventId.trim(),
        eventTitle: eventData.title,
        eventLocation: eventData.location,
        wasteCollected: wastePerVolunteer,
        timestamp: new Date().toISOString(),
        checkInTime: new Date(),
        lastEditTime: new Date().toISOString(),
        canEdit: true
      };

      const docRef = await addDoc(collection(db, 'checkins'), checkInData);
      setCurrentCheckInId(docRef.id);

      // 7. Update user's EcoScore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ecoScore: increment(10),
        lastCheckIn: new Date().toISOString(),
        totalCheckIns: increment(1)
      });

      // 8. Update event participation count
      const eventRef = doc(db, 'events', eventId.trim());
      await updateDoc(eventRef, {
        participantCount: increment(1),
        lastCheckIn: new Date().toISOString()
      });

      // 9. Generate motivational message
      const message = await generateMotivationalMessage(eventData.title, user.displayName);
      setMotivationalMessage(message);

      // 10. Check event activity status for upload/logging restrictions
      checkEventActivityStatus(eventData);

      // 11. Update local state with animation
      setEcoScore(prevScore => prevScore + 10);
      setCheckInSuccess(true);
      setStatus(`✅ Check-in successful! You collected ${wastePerVolunteer}kg of waste 🌊`);

      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);

      setEventId('');

      // 12. Refresh active check-ins
      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const checkIns = [];
      
      for (const docSnap of snapshot.docs) {
        const checkInData = { id: docSnap.id, ...docSnap.data() };
        
        const eventDoc = await getDoc(doc(db, 'events', checkInData.eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const now = new Date();
          const eventEnd = new Date(eventData.endDate + ' ' + (eventData.endTime || '23:59'));
          
          if (now <= eventEnd && eventData.status !== 'completed' && eventData.status !== 'cancelled') {
            checkIns.push({
              ...checkInData,
              eventData,
              canEdit: true
            });
          }
        }
      }
      
      setActiveCheckIns(checkIns);

    } catch (error) {
      console.error('❌ CHECK-IN ERROR:', error);
      setStatus(`❌ ${error.message || 'Error during check-in. Please try again.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCheckIn = () => {
    setCheckInSuccess(false);
    setEventDetails(null);
    setMotivationalMessage('');
    setStatus('');
    setShowProofUpload(false);
    setUploadedPhoto(null);
    setShowWasteEntry(false);
    setCustomWasteAmount('');
    setShowEventProgress(false);
    setEventProgress(null);
    setCanCheckIn(true);
    setTimeMessage('');
    setEventHasEnded(false);
    setEditMode(false);
    setEventIsActive(false);
    setEventActivityMessage('');
    // Keep currentCheckInId and originalWasteAmount for potential editing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-cyan-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6 rounded-2xl shadow-lg transform transition-all duration-500 hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">📸 Event Check-In</h2>
            <p className="text-blue-100 text-sm">Scan QR code or enter Event ID</p>
          </div>
        </div>
        
        {/* EcoScore Display */}
        <div className={`bg-gradient-to-r from-green-400 to-blue-500 p-4 rounded-xl mb-6 text-center shadow-lg transform transition-all duration-1000 ${isAnimating ? 'scale-110 rotate-1' : 'scale-100'}`}>
          <div className="text-3xl font-bold text-white drop-shadow-lg">🌟 {ecoScore}</div>
          <div className="text-green-100 font-medium">EcoScore Points</div>
          <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white/50 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min((ecoScore % 100), 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Active Check-ins Section */}
        {activeCheckIns.length > 0 && !checkInSuccess && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 animate-fadeIn">
            <h3 className="font-bold text-yellow-800 mb-3 flex items-center">
              <span className="mr-2">📝</span>
              Your Active Events
            </h3>
            <div className="space-y-2">
              {activeCheckIns.map(checkIn => (
                <div key={checkIn.id} className="bg-white p-4 rounded-lg border border-yellow-200">
                  <div className="font-medium text-gray-800">{checkIn.eventTitle}</div>
                  <div className="text-sm text-gray-600 mb-2">
                    📍 {checkIn.eventLocation} • ♻️ {checkIn.wasteCollected}kg
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    📅 {checkIn.eventData.date} - {checkIn.eventData.endDate}
                  </div>
                  <button 
                    onClick={() => enterEditMode(checkIn)}
                    className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors duration-300 transform hover:scale-105"
                  >
                    ✏️ Edit Entry
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!checkInSuccess ? (
          <div className="space-y-6">
            {/* Event ID Input */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Enter Scanned Event ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., g3rCfy5NpZn58EGA8xWa"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 text-gray-700 bg-gray-50 focus:bg-white"
                  disabled={isProcessing}
                />
                <div className="absolute right-3 top-3">
                  <span className="text-2xl">🔍</span>
                </div>
              </div>
            </div>

            {/* Time Restriction Message */}
            {timeMessage && (
              <div className={`p-4 rounded-xl border-2 text-center font-medium ${
                canCheckIn 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : eventHasEnded 
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-700'
              }`}>
                {timeMessage}
              </div>
            )}

            {/* Check-in Button */}
            <button
              onClick={handleCheckIn}
              disabled={isProcessing || !canCheckIn}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all duration-300 ${
                isProcessing || !canCheckIn
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white hover:scale-105 active:scale-95'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : canCheckIn ? (
                '🎯 Check In to Event'
              ) : (
                '⏰ Check-in Not Available'
              )}
            </button>

            {/* Status Message */}
            {status && (
              <div className={`p-4 rounded-xl text-center font-medium animate-pulse ${
                status.includes('✅') || status.includes('successful')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : status.includes('❌') || status.includes('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : status.includes('⚠️')
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {status}
              </div>
            )}
          </div>
        ) : (
          /* Check-in Success Screen */
          <div className="space-y-6 animate-fadeIn">
            {!editMode && (
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h3 className="text-2xl font-bold text-green-600 mb-3">
                  Check-in Successful!
                </h3>
              </div>
            )}

            {/* Event Details Card */}
            {eventDetails && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🌊</span>
                  {eventDetails.title}
                </h4>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="mr-2">📍</span>
                    <span>{eventDetails.location}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">📅</span>
                    <span>{eventDetails.date} - {eventDetails.endDate}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">♻️</span>
                    <span>Waste collected: {originalWasteAmount}kg</span>
                  </div>
                  {eventDetails.description && (
                    <div className="flex items-start">
                      <span className="mr-2 mt-0.5">📝</span>
                      <span className="flex-1">{eventDetails.description}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Event Activity Status Message */}
            {eventActivityMessage && (
              <div className={`p-4 rounded-xl border-2 text-center font-medium ${
                eventIsActive 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700'
              }`}>
                {eventActivityMessage}
              </div>
            )}

            {/* Motivational Message */}
            {motivationalMessage && !editMode && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <div className="text-center text-purple-700 font-medium">
                  {motivationalMessage}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowProofUpload(!showProofUpload)}
                disabled={!eventIsActive}
                className={`p-4 rounded-xl font-semibold transition-all duration-300 transform ${
                  !eventIsActive
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:scale-105 active:scale-95'
                } shadow-lg`}
              >
                <div className="text-2xl mb-2">📸</div>
                <div className="text-sm">Upload Proof</div>
              </button>

              <button
                onClick={() => setShowWasteEntry(!showWasteEntry)}
                disabled={!eventIsActive}
                className={`p-4 rounded-xl font-semibold transition-all duration-300 transform ${
                  !eventIsActive
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white hover:scale-105 active:scale-95'
                } shadow-lg`}
              >
                <div className="text-2xl mb-2">♻️</div>
                <div className="text-sm">Log Waste</div>
              </button>
            </div>

            {/* Photo Upload Section */}
            {showProofUpload && eventIsActive && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200 animate-slideDown">
                <h4 className="font-bold text-indigo-800 mb-4 flex items-center">
                  <span className="mr-2">📸</span>
                  Upload Proof Photo
                </h4>
                
                {uploadedPhoto ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img 
                        src={uploadedPhoto} 
                        alt="Uploaded proof" 
                        className="w-full h-48 object-cover rounded-lg shadow-md"
                      />
                      <div className="absolute top-2 right-2 bg-green-500 text-white p-2 rounded-full">
                        ✅
                      </div>
                    </div>
                    <p className="text-green-600 font-medium text-center">
                      📷 Photo uploaded successfully!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors duration-300">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handlePhotoUpload(file);
                        }}
                        className="hidden"
                        id="photo-upload"
                        disabled={isUploading || !eventIsActive}
                      />
                      <label
                        htmlFor="photo-upload"
                        className={`cursor-pointer ${!eventIsActive ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <div className="text-4xl mb-2">📷</div>
                        <p className="text-indigo-600 font-medium">
                          {isUploading ? 'Uploading...' : 'Click to upload photo'}
                        </p>
                        <p className="text-xs text-indigo-400 mt-1">
                          Max 5MB • JPG, PNG, GIF
                        </p>
                      </label>
                    </div>
                    {isUploading && (
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Custom Waste Entry Section */}
            {showWasteEntry && eventIsActive && (
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl border border-green-200 animate-slideDown">
                <h4 className="font-bold text-green-800 mb-4 flex items-center">
                  <span className="mr-2">♻️</span>
                  Update Waste Collection
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      Actual waste collected (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={`Current: ${originalWasteAmount}kg`}
                        value={customWasteAmount}
                        onChange={(e) => setCustomWasteAmount(e.target.value)}
                        className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-300"
                        disabled={!eventIsActive}
                      />
                      <div className="absolute right-3 top-3">
                        <span className="text-green-500">♻️</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={submitCustomWaste}
                    disabled={!customWasteAmount.trim() || !eventIsActive}
                    className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 transform ${
                      (!customWasteAmount.trim() || !eventIsActive)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    {!eventIsActive ? '⏰ Event Not Active' : '✅ Update Waste Amount'}
                  </button>
                </div>
              </div>
            )}

            {/* Event Progress Button */}
            <button
  onClick={() => {
    setShowEventProgress(!showEventProgress);
    if (!showEventProgress) {
      // Use the stored eventId or fallback to currentCheckInData eventId
      const targetEventId = eventId || currentCheckInData?.eventId;
      console.log('Target Event ID for progress:', targetEventId);
      if (targetEventId) {
        loadEventProgress(targetEventId);
      } else {
        console.error('No event ID available for progress loading');
        setStatus('❌ Unable to load event progress - no event ID found');
      }
    }
  }}
  className="w-full p-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
>
  <div className="flex items-center justify-center">
    <span className="mr-2 text-xl">📊</span>
    <span>{showEventProgress ? 'Hide' : 'View'} Event Progress</span>
  </div>
</button>


            {/* Event Progress Section */}
            {showEventProgress && eventProgress && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200 animate-slideDown">
                <h4 className="font-bold text-yellow-800 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Event Progress
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {eventProgress.totalParticipants}
                      </div>
                      <div className="text-sm text-gray-600">Participants</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {eventProgress.totalWaste}kg
                      </div>
                      <div className="text-sm text-gray-600">Total Waste</div>
                    </div>
                  </div>

                  {eventProgress.topParticipants.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-3">
                        🏆 Top Contributors
                      </h5>
                      <div className="space-y-2">
                        {eventProgress.topParticipants.map((participant, index) => (
                          <div key={index} className="bg-white p-3 rounded-lg flex justify-between items-center">
                            <div className="flex items-center">
                              <span className="mr-2">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                              </span>
                              <span className="font-medium">{participant.name}</span>
                            </div>
                            <span className="text-green-600 font-bold">
                              {participant.waste}kg
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {editMode ? (
                <button
                  onClick={exitEditMode}
                  className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  ← Back to Scan
                </button>
              ) : (
                <button
                  onClick={resetCheckIn}
                  className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  📱 Scan Another Event
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}