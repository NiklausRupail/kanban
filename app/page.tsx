"use client";

import { useAuth } from "@/lib/auth-context";
import LoginButton from "./components/login-button";
import Header from "./components/header";
import KanbanBoard from "./components/kanban-board";

export default function Home() {
  const { user, loading } = useAuth();

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
          <h1>Kanban Board</h1>
          <p>Sign in to manage your tasks</p>
          <LoginButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main>
        <KanbanBoard />
      </main>
    </>
  );
}
