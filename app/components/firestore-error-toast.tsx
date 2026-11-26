"use client";

import { useEffect, useState } from "react";

interface ErrorEntry {
  id: number;
  message: string;
  link: string | null;
}

let nextId = 0;
const listeners = new Set<(e: ErrorEntry) => void>();

export function reportFirestoreError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const linkMatch = msg.match(/(https:\/\/console\.firebase\.google\.com\S+)/);
  const entry: ErrorEntry = { id: nextId++, message: msg, link: linkMatch ? linkMatch[1] : null };
  listeners.forEach((fn) => fn(entry));
}

export default function FirestoreErrorToast() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);

  useEffect(() => {
    const handler = (e: ErrorEntry) => {
      setErrors((prev) => {
        if (prev.some((x) => x.message === e.message)) return prev;
        return [...prev, e];
      });
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className="firestore-toast-container">
      {errors.map((e) => (
        <div key={e.id} className="firestore-toast">
          <button className="firestore-toast-close" onClick={() => setErrors((prev) => prev.filter((x) => x.id !== e.id))}>×</button>
          <div className="firestore-toast-msg">{e.message.slice(0, 200)}</div>
          {e.link && (
            <a href={e.link} target="_blank" rel="noopener noreferrer" className="firestore-toast-link">
              👉 Create Index
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
