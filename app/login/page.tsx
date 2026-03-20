'use client';

import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, Loader, ArrowRight } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [cursorOnPassword, setCursorOnPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/");
      }
    });
    return () => unsub();
  }, [router]);

  const handleError = (err: any) => {
    const errorCode = err?.code || "";
    const errorMap: { [key: string]: string } = {
      "auth/invalid-email": "Invalid email format",
      "auth/user-disabled": "This account has been disabled",
      "auth/user-not-found": "No account found with this email",
      "auth/wrong-password": "Incorrect password",
      "auth/email-already-in-use": "Email already in use",
      "auth/weak-password": "Password must be at least 6 characters",
      "auth/operation-not-allowed": "Operation not allowed",
      "auth/popup-closed-by-user": "Sign-in was cancelled",
      "auth/network-request-failed": "Network error. Please check your connection",
      "auth/too-many-requests": "Too many login attempts. Please try again later.",
      "auth/invalid-credential": "Invalid email or password. If you don't have an account, try signing up!",
    };

    const message = errorMap[errorCode] || err?.message || "An error occurred";
    setError(message);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      try {
        await setDoc(doc(db, "users", result.user.uid), {
          uid: result.user.uid,
          email: email,
          role: userRole,
          fullName: "",
          courseCode: "",
          university: "",
          createdAt: new Date(),
          verified: false,
        });
      } catch (firestoreError: any) {
        console.error("Firestore error:", firestoreError);
      }

      try {
        await sendEmailVerification(result.user);
      } catch (emailError) {
        console.error("Email verification error:", emailError);
      }

      setError("");
      alert(`Account created successfully! You are registered as a ${userRole}.`);
      
      setEmail("");
      setPassword("");
      setUserRole('student');
      setIsLogin(true);
      
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);

      const userRef = doc(db, "users", result.user.uid);
      
      try {
        const { getDoc } = await import("firebase/firestore");
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: result.user.uid,
            email: result.user.email,
            fullName: result.user.displayName || "",
            role: "student",
            profilePicture: result.user.photoURL || "",
            courseCode: "",
            university: "",
            createdAt: new Date(),
            verified: true,
          });
        }
      } catch (firestoreError: any) {
        console.error("Firestore error during Google signup:", firestoreError);
      }

      router.push("/");
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setError("");
      } else {
        handleError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // Eye position based on password field focus
  const eyeOffset = cursorOnPassword ? -6 : 4;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative" style={{
      backgroundImage: "url('/bck.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Overlay for better readability - dark overlay */}
      <div className="absolute inset-0 bg-black/35 z-0"></div>

      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-60px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(60px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-slide-in-right {
          animation: slideInRight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-float {
          animation: float 3.5s ease-in-out infinite;
        }

        .eye-pupil {
          transition: cx 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .character-shadow {
          filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.15));
        }

        .group-hover\:opacity-60:hover {
          opacity: 0.6 !important;
        }

        @keyframes eyePulse {
          0%, 100% { r: 7; }
          50% { r: 8; }
        }

        @keyframes glowPulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
          }
          50% { 
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
          }
        }
      `}</style>

      <div className="relative z-10 max-w-7xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT - TWO SIMPLE CHARACTERS SIDE BY SIDE */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-16 h-full">
            
            {/* Two Characters Side by Side */}
            <div className={`animate-slide-in-left ${cursorOnPassword ? '' : 'animate-float'} flex gap-8 items-center justify-center w-full`}>
              
              {/* SQUARE CHARACTER */}
              <svg width="140" height="160" viewBox="0 0 140 160" className="character-shadow">
                {/* Shadow */}
                <ellipse cx="70" cy="150" rx="50" ry="12" fill="#000000" opacity="0.08"/>
                
                {/* Body - Green Square */}
                <rect x="20" y="60" width="100" height="100" rx="15" fill="#10b981"/>
                
                {/* Head - Green Square */}
                <rect x="30" y="10" width="80" height="80" rx="12" fill="#059669"/>
                
                {/* Eyes - LEFT EYE */}
                <g>
                  <ellipse cx="45" cy="45" rx="10" ry="13" fill="white"/>
                  <circle className="eye-pupil" cx={45 + eyeOffset} cy="48" r="6" fill="#1f2937"/>
                  <circle className="eye-pupil" cx={45 + eyeOffset + 2.5} cy="45" r="2.5" fill="white"/>
                </g>
                
                {/* Eyes - RIGHT EYE */}
                <g>
                  <ellipse cx="95" cy="45" rx="10" ry="13" fill="white"/>
                  <circle className="eye-pupil" cx={95 + eyeOffset} cy="48" r="6" fill="#1f2937"/>
                  <circle className="eye-pupil" cx={95 + eyeOffset + 2.5} cy="45" r="2.5" fill="white"/>
                </g>
                
                {/* Smile */}
                <path d="M 50 65 Q 70 75 90 65" stroke="#047857" strokeWidth="3" fill="none" strokeLinecap="round"/>
                
                {/* Arms */}
                <rect x="8" y="80" width="16" height="50" rx="8" fill="#047857"/>
                <rect x="116" y="80" width="16" height="50" rx="8" fill="#047857"/>
              </svg>

              {/* CIRCLE CHARACTER */}
              <svg width="140" height="160" viewBox="0 0 140 160" className="character-shadow">
                {/* Shadow */}
                <ellipse cx="70" cy="150" rx="50" ry="12" fill="#000000" opacity="0.08"/>
                
                {/* Body - Green Circle */}
                <circle cx="70" cy="110" r="50" fill="#10b981"/>
                
                {/* Head - Green Circle */}
                <circle cx="70" cy="45" r="40" fill="#059669"/>
                
                {/* Eyes - LEFT EYE */}
                <g>
                  <ellipse cx="50" cy="40" rx="10" ry="13" fill="white"/>
                  <circle className="eye-pupil" cx={50 + eyeOffset} cy="43" r="6" fill="#1f2937"/>
                  <circle className="eye-pupil" cx={50 + eyeOffset + 2.5} cy="40" r="2.5" fill="white"/>
                </g>
                
                {/* Eyes - RIGHT EYE */}
                <g>
                  <ellipse cx="90" cy="40" rx="10" ry="13" fill="white"/>
                  <circle className="eye-pupil" cx={90 + eyeOffset} cy="43" r="6" fill="#1f2937"/>
                  <circle className="eye-pupil" cx={90 + eyeOffset + 2.5} cy="40" r="2.5" fill="white"/>
                </g>
                
                {/* Smile */}
                <path d="M 55 60 Q 70 70 85 60" stroke="#047857" strokeWidth="3" fill="none" strokeLinecap="round"/>
                
                {/* Arms */}
                <ellipse cx="25" cy="110" rx="15" ry="45" fill="#047857"/>
                <ellipse cx="115" cy="110" rx="15" ry="45" fill="#047857"/>
              </svg>

            </div>

            {/* Status Message */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl px-8 py-4 max-w-sm text-center shadow-lg">
              <p className="font-bold text-emerald-800 text-lg">
                {cursorOnPassword ? "👀 Looking Away" : "👀 Looking At You"}
              </p>
            </div>
          </div>

          {/* RIGHT - LOGIN FORM */}
          <div className="animate-slide-in-right">
            <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 lg:p-12 border border-white/30">
              
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 animate-pulse"></div>
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-teal-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <h1 className="text-4xl font-bold text-emerald-700 mb-2">
                  {isLogin ? "Welcome Back!" : "Join Our Team"}
                </h1>
                <p className="text-gray-600 font-medium">
                  {isLogin ? "Sign in to your account" : "Create your account"}
                </p>
              </div>

              {/* Toggle Buttons */}
              <div className="flex gap-2 bg-emerald-100 rounded-full p-1.5 mb-8">
                <button
                  onClick={() => { setIsLogin(true); setError(""); }}
                  className={`flex-1 py-2.5 px-6 rounded-full font-bold transition-all duration-300 ${
                    isLogin
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg transform scale-105"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => { setIsLogin(false); setError(""); }}
                  className={`flex-1 py-2.5 px-6 rounded-full font-bold transition-all duration-300 ${
                    !isLogin
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg transform scale-105"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-6 mb-6">
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-emerald-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setCursorOnPassword(true)}
                      onBlur={() => setCursorOnPassword(false)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3.5 border-2 border-emerald-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100 transition-all font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Role Selection */}
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-3.5">
                      I am a:
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-3 flex-1 p-3 border-2 border-emerald-200 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                        <input
                          type="radio"
                          name="role"
                          value="student"
                          checked={userRole === "student"}
                          onChange={(e) => setUserRole(e.target.value)}
                          className="w-5 h-5 accent-emerald-600"
                        />
                        <span className="text-gray-800 font-bold">Student</span>
                      </label>
                      <label className="flex items-center gap-3 flex-1 p-3 border-2 border-emerald-200 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
                        <input
                          type="radio"
                          name="role"
                          value="professor"
                          checked={userRole === "professor"}
                          onChange={(e) => setUserRole(e.target.value)}
                          className="w-5 h-5 accent-green-600"
                        />
                        <span className="text-gray-800 font-bold">Professor</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Remember Me */}
                {isLogin && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded accent-emerald-600" />
                      <span className="text-gray-700 text-sm font-semibold">Remember me</span>
                    </label>
                    <a href="#" className="text-emerald-600 hover:text-emerald-700 text-sm font-bold">
                      Forgot password?
                    </a>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-8 py-4 px-6 rounded-2xl font-bold text-white text-lg bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 group"
                >
                  {loading ? (
                    <>
                      <Loader className="w-6 h-6 animate-spin" />
                      <span>{isLogin ? "Logging in..." : "Creating account..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{isLogin ? "Login" : "Sign Up"}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-gray-500 text-sm font-bold">Or continue with</span>
                </div>
              </div>

              {/* Google Button - Official Style */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-lg font-bold text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Official Google Logo */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-bold text-gray-700">Sign in with Google</span>
              </button>

              {/* Footer */}
              <p className="text-center text-gray-700 font-semibold text-sm mt-8">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(""); setEmail(""); setPassword(""); }}
                  className="text-emerald-600 hover:text-emerald-700 font-bold"
                >
                  {isLogin ? "Sign up" : "Login"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}