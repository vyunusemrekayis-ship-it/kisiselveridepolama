// Trabzon sinemaları — sinemalar.com üzerinden çeker (statik HTML, Cheerio uyumlu)
// Paribu Cineverse: salon/1311
// Lara Sinema:      salon/515
// CineGalaxy:       salon/1685
//
// sinemalar.com, tüm günlerin seanslarını tek sayfada gösterir.
// Gün filtresi yapılamadığı için film listesi + saatler tüm günler için
// aynı kabul edilir (sitenin davranışı bu yönde).

import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = "public/data/cinema.json";
const DAYS_AHEAD = 7;
const BASE = "https://www.sinemalar.com";

const SALONS = [
  {
    id:         "paribu-cineverse-forum-trabzon",
    name:       "Paribu Cineverse Forum Trabzon",
    salonId:    1311,
    salonSlug:  "trabzon-paribu-cineverse-forum-trabzon",
    address:    "Çömlekçi Mah. Devlet Sahil Yolu Cad. Forum AVM 100.Yıl Parkı Yanı Ortahisar/Trabzon",
    phone:      "0 (850) 220 09 67",
    bookingUrl: "https://www.paribucineverse.com/sinemalar/forum-trabzon",
  },
  {
    id:         "lara",
    name:       "Trabzon Lara Sinema Salonu",
    salonId:    515,
    salonSlug:  "trabzon-lara",
    address:    "Gazipaşa Mahallesi, Kasımoğlu Çk., Trabzon",
    phone:      "0 (462) 321 00 06",
    bookingUrl: "https://biletinial.com/tr-tr/mekan/lara-sinemalari",
  },
  {
    id:         "cinegalaxy",
    name:       "Cinegalaxy Trabzon Sinema Salonu",
    salonId:    1685,
    salonSlug:  "cinegalaxy-trabzon",
    address:    "Gülbahar Hatun Mah. İnönü Cad. No:8 Bodrum ve alt zemin kat Varlıbaş Atapark A.V.M – TRABZON",
    phone:      "0 (462) 223 18 81",
    bookingUrl: "https://www.cinegalaxysinemalari.com/place/CINE_GALAXY",
  },
];

// Türkiye saatiyle bugünden N gün
function getNextDays(n) {
  const days = [];
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept-Language": "tr-TR,tr;q=0.9",
      "Accept":          "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return res.text();
}

// sinemalar.com salon sayfasından film + seans parse et
function parseSalonHtml(html) {
  const $ = cheerio.load(html);
  const films = [];

  $("h3").each((_, h3El) => {
    const $h3 = $(h3El);
    const $link = $h3.find("a[href*='/film/']");
    const title = $link.text().trim();
    if (!title || title.length < 2) return;

    const filmPath = $link.attr("href") || "";
    const filmUrl = filmPath.startsWith("http") ? filmPath : BASE + filmPath;

    // Poster: h3'ten önceki img[alt*="afişi"]
    let poster = null;
    let $scan = $h3.prev();
    while ($scan.length) {
      if ($scan.is("h3")) break;
      if ($scan.is("img")) {
        const alt = $scan.attr("alt") || "";
        const src = $scan.attr("src") || $scan.attr("data-src") || "";
        if (alt.includes("afişi") && src) { poster = src; break; }
      }
      // img içinde iç içe olabilir
      const $img = $scan.find("img[alt*='afişi']").first();
      if ($img.length) { poster = $img.attr("src") || $img.attr("data-src") || null; break; }
      $scan = $scan.prev();
    }

    // h3'ten sonra: yıl, tür, format, saatler
    let year  = null;
    let genre = null;
    const formatMap = {}; // "2D - Türkçe Dublaj" → ["14:00", ...]
    let curFmt = null;

    $scan = $h3.next();
    while ($scan.length) {
      if ($scan.is("h3")) break; // başka film bloğu

      const tag  = $scan[0]?.name?.toLowerCase();
      const text = $scan.text().trim();

      // Yıl/süre satırı
      if (!year && /^\d{4}\s*[•·]/.test(text)) {
        year = text.match(/^(\d{4})/)?.[1] ?? null;
      }
      // Format başlığı: "2D - Altyazılı" vb.
      else if (/^(2D|3D|IMAX|4DX|ScreenX|MPX|Starium)\s*[-–]/.test(text)) {
        curFmt = text;
        if (!formatMap[curFmt]) formatMap[curFmt] = [];
      }
      // Seans saati linki
      else if (tag === "a" && curFmt) {
        const m = text.match(/(\d{1,2}:\d{2})/);
        if (m) formatMap[curFmt].push(m[1]);
      }
      // Tür: Türkçe büyükharfle başlar, virgül içerir, • içermez
      else if (!genre && /^[A-ZÇĞİÖŞÜ]/.test(text) && text.includes(",") && !text.includes("•") && text.length < 80) {
        genre = text;
      }
      // Tek kelime türler (virgüssüz ama tanınabilir türler)
      else if (!genre && /^(Aksiyon|Komedi|Dram|Korku|Animasyon|Belgesel|Romantik|Gerilim|Bilim|Macera|Fantastik|Aile)$/.test(text)) {
        genre = text;
      }

      $scan = $scan.next();
    }

    const allTimes   = [...new Set(Object.values(formatMap).flat())].sort();
    const formatList = Object.keys(formatMap).filter(f => formatMap[f].length > 0);

    if (title) {
      films.push({ title, filmUrl, poster: poster || null, year, genre, formats: formatList, times: allTimes });
    }
  });

  return films;
}

async function scrapeSalon(salon, days) {
  const url = `${BASE}/sinemasalonu/${salon.salonId}/${salon.salonSlug}`;
  try {
    console.log(`  → ${salon.name} (${url})`);
    const html = await fetchHtml(url);
    const films = parseSalonHtml(html);
    console.log(`     ${films.length} film, ${films.reduce((s, f) => s + f.times.length, 0)} seans`);

    // sinemalar.com tüm günler için aynı veriyi gösterir;
    // her güne aynı filmleri yaz (gelecekte gün bazlı filtreleme eklenebilir)
    const dayResults = days.map(date => ({ date, films: films.map(f => ({ ...f })) }));

    return {
      id:         salon.id,
      name:       salon.name,
      address:    salon.address,
      phone:      salon.phone,
      bookingUrl: salon.bookingUrl,
      days:       dayResults,
    };
  } catch (err) {
    console.error(`  HATA ${salon.name}: ${err.message}`);
    return {
      id:         salon.id,
      name:       salon.name,
      address:    salon.address,
      phone:      salon.phone,
      bookingUrl: salon.bookingUrl,
      error:      err.message,
      days:       days.map(date => ({ date, films: [] })),
    };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("=== Trabzon Sinema Scraper (sinemalar.com) ===");
  const days = getNextDays(DAYS_AHEAD);
  console.log(`Tarihler: ${days.join(", ")}\n`);

  const results = [];
  for (const salon of SALONS) {
    results.push(await scrapeSalon(salon, days));
    await sleep(1500); // sitenin rate limit'ine saygı
  }

  const output = { generatedAt: new Date().toISOString(), cinemas: results };
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✓ Yazıldı: ${OUTPUT_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
