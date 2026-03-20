Real-Time Classroom Polling System
A robust, full-stack web application built with Next.js and Firebase, designed to facilitate instant interaction between professors and students. This system allows for live questioning, real-time result visualization, and comprehensive data export for academic grading.

Key Features
For Professors
Dynamic Poll Creation: Support for multiple-choice questions with single or multiple correct answers.

Live Orchestration: Toggle polls between Draft, Active, and Closed states.

Blackboard Mode: A dedicated presentation view for classroom projectors showing live results.

Analytics and Export: Real-time correctness tracking and data export in CSV and JSON formats.

For Students
Domain-Locked Security: Access restricted to official @iiti.ac.in email addresses via Google OAuth.

Real-time Participation: Instant UI updates when a poll goes live; no page refreshes required.

Personal Dashboard: Track performance and participation history across different courses.

System Architecture and Firebase Integration
The application utilizes a dual-database architecture to ensure both data integrity and sub-second latency.

Cloud Firestore: Acts as the primary persistent storage for users, courses, and historical poll data.

Firebase Realtime Database: Handles high-speed signaling for live polls, ensuring students see questions the millisecond a professor clicks Start.

Firebase Auth: Manages secure, role-based sessions (Professor vs. Student) with IIT-I domain enforcement.

User Roles and Tasks
Professor Tasks
Authentication: Sign in via Google (restricted to @iiti.ac.in).

Poll Authoring: Create questions, set multiple correct options, and configure timers (10s to 300s).

Session Control: Launch polls to the Realtime Database and monitor live results on the Blackboard view.

Data Management: Close sessions and download student response data for grading.

Student Tasks
Session Entry: Join active polls using a unique Poll ID.

Participation: Submit responses in real-time before the timer expires.

Review: View personal performance history and correct answers after a poll closes.

Poll Lifecycle
The system follows a strict state machine to manage the pedagogical flow:

Draft: Created in Firestore; visible only to the professor for editing.

Active: Pushed to Realtime DB; live for student responses with an active global timer.

Closed: Removed from Realtime DB; locked for submissions; analytics and exports generated.

Branching Strategy
This project follows a modular development workflow:

main: Stable, production-ready code.

develop: Integration branch for new features.

kalyani-feature: This branch represents the first iteration and initial working version of the project. It focused on creating a functional dashboard layout and basic structure to understand the overall flow of the application. It serves as the foundation for the service layer, helping to visualize the system and align the interface with client requirements before moving to advanced real-time features.

Installation and Setup
Clone and Install:

Bash
git clone https://github.com/your-repo/polling-system.git
npm install
Environment Configuration:
Create a .env.local file with your Firebase credentials:

Code snippet
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_realtime_db_url
Run Development:

Bash
npm run dev
Testing
The application includes a built-in testing utility at /test/db. This allows developers to:

Reset and initialize the Firestore schema.

Generate mock polls and student responses.

Monitor a live activity log for debugging Firebase transactions.