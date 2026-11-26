import type { KanbanCard, KanbanColumn, Tracker, TrackerEntry, Expense, InventoryItem } from "./firestore";
import { DEFAULT_COLUMNS } from "./firestore";

const CARDS_KEY = "kanban-cards";
const COLUMNS_KEY = "kanban-columns";
const TRACKERS_KEY = "kanban-trackers";
const TRACKER_ENTRIES_KEY = "kanban-tracker-entries";
const EXPENSES_KEY = "kanban-expenses";
const INVENTORY_KEY = "kanban-inventory";

function readCards(): KanbanCard[] {
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCards(cards: KanbanCard[]) {
  try {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  } catch {}
}

// Columns
export async function getColumnsLocal(_userId: string): Promise<KanbanColumn[]> {
  try {
    const raw = localStorage.getItem(COLUMNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_COLUMNS;
}

export async function saveColumnsLocal(_userId: string, columns: KanbanColumn[]) {
  try {
    localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
  } catch {}
}

// Cards
export async function getCardsLocal(userId: string): Promise<KanbanCard[]> {
  return readCards()
    .filter((c) => c.userId === userId)
    .sort((a, b) => a.order - b.order);
}

export async function addCardLocal(
  userId: string,
  title: string,
  column: string = "todo",
  order: number = 0,
  priority: "low" | "medium" | "high" = "medium"
): Promise<string> {
  const cards = readCards();
  const id = crypto.randomUUID();
  const now = Date.now() as unknown as KanbanCard["createdAt"];
  cards.push({ id, title, description: "", column, priority, subtasks: [], order, userId, createdAt: now, updatedAt: now });
  writeCards(cards);
  return id;
}

export async function updateCardLocal(
  cardId: string,
  data: Partial<Pick<KanbanCard, "title" | "description" | "column" | "order" | "priority" | "subtasks">>
) {
  const cards = readCards();
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx !== -1) {
    cards[idx] = { ...cards[idx], ...data, updatedAt: Date.now() as unknown as KanbanCard["updatedAt"] };
    writeCards(cards);
  }
}

export async function deleteCardLocal(cardId: string) {
  writeCards(readCards().filter((c) => c.id !== cardId));
}

// Trackers
function readTrackers(): Tracker[] {
  try {
    const raw = localStorage.getItem(TRACKERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeTrackers(trackers: Tracker[]) {
  try {
    localStorage.setItem(TRACKERS_KEY, JSON.stringify(trackers));
  } catch {}
}

function readEntries(): TrackerEntry[] {
  try {
    const raw = localStorage.getItem(TRACKER_ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: TrackerEntry[]) {
  try {
    localStorage.setItem(TRACKER_ENTRIES_KEY, JSON.stringify(entries));
  } catch {}
}

export async function getTrackersLocal(userId: string): Promise<Tracker[]> {
  return readTrackers()
    .filter((t) => t.userId === userId)
    .sort((a, b) => a.order - b.order);
}

export async function addTrackerLocal(userId: string, label: string, icon: string, order: number): Promise<string> {
  const trackers = readTrackers();
  const id = crypto.randomUUID();
  const now = Date.now() as unknown as Tracker["createdAt"];
  trackers.push({ id, label, icon, userId, order, createdAt: now });
  writeTrackers(trackers);
  return id;
}

export async function deleteTrackerLocal(trackerId: string) {
  writeTrackers(readTrackers().filter((t) => t.id !== trackerId));
  writeEntries(readEntries().filter((e) => e.trackerId !== trackerId));
}

export async function getTrackerEntriesLocal(_userId: string, trackerId: string): Promise<TrackerEntry[]> {
  return readEntries()
    .filter((e) => e.trackerId === trackerId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function upsertTrackerEntryLocal(userId: string, trackerId: string, date: string, count: number) {
  const entries = readEntries();
  const idx = entries.findIndex((e) => e.trackerId === trackerId && e.date === date && e.userId === userId);
  if (idx !== -1) {
    entries[idx].count = count;
  } else {
    entries.push({ id: crypto.randomUUID(), trackerId, count, date, userId });
  }
  writeEntries(entries);
}

export async function getAllTrackerEntriesLocal(userId: string): Promise<TrackerEntry[]> {
  return readEntries()
    .filter((e) => e.userId === userId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Expenses
function readExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeExpenses(expenses: Expense[]) {
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  } catch {}
}

export async function getExpensesLocal(userId: string, month?: string): Promise<Expense[]> {
  let all = readExpenses()
    .filter((e) => e.userId === userId)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (month) all = all.filter((e) => e.date.startsWith(month));
  return all;
}

export async function addExpenseLocal(
  userId: string,
  amount: number,
  category: string,
  subcategory: string,
  description: string,
  date: string
): Promise<string> {
  const expenses = readExpenses();
  const id = crypto.randomUUID();
  const now = Date.now() as unknown as Expense["createdAt"];
  expenses.push({ id, userId, amount, category, subcategory, description, date, createdAt: now });
  writeExpenses(expenses);
  return id;
}

export async function deleteExpenseLocal(expenseId: string) {
  writeExpenses(readExpenses().filter((e) => e.id !== expenseId));
}

// Inventory
function readInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeInventory(items: InventoryItem[]) {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
  } catch {}
}

export async function getInventoryLocal(userId: string): Promise<InventoryItem[]> {
  return readInventory().filter((i) => i.userId === userId);
}

export async function addInventoryItemLocal(
  userId: string,
  name: string,
  quantity: number,
  unit: string,
  icon: string,
  lowThreshold: number
): Promise<string> {
  const items = readInventory();
  const id = crypto.randomUUID();
  const now = Date.now() as unknown as InventoryItem["updatedAt"];
  items.push({ id, userId, name, quantity, unit, icon, lowThreshold, updatedAt: now });
  writeInventory(items);
  return id;
}

export async function updateInventoryItemLocal(
  itemId: string,
  data: Partial<Pick<InventoryItem, "name" | "quantity" | "unit" | "icon" | "lowThreshold">>
) {
  const items = readInventory();
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updatedAt: Date.now() as unknown as InventoryItem["updatedAt"] };
    writeInventory(items);
  }
}

export async function deleteInventoryItemLocal(itemId: string) {
  writeInventory(readInventory().filter((i) => i.id !== itemId));
}
