import type { KanbanCard } from "./firestore";

const STORAGE_KEY = "kanban-cards";

function readCards(): KanbanCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCards(cards: KanbanCard[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {}
}

export async function getCardsLocal(userId: string): Promise<KanbanCard[]> {
  return readCards()
    .filter((c) => c.userId === userId)
    .sort((a, b) => a.order - b.order);
}

export async function addCardLocal(
  userId: string,
  title: string,
  column: KanbanCard["column"] = "todo",
  order: number = 0
): Promise<string> {
  const cards = readCards();
  const id = crypto.randomUUID();
  const now = Date.now() as unknown as KanbanCard["createdAt"];
  cards.push({ id, title, description: "", column, order, userId, createdAt: now, updatedAt: now });
  writeCards(cards);
  return id;
}

export async function updateCardLocal(
  cardId: string,
  data: Partial<Pick<KanbanCard, "title" | "description" | "column" | "order">>
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
