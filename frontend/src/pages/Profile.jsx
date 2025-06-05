import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function Profile() {
  const { user } = useAuth();
  const [ecoScore, setEcoScore] = useState(0);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setEcoScore(data.ecoScore || 0);
        }

        const checkInQuery = query(
          collection(db, 'checkins'),
          where('userId', '==', user.uid)
        );
        const checkInSnap = await getDocs(checkInQuery);
        const checkInList = checkInSnap.docs.map(doc => doc.data());
        setCheckIns(checkInList);
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user.uid]);

  if (loading) return <div className="p-6 text-center text-gray-600">Loading profile...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-blue-800 mb-4">👤 Your Profile</h2>

      <div className="bg-blue-50 p-4 rounded-lg mb-6 shadow">
        <p className="text-lg font-semibold text-blue-900">{user.displayName}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
        <p className="mt-2 text-green-700 font-medium">🌱 EcoScore: {ecoScore}</p>
        <p className="text-gray-500 text-sm">Check-ins: {checkIns.length}</p>
      </div>

      <h3 className="text-xl font-semibold text-gray-800 mb-2">🧾 Past Check-ins</h3>
      {checkIns.length === 0 ? (
        <div className="text-gray-500">No check-ins yet. Attend an event to get started!</div>
      ) : (
        <ul className="space-y-3">
          {checkIns.map((item, idx) => (
            <li key={idx} className="p-4 bg-white rounded-lg shadow">
              <h4 className="font-bold text-blue-700">{item.eventTitle}</h4>
              <p className="text-sm text-gray-600">📍 {item.eventLocation}</p>
              <p className="text-sm text-gray-500">🕒 {new Date(item.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
