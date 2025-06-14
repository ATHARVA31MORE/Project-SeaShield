import { useEffect } from 'react';
import { db } from '../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';

const mockEvents = [
  {
    title: "Juhu Beach Cleanup",
    description: "Join us to clear plastic waste and protect marine life!",
    date: "2025-06-15", // Changed to future date
    location: "Juhu Beach, Mumbai",
    wasteTarget: 80, // ✅ Ensure this is a NUMBER, not string
    wasteAvailable: 80, // ✅ Add this line
    participantCount: 0,
    status: 'active' // ✅ Initialize participant count
  },
  {
    title: "Versova Shoreline Sweep",
    description: "Help restore the beauty of Versova Beach.",
    date: "2025-06-18",
    location: "Versova Beach, Mumbai",
    wasteTarget: 30, // ✅ NUMBER
    wasteAvailable: 30, // ✅ Add this line
    participantCount: 0,
    status: 'active',
  },
  {
    title: "Dadar Eco Dive",
    description: "Let's make Dadar Beach cleaner together.",
    date: "2025-06-22",
    location: "Dadar Beach, Mumbai",
    wasteTarget: 20, // ✅ NUMBER
    wasteAvailable: 20, // ✅ Add this line
    participantCount: 0,
    status: 'active',
  }
];

export default function SeedEvents() {
  useEffect(() => {
    const insertMockEvents = async () => {
      try {
        for (const event of mockEvents) {
          const docRef = await addDoc(collection(db, 'events'), event);
          console.log('✅ Event seeded with ID:', docRef.id);
          console.log('📊 Event data:', event);
        }
        alert("Mock events seeded to Firestore ✅");
      } catch (error) {
        console.error('❌ Error seeding events:', error);
        alert("Error seeding events - check console");
      }
    };

    insertMockEvents();
  }, []);

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
      <p className="text-yellow-800 text-sm">🌱 Seeding events to Firestore...</p>
      <p className="text-xs text-yellow-600 mt-1">Check console for details</p>
    </div>
  );
}