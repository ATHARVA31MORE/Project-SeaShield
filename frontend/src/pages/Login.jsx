import { useState } from 'react';
import { auth, db, googleProvider } from '../utils/firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const docSnap = await getDoc(doc(db, 'users', userCred.user.uid));
      if (docSnap.exists()) navigate('/');
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) alert('User not registered. Please Sign Up.');
      else navigate('/');
    } catch (err) {
      alert('Google login error: ' + err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input className="w-full border p-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full border p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button className="w-full bg-blue-600 text-white p-2 rounded">Login</button>
      </form>
      <button onClick={handleGoogleLogin} className="mt-4 w-full bg-red-500 text-white p-2 rounded">Sign in with Google</button>
    </div>
  );
}
