import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-lg font-semibold">🌊 Project Seashield</div>
      <div className="flex space-x-6">
        <Link
          to="/"
          className={`hover:underline ${
            location.pathname === '/' ? 'underline' : ''
          }`}
        >
          Home
        </Link>
        <Link
          to="/events"
          className={`hover:underline ${
            location.pathname === '/events' ? 'underline' : ''
          }`}
        >
          Events
        </Link>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
