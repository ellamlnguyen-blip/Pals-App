"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/csr/DotsThree";

export function ProfileOptions({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
        requestAnimationFrame(() => trigger.current?.focus());
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || document.querySelector("dialog[open]"))
        return;
      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => trigger.current?.focus());
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return (
    <div className="profile-options-wrap" ref={container}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        aria-label="Profile options"
      >
        <DotsThreeIcon size={26} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="profile-options">
          {children}
        </div>
      )}
    </div>
  );
}
