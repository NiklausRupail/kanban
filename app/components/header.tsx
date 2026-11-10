"use client";

import { useAuth } from "@/lib/auth-context";

export default function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="header">
      <h1>Kanban Board</h1>
      <div className="header-user">
        {user.photoURL && (
          <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
        )}
        <span>{user.displayName}</span>
        <button onClick={logout} className="logout-btn">Sign out</button>
      </div>
    </header>
  );
}
