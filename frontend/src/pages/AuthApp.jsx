import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Users, Heart, Building2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Add this import

// Firebase imports - replace with your actual Firebase utils path
import { auth, db, googleProvider } from '../utils/firebase'; // Adjust path as needed
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthApp = () => {
  const navigate = useNavigate(); // Add this hook
  const [currentPage, setCurrentPage] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'volunteer',
    firstName: '',
    lastName: '',
    organization: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleUserTypeChange = (type) => {
    setFormData({
      ...formData,
      userType: type
    });
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (currentPage === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (!formData.firstName || !formData.lastName) {
        setError('First name and last name are required');
        return false;
      }
      if (formData.userType === 'organizer' && !formData.organization) {
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

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // Get user type from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSuccess(`Welcome back, ${userData.userType}!`);
        console.log('User signed in:', userData);
        
        // Redirect to home page after successful login
        setTimeout(() => {
          navigate('/home');
        }, 1000); // Small delay to show success message
      } else {
        setError('User profile not found. Please sign up first.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      const additionalData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`
      };

      if (formData.userType === 'organizer') {
        additionalData.organization = formData.organization;
      }

      await saveUserData(user, formData.userType, additionalData);
      setSuccess(`Account created successfully as ${formData.userType}!`);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        userType: 'volunteer',
        firstName: '',
        lastName: '',
        organization: ''
      });

      // Redirect to home page after successful signup
      setTimeout(() => {
        navigate('/home');
      }, 1000); // Small delay to show success message
    } catch (error) {
      console.error('Sign up error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Existing user - sign in
        const userData = userDoc.data();
        setSuccess(`Welcome back, ${userData.userType}!`);
        console.log('Existing user signed in:', userData);
        
        // Redirect to home page after successful login
        setTimeout(() => {
          navigate('/home');
        }, 1000); // Small delay to show success message
      } else {
        // New user - need to set user type
        if (currentPage === 'signup') {
          // We're on signup page, so we know the user type
          const additionalData = {
            displayName: user.displayName || `${formData.firstName} ${formData.lastName}`,
            firstName: formData.firstName || user.displayName?.split(' ')[0] || '',
            lastName: formData.lastName || user.displayName?.split(' ').slice(1).join(' ') || ''
          };

          if (formData.userType === 'organizer') {
            additionalData.organization = formData.organization;
          }

          await saveUserData(user, formData.userType, additionalData);
          setSuccess(`Account created successfully as ${formData.userType}!`);
          
          // Redirect to home page after successful signup
          setTimeout(() => {
            navigate('/home');
          }, 1000); // Small delay to show success message
        } else {
          // We're on login page but user doesn't exist
          setError('Account not found. Please sign up first.');
        }
      }
    } catch (error) {
      console.error('Google auth error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup blocked. Please allow popups and try again.');
      } else {
        setError('Google authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const UserTypeSelector = () => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        I am a:
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleUserTypeChange('volunteer')}
          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
            formData.userType === 'volunteer'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Heart className={`w-6 h-6 mx-auto mb-2 ${
            formData.userType === 'volunteer' ? 'text-blue-500' : 'text-gray-400'
          }`} />
          <div className="font-medium">Volunteer</div>
          <div className="text-xs text-gray-500 mt-1">Help make a difference</div>
        </button>
        
        <button
          type="button"
          onClick={() => handleUserTypeChange('organizer')}
          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
            formData.userType === 'organizer'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Building2 className={`w-6 h-6 mx-auto mb-2 ${
            formData.userType === 'organizer' ? 'text-green-500' : 'text-gray-400'
          }`} />
          <div className="font-medium">Organizer</div>
          <div className="text-xs text-gray-500 mt-1">Create opportunities</div>
        </button>
      </div>
    </div>
  );

  const GoogleButton = () => (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={loading}
      className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  );

  const LoginForm = () => (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-600 mt-2">Sign in to your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <GoogleButton />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">or continue with email</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              required
            />
          </div>
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEmailSignIn}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Sign In <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <p className="text-center text-gray-600 mt-6">
        Don't have an account?{' '}
        <button
          onClick={() => setCurrentPage('signup')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Sign up
        </button>
      </p>
    </div>
  );

  const SignupForm = () => (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Join Our Community</h1>
        <p className="text-gray-600 mt-2">Create your account to get started</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <UserTypeSelector />

      <GoogleButton />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">or sign up with email</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            name="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last name"
            value={formData.lastName}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
            required
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
            required
          />
        </div>

        {formData.userType === 'organizer' && (
          <input
            type="text"
            name="organization"
            placeholder="Organization name"
            value={formData.organization}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
            required
          />
        )}

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleEmailSignUp}
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Create Account <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <p className="text-center text-gray-600 mt-6">
        Already have an account?{' '}
        <button
          onClick={() => setCurrentPage('login')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Sign in
        </button>
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {currentPage === 'login' ? <LoginForm /> : <SignupForm />}
    </div>
  );
};

export default AuthApp;