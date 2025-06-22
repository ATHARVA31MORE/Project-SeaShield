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

  const uploadToImgBB = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const res = await axios.post(
    `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
    formData
  );

  return res.data.data.url; // ← This is the final image URL
};

  // Updated time restrictions - Only 2 hours before event
  const checkTimeRestrictions = (eventData) => {
    const now = new Date();
    const eventDateTime = new Date(eventData.date + ' ' + eventData.time);const endDateTime = new Date(eventData.endDate + ' ' + (eventData.endTime || '23:59'));
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
      let totalParticipants = checkInsSnapshot.size;
      const participants = [];

      checkInsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalWaste += Number(data.wasteCollected) || 0;
        participants.push({
          name: data.userName,
          waste: Number(data.wasteCollected) || 0,
          timestamp: data.timestamp
        });
      });

      participants.sort((a, b) => b.waste - a.waste);

      setEventProgress({
        totalParticipants,
        totalWaste: Math.round(totalWaste * 100) / 100,
        topParticipants: participants.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading event progress:', error);
    }
  };

  const handlePhotoUpload = async (file) => {
  if (!file || !currentCheckInId) return;

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
      photoUploadTime: new Date().toISOString()
    });

    setUploadedPhoto(photoUrl);
    setStatus('✅ Proof photo uploaded successfully!');

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);

  } catch (error) {
    console.error('❌ Upload error:', error);
    setStatus(`❌ Upload failed. Please try again.`);
  } finally {
    setIsUploading(false);
  }
};

  const submitCustomWaste = async () => {
    if (!customWasteAmount.trim() || !currentCheckInId) return;

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
        wasteEntryTime: new Date().toISOString()
      });

      setOriginalWasteAmount(newWasteAmount);
      setShowWasteEntry(false);
      setCustomWasteAmount('');
      setStatus(`✅ Waste collection updated to ${newWasteAmount}kg!`);
      
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    } catch (error) {
      console.error('Error updating waste amount:', error);
      setStatus('❌ Error updating waste amount. Please try again.');
    }
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

      // 10. Update local state with animation
      setEcoScore(prevScore => prevScore + 10);
      setCheckInSuccess(true);
      setStatus(`✅ Check-in successful! You collected ${wastePerVolunteer}kg of waste 🌊`);

      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);

      setEventId('');

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
    setCurrentCheckInId(null);
    setShowProofUpload(false);
    setUploadedPhoto(null);
    setShowWasteEntry(false);
    setCustomWasteAmount('');
    setShowEventProgress(false);
    setEventProgress(null);
    setOriginalWasteAmount(0);
    setCanCheckIn(true);
    setTimeMessage('');
    setEventHasEnded(false);
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
                  className="p-4 border-2 border-gray-200 rounded-xl w-full text-center font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                  disabled={isProcessing}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {eventId.trim() && <span className="text-green-500">✓</span>}
                </div>
              </div>
            </div>

            {/* Time restriction message */}
            {timeMessage && (
              <div className={`p-4 rounded-xl border-l-4 ${
                canCheckIn 
                  ? 'bg-green-50 border-green-500 text-green-800' 
                  : 'bg-yellow-50 border-yellow-500 text-yellow-800'
              } animate-fadeIn`}>
                <div className="font-medium">{timeMessage}</div>
              </div>
            )}

            {/* Check-in Button */}
            <button
              onClick={handleCheckIn}
              disabled={isProcessing || !eventId.trim() || !canCheckIn}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform ${
                isProcessing || !eventId.trim() || !canCheckIn
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed scale-95'
                  : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                '✅ Check In to Event'
              )}
            </button>

            {/* Status Message */}
            {status && (
              <div className={`p-4 rounded-xl font-medium text-center transform transition-all duration-500 animate-slideIn ${
                status.includes('✅') 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : status.includes('❌') 
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : status.includes('⚠️')
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {status}
              </div>
            )}
          </div>
        ) : (
          /* Success State */
          <div className="text-center space-y-6">
            {/* Success Badge */}
            <div className={`transform transition-all duration-1000 ${isAnimating ? 'scale-125 rotate-12' : 'scale-100'}`}>
              <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full w-24 h-24 flex items-center justify-center mx-auto shadow-xl">
                <span className="text-4xl animate-bounce">🎉</span>
              </div>
            </div>

            {/* Event Details Card */}
            {eventDetails && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 animate-slideIn">
                <p className="text-blue-700 mb-2">📅 {eventDetails.date} - {eventDetails.endDate} 🕒 {eventDetails.time} - {eventDetails.endTime}</p>
                <h3 className="font-bold text-xl text-blue-900 mb-2">{eventDetails.title}</h3>
                <p className="text-blue-700 mb-2">📍 {eventDetails.location}</p>
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  📅 {eventDetails.date} • ✅ Successfully checked in!
                </div>
              </div>
            )}

            {/* Points Earned */}
            <div className={`bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-xl shadow-lg transform transition-all duration-1000 ${isAnimating ? 'scale-110 rotate-1' : 'scale-100'}`}>
              <div className="text-2xl font-bold text-white">+10 EcoScore Points! 🌟</div>
              <div className="text-yellow-100">Total: {ecoScore} points</div>
            </div>

            {/* Motivational Message */}
            {motivationalMessage && (
              <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-xl border border-green-200 animate-fadeIn">
                <div className="text-green-800 italic font-medium">{motivationalMessage}</div>
              </div>
            )}

            {/* Info Message about Feedback */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="text-blue-800 font-medium mb-1">💬 Want to give feedback?</div>
              <div className="text-blue-600 text-sm">
                Visit the "My Event Participation" tab to provide feedback for this event whenever you're ready!
              </div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowProofUpload(true)}
                className="p-4 bg-purple-100 text-purple-800 rounded-xl font-medium hover:bg-purple-200 transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <div className="text-xl mb-1">📸</div>
                <div className="text-sm">Upload Proof</div>
              </button>
              
              <button
                onClick={() => setShowWasteEntry(true)}
                className="p-4 bg-orange-100 text-orange-800 rounded-xl font-medium hover:bg-orange-200 transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <div className="text-xl mb-1">♻️</div>
                <div className="text-sm">Log Waste</div>
              </button>
              
              <button
                onClick={() => { 
                  setShowEventProgress(true); 
                  loadEventProgress(eventDetails?.id || currentCheckInId); 
                }}
                className="p-4 bg-indigo-100 text-indigo-800 rounded-xl font-medium hover:bg-indigo-200 transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <div className="text-xl mb-1">📊</div>
                <div className="text-sm">Event Stats</div>
              </button>
              
              <button
                onClick={resetCheckIn}
                className="p-4 bg-blue-100 text-blue-800 rounded-xl font-medium hover:bg-blue-200 transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <div className="text-xl mb-1">➕</div>
                <div className="text-sm">Next Event</div>
              </button>
            </div>

            {/* Modals */}
            {showProofUpload && (
              <div className="bg-white p-6 rounded-xl shadow-xl border border-purple-200 animate-slideIn">
                <h4 className="font-bold text-purple-900 mb-4 flex items-center">
                  <span className="mr-2">📸</span>
                  Upload Cleanup Proof
                </h4>
                
                {!uploadedPhoto ? (
                  <div>
                    <p className="text-purple-700 mb-4">
                      Share a before/after photo or selfie at the cleanup location!
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handlePhotoUpload(e.target.files[0])}
                      className="w-full p-3 border-2 border-purple-300 rounded-lg text-sm focus:border-purple-500 transition-all duration-300"
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <div className="mt-3 flex items-center text-purple-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                        Uploading photo...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-green-600 font-bold mb-3">✅ Photo uploaded successfully!</div>
                    <img src={uploadedPhoto} alt="Cleanup proof" className="w-full h-40 object-cover rounded-lg shadow-md" />
                  </div>
                )}
                
                <button
                  onClick={() => setShowProofUpload(false)}
                  className="mt-4 w-full px-4 py-2 bg-purple-200 text-purple-800 rounded-lg font-medium hover:bg-purple-300 transition-colors duration-300"
                >
                  Close
                </button>
              </div>
            )}

            {showWasteEntry && (
              <div className="bg-white p-6 rounded-xl shadow-xl border border-orange-200 animate-slideIn">
                <h4 className="font-bold text-orange-900 mb-4 flex items-center">
                  <span className="mr-2">♻️</span>
                  Manual Waste Entry
                </h4>
                <div className="bg-orange-50 p-3 rounded-lg mb-4">
                  <p className="text-orange-700 font-medium">Current estimate: {originalWasteAmount}kg</p>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Enter actual amount (kg)"
                  value={customWasteAmount}
                  onChange={(e) => setCustomWasteAmount(e.target.value)}
                  className="w-full p-3 border-2 border-orange-300 rounded-lg mb-4 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-300"
                />
                <div className="flex gap-3">
                  <button
                    onClick={submitCustomWaste}
                    disabled={!customWasteAmount.trim()}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-orange-300 transition-colors duration-300"
                  >
                    Update Amount
                  </button>
                  <button
                    onClick={() => setShowWasteEntry(false)}
                    className="px-4 py-2 bg-orange-200 text-orange-800 rounded-lg font-medium hover:bg-orange-300 transition-colors duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showEventProgress && (
              <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-200 animate-slideIn">
                <h4 className="font-bold text-indigo-900 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Event Progress
                </h4>
                
                {eventProgress ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center bg-indigo-50 p-4 rounded-lg">
                        <div className="text-3xl font-bold text-indigo-800">{eventProgress.totalWaste}kg</div>
                        <div className="text-indigo-600 font-medium">Total Waste</div>
                      </div>
                      <div className="text-center bg-indigo-50 p-4 rounded-lg">
                        <div className="text-3xl font-bold text-indigo-800">{eventProgress.totalParticipants}</div>
                        <div className="text-indigo-600 font-medium">Participants</div>
                      </div>
                    </div>
                    
                    <div className="text-left">
                      <h5 className="font-bold text-indigo-800 mb-3 flex items-center">
                        🏆 Top Contributors:
                      </h5>
                      <div className="space-y-2">
                        {eventProgress.topParticipants.map((p, idx) => (
                          <div key={idx} className="bg-indigo-100 p-3 rounded-lg flex justify-between items-center">
                            <div className="font-medium text-indigo-800">{p.name}</div>
                            <div className="text-indigo-600">{p.waste}kg</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-indigo-600 text-sm">Loading event stats...</div>
                )}

                <button
                  onClick={() => setShowEventProgress(false)}
                  className="mt-4 w-full px-4 py-2 bg-indigo-200 text-indigo-800 rounded-lg font-medium hover:bg-indigo-300 transition-colors duration-300"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
