import { BrandLink } from "./student-shell";

export default function Loading() {
  return (
    <main className="page" role="status" aria-busy="true">
      <BrandLink />
      <p>Getting Pals ready…</p>
      <div className="loading-block" />
    </main>
  );
}
