import { useEffect, useState } from "react";
import "./Cinema.css";

const DATA_URL = "/data/cinema.json";

const TR_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function formatDayLabel(iso, idx) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = TR_DAYS[date.getDay()];
  const monthName = TR_MONTHS[date.getMonth()];
  if (idx === 0) return { short: "Bugün", long: `Bugün, ${d} ${monthName}` };
  if (idx === 1) return { short: "Yarın", long: `Yarın, ${d} ${monthName}` };
  return { short: dayName, long: `${dayName}, ${d} ${monthName}` };
}

export default function Cinema() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);

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

  // Gün listesini ilk sinemanın days dizisinden al
  const days = data.cinemas[0]?.days || [];

  return (
    <div className="cinema-page">
      <header className="cinema-header">
        <h1>Trabzon Sinemaları</h1>
        <p className="cinema-updated">
          Güncellendi: {formatDate(data.generatedAt)}
        </p>
      </header>

      {/* Gün sekmeleri */}
      <div className="day-tabs">
        {days.map((day, idx) => {
          const label = formatDayLabel(day.date, idx);
          return (
            <button
              key={day.date}
              className={`day-tab ${selectedDay === idx ? "day-tab--active" : ""}`}
              onClick={() => setSelectedDay(idx)}
            >
              <span className="day-tab__short">{label.short}</span>
              <span className="day-tab__long">{label.long}</span>
            </button>
          );
        })}
      </div>

      {/* Sinema kartları */}
      <div className="cinema-grid">
        {data.cinemas.map((cinema) => (
          <CinemaCard
            key={cinema.id}
            cinema={cinema}
            dayIndex={selectedDay}
          />
        ))}
      </div>
    </div>
  );
}

function CinemaCard({ cinema, dayIndex }) {
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

  const dayData = cinema.days?.[dayIndex];
  const films = dayData?.films || [];

  const mapsHref = cinema.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        (cinema.name || "") + " " + (cinema.address || "")
      )}`
    : null;

  return (
    <section className="cinema-card">
      <div className="cinema-card__head">
        <h2>{cinema.name || cinema.id}</h2>
        {cinema.address && (
          <a className="cinema-address" href={mapsHref} target="_blank" rel="noreferrer">
            📍 {cinema.address}
          </a>
        )}
        {cinema.phone && <span className="cinema-phone">{cinema.phone}</span>}
      </div>

      {films.length > 0 ? (
        <ul className="film-list">
          {films.map((film, i) => (
            <FilmRow key={i} film={film} bookingUrl={cinema.bookingUrl} />
          ))}
        </ul>
      ) : (
        <p className="cinema-empty">Bu gün için seans bilgisi bulunamadı.</p>
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
          {film.title}
          {film.year && <span className="film-year"> ({film.year})</span>}
        </h3>
        {film.genre && <p className="film-genre">{film.genre}</p>}

        {film.formats?.map((fmt, i) => (
          <span className="format-badge" key={i}>{fmt}</span>
        ))}

        {film.times?.length > 0 ? (
          <div className="time-chips">
            {film.times.map((t, i) => (
              <a key={i} className="time-chip" href={bookingUrl} target="_blank" rel="noreferrer">
                {t}
              </a>
            ))}
          </div>
        ) : (
          <p className="no-times">Seans saati henüz eklenmedi</p>
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
