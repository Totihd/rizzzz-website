(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const WHATSAPP = "6282289148143";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const revealEls = $$("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => io.observe(el));
  }

  const intro = $("#intro");
  if (intro) {
    const introBar = $("#introBar");
    const introFill = $("#introFill");
    const introPct = $("#introPct");
    const introStatus = $("#introStatus");
    let introDone = false;

    const finishIntro = (instant) => {
      if (introDone) return;
      introDone = true;
      document.body.classList.remove("has-intro");
      document.body.classList.add("is-entered");
      if (instant) { intro.remove(); return; }
      intro.classList.add("is-leaving");
      window.setTimeout(() => intro.remove(), 720);
    };

    let introSeen = false;
    try { introSeen = sessionStorage.getItem("rzIntro") === "1"; } catch (e) {}

    if (reduceMotion || introSeen) {
      finishIntro(true);
    } else {
      try { sessionStorage.setItem("rzIntro", "1"); } catch (e) {}

      const STATUS = ["Menyiapkan layanan…", "Memuat pricelist…", "Menghubungkan admin…", "Siap masuk."];
      let progress = 0;
      const timer = window.setInterval(() => {
        progress = Math.min(100, progress + 6 + Math.random() * 12);
        const pct = Math.floor(progress);
        introFill.style.width = pct + "%";
        introPct.textContent = pct + "%";
        introBar.setAttribute("aria-valuenow", String(pct));
        introStatus.textContent = STATUS[Math.min(STATUS.length - 1, Math.floor(pct / 26))];
        if (progress >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => finishIntro(false), 420);
        }
      }, 150);

      window.setTimeout(() => finishIntro(false), 6500);
    }
  }

  let audioCtx = null;

  function tick(kind) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const hi = kind === "confirm" ? 880 : kind === "open" ? 700 : 560;
      const lo = kind === "confirm" ? 1240 : kind === "open" ? 470 : 400;
      o.type = "triangle";
      o.frequency.setValueAtTime(hi, t);
      o.frequency.exponentialRampToValueAtTime(lo, t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.12);
    } catch (e) {}
  }

  document.addEventListener("pointerdown", (e) => {
    const hit = e.target.closest && e.target.closest("a[href], button:not([disabled])");
    if (hit) tick();
  }, { passive: true });

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const visibleFocusables = (modal) =>
    $$(FOCUSABLE, modal).filter((el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  let lastFocused = null;

  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-modal");
    const focusable = visibleFocusables(modal)[0];
    if (focusable) focusable.focus();
  };
  const closeModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!$(".modal.is-open")) {
      document.body.classList.remove("has-modal");

      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
      lastFocused = null;
    }
  };
  const closeAllModals = () => $$(".modal.is-open").forEach((m) => closeModal(m.id));

  $$("[data-open-modal]").forEach((btn) =>
    btn.addEventListener("click", () => openModal(btn.getAttribute("data-open-modal"))));
  $$("[data-close-modal]").forEach((btn) =>
    btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close-modal"))));
  $$(".modal").forEach((modal) =>
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(modal.id); }));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeAllModals(); return; }
    if (e.key !== "Tab") return;
    const modal = $(".modal.is-open");
    if (!modal) return;
    const items = visibleFocusables(modal);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !modal.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !modal.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  });

  const IDR = (v) => "Rp " + Math.round(v).toLocaleString("id-ID");
  const MYR = (v) =>
    (Math.round(v * 100) / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " RM";
  const priceText = (v, region) => (region === "MY" ? MYR(v) : IDR(v));

  const PRICING = {
    "Joki Mobile Legend": {
      qtyLabel: "Jumlah bintang",
      packages: {
        ID: [["EPIC", 3000], ["LEGEND", 5000], ["MYTHIC", 7000], ["HONOR", 10000], ["GLORY", 12000], ["IMMO", 15000]],
        MY: [["EPIC", 0.6], ["LEGEND", 1.15], ["MYTHIC", 1.6], ["HONOR", 2.29], ["GLORY", 2.75], ["IMMO", 3.44]],
      },
    },
    "Joki Gendong": {
      qtyLabel: "Jumlah bintang",
      packages: {
        ID: [["EPIC", 5000], ["LEGEND", 7000], ["MYTHIC", 9000], ["HONOR", 12000], ["GLORY", 15000], ["IMMO", 18000]],
        MY: [["EPIC", 1.15], ["LEGEND", 1.6], ["MYTHIC", 2.06], ["HONOR", 2.75], ["GLORY", 3.44], ["IMMO", 4.12]],
      },
    },
    "Joki Montage": {
      qtyLabel: "Jumlah paket",
      packages: {
        ID: [["InGame · 30 detik", 20000], ["InGame · 40 detik", 25000], ["InGame · 1 menit", 35000], ["Replay · 30 detik", 30000], ["Replay · 40 detik", 35000], ["Replay · 1 menit", 45000]],
        MY: [["InGame · 30 detik", 4.5], ["InGame · 40 detik", 5.6], ["InGame · 1 menit", 7.9], ["Replay · 30 detik", 6.8], ["Replay · 40 detik", 7.9], ["Replay · 1 menit", 10.3]],
      },
    },
    "Joki Classic / CLWR": {
      qtyLabel: "Jumlah paket",
      packages: {
        ID: [["Classic / Win — Honor", 5000], ["Classic / Win — Glory", 6000], ["Classic 10x Wins", 40000], ["Classic 10x Wins — Honor", 47000], ["Classic 10x Wins — Glory", 50000]],
        MY: [],
      },
    },
  };

  let presetOrder = null;

  const orderForm = $("#orderForm");
  if (orderForm) {
    const serviceSel = $("#orderService");
    const regionSel = $("#orderRegion");
    const packageSel = $("#orderPackage");
    const qtyInput = $("#orderQty");
    const qtyLabel = $("#orderQtyLabel");
    const totalEl = $("#orderTotal");
    const orderPanel = orderForm.closest(".panel");

    const currentList = () => {
      const cfg = PRICING[serviceSel.value];
      return cfg ? cfg.packages[regionSel.value] || [] : [];
    };

    function updateTotal() {
      const cfg = PRICING[serviceSel.value];
      const unit = currentList().find(([name]) => name === packageSel.value);
      if (!cfg || !unit) {
        totalEl.textContent = serviceSel.value ? "Pilih paket" : "Pilih layanan & paket";
        return;
      }
      const qty = Math.max(1, Math.floor(Number(qtyInput.value) || 1));
      let text = priceText(unit[1] * qty, regionSel.value);
      if (qty > 1) text += "  ·  " + priceText(unit[1], regionSel.value) + " × " + qty;
      totalEl.textContent = text;
    }

    function fillPackages() {
      const cfg = PRICING[serviceSel.value];
      packageSel.innerHTML = "";
      qtyLabel.textContent = cfg ? cfg.qtyLabel : "Jumlah";
      if (!cfg) {
        packageSel.disabled = true;
        packageSel.appendChild(new Option("Pilih layanan dulu", ""));
        return updateTotal();
      }
      const list = currentList();
      if (!list.length) {
        packageSel.disabled = true;
        packageSel.appendChild(new Option("Harga belum tersedia — tanya admin", ""));
        return updateTotal();
      }
      packageSel.disabled = false;
      packageSel.appendChild(new Option("Pilih paket", ""));
      list.forEach(([name]) => packageSel.appendChild(new Option(name, name)));
      updateTotal();
    }

    serviceSel.addEventListener("change", fillPackages);
    regionSel.addEventListener("change", () => {
      const keep = packageSel.value;
      fillPackages();
      if ([...packageSel.options].some((o) => o.value === keep)) packageSel.value = keep;
      updateTotal();
    });
    packageSel.addEventListener("change", updateTotal);
    qtyInput.addEventListener("input", updateTotal);

    fillPackages();

    orderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!orderForm.reportValidity()) return;

      const val = (id) => (document.getElementById(id)?.value || "").trim();
      const qty = Math.max(1, Math.floor(Number(qtyInput.value) || 1));
      const unit = currentList().find(([name]) => name === packageSel.value);
      const lines = [
        "Halo RizzzStore.id, saya mau order.",
        "",
        "Layanan: " + val("orderService"),
        "Region: " + (regionSel.value === "MY" ? "Malaysia" : "Indonesia"),
        unit ? "Paket: " + unit[0] : "",
        unit && qty > 1 ? qtyLabel.textContent + ": " + qty : "",
        unit ? "Estimasi total: " + priceText(unit[1] * qty, regionSel.value) + " (konfirmasi admin)" : "",
        "Nama/Nick: " + val("orderName"),
        val("orderHero") ? "Req Hero: " + val("orderHero") : "",
        val("orderNote") ? "Catatan: " + val("orderNote") : "",
      ].filter(Boolean);

      window.open(
        `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join("\n"))}`,
        "_blank", "noopener"
      );
    });

    function applyPreset(service, pkg, region, qty) {
      if (service && PRICING[service]) serviceSel.value = service;
      if (region) regionSel.value = region;
      fillPackages();
      if (pkg) {
        const has = () => [...packageSel.options].some((o) => o.value === pkg);
        if (!has() && !region) {
          const other = regionSel.value === "MY" ? "ID" : "MY";
          const cfg = PRICING[serviceSel.value];
          if (cfg && (cfg.packages[other] || []).some(([n]) => n === pkg)) {
            regionSel.value = other;
            fillPackages();
          }
        }
        if (has()) packageSel.value = pkg;
      }
      qtyInput.value = String(Math.max(1, Math.floor(Number(qty) || 1)));
      updateTotal();

      closeAllModals();
      const target = document.getElementById("order");
      if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (orderPanel) {
        orderPanel.classList.add("is-flash");
        window.setTimeout(() => orderPanel.classList.remove("is-flash"), 1400);
      }
    }
    presetOrder = applyPreset;

    $$(".price-row__pick").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal");
        const block = btn.closest(".price-block");
        applyPreset(
          modal && modal.getAttribute("data-service"),
          btn.getAttribute("data-package"),
          (block && block.getAttribute("data-region")) || null
        );
      });
    });

    $$("[data-order-cta]").forEach((cta) => {
      cta.addEventListener("click", (event) => {
        event.preventDefault();
        const modal = cta.closest(".modal");
        applyPreset(modal && modal.getAttribute("data-service"), null, null);
      });
    });
  }

  const SUPABASE_URL = "https://rxjtlfqhannwlcxbalny.supabase.co";
  const SUPABASE_KEY = "sb_publishable_PizOBYcrKA5DilDZw_JEcg_VtgKN6wN";

  const reviewForm = $("#reviewForm");
  const reviewList = $("#reviewList");
  const averageRating = $("#averageRating");
  const reviewStatus = $("#reviewStatus");
  const starButtons = $$(".star-btn");
  let selectedRating = 0;

  const SUPA_HEADERS = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
  };
  async function supabaseSelectReviews() {
    const res = await fetch(
      SUPABASE_URL + "/rest/v1/reviews?select=*&order=created_at.desc&limit=30",
      { headers: SUPA_HEADERS, cache: "no-store" }
    );
    if (!res.ok) throw new Error("Supabase REST HTTP " + res.status);
    return res.json();
  }
  async function supabaseInsertReview(row) {
    const res = await fetch(SUPABASE_URL + "/rest/v1/reviews", {
      method: "POST",
      headers: Object.assign({ Prefer: "return=minimal" }, SUPA_HEADERS),
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error("Supabase REST HTTP " + res.status);
  }

  const REVIEW_CACHE_KEY = "rzReviewsCache";
  function readReviewCache() {
    try {
      const v = JSON.parse(localStorage.getItem(REVIEW_CACHE_KEY) || "null");
      if (v && Array.isArray(v.rows)) return v.rows;
    } catch (e) {  }
    return null;
  }
  function writeReviewCache(rows) {
    try {
      localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify({ t: Date.now(), rows }));
    } catch (e) {  }
  }

  const stars = (n) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

  function updateRatingLd(rows) {
    const el = document.getElementById("ldRating");
    if (!el) return;
    const list = (rows || []).filter(
      (r) => !isToxic(r.name) && !isToxic(r.text) && Number(r.rating) >= 1
    );
    if (!list.length) { el.textContent = ""; return; }
    const avg = list.reduce((s, r) => s + Number(r.rating), 0) / list.length;
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://rizzzstore.my.id/#org",
      name: "RizzzStore.id",
      url: "https://rizzzstore.my.id/",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(avg.toFixed(1)),
        reviewCount: list.length,
        bestRating: 5,
        worstRating: 1,
      },
    });
  }

  const TOXIC_WORDS = [
    "puki", "pukimak", "puk1", "kontol", "kntl", "memek", "mmk", "pepek",
    "ngentot", "ngentod", "ngntd", "entot",
    "tai", "tahi", "bangsat", "bangke", "bajingan", "keparat", "kampret",
    "anjing", "anjeng", "anjg", "anjir", "asu", "babi", "kunyuk",
    "goblok", "goblog", "tolol", "bego", "idiot", "bodoh", "dungu",
    "jancok", "jancuk", "jancik", "cok", "kimak", "setan",
    "fuck", "fuk", "shit", "bitch", "bastard", "asshole", "dick", "pussy",
    "bokep", "colmek", "coli", "sex", "ngaceng", "sange",
  ];
  const toxicRe = new RegExp(
    "(^|[^a-z0-9])(" + TOXIC_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")([^a-z0-9]|$)",
    "i"
  );
  const isToxic = (value) => toxicRe.test(String(value || "").toLowerCase());

  function renderReviews(rows) {
    rows = (Array.isArray(rows) ? rows : []).filter(
      (row) => !isToxic(row.name) && !isToxic(row.text)
    );
    updateRatingLd(rows);
    reviewList.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "review-empty mono";
      empty.textContent = "Belum ada ulasan. Jadilah yang pertama!";
      reviewList.appendChild(empty);
      averageRating.textContent = "★ 0.0";
      return;
    }

    const avg = rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / rows.length;
    averageRating.textContent = "★ " + avg.toFixed(1);

    rows.slice(0, 8).forEach((row) => {
      const item = document.createElement("div");
      item.className = "review-item";

      const top = document.createElement("div");
      top.className = "review-item__top";

      const name = document.createElement("span");
      name.className = "review-item__name";
      name.textContent = row.name ?? "Anonim";

      const rate = document.createElement("span");
      rate.className = "review-item__stars";
      rate.textContent = stars(Number(row.rating) || 0);

      top.append(name, rate);

      const text = document.createElement("p");
      text.className = "review-item__text";
      text.textContent = row.text ?? "";

      item.append(top, text);
      reviewList.appendChild(item);
    });
  }

  async function loadReviews() {

    const cached = readReviewCache();
    if (cached && cached.length) renderReviews(cached);

    try {
      const data = await supabaseSelectReviews();
      if (Array.isArray(data)) {
        renderReviews(data);
        writeReviewCache(data);
      }
    } catch (err) {
      console.error("RizzzStore review error:", err);

      if (!cached || !cached.length) {
        reviewList.innerHTML =
          '<p class="review-empty mono">Ulasan belum dapat dimuat.<br>Silakan coba lagi nanti.</p>';
      }
    }
  }

  if (reviewForm) {
    const setRating = (value, moveFocus) => {
      selectedRating = Math.max(0, Math.min(5, value));
      starButtons.forEach((b, i) => {
        const on = i < selectedRating;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", String(on));
        if (moveFocus && i === selectedRating - 1) b.focus();
      });
    };
    starButtons.forEach((btn, i) => {
      btn.addEventListener("click", () => setRating(Number(btn.dataset.star), false));
      btn.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault(); setRating(selectedRating + 1, true);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault(); setRating(selectedRating - 1, true);
        }
      });
    });

    reviewForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const honeypot = $("#reviewWebsite");
      if (honeypot && honeypot.value.trim()) {
        reviewForm.reset();
        reviewStatus.textContent = "Ulasan berhasil dikirim. Terima kasih!";
        return;
      }

      let lastSent = 0;
      try { lastSent = Number(localStorage.getItem("rzReviewAt") || 0); } catch (e) {  }
      if (Date.now() - lastSent < 60000) {
        reviewStatus.textContent = "Tunggu sebentar sebelum mengirim ulasan lagi.";
        return;
      }

      if (!selectedRating) { reviewStatus.textContent = "Pilih rating bintang dulu."; return; }

      const name = $("#reviewName").value.trim();
      const text = $("#reviewText").value.trim();
      if (!name || !text) { reviewStatus.textContent = "Isi nama dan ulasan."; return; }
      if (isToxic(name) || isToxic(text)) {
        reviewStatus.textContent = "Ulasan mengandung kata yang tidak pantas. Mohon gunakan bahasa yang sopan.";
        return;
      }
      reviewForm.style.opacity = ".6";
      reviewStatus.textContent = "Mengirim ulasan...";

      try {
        await supabaseInsertReview({ name, rating: selectedRating, text });
      } catch (error) {
        reviewForm.style.opacity = "";
        reviewStatus.textContent = "Gagal mengirim. Coba lagi.";
        console.error(error);
        return;
      }

      reviewForm.style.opacity = "";

      try { localStorage.setItem("rzReviewAt", String(Date.now())); } catch (e) {  }
      reviewForm.reset();
      setRating(0, false);
      reviewStatus.textContent = "Ulasan berhasil dikirim. Terima kasih!";
      await loadReviews();
    });

    loadReviews();
  }

  const mainEl = $("main");
  const footerEl = $(".site-footer");
  const toolsPage = $("#gamingToolsPage");
  const simplePage = $("#simpleAppPage");
  const simpleContent = $("#simplePageContent");
  const dockButtons = $$(".dock__btn");
  const catalog = $("#toolsCatalog");
  const screens = $$(".tool-screen");

  const helpGroups = [
    { name: "Umum", items: [
      ["Apa itu RIZZZSTORE.ID?", "RIZZZSTORE.ID menyediakan layanan dan bantuan seputar kebutuhan gaming. Lihat daftar layanan dan pricelist di halaman Beranda sebelum memesan."],
      ["Bagaimana cara menghubungi customer service?", "Tekan tombol Kirim Pesan di bawah halaman Bantuan untuk menghubungi admin via WhatsApp. Bisa juga lewat Instagram @rizzzjoki.id atau TikTok @rizzzstore.joki."],
      ["Apakah ada biaya tambahan untuk transaksi?", "Harga mengikuti pricelist yang ditampilkan. Jika ada biaya atau ketentuan khusus, konfirmasikan dulu ke admin sebelum menyetujui pesanan."],
    ]},
    { name: "Top Up", items: [
      ["Bagaimana cara memesan layanan?", "Pilih layanan di halaman Beranda, baca pricelist, lalu isi formulir pesanan. Periksa kembali detailnya sebelum lanjut ke WhatsApp."],
      ["Bagaimana cara memilih layanan yang tepat?", "Buka kartu layanan yang sesuai, lalu tekan tombol pricelist untuk melihat paket dan harganya. Jika bingung, tanyakan ke admin."],
      ["Berapa lama proses pesanan?", "Waktu pengerjaan berbeda sesuai jenis layanan dan antrean. Tanyakan estimasi terbaru ke admin sebelum memesan."],
      ["Apakah saya bisa menulis request hero?", "Bisa. Isi kolom Req Hero / Request Hero pada formulir pesanan dengan hero yang kamu inginkan."],
    ]},
    { name: "Pembayaran", items: [
      ["Bagaimana cara melanjutkan pemesanan?", "Setelah mengisi formulir, tekan Lanjut Order via WhatsApp. Pesan berisi detail pesanan akan disiapkan agar bisa dikonfirmasi dengan admin."],
      ["Metode pembayaran apa yang tersedia?", "Konfirmasikan metode pembayaran yang tersedia langsung ke admin melalui WhatsApp sebelum membayar."],
      ["Kapan saya harus membayar?", "Tunggu konfirmasi detail pesanan dan instruksi pembayaran dari admin. Jangan mengirim pembayaran sebelum rincian jelas."],
      ["Apa yang harus saya lakukan setelah membayar?", "Simpan bukti pembayaran dan kirimkan ke admin sesuai instruksi, lalu tunggu konfirmasi."],
    ]},
    { name: "Pengembalian Dana", items: [
      ["Apakah pembayaran bisa dikembalikan?", "Ketentuan pengembalian bergantung pada status dan kondisi pesanan. Hubungi admin dengan detail pesanan untuk meminta pemeriksaan."],
      ["Bagaimana cara mengajukan pengembalian dana?", "Hubungi admin via WhatsApp, jelaskan kendala, dan sertakan detail pesanan serta bukti pembayaran jika ada."],
    ]},
    { name: "Keamanan", items: [
      ["Apakah data pesanan saya aman?", "Berikan hanya informasi yang diperlukan untuk memproses pesanan. Jangan pernah membagikan kata sandi akun atau kode OTP ke siapa pun."],
      ["Apakah saya perlu memberikan kode OTP?", "Tidak. Jangan berikan kode OTP, kata sandi, atau kode pemulihan kepada admin maupun pihak lain."],
      ["Bagaimana memastikan detail pesanan benar?", "Periksa layanan, paket, nama, request hero, dan catatan sebelum menekan tombol order WhatsApp."],
      ["Apa yang harus dilakukan jika menemukan kendala?", "Hubungi admin melalui kanal resmi dan jelaskan kendalanya. Jangan mengirimkan kata sandi atau kode keamanan."],
    ]},
  ];

  function renderTransactions() {
    simpleContent.innerHTML = "";
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "RizzzStore.id";
    const title = document.createElement("h2");
    title.className = "section-title";
    title.textContent = "Cek Transaksi";
    const text = document.createElement("p");
    text.className = "section-lead";
    text.textContent = "Fitur pengecekan otomatis belum terhubung ke sistem pesanan. Untuk memastikan status order, hubungi admin melalui WhatsApp.";
    const btn = document.createElement("a");
    btn.className = "btn btn--primary";
    btn.style.marginTop = "18px";
    btn.href = `https://wa.me/${WHATSAPP}`;
    btn.target = "_blank";
    btn.rel = "noopener";
    btn.textContent = "Hubungi admin WhatsApp";
    simpleContent.append(eyebrow, title, text, btn);
  }

  function renderHelp() {
    simpleContent.innerHTML = "";
    const intro = document.createElement("div");
    intro.className = "help__intro";
    intro.innerHTML =
      '<p class="eyebrow">RizzzStore.id · Pusat Bantuan</p>' +
      '<h2>Pusat Bantuan</h2>' +
      '<p>Pilih kategori atau cari pertanyaan di bawah. Soal order, pembayaran, refund, dan keamanan akun ada di sini.</p>';
    simpleContent.appendChild(intro);

    const search = document.createElement("label");
    search.className = "help-search";
    search.innerHTML = '<span class="mono">⌕</span><input type="search" placeholder="Cari pertanyaan..." aria-label="Cari pertanyaan">';
    const input = search.querySelector("input");

    const cats = document.createElement("div");
    cats.className = "help-cats";

    const faqArea = document.createElement("div");

    const contact = document.createElement("div");
    contact.className = "help-contact";
    contact.innerHTML =
      '<h3>Masih butuh bantuan?</h3>' +
      '<p>Chat admin lewat WhatsApp. Kami juga aktif di Instagram dan TikTok.</p>' +
      `<a class="btn btn--primary" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">Kirim pesan</a>` +
      '<p class="help-contact__meta mono">Instagram @rizzzjoki.id · TikTok @rizzzstore.joki</p>';

    simpleContent.append(search, cats, faqArea, contact);

    let active = "Umum";

    function draw() {
      const query = input.value.trim().toLowerCase();

      cats.innerHTML = "";
      helpGroups.forEach((group) => {
        const count = query
          ? group.items.filter((it) => (`${group.name} ${it[0]} ${it[1]}`).toLowerCase().includes(query)).length
          : group.items.length;
        if (query && count === 0) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "help-cat" + (!query && group.name === active ? " is-active" : "");
        btn.textContent = group.name + " (" + count + ")";
        btn.addEventListener("click", () => { active = group.name; input.value = ""; draw(); });
        cats.appendChild(btn);
      });

      const groups = helpGroups
        .map((group) => ({
          name: group.name,
          items: group.items.filter((it) =>
            !query ? group.name === active : (`${group.name} ${it[0]} ${it[1]}`).toLowerCase().includes(query)),
        }))
        .filter((g) => g.items.length);

      faqArea.innerHTML = "";

      if (!groups.length) {
        const empty = document.createElement("p");
        empty.className = "help-empty";
        empty.textContent = "Pertanyaan tidak ditemukan. Coba kata kunci lain atau hubungi admin.";
        faqArea.appendChild(empty);
        return;
      }

      groups.forEach((group) => {
        const card = document.createElement("div");
        card.className = "help-faq";
        group.items.forEach((item, i) => {
          const row = document.createElement("div");
          row.className = "help-faq__item" + (!query && i === 0 ? " is-open" : "");

          const q = document.createElement("button");
          q.type = "button";
          q.className = "help-faq__q";
          q.innerHTML = `<span></span><span class="chev">⌄</span>`;
          q.firstChild.textContent = item[0];

          const a = document.createElement("div");
          a.className = "help-faq__a";
          a.textContent = item[1];

          q.addEventListener("click", () => row.classList.toggle("is-open"));
          row.append(q, a);
          card.appendChild(row);
        });
        faqArea.appendChild(card);
      });
    }

    input.addEventListener("input", draw);
    draw();
  }

  function showCatalog() {
    if (catalog) catalog.hidden = false;
    screens.forEach((s) => (s.hidden = true));
  }

  function setPage(name) {
    dockButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.page === name));

    if (name === "home") {
      mainEl.hidden = false;
      footerEl.hidden = false;
      toolsPage.hidden = true;
      simplePage.hidden = true;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }

    mainEl.hidden = true;
    footerEl.hidden = true;

    if (name === "calculator") {
      simplePage.hidden = true;
      toolsPage.hidden = false;
      showCatalog();
    } else {
      toolsPage.hidden = true;
      simplePage.hidden = false;
      if (name === "transactions") renderTransactions();
      else renderHelp();
    }
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  dockButtons.forEach((btn) => btn.addEventListener("click", () => setPage(btn.dataset.page)));

  $$("[data-tool]").forEach((btn) => btn.addEventListener("click", () => {
    const target = "screen-" + btn.dataset.tool;
    catalog.hidden = true;
    screens.forEach((s) => (s.hidden = s.id !== target));
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }));
  $$("[data-back]").forEach((btn) => btn.addEventListener("click", () => {
    showCatalog();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }));

  const num = (id) => Math.max(0, Number(document.getElementById(id)?.value) || 0);
  const money = (v) => "Rp" + Math.round(v).toLocaleString("id-ID");

  function calcWinrate() {
    const m = Number($("#wrMatches").value);
    const now = Number($("#wrCurrent").value);
    const t = Number($("#wrTarget").value);
    const box = $("#wrResultBox");
    const out = $("#wrNow");
    const ex = $("#wrExplain");

    if (!Number.isFinite(m) || !Number.isFinite(now) || !Number.isFinite(t) || m < 1 || now < 0 || now > 100 || t <= 0 || t > 100) {
      box.hidden = true; return;
    }
    box.hidden = false;
    out.textContent = now.toFixed(2) + "%";
    if (t <= now) { ex.textContent = "Target sudah tercapai. Tidak perlu menambah kemenangan."; return; }
    if (t >= 100) { ex.textContent = "Target 100% tidak dapat dicapai jika sudah ada kekalahan. Perlu WR sempurna."; return; }

    const estimatedWins = m * now / 100;
    const needed = Math.max(0, Math.ceil((t * m / 100 - estimatedWins) / (1 - t / 100) - 1e-10));
    const totalAfter = m + needed;
    const projected = (estimatedWins + needed) / totalAfter * 100;
    ex.textContent =
      "Butuh sekitar " + needed.toLocaleString("id-ID") + " kemenangan beruntun. Total pertandingan menjadi sekitar " +
      totalAfter.toLocaleString("id-ID") + " match, dengan WR sekitar " + projected.toFixed(2) + "%.";
  }

  function calcSpin(prefix) {
    const prog = num(prefix + "Progress");
    const target = num(prefix + "Target");
    const single = num(prefix + "Single");
    const five = num(prefix + "Five");
    const free = num(prefix + "Free");

    let spins;
    if (prefix === "z") {
      const avg = Math.max(1, Math.min(5, num("zAverage") || 3));
      spins = Math.max(0, Math.ceil((target - prog) / avg) - free);
    } else {
      spins = Math.max(0, target - prog - free);
    }
    const fives = Math.floor(spins / 5);
    const ones = spins % 5;
    const cost = fives * five + ones * single;
    const label = prefix === "mw" ? "mw" : "z";
    document.getElementById(label + "Result").textContent = Math.round(cost).toLocaleString("id-ID") + " 💎";
    document.getElementById(label + "Explain").textContent = spins === 0
      ? "Berdasarkan input, progres target sudah tercukupi oleh progres dan spin gratis."
      : "Estimasi " + spins + " spin berbayar: " + fives + " paket 5x + " + ones + " spin 1x. Hasil aktual bisa berbeda.";
  }

  function calcPrice() {
    const total = num("priceUnit") * num("priceQty");
    const d = Math.min(100, num("priceDiscount"));
    const disc = total * d / 100;
    const final = total - disc;
    const rm = num("priceConvert") * num("priceRm");
    $("#priceResult").textContent = money(final);
    $("#priceExplain").textContent = "Diskon " + money(disc) + " · Total sebelum diskon " + money(total);
    $("#priceConversion").textContent = "Konversi RM: " + money(rm);
  }

  const RANK_TIERS = ["EPIC", "LEGEND", "MYTHIC", "HONOR", "GLORY", "IMMO"];
  const RANK_LABEL = {
    EPIC: "Epic", LEGEND: "Legend", MYTHIC: "Mythic",
    HONOR: "Mythic Honor", GLORY: "Mythic Glory", IMMO: "Immortal",
  };

  function calcRank() {
    const fromSel = $("#rankFrom");
    if (!fromSel) return;
    const from = RANK_TIERS.indexOf(fromSel.value);
    const to = RANK_TIERS.indexOf($("#rankTo").value);
    const region = $("#rankRegion").value;
    const per = Math.max(1, Math.floor(num("rankPerTier") || 5));
    const out = $("#rankResult");
    const ex = $("#rankExplain");
    const orderBtn = $("#rankOrder");

    if (to <= from) {
      out.textContent = "—";
      ex.textContent = "Rank tujuan harus lebih tinggi dari rank sekarang.";
      orderBtn.disabled = true;
      return;
    }
    const stars = (to - from) * per;
    const entry = (PRICING["Joki Mobile Legend"].packages[region] || [])[to];
    if (!entry) {
      out.textContent = "—";
      ex.textContent = "Harga untuk region ini belum tersedia.";
      orderBtn.disabled = true;
      return;
    }
    out.textContent = priceText(entry[1] * stars, region);
    ex.textContent = stars + " bintang · " + priceText(entry[1], region) + "/bintang (" +
      RANK_LABEL[RANK_TIERS[to]] + ") · " + RANK_LABEL[RANK_TIERS[from]] + " → " + RANK_LABEL[RANK_TIERS[to]];
    orderBtn.disabled = false;
    orderBtn.dataset.pkg = entry[0];
    orderBtn.dataset.stars = String(stars);
    orderBtn.dataset.region = region;
  }

  const rankOrder = $("#rankOrder");
  if (rankOrder) {
    rankOrder.addEventListener("click", () => {
      const pkg = rankOrder.dataset.pkg;
      const stars = rankOrder.dataset.stars;
      const region = rankOrder.dataset.region;
      if (!pkg || !presetOrder) return;
      setPage("home");
      presetOrder("Joki Mobile Legend", pkg, region, stars);
    });
  }

  const wrCalc = $("#wrCalculate");
  if (wrCalc) {
    wrCalc.addEventListener("click", calcWinrate);
    ["wrMatches", "wrCurrent", "wrTarget"].forEach((id) =>
      document.getElementById(id).addEventListener("input", () => { $("#wrResultBox").hidden = true; }));
    ["mwProgress", "mwTarget", "mwSingle", "mwFive", "mwFree"].forEach((id) =>
      document.getElementById(id).addEventListener("input", () => calcSpin("mw")));
    ["zProgress", "zTarget", "zSingle", "zFive", "zFree", "zAverage"].forEach((id) =>
      document.getElementById(id).addEventListener("input", () => calcSpin("z")));
    ["priceUnit", "priceQty", "priceDiscount", "priceRm", "priceConvert"].forEach((id) =>
      document.getElementById(id).addEventListener("input", calcPrice));

    ["rankFrom", "rankTo", "rankRegion", "rankPerTier"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", calcRank);
        el.addEventListener("change", calcRank);
      }
    });

    calcWinrate(); calcSpin("mw"); calcSpin("z"); calcPrice(); calcRank();
  }

  const spinModal = $("#spinModal");
  const spinFab = $("#spinFab");
  const spinWheel = $("#spinWheel");
  const spinBtn = $("#spinBtn");
  const spinResult = $("#spinResult");
  const spinDiscount = $("#spinDiscount");
  const spinCode = $("#spinCode");
  const spinOrderBtn = $("#spinOrderBtn");
  const spinNote = $("#spinNote");
  const spinHeading = $("#spinResultHeading");
  const spinDesc = $("#spinResultDesc");

  if (spinModal && spinFab && spinWheel && spinBtn) {
    const prizes = [
      { label: "100%", discount: 100, weight: 0.1 },
      { label: "90%", discount: 90, weight: 0.1 },
      { label: "80%", discount: 80, weight: 0.1 },
      { label: "70%", discount: 70, weight: 1 },
      { label: "60%", discount: 60, weight: 2 },
      { label: "50%", discount: 50, weight: 4 },
      { label: "40%", discount: 40, weight: 7 },
      { label: "30%", discount: 30, weight: 10 },
      { label: "20%", discount: 20, weight: 15 },
      { label: "10%", discount: 10, weight: 20 },
      { label: "ZONK", discount: 0, weight: 40.7 },
    ];
    const segment = 360 / prizes.length;
    let spinning = false;
    let currentPrize = null;

    const SVG_NS = "http://www.w3.org/2000/svg";
    const wedges = document.createElementNS(SVG_NS, "svg");
    wedges.setAttribute("viewBox", "0 0 100 100");
    wedges.setAttribute("class", "wheel__svg");
    wedges.setAttribute("aria-hidden", "true");
    const shades = ["#1a1e23", "#14171b"];
    const rad = (deg) => (deg * Math.PI) / 180;
    prizes.forEach((prize, i) => {
      const a0 = rad(i * segment - 90);
      const a1 = rad((i + 1) * segment - 90);
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute(
        "d",
        "M50 50 L" +
          (50 + 50 * Math.cos(a0)).toFixed(3) + " " + (50 + 50 * Math.sin(a0)).toFixed(3) +
          " A50 50 0 0 1 " +
          (50 + 50 * Math.cos(a1)).toFixed(3) + " " + (50 + 50 * Math.sin(a1)).toFixed(3) + " Z"
      );
      path.setAttribute("fill", shades[i % 2]);
      wedges.appendChild(path);
    });
    spinWheel.appendChild(wedges);

    prizes.forEach((prize, i) => {
      const el = document.createElement("span");
      el.className = "wheel__label" + (prize.label === "ZONK" ? " wheel__label--zonk" : "");
      el.textContent = prize.label;
      el.style.transform = `rotate(${i * segment + segment / 2}deg)`;
      spinWheel.appendChild(el);
    });

    const dayKey = () => {
      const d = new Date();
      return "rzSpin_" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    };

    const showPrize = (saved) => {
      currentPrize = saved.prize;
      const zonk = currentPrize === 0;
      spinHeading.textContent = zonk ? "Yahh, zonk dulu" : "Kamu mendapatkan";
      spinDiscount.textContent = zonk ? "ZONK" : currentPrize + "% DISKON";
      spinDesc.textContent = zonk ? "Belum dapat diskon kali ini. Coba lagi besok." : "Kode promo kamu:";
      spinCode.textContent = saved.code || "";
      spinCode.style.display = zonk ? "none" : "inline-block";
      spinOrderBtn.style.display = zonk ? "none" : "block";
      spinResult.hidden = false;
    };

    const restore = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(dayKey()) || "null");
        if (saved && typeof saved.prize === "number") {
          showPrize(saved);
          spinBtn.disabled = true;
          spinBtn.textContent = "Kamu sudah putar hari ini";
          spinNote.textContent = "Hasil putaran tersimpan di browser ini. Diskon harus dikonfirmasi admin.";
        }
      } catch (e) {  }
    };

    spinFab.addEventListener("click", () => openModal("spinModal"));
    spinBtn.addEventListener("click", () => {
      if (spinning || spinBtn.disabled) return;
      spinning = true;
      spinBtn.disabled = true;
      spinBtn.textContent = "Roda sedang berputar...";
      spinResult.hidden = true;

      const r = Math.random() * 100;
      let acc = 0, idx = prizes.length - 1;
      for (let i = 0; i < prizes.length; i++) {
        acc += prizes[i].weight;
        if (r < acc) { idx = i; break; }
      }
      currentPrize = prizes[idx].discount;
      const finalAngle = 360 * 6 + (360 - (idx * segment + segment / 2));
      spinWheel.style.transform = "rotate(" + finalAngle + "deg)";

      setTimeout(() => {
        spinning = false;
        const code = currentPrize === 0 ? "" : "RZ-" + Math.random().toString(36).slice(2, 6).toUpperCase();
        showPrize({ prize: currentPrize, code });
        spinBtn.textContent = "Kamu sudah putar hari ini";
        spinNote.textContent = currentPrize === 0
          ? "Kamu mendapatkan ZONK. Terima kasih sudah ikut event! Putaran berikutnya tersedia besok."
          : "Simpan kode dan hubungi admin untuk konfirmasi layanan, batas diskon, dan masa berlaku.";
        try { localStorage.setItem(dayKey(), JSON.stringify({ prize: currentPrize, code })); } catch (e) {  }
      }, 4300);
    });

    spinOrderBtn.addEventListener("click", () => {
      if (!currentPrize) return;
      const message =
        "Halo admin RIZZZSTORE.ID! Aku ikut event Lucky Spin dan mendapat kode promo: " +
        spinCode.textContent + " dengan hadiah " + currentPrize + "% diskon. Mohon konfirmasi syarat, layanan yang berlaku, dan masa promo.";
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    });

    restore();
  }

  const rankTrack = $("#rankTrack");
  const rankFill = $("#rankFill");

  if (rankTrack && rankFill) {
    const nodes = $$(".rank-node", rankTrack);
    const total = nodes.length;

    const setStep = (step) => {
      nodes.forEach((node, i) => node.classList.toggle("is-on", i < step));
      rankFill.style.width = ((step / total) * 100).toFixed(4) + "%";
    };

    if (reduceMotion) {
      setStep(total);
    } else {
      let step = 0;
      let timer = 0;
      const advance = () => {
        step += 1;
        setStep(step);
        if (step >= total) {
          window.clearInterval(timer);
          timer = 0;
        }
      };
      const start = () => {
        if (timer || step >= total) return;
        timer = window.setInterval(advance, 1100);
      };
      const stop = () => {
        if (!timer) return;
        window.clearInterval(timer);
        timer = 0;
      };
      start();
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else start();
      });
    }
  }
})();
