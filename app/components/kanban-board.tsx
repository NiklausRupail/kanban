"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getCards, addCard, updateCard, deleteCard,
  getColumns, saveColumns,
  DEFAULT_COLUMNS,
  type KanbanCard, type KanbanColumn, type Priority,
} from "@/lib/firestore";
import {
  getCardsLocal, addCardLocal, updateCardLocal, deleteCardLocal,
  getColumnsLocal, saveColumnsLocal,
} from "@/lib/local-storage";
import Summary from "./summary";

const PRIORITY_LABELS: Record<Priority, string> = { low: "Low", medium: "Med", high: "High" };
const PRIORITY_OPTIONS: Priority[] = ["low", "medium", "high"];

export default function KanbanBoard() {
  const { user, isGuest } = useAuth();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardPriority, setNewCardPriority] = useState<Priority>("medium");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editingColumns, setEditingColumns] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const cardStore = isGuest
    ? { get: getCardsLocal, add: addCardLocal, update: updateCardLocal, remove: deleteCardLocal }
    : { get: getCards, add: addCard, update: updateCard, remove: deleteCard };

  const colStore = isGuest
    ? { get: getColumnsLocal, save: saveColumnsLocal }
    : { get: getColumns, save: saveColumns };

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    const [cols, data] = await Promise.all([colStore.get(user.uid), cardStore.get(user.uid)]);
    setColumns(cols);
    setCards(data);
    setLoading(false);
  }

  async function handleAddCard(column: string) {
    if (!user || !newCardTitle.trim()) return;
    const colCards = cards.filter((c) => c.column === column);
    await cardStore.add(user.uid, newCardTitle.trim(), column, colCards.length, newCardPriority);
    setNewCardTitle("");
    setNewCardPriority("medium");
    setAddingTo(null);
    await loadAll();
  }

  async function handleMoveCard(cardId: string, newColumn: string) {
    await cardStore.update(cardId, { column: newColumn });
    await loadAll();
  }

  async function handleDeleteCard(cardId: string) {
    await cardStore.remove(cardId);
    await loadAll();
  }

  async function handlePriorityChange(cardId: string, priority: Priority) {
    await cardStore.update(cardId, { priority });
    await loadAll();
  }

  async function handleAddColumn() {
    if (!user || !newColName.trim()) return;
    const id = newColName.trim().toLowerCase().replace(/\s+/g, "-");
    if (columns.some((c) => c.id === id)) return;
    const updated = [...columns, { id, label: newColName.trim(), order: columns.length }];
    setColumns(updated);
    await colStore.save(user.uid, updated);
    setNewColName("");
  }

  async function handleDeleteColumn(colId: string) {
    if (!user || columns.length <= 1) return;
    const updated = columns.filter((c) => c.id !== colId).map((c, i) => ({ ...c, order: i }));
    setColumns(updated);
    await colStore.save(user.uid, updated);
  }

  async function handleRenameColumn(colId: string, newLabel: string) {
    if (!user) return;
    const updated = columns.map((c) => (c.id === colId ? { ...c, label: newLabel } : c));
    setColumns(updated);
    await colStore.save(user.uid, updated);
  }

  if (loading) {
    return <div className="board-loading">Loading board...</div>;
  }

  if (showSummary) {
    return <Summary cards={cards} columns={columns} onBack={() => setShowSummary(false)} />;
  }

  return (
    <div>
      <div className="board-toolbar">
        <button className="toolbar-btn" onClick={() => setShowSummary(true)}>Summary</button>
        <button className="toolbar-btn" onClick={() => setEditingColumns(!editingColumns)}>
          {editingColumns ? "Done" : "Edit Columns"}
        </button>
      </div>

      {editingColumns && (
        <div className="column-editor">
          <div className="column-editor-list">
            {columns.map((col) => (
              <div key={col.id} className="column-editor-item">
                <input
                  value={col.label}
                  onChange={(e) => handleRenameColumn(col.id, e.target.value)}
                  className="col-rename-input"
                />
                <button
                  onClick={() => handleDeleteColumn(col.id)}
                  disabled={columns.length <= 1}
                  className="col-delete-btn"
                  title="Remove column"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <form
            className="column-editor-add"
            onSubmit={(e) => { e.preventDefault(); handleAddColumn(); }}
          >
            <input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="New column name..."
              className="col-rename-input"
            />
            <button type="submit" className="toolbar-btn">Add</button>
          </form>
        </div>
      )}

      <div className="board" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((col, colIdx) => {
          const colCards = cards.filter((c) => c.column === col.id);
          return (
            <div key={col.id} className="column">
              <div className="column-header">
                <h2>{col.label}</h2>
                <span className="card-count">{colCards.length}</span>
              </div>
              <div className="card-list">
                {colCards.map((card) => (
                  <div key={card.id} className={`card priority-${card.priority || "medium"}`}>
                    <div className="card-body">
                      <div className="card-title">{card.title}</div>
                      <div className="card-meta">
                        <select
                          value={card.priority || "medium"}
                          onChange={(e) => handlePriorityChange(card.id, e.target.value as Priority)}
                          className="priority-select"
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="card-actions">
                      {colIdx > 0 && (
                        <button
                          onClick={() => handleMoveCard(card.id, columns[colIdx - 1].id)}
                          title={`Move to ${columns[colIdx - 1].label}`}
                        >
                          ←
                        </button>
                      )}
                      {colIdx < columns.length - 1 && (
                        <button
                          onClick={() => handleMoveCard(card.id, columns[colIdx + 1].id)}
                          title={`Move to ${columns[colIdx + 1].label}`}
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
                  onSubmit={(e) => { e.preventDefault(); handleAddCard(col.id); }}
                >
                  <input
                    autoFocus
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="Card title..."
                  />
                  <div className="add-card-row">
                    <select
                      value={newCardPriority}
                      onChange={(e) => setNewCardPriority(e.target.value as Priority)}
                      className="priority-select"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                      ))}
                    </select>
                    <div className="add-card-btns">
                      <button type="submit">Add</button>
                      <button type="button" onClick={() => { setAddingTo(null); setNewCardTitle(""); }}>
                        Cancel
                      </button>
                    </div>
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
    </div>
  );
}
