"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getExpenses, addExpense, deleteExpense,
  DEFAULT_EXPENSE_CATEGORIES,
  type Expense, type ExpenseCategory,
} from "@/lib/firestore";
import {
  getExpensesLocal, addExpenseLocal, deleteExpenseLocal,
} from "@/lib/local-storage";
import { reportFirestoreError } from "./firestore-error-toast";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  return today().slice(0, 7);
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function exportCSV(expenses: Expense[], categories: ExpenseCategory[], month: string) {
  const days = daysInMonth(month);
  const header = ["Kategoria", "Podkategoria", ...Array.from({ length: days }, (_, i) => String(i + 1)), "SUMA"];

  const rows: string[][] = [];
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      const row = [cat.name, sub];
      let total = 0;
      for (let d = 1; d <= days; d++) {
        const dateStr = `${month}-${String(d).padStart(2, "0")}`;
        const dayTotal = expenses
          .filter((e) => e.category === cat.name && e.subcategory === sub && e.date === dateStr)
          .reduce((sum, e) => sum + e.amount, 0);
        row.push(dayTotal ? dayTotal.toFixed(2) : "");
        total += dayTotal;
      }
      row.push(total ? total.toFixed(2) : "");
      rows.push(row);
    }
  }

  const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wydatki_${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExpensesView() {
  const { user, isGuest } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [showSummary, setShowSummary] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORIES[0].name);
  const [subcategory, setSubcategory] = useState(DEFAULT_EXPENSE_CATEGORIES[0].subcategories[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());

  const store = isGuest
    ? { get: getExpensesLocal, add: addExpenseLocal, remove: deleteExpenseLocal }
    : { get: getExpenses, add: addExpense, remove: deleteExpense };

  const activeCat = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.name === category);

  useEffect(() => {
    if (!user) return;
    loadExpenses();
  }, [user, month]);

  async function loadExpenses() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await store.get(user.uid, month);
      setExpenses(data);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      reportFirestoreError(err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!user || !amount) return;
    const num = parseFloat(amount.replace(",", "."));
    if (isNaN(num) || num <= 0) return;
    await store.add(user.uid, num, category, subcategory, description.trim(), date);
    setAmount("");
    setDescription("");
    setAdding(false);
    await loadExpenses();
  }

  async function handleDelete(id: string) {
    await store.remove(id);
    await loadExpenses();
  }

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    const c = DEFAULT_EXPENSE_CATEGORIES.find((x) => x.name === cat);
    if (c) setSubcategory(c.subcategories[0]);
  }

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  if (loading) return <div className="board-loading">Loading expenses...</div>;

  const totalMonth = expenses.reduce((s, e) => s + e.amount, 0);

  const categoryTotals = DEFAULT_EXPENSE_CATEGORIES.map((cat) => {
    const catExpenses = expenses.filter((e) => e.category === cat.name);
    const total = catExpenses.reduce((s, e) => s + e.amount, 0);
    const subs = cat.subcategories.map((sub) => ({
      name: sub,
      total: catExpenses.filter((e) => e.subcategory === sub).reduce((s, e) => s + e.amount, 0),
    }));
    return { ...cat, total, subs };
  }).filter((c) => c.total > 0 || showSummary);

  return (
    <div className="expenses-view">
      <div className="board-toolbar">
        <div className="month-nav">
          <button className="month-arrow" onClick={() => changeMonth(-1)}>←</button>
          <span className="month-label">{monthLabel(month)}</span>
          <button className="month-arrow" onClick={() => changeMonth(1)}>→</button>
        </div>
        <div className="expense-toolbar-right">
          <button className="toolbar-btn" onClick={() => setShowSummary(!showSummary)}>
            {showSummary ? "List" : "Summary"}
          </button>
          <button className="toolbar-btn" onClick={() => exportCSV(expenses, DEFAULT_EXPENSE_CATEGORIES, month)}>
            Export CSV
          </button>
          <button className="toolbar-btn" onClick={() => setAdding(!adding)}>
            {adding ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {adding && (
        <form className="expense-add-form" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <div className="expense-form-row">
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Kwota (zł)"
              className="expense-amount-input"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="expense-date-input"
            />
          </div>
          <div className="expense-form-row">
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="expense-select"
            >
              {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="expense-select"
            >
              {activeCat?.subcategories.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="expense-form-row">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opis (opcjonalnie)"
              className="expense-desc-input"
            />
            <button type="submit" className="toolbar-btn expense-submit">Add</button>
          </div>
        </form>
      )}

      <div className="expense-total-bar">
        <span>Wydatki w miesiącu</span>
        <span className="expense-total-amount">{totalMonth.toFixed(2)} zł</span>
      </div>

      {showSummary ? (
        <div className="expense-summary">
          {categoryTotals.map((cat) => (
            <div key={cat.name} className="expense-cat-card">
              <div className="expense-cat-header">
                <span className="expense-cat-name">{cat.name}</span>
                <span className="expense-cat-total">{cat.total.toFixed(2)} zł</span>
              </div>
              {cat.total > 0 && (
                <div className="expense-cat-bar">
                  <div
                    className="expense-cat-bar-fill"
                    style={{ width: `${totalMonth > 0 ? (cat.total / totalMonth) * 100 : 0}%` }}
                  />
                </div>
              )}
              {cat.subs.filter((s) => s.total > 0).map((sub) => (
                <div key={sub.name} className="expense-sub-row">
                  <span>{sub.name}</span>
                  <span>{sub.total.toFixed(2)} zł</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="expense-list">
          {expenses.length === 0 && (
            <div className="tracker-empty">Brak wydatków w tym miesiącu.</div>
          )}
          {[...expenses].reverse().map((exp) => (
            <div key={exp.id} className="expense-row">
              <div className="expense-row-left">
                <div className="expense-row-amount">{exp.amount.toFixed(2)} zł</div>
                <div className="expense-row-cat">
                  {exp.category} → {exp.subcategory}
                </div>
                {exp.description && <div className="expense-row-desc">{exp.description}</div>}
              </div>
              <div className="expense-row-right">
                <span className="expense-row-date">{exp.date.slice(8)}.{exp.date.slice(5, 7)}</span>
                <button className="expense-row-del" onClick={() => handleDelete(exp.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
