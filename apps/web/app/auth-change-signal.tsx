"use client";
export function AuthChangeSignal() {
  return (
    <button
      className="text-button"
      onClick={() => {
        const channel = new BroadcastChannel("pals-auth-change");
        channel.postMessage("changing");
        channel.close();
      }}
    >
      Sign out
    </button>
  );
}
