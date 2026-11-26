"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import LoginButton from "./components/login-button";
import GuestButton from "./components/guest-button";
import Header from "./components/header";
import KanbanBoard from "./components/kanban-board";
import TrackerView from "./components/tracker-view";
import ExpensesView from "./components/expenses-view";
import InventoryView from "./components/inventory-view";

type Tab = "board" | "trackers" | "expenses" | "inventory";

export default function Home() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("board");

  if (loading) {
    return (
      <div className="center-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="center-screen">
        <div className="login-card">
          <h1>Dashboard</h1>
          <p>Sign in to manage your tasks and trackers</p>
          <LoginButton />
          <GuestButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <nav className="tab-bar">
        <button className={`tab-btn ${tab === "board" ? "tab-active" : ""}`} onClick={() => setTab("board")}>
          Board
        </button>
        <button className={`tab-btn ${tab === "trackers" ? "tab-active" : ""}`} onClick={() => setTab("trackers")}>
          Trackers
        </button>
        <button className={`tab-btn ${tab === "expenses" ? "tab-active" : ""}`} onClick={() => setTab("expenses")}>
          Expenses
        </button>
        <button className={`tab-btn ${tab === "inventory" ? "tab-active" : ""}`} onClick={() => setTab("inventory")}>
          Inventory
        </button>
      </nav>
      <main>
        {tab === "board" && <KanbanBoard />}
        {tab === "trackers" && <TrackerView />}
        {tab === "expenses" && <ExpensesView />}
        {tab === "inventory" && <InventoryView />}
      </main>
    </>
  );
}
