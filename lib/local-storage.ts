import type { KanbanCard, KanbanColumn, Tracker, TrackerEntry } from "./firestore";
import { DEFAULT_COLUMNS } from "./firestore";

const CARDS_KEY = "kanban-cards";
const COLUMNS_KEY = "kanban-columns";
const TRACKERS_KEY = "kanban-trackers";
const TRACKER_ENTRIES_KEY = "kanban-tracker-entries";

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
