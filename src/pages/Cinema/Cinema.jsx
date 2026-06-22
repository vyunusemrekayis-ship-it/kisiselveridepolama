import { useEffect, useState } from "react";
import "./Cinema.css";

const DATA_URL = "/data/cinema.json";

export default function Cinema() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Veri bulunamadı");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="cinema-page">
        <p className="cinema-error">Sinema verisi yüklenemedi: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="cinema-page">
        <CinemaSkeleton />
      </div>
    );
  }

  return (
    <div className="cinema-page">
      <header className="cinema-header">
        <h1>Trabzon Sinemaları</h1>
        <p className="cinema-updated">
          Güncellendi: {formatDate(data.generatedAt)}
        </p>
      </header>

      <div className="cinema-grid">
        {data.cinemas.map((cinema) => (
          <CinemaCard key={cinema.id} cinema={cinema} />
        ))}
      </div>
    </div>
  );
}

function CinemaCard({ cinema }) {
  if (cinema.error) {
    return (
      <section className="cinema-card cinema-card--error">
        <h2>{cinema.id}</h2>
        <p>Bu sinemanın verisi şu an çekilemedi.</p>
        <a href={cinema.bookingUrl} target="_blank" rel="noreferrer">
          Sinemanın sitesine git →
        </a>
      </section>
    );
  }

  const mapsHref = cinema.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        cinema.name + " " + cinema.address
      )}`
    : null;

  return (
    <section className="cinema-card">
      <div className="cinema-card__head">
        <h2>{cinema.name}</h2>
        {cinema.address && (
          <a className="cinema-address" href={mapsHref} target="_blank" rel="noreferrer">
            {cinema.address}
          </a>
        )}
        {cinema.phone && <span className="cinema-phone">{cinema.phone}</span>}
      </div>

      {cinema.films?.length ? (
        <ul className="film-list">
          {cinema.films.map((film, i) => (
            <FilmRow key={i} film={film} bookingUrl={cinema.bookingUrl} />
          ))}
        </ul>
      ) : (
        <p className="cinema-empty">Bugün için seans bilgisi bulunamadı.</p>
      )}

      {cinema.thisWeekFilms?.length > 0 && (
        <details className="week-films">
          <summary>Bu hafta vizyonda ({cinema.thisWeekFilms.length} film)</summary>
          <div className="week-films__grid">
            {cinema.thisWeekFilms.map((f, i) => (
              <div className="week-film" key={i}>
                {f.poster && <img src={f.poster} alt={f.title} loading="lazy" />}
                <span>{f.title}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <a className="booking-link" href={cinema.bookingUrl} target="_blank" rel="noreferrer">
        Bilet Al →
      </a>
    </section>
  );
}

function FilmRow({ film, bookingUrl }) {
  return (
    <li className="film-row">
      {film.poster ? (
        <img className="film-poster" src={film.poster} alt={film.title} loading="lazy" />
      ) : (
        <div className="film-poster film-poster--placeholder" aria-hidden="true" />
      )}

      <div className="film-info">
        <h3>
          {film.title} {film.year && <span className="film-year">({film.year})</span>}
        </h3>
        {film.genre && <p className="film-genre">{film.genre}</p>}

        {film.formats?.map((fmt, i) => {
          const formatTimes = film.times; // tek format varsayımı; çoklu format ayrımı kaynak verisine bağlı
          return (
            <div className="format-row" key={i}>
              <span className="format-badge">{fmt}</span>
            </div>
          );
        })}

        {film.times?.length > 0 && (
          <div className="time-chips">
            {film.times.map((t, i) => (
              <a
                key={i}
                className="time-chip"
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t}
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function CinemaSkeleton() {
  return (
    <div className="cinema-grid">
      {[0, 1, 2].map((i) => (
        <div className="cinema-card cinema-card--skeleton" key={i}>
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--sub" />
          <div className="skeleton-film" />
          <div className="skeleton-film" />
        </div>
      ))}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
