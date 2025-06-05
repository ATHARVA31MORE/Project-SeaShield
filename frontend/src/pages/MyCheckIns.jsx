import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function MyCheckIns() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      setCheckins(snapshot.docs.map(doc => doc.data()));
    };
    fetch();
  }, [user]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">🗓️ My Event Participation</h2>
      {checkins.length === 0 ? (
        <p>No check-ins yet.</p>
      ) : (
        <ul className="space-y-3">
          {checkins.map((c, i) => (
            <li key={i} className="bg-blue-50 p-3 rounded shadow">
              <p><strong>Event ID:</strong> {c.eventId}</p>
              <p><strong>Date:</strong> {new Date(c.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
