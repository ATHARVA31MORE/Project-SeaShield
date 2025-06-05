import { useEffect } from 'react';
import { db } from '../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';

const mockEvents = [
  {
    title: "Juhu Beach Cleanup",
    description: "Join us to clear plastic waste and protect marine life!",
    date: "2025-06-09",
    location: "Juhu Beach, Mumbai",
  },
  {
    title: "Versova Shoreline Sweep",
    description: "Help restore the beauty of Versova Beach.",
    date: "2025-06-15",
    location: "Versova Beach, Mumbai",
  },
  {
    title: "Dadar Eco Dive",
    description: "Let's make Dadar Beach cleaner together.",
    date: "2025-06-22",
    location: "Dadar Beach, Mumbai",
  }
];

export default function SeedEvents() {
  useEffect(() => {
    const insertMockEvents = async () => {
      for (const event of mockEvents) {
        await addDoc(collection(db, 'events'), event);
      }
      alert("Mock events seeded to Firestore ✅");
    };

    insertMockEvents();
  }, []);

  return null;
}
