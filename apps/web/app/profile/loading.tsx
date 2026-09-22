export default function LoadingProfile() {
  return (
    <div className="page" role="status">
      <p>Loading your private profile…</p>
      <div className="loading-block" aria-hidden="true" />
    </div>
  );
}
