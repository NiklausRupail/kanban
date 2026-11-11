"use client";

import type { KanbanCard, KanbanColumn, Priority } from "@/lib/firestore";

interface Props {
  cards: KanbanCard[];
  columns: KanbanColumn[];
  onBack: () => void;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

const COL_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16", "#e11d48"];

function colColor(i: number) {
  return COL_COLORS[i % COL_COLORS.length];
}

function BarChart({ columns, cards }: { columns: KanbanColumn[]; cards: KanbanCard[] }) {
  const counts = columns.map((col) => cards.filter((c) => c.column === col.id).length);
  const max = Math.max(...counts, 1);
  const barW = 60;
  const gap = 20;
  const chartH = 160;
  const w = columns.length * (barW + gap);

  return (
    <div className="chart-card">
      <h3>Cards per Column</h3>
      <svg viewBox={`0 0 ${Math.max(w, 200)} ${chartH + 40}`} className="chart-svg">
        {columns.map((col, i) => {
          const h = (counts[i] / max) * chartH;
          const x = i * (barW + gap) + gap / 2;
          return (
            <g key={col.id}>
              <rect
                x={x} y={chartH - h} width={barW} height={h}
                rx={4} fill={colColor(i)}
              />
              <text x={x + barW / 2} y={chartH - h - 6} textAnchor="middle" className="chart-val">
                {counts[i]}
              </text>
              <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" className="chart-label">
                {col.label.length > 8 ? col.label.slice(0, 7) + "…" : col.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PieChart({ cards }: { cards: KanbanCard[] }) {
  const priorities: Priority[] = ["high", "medium", "low"];
  const counts = priorities.map((p) => cards.filter((c) => (c.priority || "medium") === p).length);
  const total = Math.max(counts.reduce((a, b) => a + b, 0), 1);
  let cumulative = 0;
  const r = 70;
  const cx = 90;
  const cy = 90;

  function arc(startAngle: number, endAngle: number) {
    const s = (startAngle - 90) * (Math.PI / 180);
    const e = (endAngle - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="chart-card">
      <h3>Priority Breakdown</h3>
      <div className="pie-wrap">
        <svg viewBox="0 0 180 180" className="chart-svg pie-svg">
          {priorities.map((p, i) => {
            if (counts[i] === 0) return null;
            const angle = (counts[i] / total) * 360;
            const start = cumulative;
            cumulative += angle;
            if (counts[i] === total) {
              return <circle key={p} cx={cx} cy={cy} r={r} fill={PRIORITY_COLORS[p]} />;
            }
            return <path key={p} d={arc(start, start + angle)} fill={PRIORITY_COLORS[p]} />;
          })}
        </svg>
        <div className="pie-legend">
          {priorities.map((p, i) => (
            <div key={p} className="legend-item">
              <span className="legend-dot" style={{ background: PRIORITY_COLORS[p] }} />
              {p.charAt(0).toUpperCase() + p.slice(1)}: {counts[i]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCards({ cards, columns }: { cards: KanbanCard[]; columns: KanbanColumn[] }) {
  const high = cards.filter((c) => c.priority === "high").length;
  const lastCol = columns[columns.length - 1];
  const done = lastCol ? cards.filter((c) => c.column === lastCol.id).length : 0;
  const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;

  return (
    <div className="stat-row">
      <div className="stat-card">
        <span className="stat-num">{cards.length}</span>
        <span className="stat-label">Total Cards</span>
      </div>
      <div className="stat-card">
        <span className="stat-num">{columns.length}</span>
        <span className="stat-label">Columns</span>
      </div>
      <div className="stat-card">
        <span className="stat-num" style={{ color: "#ef4444" }}>{high}</span>
        <span className="stat-label">High Priority</span>
      </div>
      <div className="stat-card">
        <span className="stat-num" style={{ color: "#22c55e" }}>{pct}%</span>
        <span className="stat-label">Completion</span>
      </div>
    </div>
  );
}

export default function Summary({ cards, columns, onBack }: Props) {
  return (
    <div className="summary">
      <div className="summary-header">
        <button className="toolbar-btn" onClick={onBack}>← Back to Board</button>
        <h2>Summary Dashboard</h2>
      </div>
      <StatCards cards={cards} columns={columns} />
      <div className="charts-grid">
        <BarChart columns={columns} cards={cards} />
        <PieChart cards={cards} />
      </div>
    </div>
  );
}
