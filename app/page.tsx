"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ClientType {
  id: string;
  nama: string;
  no_wa: string;
  layanan: string;
  status: "Baru" | "Follow-up" | "Deal" | "Ditolak";
  tgl_followup: string;
  sumber?: string;
  notes?: string;
  deal_amount?: number;
}

export default function DashboardProspek() {
  const [prospekList, setProspekList] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle Header & Sub-Tab Personal
  const [activeTab, setActiveTab] = useState<"prospek" | "personal">("prospek");
  const [personalSubTab, setPersonalSubTab] = useState<"ratecard" | "template">("ratecard");

  // Form State
  const [nama, setNama] = useState("");
  const [noWa, setNoWa] = useState("");
  const [sumber, setSumber] = useState("Google Maps");

  // Filter State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterSumber, setFilterSumber] = useState("Semua");

  // State Telegram Bot Config
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wa_clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setProspekList(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !noWa) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("wa_clients")
      .insert([
        {
          nama,
          no_wa: noWa,
          layanan: "Website Bisnis",
          status: "Baru",
          tgl_followup: todayStr,
          sumber,
          notes: "Input cepat dari dashboard jemput bola",
        },
      ])
      .select();

    if (!error && data) {
      setProspekList((prev) => [data[0], ...prev]);
      setNama("");
      setNoWa("");
    }
  };

  // Otomatisasi Klik WA (Status -> Follow-up & Tgl -> +3 Hari)
  const handleChatWA = async (prospek: ClientType) => {
    const nextFollowUp = new Date();
    nextFollowUp.setDate(nextFollowUp.getDate() + 3);
    const nextFollowUpStr = nextFollowUp.toISOString().split("T")[0];

    const { error } = await supabase
      .from("wa_clients")
      .update({ status: "Follow-up", tgl_followup: nextFollowUpStr })
      .eq("id", prospek.id);

    if (!error) {
      setProspekList((prev) =>
        prev.map((item) =>
          item.id === prospek.id
            ? { ...item, status: "Follow-up", tgl_followup: nextFollowUpStr }
            : item
        )
      );
    }

    let formattedWa = prospek.no_wa.replace(/\D/g, "");
    if (formattedWa.startsWith("0")) formattedWa = "62" + formattedWa.slice(1);
    const pesan = `Halo Kak! Saya dari Kala Project mau tanyakan terkait kebutuhan website untuk ${prospek.nama}.`;

    window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(pesan)}`, "_blank");
  };

  const handleStatusChange = async (id: string, newStatus: ClientType["status"]) => {
    let dealAmount = 0;
    if (newStatus === "Deal") {
      const inputNominal = prompt("Masukkan nilai deal/omset (Rp):", "350000");
      if (inputNominal === null) return;
      dealAmount = Number(inputNominal) || 0;
    }

    const { error } = await supabase
      .from("wa_clients")
      .update({ status: newStatus, deal_amount: dealAmount })
      .eq("id", id);

    if (!error) {
      setProspekList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus, deal_amount: dealAmount } : item))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus prospek ini?")) return;
    const { error } = await supabase.from("wa_clients").delete().eq("id", id);
    if (!error) {
      setProspekList((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Template berhasil disalin!");
  };

  // Hitung Data Statistik
  const totalProses = prospekList.filter((i) => i.status === "Baru" || i.status === "Follow-up").length;
  const totalDeal = prospekList.filter((i) => i.status === "Deal").length;
  const totalDitolak = prospekList.filter((i) => i.status === "Ditolak").length;
  const totalOmset = prospekList.filter((i) => i.status === "Deal").reduce((sum, i) => sum + (i.deal_amount || 0), 0);
  const rasioKonversi = prospekList.length > 0 ? ((totalDeal / prospekList.length) * 100).toFixed(1) : "0.0";

  // Filter List
  const filteredProspek = prospekList.filter((item) => {
    const matchSearch =
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.no_wa.includes(search) ||
      item.layanan.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Semua" ? true : item.status === filterStatus;
    const matchSumber = filterSumber === "Semua" ? true : item.sumber === filterSumber;
    return matchSearch && matchStatus && matchSumber;
  });

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

        {/* TAMPILAN MODE PERSONAL */}
        {activeTab === "personal" ? (
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* Sub-Tab Switcher */}
            <div className="bg-white p-2 rounded-2xl border border-pink-100 flex gap-2 shadow-sm">
              <button
                onClick={() => setPersonalSubTab("ratecard")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex justify-center items-center gap-1 ${
                  personalSubTab === "ratecard"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-gray-600 hover:bg-pink-50"
                }`}
              >
                🏷️ Rate Card & Promo
              </button>
              <button
                onClick={() => setPersonalSubTab("template")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex justify-center items-center gap-1 ${
                  personalSubTab === "template"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-gray-600 hover:bg-pink-50"
                }`}
              >
                💬 Template Chat
              </button>
            </div>

            {/* TAB 1: RATE CARD & PROMO */}
            {personalSubTab === "ratecard" && (
              <div className="space-y-4">
                
                {/* Header Banner */}
                <div className="bg-pink-50/70 border border-pink-200 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-xs text-pink-700 flex items-center gap-1">
                      🏷️ Pengaturan Harga Kala Project
                    </h2>
                    <p className="text-[11px] text-pink-500 mt-0.5">Portofolio: https://rifahan.dev</p>
                  </div>
                  <span className="bg-rose-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-sm">
                    ✨ Mode Promo Aktif
                  </span>
                </div>

                {/* Daftar Paket & Layanan */}
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1 border-b pb-2">
                    📋 Daftar Paket & Layanan
                  </h3>

                  <div className="space-y-2">
                    <div className="bg-pink-50/30 p-3.5 rounded-xl border border-pink-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-xs text-gray-800">Website Bisnis / UMKM</p>
                        <p className="text-[11px] text-gray-400">Landing page siap pakai + Domain & Hosting</p>
                      </div>
                      <p className="font-bold text-xs text-rose-500">Rp 350.000</p>
                    </div>

                    <div className="bg-pink-50/30 p-3.5 rounded-xl border border-pink-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-xs text-gray-800">Company Profile Custom</p>
                        <p className="text-[11px] text-gray-400">Desain eksklusif & responsif</p>
                      </div>
                      <p className="font-bold text-xs text-rose-500">Rp 750.000</p>
                    </div>
                  </div>
                </div>

                {/* Integrasi Telegram Bot */}
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1">
                    🤖 Integrasi Notifikasi Bot Telegram
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Bot Token Telegram"
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      className="p-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-300"
                    />
                    <input
                      type="text"
                      placeholder="Telegram Chat ID"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="p-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-300"
                    />
                  </div>
                  <button
                    onClick={() => alert("Konfigurasi Telegram disimpan!")}
                    className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100 transition flex items-center justify-center gap-1"
                  >
                    💾 Simpan Konfigurasi Telegram
                  </button>
                </div>

              </div>
            )}

            {/* TAB 2: TEMPLATE CHAT */}
            {personalSubTab === "template" && (
              <div className="space-y-4">
                
                <div className="bg-pink-50/70 border border-pink-200 p-4 rounded-2xl">
                  <h2 className="font-bold text-xs text-pink-700 flex items-center gap-1">
                    💬 Daftar Template Chat & Portofolio
                  </h2>
                  <p className="text-[11px] text-pink-500 mt-0.5">Semua template sudah otomatis menyertakan link https://rifahan.dev</p>
                </div>

                {/* Template 1: Kuliner */}
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1">
                    ☕ UMKM KULINER / SANTAI
                  </h3>
                  <div className="bg-pink-50/20 p-3 rounded-xl border border-pink-100 text-xs text-gray-600 leading-relaxed">
                    Halo Kak, salam kenal dari Kala Project! Aku nemu profil tokomu di Google Maps/Instagram. Mau bantu nawarin jasa buat website/menu online. Contoh karya aplikasi bisa dicek di https://rifahan.dev ya Kak. Boleh intip sebentar? ✨
                  </div>
                  <button
                    onClick={() => copyToClipboard("Halo Kak, salam kenal dari Kala Project! Aku nemu profil tokomu di Google Maps/Instagram. Mau bantu nawarin jasa buat website/menu online. Contoh karya aplikasi bisa dicek di https://rifahan.dev ya Kak. Boleh intip sebentar? ✨")}
                    className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100 transition flex justify-center items-center gap-1"
                  >
                    📋 Salin Template Ini
                  </button>
                </div>

                {/* Template 2: Formal */}
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1">
                    🏢 BISNIS FORMAL & PROFESIONAL
                  </h3>
                  <div className="bg-pink-50/20 p-3 rounded-xl border border-pink-100 text-xs text-gray-600 leading-relaxed">
                    Selamat pagi/siang Bapak/Ibu. Kami dari Kala Project melihat usaha Bapak/Ibu memiliki potensi berkembang online. Portofolio aplikasi bisnis kami dapat dilihat di https://rifahan.dev. Barangkali tertarik, mari berdiskusi. 🤝
                  </div>
                  <button
                    onClick={() => copyToClipboard("Selamat pagi/siang Bapak/Ibu. Kami dari Kala Project melihat usaha Bapak/Ibu memiliki potensi berkembang online. Portofolio aplikasi bisnis kami dapat dilihat di https://rifahan.dev. Barangkali tertarik, mari berdiskusi. 🤝")}
                    className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100 transition flex justify-center items-center gap-1"
                  >
                    📋 Salin Template Ini
                  </button>
                </div>

                {/* Template 3: Gen Z */}
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1">
                    🚀 FASHION / RETAIL (GEN Z)
                  </h3>
                  <div className="bg-pink-50/20 p-3 rounded-xl border border-pink-100 text-xs text-gray-600 leading-relaxed">
                    Halo kak! Suka banget sama produknya 😻. Dari Kala Project mau nawarin collab buat naikin omset lewat digital marketing & G-Maps. Intip portofolio app buatan kita yuk di https://rifahan.dev. Minat dibantuin gak kak? 🚀
                  </div>
                  <button
                    onClick={() => copyToClipboard("Halo kak! Suka banget sama produknya 😻. Dari Kala Project mau nawarin collab buat naikin omset lewat digital marketing & G-Maps. Intip portofolio app buatan kita yuk di https://rifahan.dev. Minat dibantuin gak kak? 🚀")}
                    className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100 transition flex justify-center items-center gap-1"
                  >
                    📋 Salin Template Ini
                  </button>
                </div>

                {/* Template 4: Rate Card Promo */}
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1">
                    📦 RATE CARD PROMO
                  </h3>
                  <div className="bg-pink-50/20 p-3 rounded-xl border border-pink-100 text-xs text-gray-600 leading-relaxed">
                    Halo Kak, lagi cari vendor buat bikin website / aplikasi? Cek portofolio Kala Project di https://rifahan.dev ya. Kita ada promo paket lengkap mulai Rp 350rb-an aja khusus awal kerja sama. Mau dikirimin rincian harganya, Kak? 📝
                  </div>
                  <button
                    onClick={() => copyToClipboard("Halo Kak, lagi cari vendor buat bikin website / aplikasi? Cek portofolio Kala Project di https://rifahan.dev ya. Kita ada promo paket lengkap mulai Rp 350rb-an aja khusus awal kerja sama. Mau dikirimin rincian harganya, Kak? 📝")}
                    className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100 transition flex justify-center items-center gap-1"
                  >
                    📋 Salin Template Ini
                  </button>
                </div>

                {/* Template 5: Soft Closing */}
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1">
                    🤝 SOFT CLOSING (JIKA DITOLAK)
                  </h3>
                  <div className="bg-pink-50/20 p-3 rounded-xl border border-pink-100 text-xs text-gray-600 leading-relaxed">
                    Baik Kak, tidak apa-apa sama sekali, terima kasih banyak ya atas waktunya dari Kala Project! 🙏 Kalau sewaktu-waktu ke depannya butuh partner untuk pembuatan website atau aplikasi usaha, portofolio kami selalu bisa dicek di https://rifahan.dev ya Kak. Sukses selalu untuk bisnisnya! ✨
                  </div>
                  <button
                    onClick={() => copyToClipboard("Baik Kak, tidak apa-apa sama sekali, terima kasih banyak ya atas waktunya dari Kala Project! 🙏 Kalau sewaktu-waktu ke depannya butuh partner untuk pembuatan website atau aplikasi usaha, portofolio kami selalu bisa dicek di https://rifahan.dev ya Kak. Sukses selalu untuk bisnisnya! ✨")}
                    className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100 transition flex justify-center items-center gap-1"
                  >
                    📋 Salin Template Ini
                  </button>
                </div>

              </div>
            )}

          </div>
        ) : (
          /* TAMPILAN MODE PROSPEK (2 KOLOM) */
          <>
            {/* Tab Navigation Sub Header */}
            <div className="flex gap-2">
              <button className="bg-white border border-pink-200 text-pink-600 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5">
                📋 Daftar Klien ({prospekList.length})
              </button>
              <button className="bg-white border border-gray-100 text-gray-500 px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5">
                📅 Kalender
              </button>
              <button className="bg-white border border-gray-100 text-gray-500 px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5">
                ➕ Baru
              </button>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* LEFT SIDEBAR (4 Cols) */}
              <div className="md:col-span-4 space-y-4">
                
                {/* Status Cards */}
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

                {/* Financial Box */}
                <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-2 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">💰 Total Omset Deal:</span>
                    <span className="font-bold text-emerald-600">Rp {totalOmset.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">📈 Rasio Konversi:</span>
                    <span className="font-bold text-pink-500">{rasioKonversi}%</span>
                  </div>
                </div>

                {/* Quick Input Form */}
                <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                  <h3 className="text-xs font-bold text-pink-600 flex items-center gap-1">
                    ⚡ Quick Input ke wa_clients
                  </h3>
                  <form onSubmit={handleSimpan} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nama Klien/Toko..."
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      className="w-full p-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-400"
                    />
                    <input
                      type="text"
                      placeholder="No WA (628... / 08...)"
                      value={noWa}
                      onChange={(e) => setNoWa(e.target.value)}
                      className="w-full p-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-400"
                    />
                    <div className="flex gap-2">
                      <select
                        value={sumber}
                        onChange={(e) => setSumber(e.target.value)}
                        className="w-full p-2 text-xs border border-gray-200 rounded-xl bg-white text-gray-600"
                      >
                        <option value="Google Maps">Google Maps</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Rekomendasi">Rekomendasi</option>
                      </select>
                      <button
                        type="submit"
                        className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded-xl text-xs whitespace-nowrap shadow-sm"
                      >
                        + Simpan
                      </button>
                    </div>
                  </form>
                </div>

                {/* Export / Database Status */}
                <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    STATUS DATABASE
                  </p>
                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                    Terhubung ke wa_clients ⚡
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 bg-pink-50 text-pink-600 py-1.5 rounded-xl text-xs font-medium hover:bg-pink-100">
                      📥 Salin
                    </button>
                    <button className="flex-1 bg-emerald-50 text-emerald-600 py-1.5 rounded-xl text-xs font-medium hover:bg-emerald-100">
                      📥 CSV
                    </button>
                    <button className="flex-1 bg-slate-50 text-slate-600 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100">
                      🖨️ Cetak
                    </button>
                  </div>
                </div>

              </div>

              {/* RIGHT CONTENT (8 Cols) */}
              <div className="md:col-span-8 space-y-4">
                
                {/* Search & Filter Bar */}
                <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cari nama, layanan, atau nomor WA..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full p-2.5 text-xs border border-gray-100 rounded-xl bg-gray-50/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-pink-300"
                    />
                    <button className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white text-gray-600 whitespace-nowrap">
                      📅 Tanggal Terdekat ▾
                    </button>
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-400 font-medium text-[11px]">Periode:</span>
                    <button className="px-3 py-1 bg-pink-500 text-white rounded-lg font-medium text-[11px]">Semua</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px]">Hari Ini</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px]">Bulan Ini</button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Semua", "Baru", "Follow-up", "Deal", "Ditolak"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          filterStatus === st
                            ? "bg-pink-500 text-white shadow-sm"
                            : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* Sumber Filter */}
                  <div className="flex flex-wrap gap-1.5">
                    {["Semua", "Google Maps", "Instagram", "Rekomendasi"].map((sb) => (
                      <button
                        key={sb}
                        onClick={() => setFilterSumber(sb)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          filterSumber === sb
                            ? "bg-slate-800 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {sb}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prospek List Cards */}
                <div className="space-y-3">
                  {loading ? (
                    <div className="bg-white p-6 rounded-2xl text-center text-xs text-gray-400">Loading data prospek...</div>
                  ) : filteredProspek.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl text-center text-xs text-gray-400">Tidak ada prospek ditemukan.</div>
                  ) : (
                    filteredProspek.map((klien) => (
                      <div key={klien.id} className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm hover:border-pink-300 transition">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{klien.nama}</h4>
                            <p className="text-xs text-gray-400">
                              {klien.layanan} <span className="text-rose-400">({klien.sumber || "Google Maps"})</span>
                            </p>
                          </div>

                          {/* Dropdown Status & Actions */}
                          <div className="flex items-center gap-2">
                            <select
                              value={klien.status}
                              onChange={(e) => handleStatusChange(klien.id, e.target.value as any)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg border border-pink-200 text-pink-600 bg-pink-50/50 focus:outline-none"
                            >
                              <option value="Baru">Baru ▾</option>
                              <option value="Follow-up">Follow-up ▾</option>
                              <option value="Deal">Deal 🚀</option>
                              <option value="Ditolak">Ditolak</option>
                            </select>
                            <button className="text-gray-400 hover:text-gray-600 text-xs">✏️</button>
                            <button onClick={() => handleDelete(klien.id)} className="text-gray-400 hover:text-rose-500 text-xs">🗑️</button>
                          </div>
                        </div>

                        {/* Notes Box */}
                        <div className="bg-pink-50/30 p-2.5 rounded-xl border border-pink-100 text-xs text-gray-600 space-y-0.5">
                          <p className="flex items-center gap-1 font-medium text-gray-700">
                            📝 Catatan: <span className="font-normal text-gray-600">{klien.notes || "Input cepat dari dashboard"}</span>
                          </p>
                          <p className="text-[10px] text-gray-400">Total Follow-up: 1x</p>
                        </div>

                        {/* Card Footer: No WA, Tanggal & Button WA */}
                        <div className="flex justify-between items-center pt-1 text-xs">
                          <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                            <span>📱 {klien.no_wa}</span>
                            <span>•</span>
                            <span>📅 {klien.tgl_followup}</span>
                          </div>
                          <button
                            onClick={() => handleChatWA(klien)}
                            className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition flex items-center gap-1"
                          >
                            💬 Chat WA
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}