import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const STATE_REF = doc(db, "app", "state");

const DEFAULT_STATE = {
  predictions: {},
  extraMembers: [],
  removedMembers: [],
  finalPrice: null,
  adminPin: "beach bagel"
};

// Read the full state document once
export async function loadAllState() {
  const snap = await getDoc(STATE_REF);
  if (snap.exists()) {
    return { ...DEFAULT_STATE, ...snap.data() };
  }
  // First time — write defaults and return them
  await setDoc(STATE_REF, DEFAULT_STATE);
  return DEFAULT_STATE;
}

// Merge fields into the state document
export async function updateState(fields) {
  await setDoc(STATE_REF, fields, { merge: true });
}

// Real-time listener — calls onChange whenever any field changes
export function subscribeToState(onChange) {
  return onSnapshot(STATE_REF, (snap) => {
    if (snap.exists()) {
      onChange({ ...DEFAULT_STATE, ...snap.data() });
    } else {
      // First time ever — create the default document, which triggers this listener again
      setDoc(STATE_REF, DEFAULT_STATE).catch(() => {
        // If write fails (permissions etc), still unblock the UI with defaults
        onChange(DEFAULT_STATE);
      });
    }
  });
}
