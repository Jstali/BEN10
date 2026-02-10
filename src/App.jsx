import { useEffect, useMemo, useRef } from 'react';
import characters from './data/characters.js';
import images from './data/images.json';

const PAGE_SIZE = 9;

const chunk = (items, size) => {
  const pages = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
};

const toSpreads = (pages) => {
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left: pages[i],
      right: pages[i + 1] ?? { type: 'blank' },
    });
  }
  return spreads;
};

const buildPages = (entries) => {
  const characterPages = chunk(entries, PAGE_SIZE).map((items, index) => ({
    type: 'characters',
    items,
    index,
  }));

  return [
    { type: 'cover' },
    { type: 'intro' },
    ...characterPages,
  ];
};

const CoverPage = () => (
  <div className="page-content cover">
    <div className="cover-badge">Field Notebook</div>
    <h1>Ben 10 Character Compendium</h1>
    <p>
      Slide across the pages to explore the roster. Each page is layered like a
      real notebook spread.
    </p>
    <div className="cover-stamp">Omnitrix Archive</div>
  </div>
);

const IntroPage = () => (
  <div className="page-content intro">
    <h2>How To Use This Notebook</h2>
    <ul>
      <li>Swipe or scroll horizontally to turn pages.</li>
      <li>Each spread has two pages with a live page-turn effect.</li>
      <li>Cards are grouped with tags to keep the roster readable.</li>
    </ul>
    <div className="intro-note">
      Add more characters or images in <code>src/data/characters.js</code>.
    </div>
  </div>
);

const CharacterCard = ({ character, index }) => (
  <div className="card" style={{ '--i': index }}>
    <div
      className="portrait"
      style={
        character.image
          ? { '--portrait-url': `url(${character.image})` }
          : undefined
      }
    />
    <div className="card-body">
      <div className="card-title">{character.name}</div>
      <div className="card-meta">
        <span className={`tag tag-${character.tag.toLowerCase()}`}>
          {character.tag}
        </span>
        <span className="era">{character.era}</span>
      </div>
    </div>
  </div>
);

const CharactersPage = ({ items, pageNumber, totalPages }) => (
  <div className="page-content">
    <div className="page-header">
      <h3>Roster Page {pageNumber}</h3>
      <span className="page-count">{pageNumber} / {totalPages}</span>
    </div>
    <div className="page-grid">
      {items.map((character, index) => (
        <CharacterCard key={character.name} character={character} index={index} />
      ))}
    </div>
  </div>
);

const BlankPage = () => (
  <div className="page-content blank">
    <div className="blank-mark">Next entry coming soon.</div>
  </div>
);

export default function App() {
  const scrollerRef = useRef(null);
  const spreadRefs = useRef([]);

  const roster = useMemo(
    () =>
      characters.map((character) => ({
        ...character,
        image: images[character.name] ?? character.image,
      })),
    [],
  );

  const pages = useMemo(() => buildPages(roster), [roster]);
  const spreads = useMemo(() => toSpreads(pages), [pages]);
  const totalCharacterPages = pages.filter((page) => page.type === 'characters').length;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const update = () => {
      const width = scroller.clientWidth;
      const scrollLeft = scroller.scrollLeft;

      spreadRefs.current.forEach((spread, index) => {
        if (!spread) return;
        const start = index * width;
        const progress = (scrollLeft - start) / width;
        const clamped = Math.max(-1, Math.min(1, progress));
        const curl = Math.min(1, Math.abs(clamped));
        spread.style.setProperty('--turn', clamped.toFixed(3));
        spread.style.setProperty('--curl', curl.toFixed(3));
      });
    };

    update();
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const handleNav = (direction) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="scene">
      <header className="titlebar">
        <div>
          <p className="eyebrow">Omnitrix Archive</p>
          <h1>Ben 10 Notebook UI</h1>
          <p className="subtitle">Swipe to turn pages and explore the full roster.</p>
        </div>
        <div className="nav-buttons">
          <button type="button" onClick={() => handleNav(-1)}>Prev Page</button>
          <button type="button" onClick={() => handleNav(1)}>Next Page</button>
        </div>
      </header>

      <div className="book-shell">
        <div className="book" ref={scrollerRef}>
          {spreads.map((spread, index) => (
            <section
              key={`spread-${index}`}
              className="spread"
              ref={(el) => {
                spreadRefs.current[index] = el;
              }}
            >
              <article className="page left">
                {spread.left.type === 'cover' && <CoverPage />}
                {spread.left.type === 'intro' && <IntroPage />}
                {spread.left.type === 'characters' && (
                  <CharactersPage
                    items={spread.left.items}
                    pageNumber={spread.left.index + 1}
                    totalPages={totalCharacterPages}
                  />
                )}
                {spread.left.type === 'blank' && <BlankPage />}
              </article>

              <article className="page right">
                {spread.right.type === 'cover' && <CoverPage />}
                {spread.right.type === 'intro' && <IntroPage />}
                {spread.right.type === 'characters' && (
                  <CharactersPage
                    items={spread.right.items}
                    pageNumber={spread.right.index + 1}
                    totalPages={totalCharacterPages}
                  />
                )}
                {spread.right.type === 'blank' && <BlankPage />}
              </article>

              <div className="spine" aria-hidden="true" />
            </section>
          ))}
        </div>
      </div>

      <footer className="footer-note">
        Tip: Use trackpad or touch to drag the notebook. Pages snap as they turn.
      </footer>
    </div>
  );
}
