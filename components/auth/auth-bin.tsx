"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pup } from "@/components/mascot/pup";
import { useBinAction } from "@/components/mascot/use-bin";
import { BIN_ACTIONS, type BinAction } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";

export type AuthField = "email" | "name" | "password";
export type AuthStatus = "idle" | "error" | "success";

type AuthBinContextValue = {
  /** A field got or lost the focus (null = none). */
  focus: (field: AuthField | null) => void;
  /** How many characters the focused text field holds: Bin's eyes slide along. */
  typed: (length: number) => void;
  /** The email field lost the focus; a good address earns a nod. */
  emailChecked: (valid: boolean) => void;
  /** The password is shown or hidden. */
  shown: (shown: boolean) => void;
  status: (status: AuthStatus) => void;
};

type AuthBinState = {
  field: AuthField | null;
  length: number;
  passwordShown: boolean;
  status: AuthStatus;
};

const ActionsContext = createContext<AuthBinContextValue | null>(null);
const StateContext = createContext<{ state: AuthBinState; oneShot: ReturnType<typeof useBinAction> } | null>(null);

/** After this long without a touch, Bin yawns. */
const YAWN_AFTER_MS = 20_000;

/**
 * Bin of the sign-in pages reacts to the form (REDESIGN_V3 §9.4): it waves when the page opens, looks at the field
 * being typed in (more to the right the longer the text), nods at a good email, covers its eyes while the
 * password is typed and peeks when it is shown, droops on a wrong answer and jumps for joy on success.
 */
export function AuthBinProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthBinState>({ field: null, length: 0, passwordShown: false, status: "idle" });
  const oneShot = useBinAction("happy");
  const play = useRef(oneShot.play);
  useEffect(() => {
    play.current = oneShot.play;
  }, [oneShot.play]);

  // A wave and a quiet woof when the page opens (the sound waits for the first touch)
  useEffect(() => {
    const t = [setTimeout(() => play.current("wave"), 350), setTimeout(() => play.current("bark"), 1400)];
    return () => t.forEach(clearTimeout);
  }, []);

  // Bored after 20 s without anything happening
  const bored = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touch = useCallback(() => {
    clearTimeout(bored.current);
    bored.current = setTimeout(() => play.current("yawn"), YAWN_AFTER_MS);
  }, []);
  useEffect(() => {
    touch();
    return () => clearTimeout(bored.current);
  }, [touch]);

  const actions = useMemo<AuthBinContextValue>(
    () => ({
      focus: (field) => {
        touch();
        // Starting to type again clears the droop of a wrong answer
        setState((s) => ({ ...s, field, length: 0, status: s.status === "error" ? "idle" : s.status }));
      },
      typed: (length) => {
        touch();
        setState((s) => (s.length === length ? s : { ...s, length }));
      },
      emailChecked: (valid) => {
        touch();
        if (valid) play.current("nod");
      },
      shown: (passwordShown) => {
        touch();
        setState((s) => ({ ...s, passwordShown }));
      },
      status: (status) => {
        touch();
        setState((s) => ({ ...s, status }));
        if (status === "success") {
          play.current("jump");
          setTimeout(() => play.current("spin"), 650);
        }
      },
    }),
    [touch],
  );

  const value = useMemo(() => ({ state, oneShot }), [state, oneShot]);
  return (
    <ActionsContext value={actions}>
      <StateContext value={value}>{children}</StateContext>
    </ActionsContext>
  );
}

/** The ways a form tells Bin what is going on; `null` outside the sign-in pages (e.g. in Settings). */
export function useAuthBin() {
  return use(ActionsContext);
}

/** The pose that stays while something holds it: covered eyes, a peek, a droop. */
function heldAction(state: AuthBinState): BinAction | null {
  if (state.status === "error") return "droop";
  if (state.field === "password") return state.passwordShown ? "peek" : "coverEyes";
  return null;
}

/** Bin's eyes: down toward the field, and along it as the text grows (0 characters = left, 30 or more = right). */
function lookFor(state: AuthBinState) {
  if (state.field !== "email" && state.field !== "name") return undefined;
  return { x: -1 + (2 * Math.min(state.length, 30)) / 30, y: 0.6 };
}

export function AuthBin({ size, className, bubbleClassName }: { size: number; className?: string; bubbleClassName?: string }) {
  const ctx = use(StateContext);
  if (!ctx) return <Pup mood="happy" size={size} className={className} />;
  const { state, oneShot } = ctx;
  const held = heldAction(state);
  const action = oneShot.action ?? held;
  const mood = action ? BIN_ACTIONS[action].mood : "happy";
  return (
    <div className="relative">
      <Pup mood={oneShot.action ? oneShot.mood : mood} action={action} size={size} look={lookFor(state)} className={className} />
      {state.status === "error" && (
        <p
          aria-hidden
          className={cn(
            "absolute top-1 right-full mr-1 rounded-lg rounded-br-[4px] bg-surface px-3 py-2 text-sm font-semibold whitespace-nowrap text-fg shadow-md",
            bubbleClassName,
          )}
        >
          Hình như sai rồi…
        </p>
      )}
    </div>
  );
}
