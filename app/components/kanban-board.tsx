"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getCards, addCard, updateCard, deleteCard, type KanbanCard } from "@/lib/firestore";

const COLUMNS = [
  { id: "todo" as const, label: "To Do" },
  { id: "in-progress" as const, label: "In Progress" },
  { id: "done" as const, label: "Done" },
];

export default function KanbanBoard() {
  const { user } = useAuth();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadCards();
  }, [user]);

  async function loadCards() {
    if (!user) return;
    setLoading(true);
    const data = await getCards(user.uid);
    setCards(data);
    setLoading(false);
  }

  async function handleAddCard(column: KanbanCard["column"]) {
    if (!user || !newCardTitle.trim()) return;
    const colCards = cards.filter((c) => c.column === column);
    await addCard(user.uid, newCardTitle.trim(), column, colCards.length);
    setNewCardTitle("");
    setAddingTo(null);
    await loadCards();
  }

  async function handleMoveCard(cardId: string, newColumn: KanbanCard["column"]) {
    await updateCard(cardId, { column: newColumn });
    await loadCards();
  }

  async function handleDeleteCard(cardId: string) {
    await deleteCard(cardId);
    await loadCards();
  }

  if (loading) {
    return <div className="board-loading">Loading board...</div>;
  }

  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const colCards = cards.filter((c) => c.column === col.id);
        return (
          <div key={col.id} className="column">
            <div className="column-header">
              <h2>{col.label}</h2>
              <span className="card-count">{colCards.length}</span>
            </div>
            <div className="card-list">
              {colCards.map((card) => (
                <div key={card.id} className="card">
                  <div className="card-title">{card.title}</div>
                  <div className="card-actions">
                    {col.id !== "todo" && (
                      <button
                        onClick={() => handleMoveCard(card.id, col.id === "done" ? "in-progress" : "todo")}
                        title="Move left"
                      >
                        ←
                      </button>
                    )}
                    {col.id !== "done" && (
                      <button
                        onClick={() => handleMoveCard(card.id, col.id === "todo" ? "in-progress" : "done")}
                        title="Move right"
                      >
                        →
                      </button>
                    )}
                    <button onClick={() => handleDeleteCard(card.id)} title="Delete" className="delete-btn">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {addingTo === col.id ? (
              <form
                className="add-card-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCard(col.id);
                }}
              >
                <input
                  autoFocus
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Card title..."
                />
                <div className="add-card-btns">
                  <button type="submit">Add</button>
                  <button type="button" onClick={() => { setAddingTo(null); setNewCardTitle(""); }}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button className="add-card-btn" onClick={() => setAddingTo(col.id)}>
                + Add card
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
