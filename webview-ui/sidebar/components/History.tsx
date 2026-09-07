/*
 * Copyright (c) 2026 Pawan Osman <https://github.com/PawanOsman>
 *
 * This file is part of OpenCursor — AI coding agent chat inside VS Code.
 * https://github.com/PawanOsman/OpenCursor
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "../../shared/icons";
import type { ConversationSummary } from "../types";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

export function History({
  list,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: {
  list: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const previousFocus = document.activeElement;
    inputRef.current?.focus();
    return () => { if (previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, []);

  const filtered = query
    ? list.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    : list;

  return (
    <div className="history-overlay" onClick={onClose}>
      <div
        className="history-popup"
        ref={popupRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-heading"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onClose(); }
          if (e.key !== "Tab") return;
          const controls = popupRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input");
          if (!controls?.length) return;
          const first = controls[0], last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }}
      >
        <div className="history-titlebar">
          <div className="history-heading"><h2 id="history-heading">Your conversations</h2><span>{list.length} saved chat{list.length === 1 ? "" : "s"}</span></div>
          <button className="history-close" onClick={onClose} aria-label="Close history"><Icon name="close" size={16} /></button>
        </div>
        {/* Search */}
        <div className="history-search">
          <Icon name="search" size={14} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search conversations…"
            aria-label="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
        </div>
        {/* List */}
        <div className="history-list">
          {filtered.length === 0 ? (
            <div className="history-empty">
              <Icon name={list.length === 0 ? "chat" : "search"} size={22} />
              <span>{list.length === 0 ? "Your conversations will appear here." : "No conversations match your search."}</span>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={"history-item" + (c.id === activeId ? " active" : "")}
              >
                <button className="hi-text" aria-current={c.id === activeId ? "page" : undefined} onClick={() => { onSelect(c.id); onClose(); }}>
                  <div className="hi-title">{c.title}</div>
                  <div className="hi-time">{timeAgo(c.updatedAt)}</div>
                </button>
                <button
                  className="hi-del"
                  title="Delete conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
