import { Component, ReactNode, Suspense, lazy, useEffect, useRef, useState } from "react";
import { ALL_TOPICS, CATEGORIES, findTopic } from "./topics";
import { VizSkeleton } from "./components/VizSkeleton";
import { TryThis } from "./components/TryThis";
import { BrandMark } from "./components/BrandMark";

const ComingSoon = lazy(() =>
  import("./components/ComingSoon").then((m) => ({ default: m.ComingSoon }))
);
const Home = lazy(() => import("./components/Home").then((m) => ({ default: m.Home })));
const TopicPrimer = lazy(() =>
  import("./components/TopicPrimer").then((m) => ({ default: m.TopicPrimer }))
);

const HOME = "home";
const VISITED_KEY = "mlmv:visited";
const LAST_KEY = "mlmv:last";

function routeFromHash(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return findTopic(hash) ? hash : HOME;
}

function loadVisited(): Set<string> {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(VISITED_KEY) || "[]");
    return new Set(Array.isArray(ids) ? ids.filter((id) => findTopic(String(id))) : []);
  } catch {
    return new Set();
  }
}

class VizBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="callout callout-warn viz-error">
          <span>This visualization failed to load. Check your connection and try again.</span>
          <button className="btn" onClick={() => this.setState({ failed: false })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visited, setVisited] = useState<Set<string>>(loadVisited);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const topic = findTopic(route);
  const isHome = !topic;
  const category = topic && CATEGORIES.find((c) => c.topics.some((t) => t.id === topic.id));
  const index = topic ? ALL_TOPICS.findIndex((t) => t.id === topic.id) : -1;
  const prev = index > 0 ? ALL_TOPICS[index - 1] : undefined;
  const next = index >= 0 && index < ALL_TOPICS.length - 1 ? ALL_TOPICS[index + 1] : undefined;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? CATEGORIES.map((c) => ({
        ...c,
        topics: c.topics.filter((t) => t.title.toLowerCase().includes(q)),
      })).filter((c) => c.topics.length > 0)
    : CATEGORIES;

  useEffect(() => {
    window.location.hash = isHome ? "/" : "/" + route;
    document.title = topic
      ? `${topic.title} · ML Math Viz`
      : "ML Math Viz: see the math behind machine learning";
  }, [route]);

  useEffect(() => {
    if (!topic) return;
    try {
      localStorage.setItem(LAST_KEY, topic.id);
    } catch {
      /* non-persistent storage */
    }
    setVisited((prevSet) => {
      if (prevSet.has(topic.id)) return prevSet;
      const nextSet = new Set(prevSet);
      nextSet.add(topic.id);
      try {
        localStorage.setItem(VISITED_KEY, JSON.stringify([...nextSet]));
      } catch {
        /* non-persistent storage */
      }
      return nextSet;
    });
  }, [route]);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", drawerOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Left/right arrows step through topics when no control has focus.
  useEffect(() => {
    if (isHome) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "ArrowLeft" && prev) selectTopic(prev.id);
      else if (e.key === "ArrowRight" && next) selectTopic(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route]);

  function closeDrawer() {
    setDrawerOpen(false);
    menuBtnRef.current?.focus();
  }

  function selectTopic(id: string) {
    setRoute(id);
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }

  function goHome() {
    setRoute(HOME);
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }

  const Viz = topic?.component;

  return (
    <div className="app">
      <header className="topbar">
        <button
          ref={menuBtnRef}
          className="menu-btn"
          aria-label="Open topics menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <line x1="3" y1="5.5" x2="17" y2="5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="3" y1="14.5" x2="17" y2="14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button className="topbar-brand" onClick={goHome} aria-label="Go to overview">
          <BrandMark size={28} />
          <span className="topbar-title">ML Math Viz</span>
        </button>
      </header>

      <button
        className={"scrim" + (drawerOpen ? " scrim-open" : "")}
        aria-label="Close topics menu"
        tabIndex={drawerOpen ? 0 : -1}
        onClick={closeDrawer}
      />

      <aside className={"sidebar" + (drawerOpen ? " sidebar-open" : "")} aria-label="Topics">
        <div className="brand">
          <button className="brand-btn" onClick={goHome} aria-label="Go to overview">
            <BrandMark size={38} />
            <span>
              <span className="brand-title">ML Math Viz</span>
              <span className="brand-sub">see the math move</span>
            </span>
          </button>
          <button
            ref={closeBtnRef}
            className="drawer-close"
            aria-label="Close topics menu"
            onClick={closeDrawer}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <line x1="4" y1="4" x2="14" y2="14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <line x1="14" y1="4" x2="4" y2="14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="rail-filter">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9.3" y1="9.3" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            placeholder="Filter topics"
            aria-label="Filter topics"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
          />
        </div>

        <nav>
          <button
            className={"nav-link nav-home" + (isHome ? " nav-link-active" : "")}
            aria-current={isHome ? "page" : undefined}
            onClick={goHome}
          >
            <span>Overview</span>
          </button>
          {filtered.map((cat) => (
            <div key={cat.name} className="nav-section">
              <div className="nav-section-title">{cat.name}</div>
              {cat.topics.map((t) => (
                <button
                  key={t.id}
                  className={"nav-link" + (t.id === route ? " nav-link-active" : "")}
                  aria-current={t.id === route ? "page" : undefined}
                  onClick={() => selectTopic(t.id)}
                >
                  <span>{t.title}</span>
                  {visited.has(t.id) && t.id !== route && (
                    <svg
                      className="nav-check"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <polyline
                        points="2,6.5 4.8,9.2 10,3.4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="rail-empty">No topics match "{query.trim()}".</p>
          )}
        </nav>

        <div className="rail-progress">
          <div className="rail-progress-text">
            {visited.size} of {ALL_TOPICS.length} topics explored
          </div>
          <div
            className="rail-progress-bar"
            role="progressbar"
            aria-valuenow={visited.size}
            aria-valuemin={0}
            aria-valuemax={ALL_TOPICS.length}
            aria-label="Topics explored"
          >
            <div
              className="rail-progress-fill"
              style={{ width: `${Math.round((visited.size / ALL_TOPICS.length) * 100)}%` }}
            />
          </div>
        </div>
      </aside>

      <main className="content" key={route}>
        {isHome ? (
          <Suspense fallback={<div className="home-loading" aria-hidden="true" />}>
            <Home
              visited={visited}
              lastTopicId={localStorage.getItem(LAST_KEY)}
              onSelect={selectTopic}
            />
          </Suspense>
        ) : (
          <>
            <header className="topic-header">
              <p className="topic-category">{category!.name}</p>
              <h1>{topic!.title}</h1>
              <p className="topic-blurb">{topic!.blurb}</p>
              <div className="topic-meta">
                <span className={"level level-" + topic!.level.toLowerCase()}>{topic!.level}</span>
                <span className="topic-min">~{topic!.minutes} min</span>
                {topic!.prereqs && topic!.prereqs.length > 0 && (
                  <span className="prereqs">
                    <span className="prereqs-label">builds on</span>
                    {topic!.prereqs.map((id) => {
                      const t = findTopic(id);
                      if (!t) return null;
                      return (
                        <button key={id} className="prereq-chip" onClick={() => selectTopic(id)}>
                          {visited.has(id) && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-label="visited">
                              <polyline
                                points="2,6.5 4.8,9.2 10,3.4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          {t.title}
                        </button>
                      );
                    })}
                  </span>
                )}
              </div>
            </header>
            {topic!.intuition && (
              <p className="intuition">
                <strong>In plain words:</strong> {topic!.intuition}
              </p>
            )}
            <Suspense fallback={null}>
              <TopicPrimer topicId={topic!.id} />
            </Suspense>
            {topic!.tryThis.length > 0 && (
              <TryThis topicId={topic!.id} prompts={topic!.tryThis} />
            )}
            <VizBoundary>
              <Suspense fallback={<VizSkeleton />}>
                {Viz ? <Viz /> : <ComingSoon topic={topic!} />}
              </Suspense>
            </VizBoundary>
            <nav className="pager" aria-label="Adjacent topics">
              {prev && (
                <button className="pager-link pager-prev" onClick={() => selectTopic(prev.id)}>
                  <span className="pager-dir">← Previous</span>
                  <span className="pager-title">{prev.title}</span>
                </button>
              )}
              {next && (
                <button className="pager-link pager-next" onClick={() => selectTopic(next.id)}>
                  <span className="pager-dir">Next →</span>
                  <span className="pager-title">{next.title}</span>
                </button>
              )}
            </nav>
          </>
        )}
      </main>
    </div>
  );
}
