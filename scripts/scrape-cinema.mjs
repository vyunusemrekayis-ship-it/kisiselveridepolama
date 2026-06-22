// Trabzon sinemaları için sinemalar.com'dan veri çeker.
// Çalıştırma: node scripts/scrape-cinema.mjs
// Çıktı: public/data/cinema.json

import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = "public/data/cinema.json";

// Trabzon'daki 3 sinema - sinemalar.com salon ID'leri sabit
const CINEMAS = [
  {
    id: "paribu-cineverse-forum-trabzon",
    sourceUrl:
      "https://www.sinemalar.com/sinemasalonu/1311/trabzon-paribu-cineverse-forum-trabzon",
    bookingUrl: "https://www.paribucineverse.com/sinemalar/forum-trabzon",
  },
  {
    id: "lara",
    sourceUrl: "https://www.sinemalar.com/sinemasalonu/515/trabzon-lara",
    bookingUrl: "https://biletinial.com/tr-tr/mekan/lara-sinemalari",
  },
  {
    id: "cinegalaxy",
    sourceUrl:
      "https://www.sinemalar.com/sinemasalonu/1685/cinegalaxy-trabzon",
    bookingUrl: "https://www.cinegalaxysinemalari.com/place/CINE_GALAXY",
  },
];

const TIME_RE = /\b([01]?\d|2[0-3]):[0-5]\d\b/g;
const FORMAT_RE =
  /\b(2D|3D|IMAX|4DX|ScreenX)\s*-?\s*(Altyazılı|Dublajlı|Türkçe Dublaj|Türkçe|Orijinal)?\b/gi;

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

function todayISO() {
  // Türkiye saatine göre bugünün tarihi
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  return now.toISOString().slice(0, 10);
}

function parseSalonPage(html) {
  const $ = cheerio.load(html);

  const name = $("h1").first().text().trim();

  // Adres: "**Adres:**" benzeri etiketten sonraki metin
  const bodyText = $("body").text();
  const addressMatch = bodyText.match(/Adres:\s*([^\n]+?)(?:Tel:|$)/);
  const address = addressMatch ? addressMatch[1].trim() : null;

  const phone = $('a[href^="tel:"]').first().text().trim() || null;

  // "Bu Salonda Gösterimde Olan Filmler" bölümünü bul
  const sectionHeading = $("h2, h1")
    .filter((_, el) =>
      $(el).text().includes("Bu Salonda Gösterimde Olan Filmler")
    )
    .first();

  const films = [];

  if (sectionHeading.length) {
    // Bu başlıktan sonraki, bir sonraki h2'ye kadar olan tüm içerik
    const container = sectionHeading.nextUntil("h2");
    const posters = container.find('img[alt*="afişi"]').toArray();

    posters.forEach((posterEl, idx) => {
      const $poster = $(posterEl);
      const poster = $poster.attr("src") || null;
      const altText = $poster.attr("alt") || "";
      const titleYearMatch = altText.match(/^(.*?)\s*\((\d{4})\)\s*afişi/);
      const title = titleYearMatch ? titleYearMatch[1].trim() : altText.replace(/afişi$/, "").trim();
      const year = titleYearMatch ? titleYearMatch[2] : null;

      const filmLink = $poster
        .closest("a")
        .attr("href") ||
        $poster.parent().find('a[href*="/film/"]').first().attr("href") ||
        null;

      // Bu poster ile bir sonraki poster arasındaki metni tara (format + saatler için)
      // Tüm container metnini al, poster sırasına göre böl
      const fullText = container.text();
      const allTitles = posters.map((p) => $(p).attr("alt") || "");
      const startIdx = fullText.indexOf(altText);
      const nextAlt = allTitles[idx + 1];
      const endIdx = nextAlt ? fullText.indexOf(nextAlt, startIdx + altText.length) : fullText.length;
      const segment = startIdx >= 0 ? fullText.slice(startIdx, endIdx > startIdx ? endIdx : undefined) : "";

      const times = [...new Set((segment.match(TIME_RE) || []))].sort();
      const formatMatches = [...segment.matchAll(FORMAT_RE)].map((m) =>
        m[0].replace(/\s+/g, " ").trim()
      );
      const formats = [...new Set(formatMatches)];

      // Tür / süre bilgisi (örn: "1 saat 49 dakika • ABD" ve ardından tür)
      const genreMatch = segment.match(
        /\d+\s*saat\s*\d+\s*dakika[^•\n]*•\s*([^\n]+?)(?:Yönetmen|$)/
      );
      const genre = genreMatch ? genreMatch[1].trim() : null;

      if (title) {
        films.push({
          title,
          year,
          genre,
          poster,
          link: filmLink,
          formats: formats.length ? formats : null,
          times,
        });
      }
    });
  }

  // "Vizyondaki Filmler" - bu hafta oynayan diğer filmler (saat bilgisi yok)
  const weekHeading = $("h2, h1")
    .filter((_, el) => $(el).text().trim() === "Vizyondaki Filmler")
    .first();

  const thisWeekFilms = [];
  if (weekHeading.length) {
    const weekContainer = weekHeading.nextUntil("h2");
    weekContainer.find('img[alt*="afişi"]').each((_, el) => {
      const $img = $(el);
      const altText = $img.attr("alt") || "";
      const titleYearMatch = altText.match(/^(.*?)\s*\((\d{4})\)\s*afişi/);
      const title = titleYearMatch ? titleYearMatch[1].trim() : altText.replace(/afişi$/, "").trim();
      if (title && !films.find((f) => f.title === title)) {
        thisWeekFilms.push({
          title,
          poster: $img.attr("src") || null,
        });
      }
    });
  }

  return { name, address, phone, films, thisWeekFilms };
}

async function main() {
  const date = todayISO();
  const cinemas = [];

  for (const cinema of CINEMAS) {
    try {
      console.log(`Çekiliyor: ${cinema.id}`);
      const html = await fetchHtml(cinema.sourceUrl);
      const parsed = parseSalonPage(html);
      cinemas.push({
        id: cinema.id,
        ...parsed,
        bookingUrl: cinema.bookingUrl,
        sourceUrl: cinema.sourceUrl,
      });
    } catch (err) {
      console.error(`Hata (${cinema.id}):`, err.message);
      cinemas.push({
        id: cinema.id,
        error: err.message,
        bookingUrl: cinema.bookingUrl,
        sourceUrl: cinema.sourceUrl,
      });
    }
    // Siteye nazik davranmak için kısa bekleme
    await new Promise((r) => setTimeout(r, 1500));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    date,
    cinemas,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Yazıldı: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
