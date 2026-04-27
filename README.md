![Vercel Deploy](https://deploy-badge.vercel.app/vercel/class-n-gazer?style=for-the-badge)

<p align="center">
  <img src="/public/favicon.svg" alt="ClassNGazer Logo" width="120"/>
</p>

<h1 align="center">ClassNGazer</h1>
<h4 align="center">Keep your Class's Gaze Steady</h4>

---

## Overview

ClassNGazer is a web-based classroom engagement platform built for faculty members. It lets you create and manage live polls for your class — right in the middle of a lecture or prepared in advance — and review student responses at any time afterward. Poll options support LaTeX rendering, so mathematical expressions display correctly.

---

## Tech Stack

- **Frontend** — Next.js with TypeScript/JavaScript and Tailwind CSS
- **Backend** — Node.js with Firebase (Authentication, Firestore, Storage)

---

## Getting Started

Follow the setup instructions for your operating system below. Each section walks you through every step from scratch — no prior experience assumed.

---

## Setting Up Environment Variables

The app needs a file called `.env.local` in the root of the `ClassNGazer` folder. This file holds private keys that connect the app to Firebase (the database and login system) and Cloudinary (image uploads). **You must create this file yourself** — it is never committed to the repository for security reasons.

### Step A — Create the file

Inside the `ClassNGazer` folder, create a new plain-text file and name it exactly `.env.local` (the dot at the beginning is required). The folder should look like this afterwards:

```
ClassNGazer/
├── app/
├── public/
├── .env.local   ← this is the file you are creating
└── ...
```

> **Windows users:** File Explorer hides files that start with a dot by default. If you cannot see `.env.local` after creating it, go to **View -> Show -> Hidden items** in File Explorer.

### Step B — Paste in the variables

Open `.env.local` in any text editor (Notepad, TextEdit, VS Code, etc.) and paste the following, filling in the values as described in the table below:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_value_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_value_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_value_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_value_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_value_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_value_here
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_value_here
CLOUDINARY_CLOUD_NAME=your_value_here
CLOUDINARY_API_KEY=your_value_here
CLOUDINARY_API_SECRET=your_value_here
```

### Step C — Where to get each value

#### Firebase variables (`NEXT_PUBLIC_FIREBASE_*`)

All seven Firebase values come from the same place — your Firebase project's settings page.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in.
2. Open your project (or create one if you have not already).
3. Click the **gear icon ⚙** next to *Project Overview* -> **Project settings**.
4. Scroll down to the **Your apps** section and click on the web app (`</>`). If no web app exists yet, click **Add app -> Web**, give it a name, and register it.
5. You will see a code block labelled `firebaseConfig`. Copy the values from it into your `.env.local` as shown below:

| Variable | Where it appears in `firebaseConfig` |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | `databaseURL` (only visible if you have enabled Realtime Database) |

> To find `databaseURL`: in the Firebase Console, go to **Build -> Realtime Database**. The URL is displayed at the top of the page and looks like `https://your-project-default-rtdb.region.firebasedatabase.app`.

#### Cloudinary variables (`CLOUDINARY_*`)

The three Cloudinary values come from your Cloudinary dashboard.

1. Go to [cloudinary.com](https://cloudinary.com) and sign in (or create a free account).
2. On the **Dashboard** home page, you will see your **Product Environment Credentials** card.
3. Copy the values as shown below:

| Variable | Label on Cloudinary dashboard |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | **Cloud name** |
| `CLOUDINARY_API_KEY` | **API key** |
| `CLOUDINARY_API_SECRET` | **API secret** (click the eye icon to reveal it) |

> Keep these values private. Never share `.env.local` or commit it to Git.

---

## Windows

### Step 1 — Install Git

> **Git** is a tool that lets you download ("clone") code from the internet onto your computer.

Download and install Git from [git-scm.com/download/win](https://git-scm.com/download/win). When the installer opens, click **Next** through all the screens and keep the default options — they work fine.

After installing, open a new **Command Prompt** or **PowerShell** window (search for either in the Start Menu) and verify:

```bash
git --version
```

> You should see something like `git version 2.x.x`. If you get an error saying the command is not found, close and reopen the terminal and try again.

### Step 2 — Install Node.js and npm

> **Node.js** is the engine that runs the app on your computer. **npm** (Node Package Manager) comes bundled with it and is used to install the app's code libraries.

Download the **LTS** installer from [nodejs.org](https://nodejs.org) and run it. Keep all default options during installation.

After installing, open a **new** Command Prompt or PowerShell window and verify:

```bash
node --version
npm --version
```

> You should see `v22.x.x` for Node and `10.x.x` for npm. Always open a new terminal after installing software so it picks up the changes.

### Step 3 — Clone the repository

> "Cloning" means downloading a copy of the project code to your computer.

```bash
git clone https://github.com/DTG2005/ClassNGazer.git
cd ClassNGazer
```

> The second command (`cd ClassNGazer`) moves you into the downloaded folder. All the following commands must be run from inside this folder.

### Step 4 — Set up the environment file

Follow the **[Setting Up Environment Variables](#setting-up-environment-variables)** section at the top of this guide to create and populate `.env.local` inside the `ClassNGazer` folder before continuing.

### Step 5 — Install project dependencies

```bash
npm install
```

> This downloads all the code libraries the app depends on. It may take a minute or two — that is normal.

### Step 6 — Start the app

```bash
npm run dev
```

> The terminal will show a link like `http://localhost:3000`. Hold **Ctrl** and click it, or open your browser and type that address into the address bar. The app will load.

---

## macOS

### Step 1 — Install Homebrew (skip if already installed)

> **Homebrew** is a package manager for macOS — a tool that makes installing developer software much easier than doing it manually.

Open **Terminal** (search for it in Spotlight with ⌘ + Space) and run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

> The installer may ask for your Mac's login password and may install Xcode Command Line Tools — allow both. This is safe and expected.

Verify Homebrew installed correctly:

```bash
brew --version
```

> **Apple Silicon Macs (M1/M2/M3/M4):** If the `brew` command is not found after installation, run the following two lines to add it to your system path:
>
> ```bash
> echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
> eval "$(/opt/homebrew/bin/brew shellenv)"
> ```

### Step 2 — Install Git and Node.js

> npm is bundled with Node.js, so one command installs both.

```bash
brew install git node@22
brew link --overwrite node@22
```

Verify everything installed correctly:

```bash
git --version
node --version
npm --version
```

> You should see `git version 2.x.x`, `v22.x.x`, and `10.x.x` respectively.

### Step 3 — Clone the repository

```bash
git clone https://github.com/DTG2005/ClassNGazer.git
cd ClassNGazer
```

> The `cd ClassNGazer` command moves you into the project folder. All following commands must be run from inside here.

### Step 4 — Set up the environment file

Follow the **[Setting Up Environment Variables](#setting-up-environment-variables)** section at the top of this guide to create and populate `.env.local` inside the `ClassNGazer` folder before continuing.

### Step 5 — Install project dependencies

```bash
npm install
```

> This may take a minute. You will see a lot of text scroll by — that is normal.

### Step 6 — Start the app

```bash
npm run dev
```

> The terminal will display a link like `http://localhost:3000`. Click it or paste it into your browser's address bar to open the app.

---

## Linux

### Step 1 — Install Git, Node.js, and npm

**Ubuntu / Debian:**

```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y git nodejs
```

**Fedora / RHEL / CentOS:**

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y git nodejs
```

**Arch Linux / Manjaro:**

```bash
sudo pacman -Syu git nodejs npm
```

Verify everything installed correctly:

```bash
git --version
node --version
npm --version
```

> You should see `v22.x.x` for Node and `10.x.x` for npm. If the Node version is lower, see the troubleshooting section at the bottom of this page.

### Step 2 — Clone the repository

```bash
git clone https://github.com/DTG2005/ClassNGazer.git
cd ClassNGazer
```

> `cd ClassNGazer` moves you into the project folder. All commands from here on must be run from inside it.

### Step 3 — Set up the environment file

Follow the **[Setting Up Environment Variables](#setting-up-environment-variables)** section at the top of this guide to create and populate `.env.local` inside the `ClassNGazer` folder before continuing.

### Step 4 — Install project dependencies

```bash
npm install
```

### Step 5 — Start the app

```bash
npm run dev
```

> Open your browser and go to **http://localhost:3000** to use the app.

---

## Switching Branches

If you want to explore a specific feature or an older version of the app, you can switch to a different branch after cloning:

```bash
git checkout <branch-name>
```

> Replace `<branch-name>` with the actual name of the branch, for example `git checkout dev`.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| Firebase errors or a blank white screen on startup | Make sure `.env.local` is inside the `ClassNGazer` folder and is named correctly (with the dot at the start). |
| `npm: command not found` | Node.js did not install correctly. Revisit Step 1/2 for your OS. On Windows, make sure to open a **new** terminal after installing. |
| Port 3000 is already in use | Run `npm run dev -- -p 3001` to use port 3001 instead, then open `http://localhost:3001`. |
| `Module not found` errors after pulling new changes | Run `npm install` again — new libraries may have been added. |
| Node version is too old (below v22) | Install `nvm` (Node Version Manager) and run `nvm install 22 && nvm use 22`. |
| Windows: `'next' is not recognized` | Make sure you ran `npm install` first. If the error persists, try `npx next dev` instead. |
| Permission errors on macOS or Linux | Do **not** run `npm install` with `sudo`. Instead, fix your npm permissions — see the [official npm guide](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally). |
