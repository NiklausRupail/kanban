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

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  subcategory: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: Timestamp;
}

export interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  icon: string;
  lowThreshold: number;
  updatedAt: Timestamp;
}

export interface ExpenseCategory {
  name: string;
  subcategories: string[];
}

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { name: "Jedzenie", subcategories: ["Jedzenie dom", "Jedzenie miasto", "Jedzenie praca", "Alkohol", "Inne"] },
  { name: "Kobiety Dragi Lasery", subcategories: ["Dupy", "Wkłady liquidy Worki", "Mieszkanie", "Prąd", "Internet", "Gaz"] },
  { name: "Transport", subcategories: ["Paliwo do auta", "Przeglądy i naprawy auta", "Wyposażenie dodatkowe", "Myjnia", "Bilet komunikacji miejskiej", "Hulajnoga", "Taxi", "Inne"] },
  { name: "Rozrywka i Edukacja", subcategories: ["Gry", "Hobby", "Hotele wyjazdy", "Kursy i Certyfikaty", "Polibuda"] },
  { name: "Zdrowie i Higiena", subcategories: ["Lekarz", "Badania", "Lekarstwa", "Fryzjer", "Inne"] },
  { name: "Ubranie", subcategories: ["Ubranie zwykłe", "Ubranie sportowe", "Buty", "Dodatki", "Inne"] },
  { name: "Edukacja", subcategories: ["Certyfikaty i kursy", "Wpłaty za semestr", "Inne"] },
  { name: "Rozrywka", subcategories: ["Koncerty", "Hobby", "Hotel / Turystyka", "Inne"] },
  { name: "Inne wydatki", subcategories: ["Dobroczynność", "Prezenty", "Sprzęt RTV", "Oprogramowanie", "Podatki", "Inne"] },
  { name: "Spłata długów", subcategories: ["Kredyt hipoteczny", "Kredyt konsumpcyjny", "Pożyczka osobista", "Inne"] },
  { name: "Budowanie oszczędności", subcategories: ["Fundusz awaryjny", "Fundusz wydatków nieregularnych", "Poduszka finansowa", "Konto emerytalne IKE/IKZE", "Nadpłata długów", "Fundusz: wakacje", "Fundusz: prezenty świąteczne", "Inne"] },
];

const CARDS_COLLECTION = "cards";
const COLUMNS_COLLECTION = "columns";
const TRACKERS_COLLECTION = "trackers";
const TRACKER_ENTRIES_COLLECTION = "tracker_entries";
const EXPENSES_COLLECTION = "expenses";
const INVENTORY_COLLECTION = "inventory";

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

// Expenses
export async function getExpenses(userId: string, month?: string): Promise<Expense[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, EXPENSES_COLLECTION),
    where("userId", "==", userId),
    orderBy("date")
  );
  const snapshot = await getDocs(q);
  const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
  if (month) return all.filter((e) => e.date.startsWith(month));
  return all;
}

export async function addExpense(
  userId: string,
  amount: number,
  category: string,
  subcategory: string,
  description: string,
  date: string
): Promise<string> {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, EXPENSES_COLLECTION), {
    userId,
    amount,
    category,
    subcategory,
    description,
    date,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteExpense(expenseId: string) {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, EXPENSES_COLLECTION, expenseId));
}

// Inventory
export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, INVENTORY_COLLECTION),
    where("userId", "==", userId),
    orderBy("updatedAt")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem);
}

export async function addInventoryItem(
  userId: string,
  name: string,
  quantity: number,
  unit: string,
  icon: string,
  lowThreshold: number
): Promise<string> {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, INVENTORY_COLLECTION), {
    userId,
    name,
    quantity,
    unit,
    icon,
    lowThreshold,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateInventoryItem(
  itemId: string,
  data: Partial<Pick<InventoryItem, "name" | "quantity" | "unit" | "icon" | "lowThreshold">>
) {
  const db = getFirebaseDb();
  await updateDoc(doc(db, INVENTORY_COLLECTION, itemId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInventoryItem(itemId: string) {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, INVENTORY_COLLECTION, itemId));
}
