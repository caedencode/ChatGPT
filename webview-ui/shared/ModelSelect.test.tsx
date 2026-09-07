/*
 * Copyright (c) 2026 Pawan Osman <https://github.com/PawanOsman>
 *
 * This file is part of OpenCursor — AI coding agent chat inside VS Code.
 * https://github.com/PawanOsman/OpenCursor
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelSelect } from "./ModelSelect";

let root: Root;
let container: HTMLDivElement;
const change = vi.fn();
const models = [
  { id: "provider-a/model", name: "Model A", providerName: "Provider A" },
  { id: "provider-b/model", name: "Model B", providerName: "Provider B" },
];
const query = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const key = (element: HTMLElement, value: string, shiftKey = false) => act(() => {
  element.dispatchEvent(new KeyboardEvent("keydown", { key: value, shiftKey, bubbles: true, cancelable: true }));
});
const click = (element: HTMLElement) => act(() => element.click());
function search(value: string) {
  const input = query<HTMLInputElement>(".msel-search");
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  change.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<ModelSelect models={models} value={models[0].id} onChange={change} customItems={[{ value: "", label: "Automatic", desc: "Choose the first enabled model" }]} />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("shared model picker interaction", () => {
  it("opens a named dialog outside its container, focuses search and returns focus on Escape", () => {
    const trigger = query<HTMLButtonElement>(".msel-trigger");
    click(trigger);
    const dialog = query("[role=dialog]");
    expect(container.contains(dialog)).toBe(false);
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("Choose a model");
    expect(document.activeElement).toBe(query(".msel-search"));
    key(query(".msel-search"), "Escape");
    expect(document.querySelector("[role=dialog]")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("filters models by provider and search without hiding the current selection", () => {
    click(query(".msel-trigger"));
    const provider = Array.from(document.querySelectorAll<HTMLButtonElement>(".msel-chip")).find(button => button.textContent === "Provider B")!;
    click(provider);
    expect(document.querySelectorAll(".msel-item")).toHaveLength(1);
    expect(query(".msel-item-name").textContent).toBe("Model B");
    search("unavailable");
    expect(query(".msel-empty").textContent).toContain("No models found");
    search("model");
    click(query(".msel-item"));
    expect(change).toHaveBeenCalledWith("provider-b/model");
    expect(document.querySelector("[role=dialog]")).toBeNull();
  });

  it("navigates model rows with arrow keys and keeps Tab inside the dialog", () => {
    click(query(".msel-trigger"));
    key(query(".msel-search"), "ArrowDown");
    expect(document.activeElement).toBe(query(".msel-item"));
    key(document.activeElement as HTMLElement, "ArrowDown");
    expect(document.activeElement?.textContent).toContain("Model A");
    const items = Array.from(document.querySelectorAll<HTMLButtonElement>(".msel-item"));
    const last = items[items.length - 1];
    last.focus();
    key(last, "Tab");
    expect(document.activeElement).toBe(query(".msel-close"));
    key(query(".msel-close"), "Tab", true);
    expect(document.activeElement).toBe(last);
  });

  it("preserves custom selections and dismisses a backdrop click without changes", () => {
    click(query(".msel-trigger"));
    click(query(".msel-item.custom"));
    expect(change).toHaveBeenCalledWith("");
    change.mockClear();
    click(query(".msel-trigger"));
    act(() => query(".msel-overlay").dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(document.querySelector("[role=dialog]")).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });
});
