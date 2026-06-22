// Trabzon sinemaları için sinemalar.com'dan veri çeker.
// Çalıştırma: node scripts/scrape-cinema.mjs
// Çıktı: public/data/cinema.json

import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = "public/data/cinema.json";
const DAYS_AHEAD = 7;

const CINEMAS = [
  {
    id: "paribu-cineverse-forum-trabzon",
    sourceUrl: "https://www.sinemalar.com/sinemasalonu/1311/trabzon-paribu-cineverse-forum-trabzon",
    bookingUrl: "https://www.paribucineverse.com/sinemalar/forum-trabzon",
  },
  {
    id: "lara",
    sourceUrl: "https://www.sinemalar.com/sinemasalonu/515/trabzon-lara",
    bookingUrl: "https://biletinial.com/tr-tr/mekan/lara-sinemalari",
  },
  {
    id: "cinegalaxy",
    sourceUrl: "https://www.sinemalar.com/sinemasalonu/1685/cinegalaxy-trabzon",
    bookingUrl: "https://www.cinegalaxysinemalari.com/place/CINE_GALAXY",
  },
];

const TIME_RE = /\b([01]?\d|2[0-3]):[0-5]\d\b/g;
const FORMAT_RE = /\b(2D|3D|IMAX|4DX|ScreenX)\s*-?\s*(Altyazılı|Dublajlı|Türkçe Dublaj|Türkçe|Orijinal)?\b/gi;

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

// Türkiye saatiyle bugün + N gün sonrasının tarihlerini üret
function getNextDays(n) {
  const tz = "Europe/Istanbul";
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const [year, month, day] = iso.split("-");
    const tarih = `${day}-${month}-${year}`; // DD-MM-YYYY (sinemalar.com formatı)
    days.push({ iso, tarih });
  }
  return days;
}

function parseFilms(html) {
  const $ = cheerio.load(html);

  const name = $("h1").first().text().trim();
  const bodyText = $("body").text();
  const addressMatch = bodyText.match(/Adres:\s*([^\n]+?)(?:Tel:|$)/);
  const address = addressMatch ? addressMatch[1].trim() : null;
  const phone = $('a[href^="tel:"]').first().text().trim() || null;

  const sectionHeading = $("h2, h1")
    .filter((_, el) => $(el).text().includes("Bu Salonda Gösterimde Olan Filmler"))
    .first();

  const films = [];

  if (sectionHeading.length) {
    const container = sectionHeading.nextUntil("h2");
    const posters = container.find('img[alt*="afişi"]').toArray();

    posters.forEach((posterEl, idx) => {
      const $poster = $(posterEl);
      const poster = $poster.attr("src") || null;
      const altText = $poster.attr("alt") || "";
      const titleYearMatch = altText.match(/^(.*?)\s*\((\d{4})\)\s*afişi/);
      const title = titleYearMatch ? titleYearMatch[1].trim() : altText.replace(/afişi$/, "").trim();
      const year = titleYearMatch ? titleYearMatch[2] : null;

      const fullText = container.text();
      const allTitles = posters.map((p) => $(p).attr("alt") || "");
      const startIdx = fullText.indexOf(altText);
      const nextAlt = allTitles[idx + 1];
      const endIdx = nextAlt ? fullText.indexOf(nextAlt, startIdx + altText.length) : fullText.length;
      const segment = startIdx >= 0 ? fullText.slice(startIdx, endIdx > startIdx ? endIdx : undefined) : "";

      const times = [...new Set((segment.match(TIME_RE) || []))].sort();
      const formatMatches = [...segment.matchAll(FORMAT_RE)].map((m) => m[0].replace(/\s+/g, " ").trim());
      const formats = [...new Set(formatMatches)];
      const genreMatch = segment.match(/\d+\s*saat\s*\d+\s*dakika[^•\n]*•\s*([^\n]+?)(?:Yönetmen|$)/);
      const genre = genreMatch ? genreMatch[1].trim() : null;

      if (title) films.push({ title, year, genre, poster, formats: formats.length ? formats : null, times });
    });
  }

  return { name, address, phone, films };
}

async function main() {
  const days = getNextDays(DAYS_AHEAD);
  const cinemas = [];

  for (const cinema of CINEMAS) {
    console.log(`\n--- ${cinema.id} ---`);
    let cinemaName = null;
    let cinemaAddress = null;
    let cinemaPhone = null;
    const dayResults = [];

    for (const day of days) {
      const url = `${cinema.sourceUrl}?tarih=${day.tarih}`;
      try {
        console.log(`  Çekiliyor: ${day.iso} (${day.tarih})`);
        const html = await fetchHtml(url);
        const { name, address, phone, films } = parseFilms(html);

        if (!cinemaName && name) cinemaName = name;
        if (!cinemaAddress && address) cinemaAddress = address;
        if (!cinemaPhone && phone) cinemaPhone = phone;

        dayResults.push({ date: day.iso, films });
        console.log(`    ${films.length} film bulundu`);
      } catch (err) {
        console.error(`  Hata (${day.iso}):`, err.message);
        dayResults.push({ date: day.iso, films: [], error: err.message });
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    cinemas.push({
      id: cinema.id,
      name: cinemaName,
      address: cinemaAddress,
      phone: cinemaPhone,
      bookingUrl: cinema.bookingUrl,
      days: dayResults,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    cinemas,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nYazıldı: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
