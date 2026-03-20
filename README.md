# Real-Time Classroom Polling System

A robust, full-stack web application built with Next.js and Firebase, designed to facilitate instant interaction between professors and students. This system allows for live questioning, real-time result visualization, and comprehensive data export for academic grading.

## Key Features

### For Professors
* **Dynamic Poll Creation:** Support for multiple-choice questions with single or multiple correct answers.
* **Live Orchestration:** Toggle polls between Draft, Active, and Closed states.
* **Blackboard Mode:** A dedicated presentation view for classroom projectors showing live results.
* **Analytics and Export:** Real-time correctness tracking and data export in CSV and JSON formats.

### For Students
* **Domain-Locked Security:** Access restricted to official @iiti.ac.in email addresses via Google OAuth.
* **Real-time Participation:** Instant UI updates when a poll goes live; no page refreshes required.
* **Personal Dashboard:** Track performance and participation history across different courses.

---

## System Architecture and Firebase Integration

The application utilizes a dual-database architecture to ensure both data integrity and sub-second latency.

* **Cloud Firestore:** Acts as the primary persistent storage for users, courses, and historical poll data.
* **Firebase Realtime Database:** Handles high-speed signaling for live polls, ensuring students see questions the millisecond a professor clicks Start.
* **Firebase Auth:** Manages secure, role-based sessions (Professor vs. Student) with IIT-I domain enforcement.

---

## User Roles and Tasks

### Professor Tasks
* **Authentication:** Sign in via Google (restricted to @iiti.ac.in).
* **Poll Authoring:** Create questions, set multiple correct options, and configure timers (10s to 300s).
* **Session Control:** Launch polls to the Realtime Database and monitor live results on the Blackboard view.
* **Data Management:** Close sessions and download student response data for grading.

### Student Tasks
* **Session Entry:** Join active polls using a unique Poll ID.
* **Participation:** Submit responses in real-time before the timer expires.
* **Review:** View personal performance history and correct answers after a poll closes.

---

## Poll Lifecycle

The system follows a strict state machine to manage the pedagogical flow:

1. **Draft:** Created in Firestore; visible only to the professor for editing.
2. **Active:** Pushed to Realtime Database; live for student responses with an active global timer.
3. **Closed:** Removed from Realtime Database; locked for submissions; analytics and exports generated.

---

## Installation and Setup

1. **Clone and Install:**
   ```bash
   git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
   cd your-repo-name
   npm install


