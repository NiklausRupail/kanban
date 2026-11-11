import type { KanbanCard, KanbanColumn } from "./firestore";
import { DEFAULT_COLUMNS } from "./firestore";

const CARDS_KEY = "kanban-cards";
const COLUMNS_KEY = "kanban-columns";

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
  cards.push({ id, title, description: "", column, priority, order, userId, createdAt: now, updatedAt: now });
  writeCards(cards);
  return id;
}

export async function updateCardLocal(
  cardId: string,
  data: Partial<Pick<KanbanCard, "title" | "description" | "column" | "order" | "priority">>
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
