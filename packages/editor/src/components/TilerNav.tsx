/**
 * Top navigation bar — sticky, paper-2 background, hairline bottom border.
 * Mirrors the Rails `app/views/layouts/tiler/application.html.erb` layout.
 *
 * The link targets are rendered as anchors so the host application's router
 * (or a plain server roundtrip) takes over — the editor doesn't try to own
 * navigation state.
 */
export function TilerNav(): JSX.Element {
  return (
    <nav className="tiler-nav" aria-label="Primary">
      <a className="tiler-nav-brand" href="/dashboards">
        tiler
      </a>
      <div className="tiler-nav-links">
        <a className="tiler-nav-link" href="/dashboards" aria-current="page">
          Dashboards
        </a>
        <a className="tiler-nav-link" href="/data-sources">
          Data Sources
        </a>
        <a className="tiler-nav-link" href="/settings">
          Settings
        </a>
      </div>
    </nav>
  );
}
