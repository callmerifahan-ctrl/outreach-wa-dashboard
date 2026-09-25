"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import confetti from "canvas-confetti";

// Safe Supabase Initializer
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ClientType {
  id: string;
  nama: string;
  no_whatsapp: string;
  layanan: string;
  status: "Baru" | "Follow-up" | "Deal" | "Ditolak";
  tgl_followup: string;
  sumber?: string;
  notes?: string;
  deal_amount?: number;
  followup_count?: number;
}

export default function DashboardProspek() {
  const [prospekList, setProspekList] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle Header & Sub-Tab Navigation
  const [activeTab, setActiveTab] = useState<"prospek" | "personal">("prospek");
  const [prospekSubTab, setProspekSubTab] = useState<"daftar" | "kalender" | "baru">("daftar");
  const [personalSubTab, setPersonalSubTab] = useState<"ratecard" | "template">("ratecard");

  // ✨ STATE MODE PROMO INTERAKTIF
  const [isPromoActive, setIsPromoActive] = useState(true);

  // Form State Lengkap
  const [nama, setNama] = useState("");
  const [noWa, setNoWa] = useState("");
  const [sumber, setSumber] = useState("Instagram");
  const [status, setStatus] = useState<ClientType["status"]>("Baru");
  const [layanan, setLayanan] = useState("Website Bisnis / UMKM");
  const [tglFollowup, setTglFollowup] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Filter State Baru (Sumber & Status)
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterSumber, setFilterSumber] = useState("Semua");

  // State Telegram Bot Config & Target Omset & Misi Harian
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [targetOmsetBulanan, setTargetOmsetBulanan] = useState(2000000);
  const [dailyTargetCount, setDailyTargetCount] = useState(5);
  const [completedToday, setCompletedToday] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wa_clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setProspekList(data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const savedToken = localStorage.getItem("tg_token");
    const savedChatId = localStorage.getItem("tg_chatid");
    const savedTarget = localStorage.getItem("target_omset");
    const savedPromo = localStorage.getItem("is_promo");
    const savedMission = localStorage.getItem("completed_today");
    if (savedToken) setTelegramToken(savedToken);
    if (savedChatId) setTelegramChatId(savedChatId);
    if (savedTarget) setTargetOmsetBulanan(Number(savedTarget));
    if (savedPromo !== null) setIsPromoActive(savedPromo === "true");
    if (savedMission) setCompletedToday(Number(savedMission));
  }, []);

  const triggerCelebration = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.log("Audio play blocked", e);
    }
  };

  const handleSaveTelegramConfig = () => {
    localStorage.setItem("tg_token", telegramToken);
    localStorage.setItem("tg_chatid", telegramChatId);
    localStorage.setItem("target_omset", targetOmsetBulanan.toString());
    localStorage.setItem("is_promo", isPromoActive.toString());
    alert("Konfigurasi & Mode Promo berhasil disimpan!");
  };

  const sendTelegramNotification = async (message: string) => {
    if (!telegramToken || !telegramChatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: "HTML",
        }),
      });
    } catch (e) {
      console.error("Gagal kirim notifikasi Telegram:", e);
    }
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nama.trim() || !noWa.trim()) {
      alert("Mohon isi Nama Klien dan No. WhatsApp / Username IG terlebih dahulu!");
      return;
    }

    let dealAmount = 0;
    if (status === "Deal") {
      const defaultNominal = isPromoActive ? "300000" : "350000";
      const inputNominal = prompt("Masukkan nilai deal/omset (Rp):", defaultNominal);
      if (inputNominal !== null) dealAmount = Number(inputNominal) || 0;
    }

    const payload = {
      nama: nama.trim(),
      no_whatsapp: noWa.trim(),
      layanan,
      status,
      tgl_followup: tglFollowup,
      sumber,
      notes: notes.trim() || "Input dari form lengkap",
      deal_amount: dealAmount,
      followup_count: 0,
    };

    const { data, error } = await supabase
      .from("wa_clients")
      .insert([payload])
      .select();

    if (error) {
      alert("Gagal menyimpan ke database: " + error.message);
      return;
    }

    if (data) {
      setProspekList((prev) => [data[0], ...prev]);
      setNama("");
      setNoWa("");
      setNotes("");
      setProspekSubTab("daftar");

      const newCompleted = Math.min(completedToday + 1, dailyTargetCount);
      setCompletedToday(newCompleted);
      localStorage.setItem("completed_today", newCompleted.toString());

      if (status === "Deal") triggerCelebration();

      sendTelegramNotification(`🚀 <b>Prospek Baru Ditambahkan!</b>\nNama: ${nama}\nLayanan: ${layanan}\nSumber: ${sumber}\nStatus: ${status}`);
    }
  };

  const handleChatWA = async (prospek: ClientType) => {
    const nextFollowUp = new Date();
    nextFollowUp.setDate(nextFollowUp.getDate() + 3);
    const nextFollowUpStr = nextFollowUp.toISOString().split("T")[0];
    const newCount = (prospek.followup_count || 0) + 1;

    const { error } = await supabase
      .from("wa_clients")
      .update({
        status: "Follow-up",
        tgl_followup: nextFollowUpStr,
        followup_count: newCount,
      })
      .eq("id", prospek.id);

    if (!error) {
      setProspekList((prev) =>
        prev.map((item) =>
          item.id === prospek.id
            ? { ...item, status: "Follow-up", tgl_followup: nextFollowUpStr, followup_count: newCount }
            : item
        )
      );
    }

    let targetKontak = prospek.no_whatsapp || "";
    let formattedWa = targetKontak.replace(/\D/g, "");
    if (formattedWa.startsWith("0")) formattedWa = "62" + formattedWa.slice(1);
    const pesan = `Halo Kak ${prospek.nama}! Saya dari Kala Project mau tanyakan terkait kebutuhan ${prospek.layanan}. Portofolio kami bisa dicek di https://rifahan.dev ya!`;

    window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(pesan)}`, "_blank");
  };

  const handleQuickCopyChat = (prospek: ClientType) => {
    const pesan = `Halo Kak ${prospek.nama}! Salam kenal dari Kala Project. Kami melihat usaha Kakak dan ingin menawarkan pembuatan ${prospek.layanan}. Portofolio karya kami bisa dicek di https://rifahan.dev ya Kak. Boleh intip sebentar? ✨`;
    navigator.clipboard.writeText(pesan);
    alert(`Template chat untuk ${prospek.nama} berhasil disalin ke clipboard! 📋`);
  };

  const handleStatusChange = async (id: string, newStatus: ClientType["status"]) => {
    let dealAmount = 0;
    if (newStatus === "Deal") {
      const defaultNom = isPromoActive ? "300000" : "350000";
      const inputNominal = prompt("Masukkan nilai deal/omset (Rp):", defaultNom);
      if (inputNominal === null) return;
      dealAmount = Number(inputNominal) || 0;
      triggerCelebration();
    }

    const { error } = await supabase
      .from("wa_clients")
      .update({ status: newStatus, deal_amount: dealAmount })
      .eq("id", id);

    if (!error) {
      setProspekList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus, deal_amount: dealAmount } : item))
      );

      const client = prospekList.find((c) => c.id === id);
      if (newStatus === "Deal") {
        sendTelegramNotification(`🎉 <b>DEAL BARU!</b>\nKlien: ${client?.nama}\nNominal: Rp ${dealAmount.toLocaleString("id-ID")}`);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus prospek ini?")) return;
    const { error } = await supabase.from("wa_clients").delete().eq("id", id);
    if (!error) {
      setProspekList((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const exportToCSV = () => {
    const headers = ["ID,Nama,No WhatsApp,Layanan,Status,Tgl Followup,Sumber,Deal Amount,Followup Count\n"];
    const rows = prospekList.map(
      (i) => `"${i.id}","${i.nama}","${i.no_whatsapp}","${i.layanan}","${i.status}","${i.tgl_followup}","${i.sumber || ""}","${i.deal_amount || 0}","${i.followup_count || 0}"`
    );
    const blob = new Blob([headers.concat(rows.join("\n")).join("")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wa_clients_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const copyDataToClipboard = () => {
    const textData = prospekList
      .map((i) => `${i.nama} | ${i.no_whatsapp} | Sumber: ${i.sumber} | ${i.status} | Tgl: ${i.tgl_followup}`)
      .join("\n");
    navigator.clipboard.writeText(textData);
    alert("Daftar prospek berhasil disalin ke clipboard!");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Template berhasil disalin!");
  };

  // Statistik & Kalkulator
  const totalProses = prospekList.filter((i) => i.status === "Baru" || i.status === "Follow-up").length;
  const totalDeal = prospekList.filter((i) => i.status === "Deal").length;
  const totalDitolak = prospekList.filter((i) => i.status === "Ditolak").length;
  const totalOmset = prospekList.filter((i) => i.status === "Deal").reduce((sum, i) => sum + (i.deal_amount || 0), 0);
  const rasioKonversi = prospekList.length > 0 ? ((totalDeal / prospekList.length) * 100).toFixed(1) : "0.0";

  const porsiBakso = Math.floor(totalOmset / 15000);
  const gelasKopi = Math.floor(totalOmset / 18000);

  const getTemperatureBadge = (klien: ClientType) => {
    if (klien.status === "Deal") return { label: "💎 Closed Deal", style: "bg-emerald-50 text-emerald-600 border-emerald-200" };
    if (klien.status === "Ditolak") return { label: "❄️ Cold Off", style: "bg-gray-100 text-gray-400 border-gray-200" };
    const fuCount = klien.followup_count || 0;
    if (fuCount === 0) return { label: "🔥 Hot Lead", style: "bg-amber-50 text-amber-600 border-amber-200" };
    if (fuCount <= 2) return { label: "☕ Warm", style: "bg-orange-50 text-orange-600 border-orange-200" };
    return { label: "👻 Ghosting Risk", style: "bg-purple-50 text-purple-600 border-purple-200" };
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredProspek = prospekList.filter((item) => {
    const matchSearch =
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      (item.no_whatsapp && item.no_whatsapp.includes(search)) ||
      item.layanan.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Semua" ? true : item.status === filterStatus;
    const matchSumber = filterSumber === "Semua" ? true : item.sumber === filterSumber;
    return matchSearch && matchStatus && matchSumber;
  });

  const getCalendarBadge = (status: ClientType["status"]) => {
    switch (status) {
      case "Deal": return { style: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold", label: "🎉 Deal:" };
      case "Follow-up": return { style: "bg-pink-100 text-pink-700 border-pink-200 font-medium", label: "💬 Follow-up:" };
      case "Ditolak": return { style: "bg-rose-100 text-rose-700 border-rose-200 font-medium", label: "❌ Ditolak:" };
      default: return { style: "bg-blue-50 text-blue-600 border-blue-200 font-medium", label: "🆕 Prospek:" };
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F8] p-6 text-gray-700 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Top Header */}
        <div className="bg-white p-4 rounded-2xl border border-pink-100 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-pink-600 flex items-center gap-2">
              🚀 Kala Project • Sales Tracker Jemput Bola
            </h1>
            <p className="text-xs text-gray-400">Dashboard Manajemen Klien & Portofolio (wa_clients)</p>
          </div>
          <div className="flex bg-pink-50 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("prospek")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "prospek" ? "bg-pink-500 text-white shadow-sm" : "text-gray-600 hover:text-pink-600"
              }`}
            >
              🎯 Mode Prospek
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "personal" ? "bg-pink-500 text-white shadow-sm" : "text-gray-600 hover:text-pink-600"
              }`}
            >
              👤 Mode Personal
            </button>
          </div>
        </div>

        {activeTab === "personal" ? (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white p-2 rounded-2xl border border-pink-100 flex gap-2 shadow-sm">
              <button
                onClick={() => setPersonalSubTab("ratecard")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex justify-center items-center gap-1 ${
                  personalSubTab === "ratecard" ? "bg-rose-500 text-white shadow-sm" : "text-gray-600 hover:bg-pink-50"
                }`}
              >
                🏷️ Rate Card & Promo
              </button>
              <button
                onClick={() => setPersonalSubTab("template")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex justify-center items-center gap-1 ${
                  personalSubTab === "template" ? "bg-rose-500 text-white shadow-sm" : "text-gray-600 hover:bg-pink-50"
                }`}
              >
                💬 Template Chat (15)
              </button>
            </div>

            {personalSubTab === "ratecard" && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-pink-100 flex justify-between items-center shadow-sm">
                  <div>
                    <h2 className="font-bold text-xs text-pink-700 flex items-center gap-1">🏷️ Pengaturan Mode Diskon / Promo</h2>
                    <p className="text-[11px] text-gray-400">Status Promo: <span className={isPromoActive ? "text-emerald-600 font-bold" : "text-gray-500 font-bold"}>{isPromoActive ? "AKTIF (-Rp 50rb)" : "TIDAK AKTIF (Harga Normal)"}</span></p>
                  </div>
                  <button
                    onClick={() => setIsPromoActive(!isPromoActive)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                      isPromoActive ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {isPromoActive ? "✨ Promo ON" : "⚪ Promo OFF"}
                  </button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 border-b pb-2">📋 Daftar Harga Layanan Kala Project</h3>
                  <div className="space-y-2">
                    <div className="bg-pink-50/30 p-3.5 rounded-xl border border-pink-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-xs text-gray-800">Website Bisnis / UMKM</p>
                        <p className="text-[11px] text-gray-400">Landing page siap pakai + Domain & Hosting</p>
                      </div>
                      <div className="text-right">
                        {isPromoActive && <span className="text-[10px] text-gray-400 line-through block">Rp 350.000</span>}
                        <p className="font-bold text-xs text-rose-500">{isPromoActive ? "Rp 300.000" : "Rp 350.000"}</p>
                      </div>
                    </div>

                    <div className="bg-pink-50/30 p-3.5 rounded-xl border border-pink-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-xs text-gray-800">Company Profile Custom</p>
                        <p className="text-[11px] text-gray-400">Desain eksklusif & responsif perusahaan</p>
                      </div>
                      <div className="text-right">
                        {isPromoActive && <span className="text-[10px] text-gray-400 line-through block">Rp 750.000</span>}
                        <p className="font-bold text-xs text-rose-500">{isPromoActive ? "Rp 650.000" : "Rp 750.000"}</p>
                      </div>
                    </div>

                    <div className="bg-pink-50/30 p-3.5 rounded-xl border border-pink-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-xs text-gray-800">Katalog Digital / E-Commerce WA</p>
                        <p className="text-[11px] text-gray-400">Sistem order otomatis kirim format ke WA</p>
                      </div>
                      <div className="text-right">
                        {isPromoActive && <span className="text-[10px] text-gray-400 line-through block">Rp 500.000</span>}
                        <p className="font-bold text-xs text-rose-500">{isPromoActive ? "Rp 450.000" : "Rp 500.000"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800">🤖 Integrasi Notifikasi Bot Telegram</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input type="text" placeholder="Bot Token Telegram" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} className="p-2.5 text-xs border border-gray-200 rounded-xl" />
                    <input type="text" placeholder="Telegram Chat ID" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="p-2.5 text-xs border border-gray-200 rounded-xl" />
                  </div>
                  <button onClick={handleSaveTelegramConfig} className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100">
                    💾 Simpan Konfigurasi & Status Promo
                  </button>
                </div>
              </div>
            )}

            {personalSubTab === "template" && (
              <div className="space-y-4">
                <div className="bg-pink-50/70 border border-pink-200 p-4 rounded-2xl">
                  <h2 className="font-bold text-xs text-pink-700">💬 Daftar 15 Template Chat & Strategi Bantuan 0 Rupiah</h2>
                  <p className="text-[11px] text-pink-500 mt-0.5">Semua template sudah otomatis menyertakan link https://rifahan.dev</p>
                </div>

                {[
                  { title: "☕ UMKM KULINER / SANTAI", text: "Halo Kak, salam kenal dari Kala Project! Aku nemu profil tokomu di Google Maps/Instagram. Mau bantu nawarin jasa buat website/menu online. Contoh karya aplikasi bisa dicek di https://rifahan.dev ya Kak. Boleh intip sebentar? ✨" },
                  { title: "🏢 BISNIS FORMAL & PROFESIONAL", text: "Selamat pagi/siang Bapak/Ibu. Kami dari Kala Project melihat usaha Bapak/Ibu memiliki potensi berkembang online. Portofolio aplikasi bisnis kami dapat dilihat di https://rifahan.dev. Barangkali tertarik, mari berdiskusi. 🤝" },
                  { title: "🚀 FASHION / RETAIL (GEN Z)", text: "Halo kak! Suka banget sama produknya 😻. Dari Kala Project mau nawarin collab buat naikin omset lewat digital marketing & G-Maps. Intip portofolio app buatan kita yuk di https://rifahan.dev. Minat dibantuin gak kak? 🚀" },
                  { title: "📦 RATE CARD PROMO", text: isPromoActive ? "Halo Kak, lagi cari vendor buat bikin website / aplikasi? Cek portofolio Kala Project di https://rifahan.dev ya. Lagi ada promo spesial awal kerja sama nih cuma Rp 300rb-an aja udah lengkap! Mau dikirimin rincian harganya, Kak? 📄" : "Halo Kak, lagi cari vendor buat bikin website / aplikasi? Cek portofolio Kala Project di https://rifahan.dev ya. Paket lengkap website bisnis mulai Rp 350rb aja. Mau dikirimin rincian harganya, Kak? 📄" },
                  { title: "🤝 SOFT CLOSING (JIKA DITOLAK)", text: "Baik Kak, tidak apa-apa sama sekali, terima kasih banyak ya atas waktunya dari Kala Project! 🙏 Kalau sewaktu-waktu ke depannya butuh partner untuk pembuatan website atau aplikasi usaha, portofolio kami selalu bisa dicek di https://rifahan.dev ya Kak. Sukses selalu untuk bisnisnya! ✨" },
                  { title: "⏰ FOLLOW-UP PENGINGAT (H+3)", text: "Halo Kak! Sekadar mengingatkan kembali pesan saya kemarin dari Kala Project. Barangkali Kakak ada waktu luang untuk sekadar ngobrol santai atau konsultasi singkat seputar pembuatan website? Portofolio tetap bisa diakses di https://rifahan.dev ya Kak. Terima kasih! 😊" },
                  { title: "🛠️ PENAWARAN REDESIGN & MAINTENANCE", text: "Halo Kak, kami perhatikan website usaha Kakak sepertinya butuh penyegaran tampilan atau peningkatan kecepatan biar pengunjung semakin betah. Kala Project siap bantu optimasi & redesign dari awal. Cek standar karya kami di https://rifahan.dev ya Kak. Tertarik konsultasi dulu? 🚀" },
                  { title: "📍 LAYANAN GOOGLE MAPS & LOCAL SEO", text: "Halo Kak, aku nemu lokasi usahamu di Google Maps! Kala Project punya solusi buat bantu toko Kakak lebih gampang ditemukan calon pembeli di sekitar lokasi lewat integrasi Web + Google Business. Hasil portofolio kita bisa diintip di https://rifahan.dev. Mau kita bantu rapihkan digitalnya Kak? 🗺️" },
                  { title: "🛒 KATALOG DIGITAL / WEB E-COMMERCE", text: "Halo Kak! Capek gak sih balas manual pertanyaan harga & produk satu-satu di WA? Kala Project bisa buatkan web katalog produk praktis biar pembeli tinggal klik & kirim format order otomatis ke WA. Contoh sistem aplikasi kami bisa diklik di https://rifahan.dev ya Kak! 🛍️" },
                  { title: "⚡ DISKON / PROMO SLOT TERBATAS", text: "Halo Kak, kabar baik! Minggu ini Kala Project lagi buka 3 slot khusus pembuatan website landing page cepat dengan potongan harga spesial + gratis domain. Contoh project yang pernah kita kerjakan ada di https://rifahan.dev. Ambil slot promonya sekarang yuk Kak sebelum penuh! 🔥" },
                  { title: "🏛️ KONSULTAN / KLINIK / JASA PROFESIONAL", text: "Selamat pagi/siang Kak. Website instansi/jasa yang kredibel terbukti meningkatkan kepercayaan klien hingga 80%. Kami dari Kala Project berpengalaman membangun web profesional yang elegan. Rekam jejak karya kami bisa dicek di https://rifahan.dev. Mari jadwalkan konsultasi singkat! 💼" },
                  { title: "🔄 RE-ENGAGEMENT / SAPA KLIEN LAMA", text: "Halo Kak! Apa kabar usahanya? Semoga makin lancar ya. Dulu sempat ngobrol seputar website sama Kala Project. Sekarang kita ada update fitur-fitur baru & tampilan modern yang bisa dilihat di https://rifahan.dev. Barangkali sekarang saat yang tepat buat eksekusi? 😊" },
                  { title: "🏥 KLINIK KECANTIKAN / SKINCARE", text: "Halo Kak! Saya dari Kala Project. Perhatiin klinik kecantikan Kakak punya potensi besar kalau punya sistem booking online & web profil yang estetik. Portofolio karya kami bisa dicek di https://rifahan.dev ya Kak. Mau kita bantu optimasi websitenya? ✨" },
                  { title: "🏋️ GYM / FITNESS CENTER / PT", text: "Halo Kak! Salam kenal dari Kala Project. Mau nawarin pembuatan web membership & jadwal kelas online/booking buat tempat fitness Kakak biar makin profesional. Cek portofolio aplikasi kita di https://rifahan.dev ya. Tertarik ngobrol singkat? 💪" },
                  { title: "🎁 STRATEGI BANTUAN GOOGLE MAPS / IG (0 RUPIAH)", text: "Halo Kak, salam kenal dari Kala Project! Minggu ini saya ada program sosial bantu UMKM lokal buat klaim/optimasi Google Maps atau rapihin Bio Instagram tokonya secara GRATIS (0 rupiah, murni bantu portofolio). Toko Kakak mau dibantu rapikan tampilan digitalnya? Cek karya kami di https://rifahan.dev ya! 🎁" }
                ].map((tpl, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                    <h3 className="font-bold text-xs text-gray-800">{tpl.title}</h3>
                    <div className="bg-pink-50/20 p-3 rounded-xl border border-pink-100 text-xs text-gray-600 leading-relaxed">{tpl.text}</div>
                    <button onClick={() => copyToClipboard(tpl.text)} className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100">
                      📋 Salin Template Ini
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setProspekSubTab("daftar")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                  prospekSubTab === "daftar" ? "bg-pink-500 text-white border border-pink-500" : "bg-white border border-gray-100 text-gray-500 hover:text-pink-600"
                }`}
              >
                📋 Daftar Klien ({prospekList.length})
              </button>
              <button
                onClick={() => setProspekSubTab("kalender")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                  prospekSubTab === "kalender" ? "bg-pink-500 text-white border border-pink-500" : "bg-white border border-gray-100 text-gray-500 hover:text-pink-600"
                }`}
              >
                📅 Kalender
              </button>
              <button
                onClick={() => setProspekSubTab("baru")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                  prospekSubTab === "baru" ? "bg-pink-500 text-white border border-pink-500" : "bg-white border border-gray-100 text-gray-500 hover:text-pink-600"
                }`}
              >
                ➕ Baru
              </button>
            </div>

            {prospekSubTab === "kalender" ? (
              <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm space-y-4 max-w-4xl mx-auto">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-pink-600 flex items-center gap-2">📅 Kalender Progres wa_clients</h3>
                    <div className="flex gap-3 text-[10px] mt-1 font-medium">
                      <span className="text-blue-600">🆕 Prospek</span>
                      <span className="text-pink-600">💬 Follow-up</span>
                      <span className="text-emerald-600">🎉 Deal</span>
                      <span className="text-rose-500">❌ Ditolak</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">September 2026</span>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400">
                  <div>Ming</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const dayStr = `2026-09-${day < 10 ? "0" + day : day}`;
                    const clientsOnDay = prospekList.filter((c) => c.tgl_followup === dayStr);

                    return (
                      <div key={day} className={`min-h-[78px] p-1.5 border rounded-2xl flex flex-col justify-between ${day === 14 ? "border-pink-500 bg-pink-50/20" : "border-pink-100 bg-white"}`}>
                        <span className={`text-[11px] font-bold ${day === 14 ? "text-pink-600" : "text-gray-600"}`}>{day}</span>
                        <div className="space-y-1 overflow-hidden mt-1">
                          {clientsOnDay.map((klien) => {
                            const badge = getCalendarBadge(klien.status);
                            return (
                              <div key={klien.id} className={`text-[9px] px-1.5 py-0.5 rounded-md border truncate ${badge.style}`}>
                                {badge.label} {klien.nama}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : prospekSubTab === "baru" ? (
              <div className="bg-white p-8 rounded-3xl border border-pink-100 shadow-sm space-y-5 max-w-xl mx-auto">
                <h3 className="font-bold text-sm text-pink-600 flex items-center gap-2">
                  ➕ Form Klien wa_clients
                </h3>

                <form onSubmit={handleSimpan} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Nama Klien / Toko *</label>
                    <input type="text" placeholder="Contoh: Toko Kopi Jaya" value={nama} onChange={(e) => setNama(e.target.value)} className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">No. WhatsApp / Username IG *</label>
                    <input type="text" placeholder="62813... atau @username_ig" value={noWa} onChange={(e) => setNoWa(e.target.value)} className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Sumber Pencarian</label>
                      <select value={sumber} onChange={(e) => setSumber(e.target.value)} className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30">
                        <option value="Instagram">Instagram (DM)</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Google Maps">Google Maps</option>
                        <option value="Rekomendasi">Rekomendasi</option>
                        <option value="LinkedIn / Lainnya">LinkedIn / Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Status</label>
                      <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30">
                        <option value="Baru">Baru</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Deal">Deal</option>
                        <option value="Ditolak">Ditolak</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Pilih Layanan</label>
                    <select value={layanan} onChange={(e) => setLayanan(e.target.value)} className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30">
                      <option value="Website Bisnis / UMKM">Website Bisnis / UMKM</option>
                      <option value="Company Profile Custom">Company Profile Custom</option>
                      <option value="Katalog Digital E-Commerce">Katalog Digital E-Commerce</option>
                      <option value="Google Maps & Local SEO">Google Maps & Local SEO</option>
                      <option value="Maintenance & Redesign">Maintenance & Redesign</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Tanggal Follow-up</label>
                    <input type="date" value={tglFollowup} onChange={(e) => setTglFollowup(e.target.value)} className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Catatan</label>
                    <textarea placeholder="Catatan interaksi..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30" />
                  </div>
                  <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition shadow-sm text-xs">
                    💾 Simpan ke wa_clients
                  </button>
                </form>
              </div>
            ) : (
              /* MAIN GRID 2 KOLOM */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* LEFT SIDEBAR */}
                <div className="md:col-span-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-3 rounded-2xl border border-pink-100 text-center shadow-sm">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">PROSES</p>
                      <p className="text-xl font-bold text-gray-700">{totalProses}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-emerald-100 text-center shadow-sm">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">DEAL 🚀</p>
                      <p className="text-xl font-bold text-emerald-600">{totalDeal}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-rose-100 text-center shadow-sm">
                      <p className="text-[10px] text-rose-500 font-bold uppercase">DITOLAK</p>
                      <p className="text-xl font-bold text-rose-500">{totalDitolak}</p>
                    </div>
                  </div>

                  {/* 📈 STATISTIK / CONVERSION FUNNEL */}
                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs font-bold text-pink-600">
                      <span>📈 Konversi Penjualan</span>
                      <span>{rasioKonversi}% Success</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-blue-400 h-full" style={{ width: `${prospekList.length ? (totalProses / prospekList.length) * 100 : 0}%` }} title="Proses"></div>
                      <div className="bg-emerald-500 h-full" style={{ width: `${prospekList.length ? (totalDeal / prospekList.length) * 100 : 0}%` }} title="Deal"></div>
                      <div className="bg-rose-400 h-full" style={{ width: `${prospekList.length ? (totalDitolak / prospekList.length) * 100 : 0}%` }} title="Ditolak"></div>
                    </div>
                    <p className="text-[10px] text-gray-400">Rasio perbandingan prospek aktif berujung Closed Deal.</p>
                  </div>

                  {/* 🎯 WIDGET MISI HARIAN / DAILY SALES MISSION */}
                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs font-bold text-pink-600">
                      <span>🎯 Misi Jemput Bola Harian</span>
                      <span>{completedToday} / {dailyTargetCount} Target</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(completedToday / dailyTargetCount) * 100}%` }}></div>
                    </div>
                    <p className="text-[10px] text-gray-400">Tambah prospek baru hari ini untuk mencentang misi!</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">💰 Total Omset Deal:</span>
                      <span className="font-bold text-emerald-600">Rp {totalOmset.toLocaleString("id-ID")}</span>
                    </div>
                    
                    <div className="bg-pink-50/50 p-2.5 rounded-xl border border-pink-100 text-[11px] space-y-1">
                      <p className="font-bold text-pink-600 flex items-center gap-1">🍜 Equivalen Omset Kamu:</p>
                      <div className="flex justify-between text-gray-600 font-medium">
                        <span>• Bakso Urat (15k):</span>
                        <span className="font-bold text-gray-800">{porsiBakso} Porsi</span>
                      </div>
                      <div className="flex justify-between text-gray-600 font-medium">
                        <span>• Kopi Kenangan (18k):</span>
                        <span className="font-bold text-gray-800">{gelasKopi} Gelas</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                    <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">STATUS DATABASE</p>
                    <p className="text-xs font-semibold text-gray-800">Terhubung ke wa_clients ⚡</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={copyDataToClipboard} className="flex-1 bg-pink-50 text-pink-600 py-1.5 rounded-xl text-xs font-medium">📥 Salin</button>
                      <button onClick={exportToCSV} className="flex-1 bg-emerald-50 text-emerald-600 py-1.5 rounded-xl text-xs font-medium">📥 CSV</button>
                      <button onClick={() => window.print()} className="flex-1 bg-slate-50 text-slate-600 py-1.5 rounded-xl text-xs font-medium">🖨️ Cetak</button>
                    </div>
                  </div>
                </div>

                {/* RIGHT CONTENT */}
                <div className="md:col-span-8 space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                    <input type="text" placeholder="Cari nama, layanan, atau nomor WhatsApp..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full p-2.5 text-xs border border-gray-100 rounded-xl bg-gray-50/50" />
                    
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Filter Status */}
                      <div className="flex flex-wrap gap-1.5">
                        {["Semua", "Baru", "Follow-up", "Deal", "Ditolak"].map((st) => (
                          <button key={st} onClick={() => setFilterStatus(st)} className={`px-3 py-1 rounded-lg text-xs font-medium ${filterStatus === st ? "bg-pink-500 text-white" : "bg-white text-gray-500 border"}`}>
                            {st}
                          </button>
                        ))}
                      </div>

                      {/* Filter Sumber Klien Baru */}
                      <select 
                        value={filterSumber} 
                        onChange={(e) => setFilterSumber(e.target.value)} 
                        className="text-xs px-3 py-1.5 rounded-lg border border-pink-200 text-pink-600 bg-pink-50/50 outline-none font-medium"
                      >
                        <option value="Semua">Semua Sumber ▾</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Google Maps">Google Maps</option>
                        <option value="Rekomendasi">Rekomendasi</option>
                        <option value="LinkedIn / Lainnya">LinkedIn / Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {loading ? (
                      <div className="bg-white p-6 rounded-2xl text-center text-xs text-gray-400">Loading data prospek...</div>
                    ) : filteredProspek.map((klien) => {
                      const tempBadge = getTemperatureBadge(klien);
                      const isDueToday = klien.tgl_followup === todayStr;

                      return (
                        <div key={klien.id} className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm hover:border-pink-300 transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-gray-800 text-sm">{klien.nama}</h4>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${tempBadge.style}`}>{tempBadge.label}</span>
                                
                                {isDueToday && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-500 text-white animate-pulse">
                                    ⏰ Follow-up Hari Ini!
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{klien.layanan} <span className="text-rose-400 font-semibold">({klien.sumber || "Instagram"})</span></p>
                            </div>

                            {/* Quick Status 1-Click Dropdown */}
                            <select
                              value={klien.status}
                              onChange={(e) => handleStatusChange(klien.id, e.target.value as any)}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-pink-200 text-pink-600 bg-pink-50/50 outline-none"
                            >
                              <option value="Baru">Baru ▾</option>
                              <option value="Follow-up">Follow-up ▾</option>
                              <option value="Deal">Deal 🚀</option>
                              <option value="Ditolak">Ditolak</option>
                            </select>
                          </div>

                          <div className="bg-pink-50/30 p-2.5 rounded-xl border border-pink-100 text-xs text-gray-600 space-y-0.5">
                            <p className="flex items-center gap-1 font-medium text-gray-700">
                              📝 Catatan: <span className="font-normal text-gray-600">{klien.notes || "Input dari form lengkap"}</span>
                            </p>
                            <p className="text-[10px] text-gray-400">Total Follow-up: {klien.followup_count || 0}x</p>
                          </div>

                          <div className="flex justify-between items-center pt-1 text-xs">
                            <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                              <span>📱 {klien.no_whatsapp}</span>
                              <span>•</span>
                              <span>📅 {klien.tgl_followup}</span>
                            </div>

                            <div className="flex gap-2">
                              <button onClick={() => handleQuickCopyChat(klien)} className="bg-pink-50 text-pink-600 border border-pink-200 px-3 py-1 rounded-xl text-xs font-semibold hover:bg-pink-100">
                                📋 Salin Chat
                              </button>
                              <button onClick={() => handleChatWA(klien)} className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-semibold hover:bg-emerald-100">
                                💬 Chat WA
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}