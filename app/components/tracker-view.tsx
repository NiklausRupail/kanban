"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getTrackers, addTracker, deleteTracker,
  getTrackerEntries, upsertTrackerEntry, getAllTrackerEntries,
  type Tracker, type TrackerEntry,
} from "@/lib/firestore";
import {
  getTrackersLocal, addTrackerLocal, deleteTrackerLocal,
  getTrackerEntriesLocal, upsertTrackerEntryLocal, getAllTrackerEntriesLocal,
} from "@/lib/local-storage";

const ICONS = ["🚬", "⚡", "☕", "🍺", "💊", "🏃", "💧", "🍔", "📖", "🎮"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function MiniChart({ entries, days }: { entries: TrackerEntry[]; days: string[] }) {
  const counts = days.map((d) => entries.find((e) => e.date === d)?.count || 0);
  const max = Math.max(...counts, 1);
  const barW = 24;
  const gap = 4;
  const chartH = 60;
  const w = days.length * (barW + gap);

  return (
    <svg viewBox={`0 0 ${w} ${chartH + 18}`} className="mini-chart">
      {days.map((day, i) => {
        const h = (counts[i] / max) * chartH;
        const x = i * (barW + gap);
        return (
          <g key={day}>
            <rect x={x} y={chartH - h} width={barW} height={Math.max(h, 2)} rx={3} className="mini-bar" />
            <text x={x + barW / 2} y={chartH - h - 4} textAnchor="middle" className="mini-val">
              {counts[i] > 0 ? counts[i] : ""}
            </text>
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" className="mini-day">
              {day.slice(8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TrackerView() {
  const { user, isGuest } = useAuth();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [allEntries, setAllEntries] = useState<TrackerEntry[]>([]);
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState(ICONS[0]);

  const store = isGuest
    ? { getTrackers: getTrackersLocal, addTracker: addTrackerLocal, deleteTracker: deleteTrackerLocal,
        getEntries: getTrackerEntriesLocal, upsert: upsertTrackerEntryLocal, getAllEntries: getAllTrackerEntriesLocal }
    : { getTrackers, addTracker, deleteTracker,
        getEntries: getTrackerEntries, upsert: upsertTrackerEntry, getAllEntries: getAllTrackerEntries };

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    const [trks, entries] = await Promise.all([
      store.getTrackers(user.uid),
      store.getAllEntries(user.uid),
    ]);
    setTrackers(trks);
    setAllEntries(entries);
    const todayStr = today();
    const counts: Record<string, number> = {};
    for (const t of trks) {
      const entry = entries.find((e) => e.trackerId === t.id && e.date === todayStr);
      counts[t.id] = entry?.count || 0;
    }
    setTodayCounts(counts);
    setLoading(false);
  }

  async function handleIncrement(trackerId: string, delta: number) {
    if (!user) return;
    const current = todayCounts[trackerId] || 0;
    const next = Math.max(0, current + delta);
    setTodayCounts((prev) => ({ ...prev, [trackerId]: next }));
    await store.upsert(user.uid, trackerId, today(), next);
    const entries = await store.getAllEntries(user.uid);
    setAllEntries(entries);
  }

  async function handleAddTracker() {
    if (!user || !newLabel.trim()) return;
    await store.addTracker(user.uid, newLabel.trim(), newIcon, trackers.length);
    setNewLabel("");
    setNewIcon(ICONS[0]);
    setAdding(false);
    await loadAll();
  }

  async function handleDeleteTracker(id: string) {
    await store.deleteTracker(id);
    await loadAll();
  }

  if (loading) {
    return <div className="board-loading">Loading trackers...</div>;
  }

  const days = last7Days();

  return (
    <div className="tracker-view">
      <div className="board-toolbar">
        <h2 className="tracker-title">Trackers</h2>
        <button className="toolbar-btn" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "+ New Tracker"}
        </button>
      </div>

      {adding && (
        <form className="tracker-add-form" onSubmit={(e) => { e.preventDefault(); handleAddTracker(); }}>
          <div className="icon-picker">
            {ICONS.map((ic) => (
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
          <div className="tracker-add-row">
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Cigarettes, Energy Drinks..."
              className="tracker-input"
            />
            <button type="submit" className="toolbar-btn">Add</button>
          </div>
        </form>
      )}

      {trackers.length === 0 && !adding && (
        <div className="tracker-empty">
          No trackers yet. Create one to start counting.
        </div>
      )}

      <div className="tracker-grid">
        {trackers.map((t) => {
          const count = todayCounts[t.id] || 0;
          const trackerEntries = allEntries.filter((e) => e.trackerId === t.id);
          return (
            <div key={t.id} className="tracker-card">
              <div className="tracker-card-header">
                <span className="tracker-icon">{t.icon}</span>
                <span className="tracker-label">{t.label}</span>
                <button className="tracker-delete" onClick={() => handleDeleteTracker(t.id)} title="Delete tracker">
                  ×
                </button>
              </div>
              <div className="tracker-counter">
                <button className="counter-btn" onClick={() => handleIncrement(t.id, -1)} disabled={count <= 0}>
                  −
                </button>
                <span className="counter-value">{count}</span>
                <button className="counter-btn counter-plus" onClick={() => handleIncrement(t.id, 1)}>
                  +
                </button>
              </div>
              <div className="tracker-today-label">today</div>
              <MiniChart entries={trackerEntries} days={days} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
