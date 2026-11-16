import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

export interface KanbanColumn {
  id: string;
  label: string;
  order: number;
}

export type Priority = "low" | "medium" | "high";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  column: string;
  priority: Priority;
  order: number;
  userId: string;
  subtasks: Subtask[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Tracker {
  id: string;
  label: string;
  icon: string;
  userId: string;
  order: number;
  createdAt: Timestamp;
}

export interface TrackerEntry {
  id: string;
  trackerId: string;
  count: number;
  date: string; // YYYY-MM-DD
  userId: string;
}

const CARDS_COLLECTION = "cards";
const COLUMNS_COLLECTION = "columns";
const TRACKERS_COLLECTION = "trackers";
const TRACKER_ENTRIES_COLLECTION = "tracker_entries";

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "todo", label: "To Do", order: 0 },
  { id: "in-progress", label: "In Progress", order: 1 },
  { id: "done", label: "Done", order: 2 },
];

// Columns
export async function getColumns(userId: string): Promise<KanbanColumn[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COLUMNS_COLLECTION),
    where("userId", "==", userId),
    orderBy("order")
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return DEFAULT_COLUMNS;
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as KanbanColumn);
}

export async function saveColumns(userId: string, columns: KanbanColumn[]) {
  const db = getFirebaseDb();
  const q = query(collection(db, COLUMNS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) await deleteDoc(d.ref);
  for (const col of columns) {
    await setDoc(doc(db, COLUMNS_COLLECTION, `${userId}_${col.id}`), {
      ...col,
      userId,
    });
  }
}

// Cards
export async function getCards(userId: string): Promise<KanbanCard[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, CARDS_COLLECTION),
    where("userId", "==", userId),
    orderBy("order")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as KanbanCard);
}

export async function addCard(
  userId: string,
  title: string,
  column: string = "todo",
  order: number = 0,
  priority: Priority = "medium"
): Promise<string> {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, CARDS_COLLECTION), {
    title,
    description: "",
    column,
    priority,
    subtasks: [],
    order,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCard(
  cardId: string,
  data: Partial<Pick<KanbanCard, "title" | "description" | "column" | "order" | "priority" | "subtasks">>
) {
  const db = getFirebaseDb();
  await updateDoc(doc(db, CARDS_COLLECTION, cardId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCard(cardId: string) {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, CARDS_COLLECTION, cardId));
}

// Trackers
export async function getTrackers(userId: string): Promise<Tracker[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TRACKERS_COLLECTION),
    where("userId", "==", userId),
    orderBy("order")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Tracker);
}

export async function addTracker(userId: string, label: string, icon: string, order: number): Promise<string> {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, TRACKERS_COLLECTION), {
    label,
    icon,
    userId,
    order,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteTracker(trackerId: string) {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, TRACKERS_COLLECTION, trackerId));
}

// Tracker Entries
export async function getTrackerEntries(userId: string, trackerId: string): Promise<TrackerEntry[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TRACKER_ENTRIES_COLLECTION),
    where("userId", "==", userId),
    where("trackerId", "==", trackerId),
    orderBy("date")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TrackerEntry);
}

export async function upsertTrackerEntry(userId: string, trackerId: string, date: string, count: number) {
  const db = getFirebaseDb();
  const docId = `${userId}_${trackerId}_${date}`;
  await setDoc(doc(db, TRACKER_ENTRIES_COLLECTION, docId), {
    trackerId,
    count,
    date,
    userId,
  });
}

export async function getAllTrackerEntries(userId: string): Promise<TrackerEntry[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TRACKER_ENTRIES_COLLECTION),
    where("userId", "==", userId),
    orderBy("date")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TrackerEntry);
}
