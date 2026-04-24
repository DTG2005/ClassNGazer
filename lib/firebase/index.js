// Barrel export for lib/firebase
// The Addition pages import { auth, db } from 'lib/firebase'
// This re-exports everything from the existing init.js
export { db, realtimeDb, auth } from './init';
export { default } from './init';
