"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Safe Supabase Initializer (mencegah error build "supabaseUrl is required" di Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
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
  followup_count?: number;
}

export default function DashboardProspek() {
  const [prospekList, setProspekList] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle Header & Sub-Tab Navigation
  const [activeTab, setActiveTab] = useState<"prospek" | "personal">("prospek");
  const [prospekSubTab, setProspekSubTab] = useState<"daftar" | "kalender" | "baru">("daftar");
  const [personalSubTab, setPersonalSubTab] = useState<"ratecard" | "template">("ratecard");

  // Form State
  const [nama, setNama] = useState("");
  const [noWa, setNoWa] = useState("");
  const [sumber, setSumber] = useState("Google Maps");
  const [status, setStatus] = useState<ClientType["status"]>("Baru");
  const [layanan, setLayanan] = useState("Website Bisnis");
  const [tglFollowup, setTglFollowup] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Filter State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterSumber, setFilterSumber] = useState("Semua");

  // State Telegram Bot Config & Target Omset
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [targetOmsetBulanan] = useState(2000000);

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
    if (savedToken) setTelegramToken(savedToken);
    if (savedChatId) setTelegramChatId(savedChatId);
  }, []);

  const handleSaveTelegramConfig = () => {
    localStorage.setItem("tg_token", telegramToken);
    localStorage.setItem("tg_chatid", telegramChatId);
    alert("Konfigurasi Telegram disimpan!");
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
    if (!nama || !noWa) return;

    const { data, error } = await supabase
      .from("wa_clients")
      .insert([
        {
          nama,
          no_wa: noWa,
          layanan,
          status,
          tgl_followup: tglFollowup,
          sumber,
          notes: notes || "Input cepat dari dashboard jemput bola",
          followup_count: 0,
        },
      ])
      .select();

    if (!error && data) {
      setProspekList((prev) => [data[0], ...prev]);
      setNama("");
      setNoWa("");
      setNotes("");
      setProspekSubTab("daftar");

      sendTelegramNotification(`🚀 <b>Prospek Baru Ditambahkan!</b>\nNama: ${nama}\nSumber: ${sumber}`);
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
    const headers = ["ID,Nama,No WA,Layanan,Status,Tgl Followup,Sumber,Deal Amount\n"];
    const rows = prospekList.map(
      (i) => `"${i.id}","${i.nama}","${i.no_wa}","${i.layanan}","${i.status}","${i.tgl_followup}","${i.sumber || ""}","${i.deal_amount || 0}"`
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
      .map((i) => `${i.nama} | ${i.no_wa} | ${i.status} | Tgl: ${i.tgl_followup}`)
      .join("\n");
    navigator.clipboard.writeText(textData);
    alert("Daftar prospek berhasil disalin ke clipboard!");
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
  const persentaseTargetOmset = Math.min(Math.round((totalOmset / targetOmsetBulanan) * 100), 100);

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

  // Helper Warna & Label Progres Dinamis di Kalender
  const getCalendarBadge = (status: ClientType["status"]) => {
    switch (status) {
      case "Deal":
        return {
          style: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
          label: "🎉 Deal:",
        };
      case "Follow-up":
        return {
          style: "bg-pink-100 text-pink-700 border-pink-200 font-medium",
          label: "💬 Follow-up:",
        };
      case "Ditolak":
        return {
          style: "bg-rose-100 text-rose-700 border-rose-200 font-medium",
          label: "❌ Ditolak:",
        };
      default:
        return {
          style: "bg-blue-50 text-blue-600 border-blue-200 font-medium",
          label: "🆕 Prospek:",
        };
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

        {/* TAMPILAN MODE PERSONAL */}
        {activeTab === "personal" ? (
          <div className="max-w-3xl mx-auto space-y-4">
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

            {personalSubTab === "ratecard" && (
              <div className="space-y-4">
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

                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800 border-b pb-2">📋 Daftar Paket & Layanan</h3>
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

                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800">🤖 Integrasi Notifikasi Bot Telegram</h3>
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
                    onClick={handleSaveTelegramConfig}
                    className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-2 rounded-xl text-xs hover:bg-pink-100 transition"
                  >
                    💾 Simpan Konfigurasi Telegram
                  </button>
                </div>
              </div>
            )}

            {personalSubTab === "template" && (
              <div className="space-y-4">
                <div className="bg-pink-50/70 border border-pink-200 p-4 rounded-2xl">
                  <h2 className="font-bold text-xs text-pink-700">💬 Daftar Template Chat & Portofolio</h2>
                  <p className="text-[11px] text-pink-500 mt-0.5">Semua template sudah otomatis menyertakan link https://rifahan.dev</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-gray-800">☕ UMKM KULINER / SANTAI</h3>
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
              </div>
            )}
          </div>
        ) : (
          /* TAMPILAN MODE PROSPEK */
          <>
            {/* SUB-HEADER MENU NAVIGATION */}
            <div className="flex gap-2">
              <button
                onClick={() => setProspekSubTab("daftar")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                  prospekSubTab === "daftar"
                    ? "bg-pink-500 text-white border border-pink-500"
                    : "bg-white border border-gray-100 text-gray-500 hover:text-pink-600"
                }`}
              >
                📋 Daftar Klien ({prospekList.length})
              </button>
              <button
                onClick={() => setProspekSubTab("kalender")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                  prospekSubTab === "kalender"
                    ? "bg-pink-500 text-white border border-pink-500"
                    : "bg-white border border-gray-100 text-gray-500 hover:text-pink-600"
                }`}
              >
                📅 Kalender
              </button>
              <button
                onClick={() => setProspekSubTab("baru")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                  prospekSubTab === "baru"
                    ? "bg-pink-500 text-white border border-pink-500"
                    : "bg-white border border-gray-100 text-gray-500 hover:text-pink-600"
                }`}
              >
                ➕ Baru
              </button>
            </div>

            {/* AREA UTAMA DENGAN KONDISI SUB TAB */}
            {prospekSubTab === "kalender" ? (
              /* TAMPILAN FULL KALENDER MULTI-EVENT PROGRES */
              <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm space-y-4 max-w-4xl mx-auto">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-pink-600 flex items-center gap-2">
                      📅 Kalender Progres wa_clients
                    </h3>
                    <div className="flex gap-3 text-[10px] mt-1 font-medium">
                      <span className="text-blue-600">🆕 Prospek Baru</span>
                      <span className="text-pink-600">💬 Follow-up</span>
                      <span className="text-emerald-600">🎉 Deal</span>
                      <span className="text-rose-500">❌ Ditolak</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">September 2026</span>
                </div>

                {/* Day Header */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400">
                  <div>Ming</div>
                  <div>Sen</div>
                  <div>Sel</div>
                  <div>Rab</div>
                  <div>Kam</div>
                  <div>Jum</div>
                  <div>Sab</div>
                </div>

                {/* Grid 31 Hari */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const dayStr = `2026-09-${day < 10 ? "0" + day : day}`;
                    const clientsOnDay = prospekList.filter((c) => c.tgl_followup === dayStr);

                    return (
                      <div
                        key={day}
                        className={`min-h-[78px] p-1.5 border rounded-2xl flex flex-col justify-between transition ${
                          day === 14 ? "border-pink-500 bg-pink-50/20" : "border-pink-100 bg-white"
                        }`}
                      >
                        <span className={`text-[11px] font-bold ${day === 14 ? "text-pink-600" : "text-gray-600"}`}>
                          {day}
                        </span>

                        <div className="space-y-1 overflow-hidden mt-1">
                          {clientsOnDay.map((klien) => {
                            const badge = getCalendarBadge(klien.status);
                            return (
                              <div
                                key={klien.id}
                                className={`text-[9px] px-1.5 py-0.5 rounded-md border truncate ${badge.style}`}
                                title={`${klien.nama} (${klien.status}) - ${klien.notes || ""}`}
                              >
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
              /* TAMPILAN FORM TERPUSAT */
              <div className="bg-white p-8 rounded-3xl border border-pink-100 shadow-sm space-y-5 max-w-xl mx-auto">
                <h3 className="font-bold text-sm text-pink-600 flex items-center gap-2">
                  ➕ Form Klien wa_clients
                </h3>

                <form onSubmit={handleSimpan} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Nama Klien / Toko *</label>
                    <input
                      type="text"
                      placeholder="Contoh: Toko Kopi Jaya"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">No. WhatsApp *</label>
                    <input
                      type="text"
                      placeholder="62813..."
                      value={noWa}
                      onChange={(e) => setNoWa(e.target.value)}
                      className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Sumber</label>
                      <select
                        value={sumber}
                        onChange={(e) => setSumber(e.target.value)}
                        className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30 text-gray-600 focus:outline-none"
                      >
                        <option value="Google Maps">Google Maps</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Rekomendasi">Rekomendasi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30 text-gray-600 focus:outline-none"
                      >
                        <option value="Baru">Baru</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Deal">Deal</option>
                        <option value="Ditolak">Ditolak</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Layanan</label>
                    <input
                      type="text"
                      value={layanan}
                      onChange={(e) => setLayanan(e.target.value)}
                      className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Tanggal Follow-up / Progres</label>
                    <input
                      type="date"
                      value={tglFollowup}
                      onChange={(e) => setTglFollowup(e.target.value)}
                      className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30 text-gray-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Catatan</label>
                    <textarea
                      placeholder="Catatan interaksi..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full p-3 border border-pink-100 rounded-xl bg-gray-50/30 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition shadow-sm text-xs flex justify-center items-center gap-1"
                  >
                    💾 Simpan ke wa_clients
                  </button>
                </form>
              </div>
            ) : (
              /* TAMPILAN MAIN GRID 2 KOLOM FAVORIT */
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

                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">💰 Total Omset Deal:</span>
                      <span className="font-bold text-emerald-600">Rp {totalOmset.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">📈 Rasio Konversi:</span>
                      <span className="font-bold text-pink-500">{rasioKonversi}%</span>
                    </div>

                    <div className="pt-2 border-t border-pink-50 space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-gray-600">
                        <span>Target Omset Bulanan:</span>
                        <span className="font-bold text-pink-600">{persentaseTargetOmset}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all" style={{ width: `${persentaseTargetOmset}%` }}></div>
                      </div>
                      <p className="text-[10px] text-gray-400 text-right">Rp {totalOmset.toLocaleString("id-ID")} / Rp {targetOmsetBulanan.toLocaleString("id-ID")}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                    <h3 className="text-xs font-bold text-pink-600 flex items-center gap-1">⚡ Quick Input ke wa_clients</h3>
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
                        <button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm">
                          + Simpan
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                    <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">STATUS DATABASE</p>
                    <p className="text-xs font-semibold text-gray-800">Terhubung ke wa_clients ⚡</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={copyDataToClipboard} className="flex-1 bg-pink-50 text-pink-600 py-1.5 rounded-xl text-xs font-medium hover:bg-pink-100">
                        📥 Salin
                      </button>
                      <button onClick={exportToCSV} className="flex-1 bg-emerald-50 text-emerald-600 py-1.5 rounded-xl text-xs font-medium hover:bg-emerald-100">
                        📥 CSV
                      </button>
                      <button onClick={() => window.print()} className="flex-1 bg-slate-50 text-slate-600 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100">
                        🖨️ Cetak
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT CONTENT */}
                <div className="md:col-span-8 space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cari nama, layanan, atau nomor WA..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full p-2.5 text-xs border border-gray-100 rounded-xl bg-gray-50/50 focus:outline-none"
                      />
                      <button className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white text-gray-600 whitespace-nowrap">
                        📅 Tanggal Terdekat ▾
                      </button>
                    </div>

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
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            filterStatus === st ? "bg-pink-500 text-white" : "bg-white text-gray-500 border"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {["Semua", "Google Maps", "Instagram", "Rekomendasi"].map((sb) => (
                        <button
                          key={sb}
                          onClick={() => setFilterSumber(sb)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            filterSumber === sb ? "bg-slate-800 text-white" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {sb}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {loading ? (
                      <div className="bg-white p-6 rounded-2xl text-center text-xs text-gray-400">Loading data prospek...</div>
                    ) : filteredProspek.map((klien) => (
                      <div key={klien.id} className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 shadow-sm hover:border-pink-300 transition">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{klien.nama}</h4>
                            <p className="text-xs text-gray-400">{klien.layanan} <span className="text-rose-400">({klien.sumber || "Google Maps"})</span></p>
                          </div>
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
                            <button onClick={() => handleDelete(klien.id)} className="text-gray-400 hover:text-rose-500 text-xs">🗑️</button>
                          </div>
                        </div>

                        <div className="bg-pink-50/30 p-2.5 rounded-xl border border-pink-100 text-xs text-gray-600 space-y-0.5">
                          <p className="flex items-center gap-1 font-medium text-gray-700">
                            📝 Catatan: <span className="font-normal text-gray-600">{klien.notes || "Input cepat dari dashboard"}</span>
                          </p>
                          <p className="text-[10px] text-gray-400">Total Follow-up: {klien.followup_count || 0}x</p>
                        </div>

                        <div className="flex justify-between items-center pt-1 text-xs">
                          <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                            <span>📱 {klien.no_wa}</span>
                            <span>•</span>
                            <span>📅 {klien.tgl_followup}</span>
                          </div>
                          <button
                            onClick={() => handleChatWA(klien)}
                            className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition"
                          >
                            💬 Chat WA
                          </button>
                        </div>
                      </div>
                    ))}
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