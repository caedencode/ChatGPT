/*
 * Copyright (c) 2026 Pawan Osman <https://github.com/PawanOsman>
 *
 * This file is part of OpenCursor — AI coding agent chat inside VS Code.
 * https://github.com/PawanOsman/OpenCursor
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import "./model-select.css";

/** Minimal structural shape shared by sidebar ModelDef and settings ModelDef. */
export interface ModelSelectItem {
  id: string;
  name: string;
  kind?: string | string[];
  providerName?: string;
}

/** Custom entries pinned above the model list (e.g. "First enabled model", "(inherit chat model)"). */
export interface ModelSelectCustom {
  value: string;
  label: string;
  desc?: string;
}

const groupOf = (m: ModelSelectItem): string => {
  const k = Array.isArray(m.kind) ? m.kind[0] : m.kind;
  if (k === "llamacpp") return "Local · llama.cpp";
  if (k === "ollama") return "Local · Ollama";
  return m.providerName || "Other";
};

/**
 * Unified model selector: a trigger button that opens a modal dialog with
 * search, provider filter chips, and the enabled models grouped by provider.
 * `customItems` render pinned at the top (judge "first enabled", subagent
 * "inherit chat model", etc.).
 */
export function ModelSelect({
  models,
  value,
  onChange,
  customItems,
  style,
}: {
  models: ModelSelectItem[];
  value: string;
  onChange: (id: string) => void;
  customItems?: ModelSelectCustom[];
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [provider, setProvider] = React.useState<string | null>(null); // null = all
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const titleId = React.useId();

  const groups = React.useMemo(() => {
    const map = new Map<string, ModelSelectItem[]>();
    for (const m of models) {
      const g = groupOf(m);
      (map.get(g) ?? map.set(g, []).get(g)!).push(m);
    }
    return [...map.entries()].sort((a, b) => Number(a[0].startsWith("Local ")) - Number(b[0].startsWith("Local ")));
  }, [models]);

  const q = query.trim().toLowerCase();
  const visibleGroups = groups
    .filter(([g]) => provider === null || g === provider)
    .map(([g, list]) => [g, q ? list.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) : list] as const)
    .filter(([, list]) => list.length > 0);
  const visibleCustom = (customItems || []).filter(
    (c) => (provider === null) && (!q || c.label.toLowerCase().includes(q))
  );

  const current =
    customItems?.find((c) => c.value === value)?.label ??
    models.find((m) => m.id === value)?.name ??
    (value || customItems?.[0]?.label || "Select model");

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setProvider(null);
  }, []);
  const pick = (v: string) => {
    onChange(v);
    close();
  };

  React.useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const trigger = triggerRef.current;
    return () => { trigger?.focus(); };
  }, [open]);

  const onDialogKey = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (event.key === "Tab") {
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const options = Array.from(dialog.querySelectorAll<HTMLButtonElement>(".msel-item"));
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      if (document.activeElement !== searchRef.current && index < 0) return;
      if (!options.length) return;
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (index + 1) % options.length : (index - 1 + options.length) % options.length;
      const option = options[index < 0 && event.key === "ArrowUp" ? options.length - 1 : next];
      option.focus();
      option.scrollIntoView?.({ block: "nearest" });
    }
  };
  const modelCount = visibleGroups.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <>
      <button ref={triggerRef} type="button" className="msel-trigger" style={style} onClick={() => setOpen(true)} title={value || current} aria-haspopup="dialog" aria-expanded={open}>
        <span className="msel-trigger-label">{current}</span>
        <Icon name="chevD" size={14} />
      </button>
      {open && createPortal(
        <div className="msel-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div ref={dialogRef} className="msel-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onDialogKey}>
            <div className="msel-heading">
              <div className="msel-heading-text">
                <h2 className="msel-title" id={titleId}>Choose a model</h2>
                <p className="msel-description">Search your models or filter by provider.</p>
              </div>
              <button type="button" className="msel-close" onClick={close} aria-label="Close model picker"><Icon name="close" size={16} /></button>
            </div>
            <div className="msel-head">
              <Icon name="search" size={16} />
              <input
                ref={searchRef}
                className="msel-search"
                placeholder="Search models…"
                aria-label="Search models"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="msel-filters" role="group" aria-label="Filter by provider">
              <button type="button" aria-pressed={provider === null} className={"msel-chip" + (provider === null ? " active" : "")} onClick={() => setProvider(null)}>
                All
              </button>
              {groups.map(([g]) => (
                <button type="button" key={g} aria-pressed={provider === g} className={"msel-chip" + (provider === g ? " active" : "")} onClick={() => setProvider(provider === g ? null : g)}>
                  {g}
                </button>
              ))}
            </div>
            <div className="msel-body">
              {visibleCustom.map((c) => (
                <button
                  type="button"
                  key={c.value || "__custom__"}
                  className={"msel-item custom" + (value === c.value ? " active" : "")}
                  aria-pressed={value === c.value}
                  onClick={() => pick(c.value)}
                >
                  <span className="msel-item-text">
                    <span className="msel-item-name">{c.label}</span>
                    {c.desc && <span className="msel-item-sub">{c.desc}</span>}
                  </span>
                  {value === c.value && <Icon name="check" className="msel-item-check" size={16} />}
                </button>
              ))}
              {visibleCustom.length > 0 && visibleGroups.length > 0 && <div className="msel-divider" />}
              {visibleGroups.length === 0 && visibleCustom.length === 0 && <div className="msel-empty" role="status"><Icon name="search" size={22} /><strong>No models found</strong><span>{q || provider ? "Try another search or provider." : "Enable a model in Models settings to get started."}</span></div>}
              {visibleGroups.map(([g, list]) => (
                <React.Fragment key={g}>
                  <div className="msel-group"><span>{g}</span><span>{list.length}</span></div>
                  {list.map((m) => (
                    <button type="button" key={m.id} aria-pressed={value === m.id} className={"msel-item" + (value === m.id ? " active" : "")} onClick={() => pick(m.id)}>
                      <span className="msel-item-text">
                        <span className="msel-item-name">{m.name}</span>
                        {m.id !== m.name && <span className="msel-item-sub">{m.id}</span>}
                      </span>
                      {value === m.id && <Icon name="check" className="msel-item-check" size={16} />}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="msel-footer"><span>{modelCount} {modelCount === 1 ? "model" : "models"}</span><span><kbd>↑</kbd> <kbd>↓</kbd> navigate · <kbd>esc</kbd> close</span></div>
          </div>
        </div>, document.body
      )}
    </>
  );
}
