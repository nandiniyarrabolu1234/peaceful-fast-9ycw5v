import React, { useEffect, useState, useCallback } from "react";

/*
  Book Finder - React (uses OpenLibrary Search API)
  - search by title
  - shows cover (if present), title, author(s), year
  - details modal + pagination + loading/error handling
*/

const PAGE_SIZE = 20;

function coverUrlFromDoc(doc) {
  // prefer cover_i, fallback to isbn[0] or olid
  if (doc.cover_i)
    return "https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg";
  if (doc.isbn && doc.isbn.length)
    return "https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg";
  if (doc.cover_edition_key)
    return "https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg";
  return null;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  // debounce query input (400ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1); // reset page on new query
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const fetchBooks = useCallback(async (q, p = 1) => {
    if (!q) {
      setDocs([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // OpenLibrary Search API - search by title
      const res = await fetch(
        "https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&page=${p}&limit=${PAGE_SIZE}"
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDocs(data.docs || []);
      setTotal(data.numFound || 0);
    } catch (err) {
      console.error(err);
      setError("Could not load results. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // fetch when debouncedQuery or page changes
  useEffect(() => {
    fetchBooks(debouncedQuery, page);
  }, [debouncedQuery, page, fetchBooks]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="app">
      <header className="topbar">
        <h1>Book Finder</h1>
        <p className="subtitle">Search titles from Open Library</p>
      </header>

      <main>
        <section className="search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by book title — e.g. 'Harry Potter'"
            aria-label="Search books by title"
          />
          <div className="meta">
            <small>
              {loading
                ? "Searching..."
                : debouncedQuery
                ? ` ${total.toLocaleString()} results `
                : "Type a title to start"}
            </small>
          </div>
        </section>

        <section className="results">
          {error && <div className="error">{error}</div>}

          {!loading && docs.length === 0 && debouncedQuery && !error && (
            <div className="empty">
              No results found for “{debouncedQuery}”. Try different keywords.
            </div>
          )}

          <div className="grid">
            {docs.map((doc) => {
              const cover = coverUrlFromDoc(doc);
              return (
                <article className="card" key={doc.key + (doc.cover_i || "")}>
                  <div className="cover">
                    {cover ? (
                      // cover may 404 if missing — browser handles broken images
                      <img src={cover} alt={`${doc.title} cover`} />
                    ) : (
                      <div className="placeholder">
                        <span>
                          {(doc.title || "No title").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="info">
                    <h3>{doc.title}</h3>
                    <p className="authors">
                      {(doc.author_name || []).slice(0, 3).join(", ")}
                    </p>
                    <p className="year">{doc.first_publish_year || "—"}</p>
                    <button onClick={() => setSelected(doc)}>Details</button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="pager">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next →
            </button>
          </div>
        </section>

        {selected && (
          <dialog open className="modal" onClick={() => setSelected(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="close" onClick={() => setSelected(null)}>
                ✕
              </button>
              <h2>{selected.title}</h2>
              <p className="authors">
                {(selected.author_name || []).join(", ")}
              </p>
              <div className="modal-body">
                <div className="modal-cover">
                  {coverUrlFromDoc(selected) ? (
                    <img src={coverUrlFromDoc(selected)} alt="cover" />
                  ) : (
                    <div className="placeholder big">No cover</div>
                  )}
                </div>
                <div className="modal-meta">
                  <p>
                    <strong>First published:</strong>{" "}
                    {selected.first_publish_year || "Unknown"}
                  </p>
                  <p>
                    <strong>Edition count:</strong>{" "}
                    {selected.edition_count || "—"}
                  </p>
                  <p>
                    <strong>Publisher(s):</strong>{" "}
                    {(selected.publisher || []).slice(0, 4).join(", ") || "—"}
                  </p>
                  <p>
                    <strong>ISBN(s):</strong>{" "}
                    {(selected.isbn || []).slice(0, 4).join(", ") || "—"}
                  </p>
                  <a
                    href={"https://openlibrary.org${selected.key"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open on OpenLibrary
                  </a>
                </div>
              </div>
            </div>
          </dialog>
        )}
      </main>

      <footer className="foot">
        <small>
          Data from Open Library (Open Library Search API) — covers via Covers
          API.
        </small>
      </footer>
    </div>
  );
}
