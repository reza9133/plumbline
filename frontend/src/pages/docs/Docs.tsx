import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, Search } from 'lucide-react';
import { DOCS, type DocPage } from './registry';

const GROUPS: DocPage['group'][] = ['Start', 'Understand', 'Reference', 'The app', 'More'];

function Toc({ slug }: { slug: string }) {
  const [items, setItems] = useState<{ id: string; text: string; level: number }[]>([]);
  const [active, setActive] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      const hs = Array.from(document.querySelectorAll<HTMLElement>('.prose-doc h2[id], .prose-doc h3[id]'));
      setItems(hs.map((h) => ({ id: h.id, text: h.textContent ?? '', level: h.tagName === 'H2' ? 2 : 3 })));
      if (typeof IntersectionObserver === 'undefined') return;
      const io = new IntersectionObserver(
        (es) => {
          const e = es.find((x) => x.isIntersecting);
          if (e) setActive((e.target as HTMLElement).id);
        },
        { rootMargin: '-90px 0px -70% 0px' },
      );
      hs.forEach((h) => io.observe(h));
      cleanup = () => io.disconnect();
    }, 60);
    let cleanup = () => undefined as void;
    return () => {
      clearTimeout(t);
      cleanup();
    };
  }, [slug]);
  if (items.length < 2) return null;
  return (
    <nav
      aria-label="On this page"
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-auto xl:block"
    >
      <p className="label">On this page</p>
      <ul className="space-y-1.5 border-l border-line/70 text-sm">
        {items.map((i) => (
          <li key={i.id} style={{ paddingLeft: i.level === 3 ? 22 : 12 }}>
            <a
              href={`#${i.id}`}
              className={`block transition hover:text-ink ${active === i.id ? 'font-bold text-brass' : 'text-muted'}`}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Docs() {
  const { slug } = useParams();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const main = useRef<HTMLDivElement>(null);
  const page = DOCS.find((d) => d.slug === (slug ?? 'introduction'));

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? DOCS.filter((d) => `${d.title} ${d.summary} ${d.keywords}`.toLowerCase().includes(n)) : DOCS;
  }, [q]);

  useEffect(() => {
    setOpen(false);
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      el?.scrollIntoView();
    }
  }, [slug]);

  if (!page) return <Navigate to="/docs/introduction" replace />;
  const idx = DOCS.indexOf(page);
  const prev = DOCS[idx - 1];
  const next = DOCS[idx + 1];
  const { Component } = page;

  const nav = (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Search the docs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search the documentation"
        />
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted">No page matches “{q}”.</p>}
      {GROUPS.map((g) => {
        const items = filtered.filter((d) => d.group === g);
        if (!items.length) return null;
        return (
          <div key={g} className="mb-5">
            <p className="label">{g}</p>
            <ul className="space-y-0.5">
              {items.map((d) => (
                <li key={d.slug}>
                  <Link
                    to={`/docs/${d.slug}`}
                    className={`block rounded-lg px-3 py-1.5 text-sm font-semibold transition ${d.slug === page.slug ? 'bg-brass/15 text-brass' : 'text-muted hover:bg-surface2/60 hover:text-ink'}`}
                    aria-current={d.slug === page.slug ? 'page' : undefined}
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_220px]">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-auto">
        <button
          className="btn mb-3 w-full justify-between lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> {page.title}
          </span>
          <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        <div className={`${open ? 'block' : 'hidden'} lg:block`}>{nav}</div>
      </aside>

      <article ref={main} className="min-w-0">
        <p className="eyebrow mb-2">{page.group}</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">{page.title}</h1>
        <p className="mt-2 text-muted">{page.summary}</p>
        <div className="prose-doc mt-6" data-testid="doc-body">
          <Component />
        </div>
        <div className="mt-14 grid gap-3 border-t border-line/60 pt-6 sm:grid-cols-2">
          {prev ? (
            <Link
              to={`/docs/${prev.slug}`}
              className="card flex items-center gap-3 p-4 transition hover:border-cyan/50"
            >
              <ArrowLeft className="h-4 w-4 text-muted" />
              <span>
                <span className="label mb-0 block">Previous</span>
                <b>{prev.title}</b>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/docs/${next.slug}`}
              className="card flex items-center justify-end gap-3 p-4 text-right transition hover:border-cyan/50"
            >
              <span>
                <span className="label mb-0 block">Next</span>
                <b>{next.title}</b>
              </span>
              <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
          )}
        </div>
      </article>

      <Toc slug={page.slug} />
    </div>
  );
}
