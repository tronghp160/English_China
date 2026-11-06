// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for useChat: the hook under test is about what it stores, stops and warns about, not about streaming.
const chat = {
  messages: [] as UIMessage[],
  status: "ready" as string,
  error: undefined as Error | undefined,
  setMessages: vi.fn(),
  sendMessage: vi.fn(),
  stop: vi.fn(),
  regenerate: vi.fn(),
  clearError: vi.fn(),
};
vi.mock("@ai-sdk/react", () => ({ useChat: () => chat }));
const warmClone = vi.fn();
vi.mock("@/lib/ai/clone/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/ai/clone/client")>()), warmClone: () => warmClone() }));

const { useCloneChat } = await import("@/components/clone/use-clone-chat");

const msg = (role: "user" | "assistant", text: string): UIMessage => ({ id: `${role}-${text}`, role, parts: [{ type: "text", text }] });
/** Fires beforeunload and reports whether the page asked the browser to confirm leaving. */
const leaveAsks = () => {
  const e = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
};

beforeEach(() => {
  chat.messages = [];
  chat.status = "ready";
  chat.error = undefined;
  for (const fn of [chat.setMessages, chat.sendMessage, chat.stop, chat.regenerate, chat.clearError, warmClone]) fn.mockClear();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup(); // Vitest has no globals, so Testing Library does not unmount by itself: a leftover hook would keep its listener
  vi.restoreAllMocks();
});

describe("useCloneChat: nothing is stored", () => {
  it("deletes what an earlier version kept in localStorage and keeps every other key", () => {
    localStorage.setItem("sotu:clone:v1:user-a", '[{"id":"1","role":"user","text":"cũ"}]');
    localStorage.setItem("sotu:clone:v1:user-b", "[]");
    localStorage.setItem("sotu:clone:intro:v1", "1"); // the closed-card flag has no chat content
    localStorage.setItem("sotu-theme", "dark");
    renderHook(() => useCloneChat("user-a"));
    expect(Object.keys(localStorage).sort()).toEqual(["sotu-theme", "sotu:clone:intro:v1"]);
  });

  it("does not break when the browser blocks storage", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => renderHook(() => useCloneChat("u"))).not.toThrow();
  });

  it("writes nothing while messages come and go: no storage, no cookie", () => {
    const local = vi.spyOn(Storage.prototype, "setItem");
    const { rerender } = renderHook(() => useCloneChat("u"));
    chat.messages = [msg("user", "bí mật số một")];
    chat.status = "submitted";
    rerender();
    chat.messages = [msg("user", "bí mật số một"), msg("assistant", "ừ nghe nè")];
    chat.status = "streaming";
    rerender();
    chat.status = "ready";
    rerender();
    expect(local).not.toHaveBeenCalled();
    expect(Object.keys(localStorage)).toEqual([]);
    expect(Object.keys(sessionStorage)).toEqual([]);
    expect(document.cookie).toBe("");
  });

  it("wakes the route when the page opens", () => {
    renderHook(() => useCloneChat("u"));
    expect(warmClone).toHaveBeenCalledTimes(1);
  });
});

describe("useCloneChat: the conversation goes away", () => {
  it("stops an answer in progress and empties the messages when the page is left", () => {
    const { unmount } = renderHook(() => useCloneChat("u"));
    chat.stop.mockClear();
    chat.setMessages.mockClear();
    unmount();
    expect(chat.stop).toHaveBeenCalled();
    expect(chat.setMessages).toHaveBeenCalledWith([]);
  });

  it("reset stops, empties and clears an error at once", () => {
    chat.messages = [msg("user", "a"), msg("assistant", "b")];
    chat.error = new Error("lỗi");
    const { result } = renderHook(() => useCloneChat("u"));
    result.current.reset();
    expect(chat.stop).toHaveBeenCalled();
    expect(chat.setMessages).toHaveBeenCalledWith([]);
    expect(chat.clearError).toHaveBeenCalled();
  });
});

describe("useCloneChat: asking before a reload or closing the tab", () => {
  it("does not ask while the user has sent nothing", () => {
    const { rerender } = renderHook(() => useCloneChat("u"));
    expect(leaveAsks()).toBe(false);
    chat.messages = [msg("assistant", "chào")]; // a greeting of the companion alone is nothing to lose
    rerender();
    expect(leaveAsks()).toBe(false);
  });

  it("asks once there is a message from the user, and stops asking when the chat is emptied", () => {
    const { rerender } = renderHook(() => useCloneChat("u"));
    chat.messages = [msg("user", "xin chào")];
    rerender();
    expect(leaveAsks()).toBe(true);
    chat.messages = [];
    rerender();
    expect(leaveAsks()).toBe(false);
  });

  it("takes the listener away when the page is left", () => {
    chat.messages = [msg("user", "xin chào")];
    const { unmount } = renderHook(() => useCloneChat("u"));
    expect(leaveAsks()).toBe(true);
    unmount();
    expect(leaveAsks()).toBe(false);
  });
});

describe("useCloneChat: access taken away in the middle of a chat", () => {
  const forbidden = () => new Error(JSON.stringify({ error: "Tính năng này hiện chưa mở cho bạn.", kind: "forbidden" }));

  it("is not locked normally, nor after another kind of failure", () => {
    const { result, rerender } = renderHook(() => useCloneChat("u"));
    expect(result.current.locked).toBe(false);
    chat.error = new Error("Failed to fetch");
    rerender();
    expect(result.current.locked).toBe(false);
    chat.error = new Error(JSON.stringify({ error: "Bạn gửi nhanh quá.", kind: "rate" }));
    rerender();
    expect(result.current.locked).toBe(false);
  });

  it("locks when the route says there is no access, and sends nothing more", () => {
    const { result, rerender } = renderHook(() => useCloneChat("u"));
    chat.error = forbidden();
    rerender();
    expect(result.current.locked).toBe(true);
    chat.sendMessage.mockClear();
    expect(result.current.send("còn ai ở đó không")).toBe(false);
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("starting a new conversation clears the error, so the page can try again", () => {
    chat.error = forbidden();
    const { result, rerender } = renderHook(() => useCloneChat("u"));
    expect(result.current.locked).toBe(true);
    result.current.reset();
    expect(chat.clearError).toHaveBeenCalled();
    chat.error = undefined;
    rerender();
    expect(result.current.locked).toBe(false);
  });
});

describe("useCloneChat: sending", () => {
  it("sends a trimmed message and refuses empty, too long or while an answer is coming", () => {
    const { result, rerender } = renderHook(() => useCloneChat("u"));
    expect(result.current.send("  chào  ")).toBe(true);
    expect(chat.sendMessage).toHaveBeenCalledWith({ text: "chào" });
    expect(result.current.send("   ")).toBe(false);
    expect(result.current.send("x".repeat(1001))).toBe(false);
    chat.status = "streaming";
    rerender();
    expect(result.current.send("còn một câu")).toBe(false);
    expect(chat.sendMessage).toHaveBeenCalledTimes(1);
  });
});
