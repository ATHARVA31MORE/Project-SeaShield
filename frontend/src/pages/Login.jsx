import { useState } from 'react';
import { auth, db, googleProvider } from '../utils/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [userType, setUserType] = useState('volunteer');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (!firstName || !lastName) {
        setError('First name and last name are required');
        return false;
      }
      if (userType === 'organizer' && !organization) {
        setError('Organization name is required for organizers');
        return false;
      }
    }

    return true;
  };

  const saveUserData = async (user, userType, additionalData = {}) => {
    try {
      const userData = {
        uid: user.uid,
        email: user.email,
        userType: userType,
        createdAt: new Date().toISOString(),
        ...additionalData
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('User data saved to Firestore');
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const docSnap = await getDoc(doc(db, 'users', userCred.user.uid));
      
      if (docSnap.exists()) {
        console.log('User logged in successfully');
        navigate('/');
      } else {
        setError('User profile not found. Please sign up first.');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Login failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      const additionalData = {
        firstName: firstName,
        lastName: lastName,
        displayName: `${firstName} ${lastName}`
      };

      if (userType === 'organizer') {
        additionalData.organization = organization;
      }

      await saveUserData(user, userType, additionalData);
      console.log('Account created successfully');
      navigate('/');
    } catch (err) {
      console.error('Sign up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Sign up failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    // For sign up, validate required fields first
    if (isSignUp) {
      if (!firstName || !lastName) {
        setError('Please enter your full name before continuing with Google');
        setLoading(false);
        return;
      }
      if (userType === 'organizer' && !organization) {
        setError('Organization name is required for organizers');
        setLoading(false);
        return;
      }
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Existing user - login
        console.log('User logged in with Google');
        navigate('/');
      } else {
        // New user
        if (isSignUp) {
          // Sign up flow
          const additionalData = {
            displayName: user.displayName || `${firstName} ${lastName}`,
            firstName: firstName || user.displayName?.split(' ')[0] || '',
            lastName: lastName || user.displayName?.split(' ').slice(1).join(' ') || ''
          };

          if (userType === 'organizer') {
            additionalData.organization = organization;
          }

          await saveUserData(user, userType, additionalData);
          console.log('Account created with Google');
          navigate('/');
        } else {
          // Login flow but user doesn't exist
          setError('Account not found. Please sign up first.');
        }
      }
    } catch (err) {
      console.error('Google auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked. Please allow popups and try again.');
      } else {
        setError('Google authentication failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {isSignUp && (
          <>
            {/* User Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUserType('volunteer')}
                  className={`p-3 rounded-lg border-2 text-sm ${
                    userType === 'volunteer'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Volunteer
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('organizer')}
                  className={`p-3 rounded-lg border-2 text-sm ${
                    userType === 'organizer'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Organizer
                </button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
              />
              <input
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
              />
            </div>

            {/* Organization field for organizers */}
            {userType === 'organizer' && (
              <input
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Organization name"
                required
              />
            )}
          </>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
          <input
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />

          {isSignUp && (
            <input
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isSignUp ? 'Create Account' : 'Login'
            )}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mt-4 w-full bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              `${isSignUp ? 'Sign up' : 'Sign in'} with Google`
            )}
          </button>
        </div>

        <p className="text-center text-gray-600 mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}