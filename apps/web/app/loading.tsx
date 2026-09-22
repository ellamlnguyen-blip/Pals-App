export default function Loading() {
  return (
    <main className="page" role="status" aria-busy="true">
      <p>Getting Pals ready…</p>
      <div className="loading-block" />
    </main>
  );
}
