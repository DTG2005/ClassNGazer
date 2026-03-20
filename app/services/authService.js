
import { auth } from '../../lib/firebase/init';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { userDatabase } from './userDatabase';

const googleProvider = new GoogleAuthProvider();
// Restrict Google sign-in to @iiti.ac.in domain
googleProvider.setCustomParameters({ hd: 'iiti.ac.in' });

function validateIITIEmail(email) {
  if (!email || !email.endsWith('@iiti.ac.in')) {
    throw new Error('Only @iiti.ac.in email addresses are allowed.');
  }
}

export const authService = {

  // ════════════════════════════════════════
  // GOOGLE SIGN-IN (from Class Diagram: googleSignin())
  // State: Unregistered → Awaiting Registration → Registered → CurrentUser
  // ════════════════════════════════════════
  async googleSignIn() {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    validateIITIEmail(user.email);

    // Check if user profile exists in Firestore
    const existing = await userDatabase.getUserById(user.uid);

    if (existing) {
      // Existing user — State: Registered → CurrentUser
      return {
        uid: user.uid,
        email: user.email,
        name: existing.name,
        role: existing.role,
        profilePic: user.photoURL || existing.profilePic || null,
        emailVerified: user.emailVerified,
        isNewUser: false,
      };
    } else {
      // New user — State: Awaiting Registration
      // Return user info so the UI can ask for role selection before calling registerUser()
      return {
        uid: user.uid,
        email: user.email,
        name: user.displayName || '',
        profilePic: user.photoURL || null,
        emailVerified: user.emailVerified,
        isNewUser: true,  // UI should prompt for role selection
        role: null,        // Not yet assigned
      };
    }
  },

  // ════════════════════════════════════════
  // REGISTER USER (from Class Diagram: registerUser())
  // State: Awaiting Registration → Registered
  // Called after Google sign-in for new users who need to pick a role
  // ════════════════════════════════════════
  async registerUser({ uid, name, email, role, profilePic }) {
    validateIITIEmail(email);
    if (!['professor', 'student'].includes(role)) throw new Error('Role must be "professor" or "student".');

    await userDatabase.createUser(uid, {
      name: name?.trim() || 'Unknown',
      email,
      role,
      userName: name?.trim() || '',
      profilePic: profilePic || null,
    });

    return { uid, email, name, role, profilePic };
  },

  // ════════════════════════════════════════
  // EMAIL/PASSWORD SIGN UP
  // ════════════════════════════════════════
  async signUp({ name, email, password, role }) {
    validateIITIEmail(email);
    if (!name?.trim()) throw new Error('Name is required.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (!['professor', 'student'].includes(role)) throw new Error('Role must be "professor" or "student".');

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);

    await userDatabase.createUser(cred.user.uid, {
      name: name.trim(),
      email,
      role,
      userName: name.trim(),
      profilePic: null,
    });

    return { uid: cred.user.uid, email, name: name.trim(), role, emailVerified: false };
  },

  // ════════════════════════════════════════
  // EMAIL/PASSWORD SIGN IN
  // ════════════════════════════════════════
  async signIn(email, password) {
    validateIITIEmail(email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await userDatabase.getUserById(cred.user.uid);
    if (!profile) throw new Error('User profile not found. Please sign up first.');

    return {
      uid: cred.user.uid, email: cred.user.email,
      name: profile.name, role: profile.role,
      profilePic: profile.profilePic || null,
      emailVerified: cred.user.emailVerified,
    };
  },

  // ════════════════════════════════════════
  // LOGOUT (from Class Diagram: logout())
  // State: CurrentUser → Guest
  // ════════════════════════════════════════
  async signOut() {
    await signOut(auth);
    return true;
  },

  // ════════════════════════════════════════
  // CURRENT USER (from Class Diagram: currentUser())
  // ════════════════════════════════════════
  async getCurrentUser() {
    const user = auth.currentUser;
    if (!user) return null;
    const profile = await userDatabase.getUserById(user.uid);
    if (!profile) return null;
    return {
      uid: user.uid, email: user.email,
      name: profile.name, role: profile.role,
      userName: profile.userName || profile.name,
      profilePic: profile.profilePic || user.photoURL || null,
      emailVerified: user.emailVerified,
    };
  },

  // Auth state listener
  onAuthChange(callback) {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { callback(null); return; }
      try {
        const profile = await userDatabase.getUserById(fbUser.uid);
        if (!profile) { callback({ uid: fbUser.uid, email: fbUser.email, isNewUser: true, role: null }); return; }
        callback({
          uid: fbUser.uid, email: fbUser.email,
          name: profile.name, role: profile.role,
          userName: profile.userName || profile.name,
          profilePic: profile.profilePic || fbUser.photoURL || null,
          emailVerified: fbUser.emailVerified, isNewUser: false,
        });
      } catch { callback(null); }
    });
  },

  async resendVerification() {
    const user = auth.currentUser;
    if (!user) throw new Error('No user signed in.');
    if (user.emailVerified) throw new Error('Already verified.');
    await sendEmailVerification(user);
    return true;
  },
};