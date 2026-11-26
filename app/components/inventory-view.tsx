"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
  type InventoryItem,
} from "@/lib/firestore";
import {
  getInventoryLocal, addInventoryItemLocal, updateInventoryItemLocal, deleteInventoryItemLocal,
} from "@/lib/local-storage";
import { reportFirestoreError } from "./firestore-error-toast";

const INVENTORY_ICONS = ["🗑️", "🧻", "🧽", "🧴", "👕", "🧦", "🧤", "🛁", "🧹", "🧊", "💡", "🔋", "📦", "🧈", "☕"];
const DEFAULT_UNITS = ["szt", "rolek", "worków", "opakowań", "par", "butelek"];

export default function InventoryView() {
  const { user, isGuest } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("0");
  const [newUnit, setNewUnit] = useState(DEFAULT_UNITS[0]);
  const [newIcon, setNewIcon] = useState(INVENTORY_ICONS[0]);
  const [newThreshold, setNewThreshold] = useState("3");

  const store = isGuest
    ? { get: getInventoryLocal, add: addInventoryItemLocal, update: updateInventoryItemLocal, remove: deleteInventoryItemLocal }
    : { get: getInventory, add: addInventoryItem, update: updateInventoryItem, remove: deleteInventoryItem };

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user]);

  async function loadItems() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await store.get(user.uid);
      setItems(data);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      reportFirestoreError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!user || !newName.trim()) return;
    await store.add(user.uid, newName.trim(), parseInt(newQty) || 0, newUnit, newIcon, parseInt(newThreshold) || 3);
    setNewName("");
    setNewQty("0");
    setNewThreshold("3");
    setAdding(false);
    await loadItems();
  }

  async function handleQuantityChange(item: InventoryItem, delta: number) {
    const next = Math.max(0, item.quantity + delta);
    await store.update(item.id, { quantity: next });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: next } : i));
  }

  async function handleDelete(id: string) {
    await store.remove(id);
    await loadItems();
  }

  if (loading) return <div className="board-loading">Loading inventory...</div>;

  const lowItems = items.filter((i) => i.quantity <= i.lowThreshold);

  return (
    <div className="inventory-view">
      <div className="board-toolbar">
        <h2 className="tracker-title">Inventory</h2>
        <button className="toolbar-btn" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "+ Add Item"}
        </button>
      </div>

      {lowItems.length > 0 && (
        <div className="inventory-alert">
          <span className="inventory-alert-icon">⚠️</span>
          <span>Low stock: {lowItems.map((i) => `${i.icon} ${i.name} (${i.quantity})`).join(", ")}</span>
        </div>
      )}

      {adding && (
        <form className="tracker-add-form" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <div className="icon-picker">
            {INVENTORY_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`icon-btn ${newIcon === ic ? "icon-active" : ""}`}
                onClick={() => setNewIcon(ic)}
              >
                {ic}
              </button>
            ))}
          </div>
          <div className="expense-form-row">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nazwa (np. Worki na śmieci)"
              className="tracker-input"
            />
          </div>
          <div className="expense-form-row">
            <input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Ilość"
              className="expense-amount-input"
              min="0"
            />
            <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="expense-select">
              {DEFAULT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input
              type="number"
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
              placeholder="Alert gdy ≤"
              className="expense-amount-input"
              min="0"
            />
          </div>
          <button type="submit" className="toolbar-btn" style={{ marginTop: "0.5rem" }}>Add</button>
        </form>
      )}

      {items.length === 0 && !adding && (
        <div className="tracker-empty">
          No items yet. Add items to track your household supplies.
        </div>
      )}

      <div className="inventory-grid">
        {items.map((item) => {
          const isLow = item.quantity <= item.lowThreshold;
          return (
            <div key={item.id} className={`inventory-card ${isLow ? "inventory-low" : ""}`}>
              <div className="tracker-card-header">
                <span className="tracker-icon">{item.icon}</span>
                <span className="tracker-label">{item.name}</span>
                <button className="tracker-delete" onClick={() => handleDelete(item.id)} title="Delete">×</button>
              </div>
              <div className="tracker-counter">
                <button className="counter-btn" onClick={() => handleQuantityChange(item, -1)} disabled={item.quantity <= 0}>
                  −
                </button>
                <span className={`counter-value ${isLow ? "counter-low" : ""}`}>{item.quantity}</span>
                <button className="counter-btn counter-plus" onClick={() => handleQuantityChange(item, 1)}>
                  +
                </button>
              </div>
              <div className="inventory-unit">{item.unit}</div>
              {isLow && <div className="inventory-low-badge">Low stock!</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
