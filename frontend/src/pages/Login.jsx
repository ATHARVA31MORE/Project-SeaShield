import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50">
      <h1 className="text-3xl font-bold mb-6 text-blue-800">Welcome to Project Seashield 🌊</h1>
      <button
        onClick={login}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
      >
        Sign in with Google
      </button>
    </div>
  );
}
