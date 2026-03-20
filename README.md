### Overview

The `login+dash` branch builds upon the `BasicDashboard` by introducing a **user authentication system using Firebase**. This marks a significant step forward, as the application transitions from a static interface to a user-specific, interactive system.

---

#### 🔐 Overview

This branch integrates a login mechanism that allows users to securely sign in using their credentials (email and password). Once authenticated, users can access the dashboard, making the application more personalized and controlled.

---

#### 🏗️ Structure

The project is organized as follows:

* `app/`

  * `page.tsx` → Main dashboard page
  * `login/page.tsx` → Login interface for user authentication

* `lib/`

  * `firebase.ts` → Firebase configuration and initialization

---

#### ⚙️ Key Functionalities

* **User Authentication**

  * Users can log in using email and password
  * Authentication is fully managed by Firebase

* **Session Handling**

  * Firebase keeps track of logged-in users
  * Users remain authenticated unless they log out

* **Protected Access (Basic Level)**

  * Only authenticated users can access the dashboard

* **Separation of Concerns**

  * Firebase logic is handled in `lib/firebase.ts`
  * UI and routing handled inside `app/`

---

#### 🔥 Firebase Integration

This branch uses Firebase Authentication to manage users.

**Core Features Used:**

* Email/Password Sign-In
* Authentication State Management
* Secure session handling

---

#### 🚀 How to Run This Branch

1. **Checkout the branch**

```bash id="k92jda"
git checkout login+dash
```

2. **Install dependencies**

```bash id="p3x9sm"
npm install
```

3. **Configure Environment Variables**

Create a `.env.local` file in the root directory and add the Firebase configuration values.

```env id="q8zn2l"
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

> 📩 The actual environment variable values will be shared separately via email.

These variables are used inside `lib/firebase.ts` to initialize Firebase securely.

4. **Run the project**

```bash id="u7df3l"
npm run dev
```

#### 🧠 What This Branch Demonstrates

* Transition from static UI to **user-based system**
* Integration of **third-party services (Firebase)**
* Basic **authentication workflow in a real application**
* Foundation for future features like user data, roles, etc.

---

