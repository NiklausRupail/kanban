import {
  collection,
  doc,
  getDocs,
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

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  column: "todo" | "in-progress" | "done";
  order: number;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const CARDS_COLLECTION = "cards";

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
  column: KanbanCard["column"] = "todo",
  order: number = 0
): Promise<string> {
  const db = getFirebaseDb();
  const ref = await addDoc(collection(db, CARDS_COLLECTION), {
    title,
    description: "",
    column,
    order,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCard(
  cardId: string,
  data: Partial<Pick<KanbanCard, "title" | "description" | "column" | "order">>
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
