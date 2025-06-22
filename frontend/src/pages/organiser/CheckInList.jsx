import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

const CheckInList = ({ eventId }) => {
  const [checkIns, setCheckIns] = useState([]);

  useEffect(() => {
    const fetchCheckIns = async () => {
      try {
        const checkinQuery = query(collection(db, 'checkins'), where('eventId', '==', eventId));
        const snapshot = await getDocs(checkinQuery);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCheckIns(data);
      } catch (err) {
        console.error('Error fetching check-ins:', err);
      }
    };

    if (eventId) fetchCheckIns();
  }, [eventId]);

  if (!eventId) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-4">
      <h2 className="text-lg font-bold mb-2">Volunteer Check-ins</h2>
      {checkIns.length === 0 ? (
        <p className="text-gray-600">No volunteers have checked in yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {checkIns.map(check => (
            <li key={check.id} className="py-2">
              <p><strong>Name:</strong> {check.userName}</p>
              <p><strong>Email:</strong> {check.userEmail}</p>
              <p><strong>Check-in Time:</strong> {new Date(check.checkInTime.seconds * 1000).toLocaleString()}</p>
              <p><strong>Waste Collected:</strong> {check.wasteCollected}kg</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CheckInList;
