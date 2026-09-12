"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface WaClient {
  id: string;
  created_at?: string;
  nama: string;
  no_whatsapp: string;
  sumber: string;
  layanan: string;
  status: "Baru" | "Follow-up" | "Deal" | "Ditolak";
  catatan?: string;
  tgl_followup: string;
  followup_count?: number;
  nominal?: number | null;
  statusBayar?: "Belum DP" | "DP 50%" | "Lunas";
}

export default function Home() {
  const [modeUtama, setModeUtama] = useState<"prospek" | "personal">("prospek");
  const [subProspek, setSubProspek] = useState<"list" | "kalender" | "tambah">("list");
  const [subPersonal, setSubPersonal] = useState<"ratecard" | "template">("ratecard");

  const todayStr = new Date().toISOString().split("T")[0];

  const [prospekList, setProspekList] = useState<WaClient[]>([]);

  const [filterStatus, setFilterStatus] = useState<string>("Semua");
  const [filterKategori, setFilterKategori] = useState<string>("Semua");
  const [filterRentang, setFilterRentang] = useState<"semua" | "bulan_ini" | "hari_ini">("semua");
  const [pencarian, setPencarian] = useState("");
  const [urutanSort, setUrutanSort] = useState<"terbaru" | "terdekat">("terdekat");
  const [isTerhubung, setIsTerhubung] = useState(true);

  // State Form Quick Input
  const [qNama, setQNama] = useState("");
  const [qWhatsapp, setQWhatsapp] = useState("");
  const [qSumber, setQSumber] = useState("Google Maps");

  // State Form Lengkap & Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputNama, setInputNama] = useState("");
  const [inputWhatsapp, setInputWhatsapp] = useState("");
  const [inputSumber, setInputSumber] = useState("Google Maps");
  const [inputLayanan, setInputLayanan] = useState("Website Bisnis");
  const [inputStatus, setInputStatus] = useState<"Baru" | "Follow-up" | "Deal" | "Ditolak">("Baru");
  const [inputTanggal, setInputTanggal] = useState(todayStr);
  const [inputCatatan, setInputCatatan] = useState("");
  const [inputNominal, setInputNominal] = useState<number | "">("");
  const [inputStatusBayar, setInputStatusBayar] = useState<"Belum DP" | "DP 50%" | "Lunas">("Belum DP");

  // State Pengaturan Bot Telegram & Rate Card
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isPromoAktif, setIsPromoAktif] = useState(true);

  useEffect(() => {
    fetchWaClients();
    const savedToken = localStorage.getItem("tg_token") || "";
    const savedChatId = localStorage.getItem("tg_chatid") || "";
    setTelegramBotToken(savedToken);
    setTelegramChatId(savedChatId);
  }, []);

  const fetchWaClients = async () => {
    try {
      const { data, error } = await supabase
        .from("wa_clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setProspekList(data);
      setIsTerhubung(true);
    } catch (err) {
      console.error("Gagal terhubung ke Supabase:", err);
      setIsTerhubung(false);
    }
  };

  const kirimNotifTelegram = async (pesan: string) => {
    if (!telegramBotToken || !telegramChatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramChatId, text: pesan, parse_mode: "Markdown" })
      });
    } catch (err) {
      console.error("Gagal kirim notif telegram:", err);
    }
  };

  const simpanConfigTelegram = () => {
    localStorage.setItem("tg_token", telegramBotToken);
    localStorage.setItem("tg_chatid", telegramChatId);
    alert("✅ Konfigurasi Bot Telegram berhasil disimpan!");
  };

  const tambahQuickProspek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qNama.trim() || !qWhatsapp.trim()) {
      alert("Nama dan No. WhatsApp wajib diisi!");
      return;
    }

    let formatWa = qWhatsapp.trim();
    if (formatWa.startsWith("0")) {
      formatWa = "62" + formatWa.slice(1);
    }

    const dataBaru = {
      nama: qNama,
      no_whatsapp: formatWa,
      sumber: qSumber,
      layanan: "Website Bisnis",
      status: "Baru" as const,
      catatan: "Input cepat dari dashboard jemput bola",
      tgl_followup: todayStr,
      followup_count: 1
    };

    try {
      const { data, error } = await supabase.from("wa_clients").insert([dataBaru]).select();
      if (error) throw error;
      if (data) setProspekList([data[0], ...prospekList]);
    } catch (err) {
      console.error("Gagal insert ke wa_clients:", err);
      alert("Gagal menyimpan ke database Supabase. Cek koneksi / RLS policy.");
      return;
    }

    kirimNotifTelegram(`⚡ *PROSPEK BARU MASUK!*\nNama: ${qNama}\nWhatsApp: ${formatWa}\nSumber: ${qSumber}`);

    setQNama("");
    setQWhatsapp("");
    alert("✅ Prospek baru berhasil disimpan ke wa_clients!");
  };

  const simpanProspekLengkap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNama.trim()) return;

    let formatWa = inputWhatsapp.trim();
    if (formatWa.startsWith("0")) {
      formatWa = "62" + formatWa.slice(1);
    }

    const payload = {
      nama: inputNama,
      no_whatsapp: formatWa,
      sumber: inputSumber,
      layanan: inputLayanan,
      status: inputStatus,
      catatan: inputCatatan || "-",
      tgl_followup: inputTanggal,
      nominal: inputNominal === "" ? null : Number(inputNominal),
      statusBayar: inputStatusBayar
    };

    if (editingId !== null) {
      const listBaru = prospekList.map((item) => {
        if (item.id === editingId) {
          return { ...item, ...payload };
        }
        return item;
      });

      setProspekList(listBaru);

      try {
        await supabase.from("wa_clients").update(payload).eq("id", editingId);
      } catch (err) {}

      setEditingId(null);
      alert("✅ Data klien berhasil diperbarui!");
    } else {
      try {
        const { data, error } = await supabase.from("wa_clients").insert([{ ...payload, followup_count: 1 }]).select();
        if (error) throw error;
        if (data) setProspekList([data[0], ...prospekList]);
      } catch (err) {
        console.error("Gagal insert lengkap:", err);
      }

      kirimNotifTelegram(`📝 *PROSPEK LENGKAP!*\nNama: ${inputNama}\nLayanan: ${inputLayanan}\nStatus: ${inputStatus}`);
    }

    setInputNama("");
    setInputWhatsapp("");
    setInputCatatan("");
    setInputNominal("");
    setSubProspek("list");
  };

  const mulaiEditProspek = (item: WaClient) => {
    setEditingId(item.id);
    setInputNama(item.nama);
    setInputWhatsapp(item.no_whatsapp);
    setInputSumber(item.sumber || "Google Maps");
    setInputLayanan(item.layanan || "Website Bisnis");
    setInputStatus(item.status);
    setInputTanggal(item.tgl_followup || todayStr);
    setInputCatatan(item.catatan || "");
    setInputNominal(item.nominal || "");
    setInputStatusBayar(item.statusBayar || "Belum DP");
    setSubProspek("tambah");
  };

  const ubahStatusCepat = async (id: string, statusBaru: "Baru" | "Follow-up" | "Deal" | "Ditolak") => {
    const listBaru = prospekList.map((item) => item.id === id ? { ...item, status: statusBaru } : item);
    setProspekList(listBaru);

    if (statusBaru === "Deal" || statusBaru === "Ditolak") {
      kirimNotifTelegram(`🎉 *STATUS BERUBAH KE [${statusBaru.toUpperCase()}]!*\nID Klien: #${id}`);
    }

    try {
      await supabase.from("wa_clients").update({ status: statusBaru }).eq("id", id);
    } catch (err) {}
  };

  const hapusProspek = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data klien ini?")) return;
    setProspekList(prospekList.filter(item => item.id !== id));
    try {
      await supabase.from("wa_clients").delete().eq("id", id);
    } catch (err) {}
  };

  const salinTeks = (teks: string) => {
    navigator.clipboard.writeText(teks);
    alert("Berhasil disalin! Siap ditempel.");
  };

  const exportToCSV = () => {
    if (prospekList.length === 0) {
      alert("Tidak ada data untuk diekspor!");
      return;
    }

    const headers = ["ID", "Nama", "No WhatsApp", "Sumber", "Layanan", "Status", "Tanggal Followup", "Catatan"];
    const rows = prospekList.map(item => [
      item.id,
      `"${item.nama}"`,
      `"${item.no_whatsapp}"`,
      `"${item.sumber}"`,
      `"${item.layanan}"`,
      item.status,
      item.tgl_followup,
      `"${item.catatan || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_wa_clients_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDFReport = () => {
    window.print();
  };

  const exportLaporan = () => {
    const totalDealCount = prospekList.filter(i => i.status === "Deal").length;
    let laporan = `📊 *LAPORAN WA CLIENTS KALA PROJECT*\n`;
    laporan += `Total Klien: ${prospekList.length} | Deal: ${totalDealCount}\n\n`;
    
    prospekList.forEach((item, idx) => {
      laporan += `${idx + 1}. *${item.nama}* (${item.layanan})\n   Status: [${item.status}] | WA: ${item.no_whatsapp}\n\n`;
    });

    salinTeks(laporan);
  };

  const listFollowUpHariIni = prospekList.filter(item => item.tgl_followup === todayStr && (item.status === "Baru" || item.status === "Follow-up"));

  const totalDeal = prospekList.filter(i => i.status === "Deal").length;
  const totalDitolak = prospekList.filter(i => i.status === "Ditolak").length;
  const totalProses = prospekList.filter(i => i.status === "Baru" || i.status === "Follow-up").length;

  const totalOmset = prospekList
    .filter(i => i.status === "Deal" && i.nominal)
    .reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  
  const conversionRate = prospekList.length > 0 
    ? ((totalDeal / prospekList.length) * 100).toFixed(1) 
    : "0";

  const filteredList = prospekList.filter((item) => {
    const cocokPencarian =
      item.nama.toLowerCase().includes(pencarian.toLowerCase()) ||
      (item.layanan && item.layanan.toLowerCase().includes(pencarian.toLowerCase())) ||
      item.no_whatsapp.toLowerCase().includes(pencarian.toLowerCase());

    const cocokStatus = filterStatus === "Semua" || item.status === filterStatus;
    const cocokKategori = filterKategori === "Semua" || item.sumber === filterKategori;

    let cocokRentang = true;
    if (filterRentang === "hari_ini") {
      cocokRentang = item.tgl_followup === todayStr;
    } else if (filterRentang === "bulan_ini") {
      const bulanIniPrefix = todayStr.slice(0, 7);
      cocokRentang = !!(item.tgl_followup && item.tgl_followup.startsWith(bulanIniPrefix));
    }

    return cocokPencarian && cocokStatus && cocokKategori && cocokRentang;
  }).sort((a, b) => {
    if (urutanSort === "terdekat") {
      return (a.tgl_followup || "").localeCompare(b.tgl_followup || "");
    } else {
      return (b.created_at || "").localeCompare(a.created_at || "");
    }
  });

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-slate-800 flex flex-col font-sans pb-16">
      <div className="max-w-5xl w-full mx-auto p-4 md:p-6 space-y-4">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-[#FFD1DC] p-4 rounded-3xl shadow-xs gap-3">
          <div>
            <h1 className="text-sm md:text-base font-extrabold text-[#D65A75] flex items-center gap-1.5">
              🚀 Kala Project • Sales Tracker Jemput Bola
            </h1>
            <p className="text-[11px] text-slate-400">Dashboard Manajemen Klien & Portofolio (wa_clients)</p>
          </div>
          
          <div className="bg-[#FFE8EC] border border-[#FFD1DC] p-1.5 rounded-2xl grid grid-cols-2 gap-1 shadow-xs w-full md:w-auto">
            <button
              onClick={() => { setModeUtama("prospek"); setSubProspek("list"); }}
              className={`py-1.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer ${
                modeUtama === "prospek" ? "bg-[#D65A75] text-white shadow-xs" : "text-slate-600 hover:bg-white/50"
              }`}
            >
              🎯 Mode Prospek
            </button>
            <button
              onClick={() => { setModeUtama("personal"); setSubPersonal("ratecard"); }}
              className={`py-1.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer ${
                modeUtama === "personal" ? "bg-[#D65A75] text-white shadow-xs" : "text-slate-600 hover:bg-white/50"
              }`}
            >
              👤 Mode Personal
            </button>
          </div>
        </div>

        {modeUtama === "prospek" && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-white border border-[#FFD1DC] p-1.5 rounded-2xl max-w-lg">
              <button
                onClick={() => { setSubProspek("list"); setEditingId(null); }}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-xl transition cursor-pointer ${subProspek === "list" ? "bg-[#FFE8EC] text-[#D65A75]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                📋 Daftar Klien ({prospekList.length})
              </button>
              <button
                onClick={() => { setSubProspek("kalender"); setEditingId(null); }}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-xl transition cursor-pointer ${subProspek === "kalender" ? "bg-[#FFE8EC] text-[#D65A75]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                📅 Kalender
              </button>
              <button
                onClick={() => { 
                  setSubProspek("tambah"); 
                  setEditingId(null); 
                  setInputNama(""); setInputWhatsapp(""); setInputCatatan(""); setInputNominal("");
                }}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-xl transition cursor-pointer ${subProspek === "tambah" ? "bg-[#FFE8EC] text-[#D65A75]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                ➕ {editingId !== null ? "Edit" : "Baru"}
              </button>
            </div>

            {subProspek === "list" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                
                {/* KOLOM KIRI */}
                <div className="space-y-3 lg:col-span-1">
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white border border-[#FFD1DC] p-2.5 rounded-2xl text-center shadow-xs">
                      <p className="text-[10px] text-slate-400 font-semibold">PROSES</p>
                      <p className="text-sm font-bold text-[#D65A75]">{totalProses}</p>
                    </div>
                    <div className="bg-white border border-emerald-200 p-2.5 rounded-2xl text-center shadow-xs">
                      <p className="text-[10px] text-emerald-600 font-semibold">DEAL 🚀</p>
                      <p className="text-sm font-bold text-emerald-700">{totalDeal}</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded-2xl text-center shadow-xs">
                      <p className="text-[10px] text-slate-400 font-semibold">DITOLAK</p>
                      <p className="text-sm font-bold text-slate-600">{totalDitolak}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#FFE8EC] to-white border border-[#FFD1DC] p-3 rounded-2xl shadow-xs space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-semibold">💰 Total Omset Deal:</span>
                      <span className="font-bold text-emerald-700">Rp {totalOmset.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-semibold">📈 Rasio Konversi:</span>
                      <span className="font-bold text-[#D65A75]">{conversionRate}%</span>
                    </div>
                  </div>

                  {/* QUICK INPUT FORM */}
                  <div className="bg-white border border-[#FFD1DC] rounded-2xl p-3.5 shadow-sm space-y-2.5">
                    <p className="text-[11px] font-bold text-[#D65A75]">⚡ Quick Input ke wa_clients</p>
                    <form onSubmit={tambahQuickProspek} className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        placeholder="Nama Klien/Toko..."
                        value={qNama}
                        onChange={(e) => setQNama(e.target.value)}
                        className="bg-[#FFFDF9] border border-[#FFD1DC] px-3 py-1.5 rounded-xl text-xs focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="No WA (628... / 08...)"
                        value={qWhatsapp}
                        onChange={(e) => setQWhatsapp(e.target.value)}
                        className="bg-[#FFFDF9] border border-[#FFD1DC] px-3 py-1.5 rounded-xl text-xs focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <select
                          value={qSumber}
                          onChange={(e) => setQSumber(e.target.value)}
                          className="bg-[#FFFDF9] border border-[#FFD1DC] px-3 py-1.5 rounded-xl text-xs text-slate-700 flex-1"
                        >
                          <option value="Google Maps">Google Maps</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Rekomendasi">Rekomendasi</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-[#D65A75] hover:bg-[#c24e67] text-white font-semibold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0"
                        >
                          + Simpan
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* DATABASE & EKSPOR */}
                  <div className="bg-white border border-[#FFD1DC] rounded-2xl p-3 shadow-sm space-y-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-600">STATUS DATABASE</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {isTerhubung ? "Terhubung ke wa_clients ⚡" : "Mode Offline 💾"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <button
                        onClick={exportLaporan}
                        className="bg-[#FFE8EC] hover:bg-[#ffd6df] text-[#D65A75] text-[10px] font-semibold py-1.5 px-1 rounded-xl border border-[#FFD1DC] transition cursor-pointer text-center"
                      >
                        📤 Salin
                      </button>
                      <button
                        onClick={exportToCSV}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold py-1.5 px-1 rounded-xl border border-emerald-200 transition cursor-pointer text-center"
                      >
                        📥 CSV
                      </button>
                      <button
                        onClick={printPDFReport}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold py-1.5 px-1 rounded-xl border border-slate-200 transition cursor-pointer text-center"
                      >
                        🖨️ Cetak
                      </button>
                    </div>
                  </div>

                </div>

                {/* KOLOM KANAN */}
                <div className="space-y-3 lg:col-span-2">
                  
                  {listFollowUpHariIni.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 shadow-xs space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-600 text-sm">🔔</span>
                        <p className="text-xs font-bold text-amber-800">Perhatian: {listFollowUpHariIni.length} Klien Perlu Dihubungi Hari Ini!</p>
                      </div>
                      <div className="space-y-1">
                        {listFollowUpHariIni.map(item => (
                          <div key={item.id} className="bg-white/80 border border-amber-100 p-2 rounded-xl flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-slate-700">{item.nama} ({item.layanan})</span>
                            <a
                              href={`https://wa.me/${item.no_whatsapp}?text=${encodeURIComponent(`Halo Kak ${item.nama}, mau silaturahmi menanyakan kelanjutan diskusi kita kemarin ya Kak.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold px-2.5 py-1 rounded-lg border border-emerald-200"
                            >
                              💬 Chat WA
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FILTER & PENCARIAN */}
                  <div className="bg-white border border-[#FFD1DC] rounded-2xl p-3.5 shadow-sm space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cari nama, layanan, atau nomor WA..."
                        value={pencarian}
                        onChange={(e) => setPencarian(e.target.value)}
                        className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                      />
                      <select
                        value={urutanSort}
                        onChange={(e) => setUrutanSort(e.target.value as any)}
                        className="bg-[#FFFDF9] border border-[#FFD1DC] px-3 py-1 rounded-xl text-xs text-slate-700 shrink-0"
                      >
                        <option value="terdekat">🗓️ Tanggal Terdekat</option>
                        <option value="terbaru">⚡ Paling Baru</option>
                      </select>
                    </div>

                    <div className="flex gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-slate-400">Periode:</span>
                      {(["semua", "hari_ini", "bulan_ini"] as const).map((rentang) => (
                        <button
                          key={rentang}
                          onClick={() => setFilterRentang(rentang)}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                            filterRentang === rentang ? "bg-[#D65A75] text-white border-[#D65A75]" : "bg-[#FFFDF9] text-slate-600 border-[#FFD1DC]"
                          }`}
                        >
                          {rentang === "semua" ? "Semua" : rentang === "hari_ini" ? "Hari Ini" : "Bulan Ini"}
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 items-center justify-between pt-1 border-t border-[#FFD1DC]/40">
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {["Semua", "Baru", "Follow-up", "Deal", "Ditolak"].map((status) => (
                          <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`text-[11px] font-medium px-3 py-1.5 rounded-xl border transition shrink-0 cursor-pointer ${
                              filterStatus === status ? "bg-[#D65A75] text-white border-[#D65A75]" : "bg-[#FFFDF9] text-slate-600 border-[#FFD1DC]"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {["Semua", "Google Maps", "Instagram", "Rekomendasi"].map((kat) => (
                          <button
                            key={kat}
                            onClick={() => setFilterKategori(kat)}
                            className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition shrink-0 cursor-pointer ${
                              filterKategori === kat ? "bg-slate-700 text-white border-slate-700" : "bg-[#FFFDF9] text-slate-500 border-[#FFD1DC]"
                            }`}
                          >
                            {kat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* DAFTAR KARTU KLIEN */}
                  <div className="space-y-2.5">
                    {filteredList.length === 0 ? (
                      <div className="bg-white border border-[#FFD1DC] rounded-2xl p-8 text-center space-y-2 shadow-sm">
                        <p className="text-xs text-slate-400">Tidak ada data di tabel wa_clients.</p>
                      </div>
                    ) : (
                      filteredList.map((item) => (
                        <div key={item.id} className="bg-white border border-[#FFD1DC] p-4 rounded-2xl shadow-sm space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">{item.nama}</h4>
                              <p className="text-[11px] text-slate-500">{item.layanan || "Layanan Umum"} <span className="text-[10px] text-[#D65A75]">({item.sumber})</span></p>
                              
                              {item.status === "Deal" && item.nominal && (
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                    💰 Rp {item.nominal.toLocaleString("id-ID")}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <select
                                value={item.status}
                                onChange={(e) => ubahStatusCepat(item.id, e.target.value as any)}
                                className={`text-[10px] px-2 py-1 rounded-xl font-semibold border focus:outline-none cursor-pointer ${
                                  item.status === "Deal" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                    : item.status === "Ditolak"
                                    ? "bg-slate-100 text-slate-500 border-slate-200"
                                    : "bg-[#FFE8EC] text-[#D65A75] border-[#FFD1DC]"
                                }`}
                              >
                                <option value="Baru">Baru</option>
                                <option value="Follow-up">Follow-up</option>
                                <option value="Deal">Deal 🚀</option>
                                <option value="Ditolak">Ditolak</option>
                              </select>

                              <button
                                onClick={() => mulaiEditProspek(item)}
                                className="text-slate-400 hover:text-[#D65A75] text-xs p-1 cursor-pointer"
                                title="Edit Klien"
                              >
                                ✏️
                              </button>

                              <button
                                onClick={() => hapusProspek(item.id)}
                                className="text-slate-400 hover:text-red-500 text-xs p-1 cursor-pointer"
                                title="Hapus Klien"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* CATATAN / KETERANGAN */}
                          <div className="space-y-1.5 bg-[#FFFDF9] border border-[#FFD1DC] p-2.5 rounded-xl text-[11px] text-slate-600">
                            <span className="font-bold text-slate-500">📝 Catatan:</span> {item.catatan || "Tidak ada catatan."}
                            {item.followup_count !== undefined && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Total Follow-up: {item.followup_count}x
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-1 border-t border-[#FFFDF9]">
                            <span className="text-[10px] text-slate-400 font-mono">
                              📱 {item.no_whatsapp} • 📅 {item.tgl_followup}
                            </span>
                            <a
                              href={`https://wa.me/${item.no_whatsapp}?text=${encodeURIComponent(`Halo Kak ${item.nama}, salam kenal dari Kala Project! Boleh intip portofolio kami di https://rifahan.dev ya.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-3 py-1 rounded-xl border border-emerald-200"
                            >
                              💬 Chat WA
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>
            )}

            {subProspek === "kalender" && (
              <div className="bg-white border border-[#FFD1DC] rounded-3xl p-5 shadow-sm space-y-4 max-w-3xl mx-auto">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-[#D65A75]">📅 Kalender Follow-up wa_clients</h2>
                  <p className="text-[11px] text-slate-400">Bulan Ini ({new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })})</p>
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-2">
                  {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((hari, i) => (
                    <div key={i} className="text-center text-[11px] font-bold text-slate-400 py-1">{hari}</div>
                  ))}

                  {Array.from({ length: 31 }, (_, index) => {
                    const tglAngka = index + 1;
                    const tglStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(tglAngka).padStart(2, '0')}`;
                    const prospekHariIni = prospekList.filter(item => item.tgl_followup === tglStr);
                    const isToday = tglStr === todayStr;

                    return (
                      <div 
                        key={index} 
                        className={`min-h-[75px] bg-[#FFFDF9] border p-1.5 rounded-xl flex flex-col justify-between transition ${
                          isToday ? "border-[#D65A75] ring-1 ring-[#D65A75]" : "border-[#FFD1DC]"
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${isToday ? "text-[#D65A75]" : "text-slate-500"}`}>{tglAngka}</span>
                        <div className="space-y-1 overflow-y-auto max-h-[50px]">
                          {prospekHariIni.map((item) => (
                            <div key={item.id} className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-[#FFE8EC] text-[#D65A75] border-[#FFD1DC] truncate">
                              {item.nama}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {subProspek === "tambah" && (
              <div className="bg-white border border-[#FFD1DC] rounded-3xl p-5 shadow-sm space-y-4 max-w-xl mx-auto">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-[#D65A75]">
                    {editingId !== null ? "✏️ Edit Klien" : "➕ Form Klien wa_clients"}
                  </h2>
                  {editingId !== null && (
                    <button onClick={() => { setEditingId(null); setSubProspek("list"); }} className="text-[10px] text-slate-400 hover:text-red-500 font-semibold">
                      Batal
                    </button>
                  )}
                </div>
                
                <form onSubmit={simpanProspekLengkap} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Nama Klien / Toko *</label>
                    <input
                      type="text"
                      placeholder="Contoh: Toko Kopi Jaya"
                      value={inputNama}
                      onChange={(e) => setInputNama(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">No. WhatsApp *</label>
                    <input
                      type="text"
                      placeholder="62813..."
                      value={inputWhatsapp}
                      onChange={(e) => setInputWhatsapp(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Sumber</label>
                      <select
                        value={inputSumber}
                        onChange={(e) => setInputSumber(e.target.value)}
                        className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 text-slate-700"
                      >
                        <option value="Google Maps">Google Maps</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Rekomendasi">Rekomendasi</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Status</label>
                      <select
                        value={inputStatus}
                        onChange={(e) => setInputStatus(e.target.value as any)}
                        className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 text-slate-700"
                      >
                        <option value="Baru">Baru</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Deal">Deal 🚀</option>
                        <option value="Ditolak">Ditolak</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Layanan</label>
                    <input
                      type="text"
                      value={inputLayanan}
                      onChange={(e) => setInputLayanan(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 focus:outline-none"
                    />
                  </div>
                  {inputStatus === "Deal" && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl space-y-2">
                      <label className="text-[9px] font-bold text-emerald-700">Nominal Harga (Rp)</label>
                      <input
                        type="number"
                        placeholder="350000"
                        value={inputNominal}
                        onChange={(e) => setInputNominal(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-white border border-emerald-200 px-3 py-1.5 rounded-xl text-xs"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Tanggal Follow-up</label>
                    <input
                      type="date"
                      value={inputTanggal}
                      onChange={(e) => setInputTanggal(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Catatan</label>
                    <input
                      type="text"
                      placeholder="Catatan interaksi..."
                      value={inputCatatan}
                      onChange={(e) => setInputCatatan(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#D65A75] hover:bg-[#c24e67] text-white text-xs font-semibold py-3 rounded-xl transition shadow-sm cursor-pointer mt-2"
                  >
                    💾 Simpan ke wa_clients
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= AREA MODE PERSONAL ================= */}
        {modeUtama === "personal" && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {/* Tombol Sub-Menu Personal dengan Kontras Tinggi */}
            <div className="flex gap-1 bg-white border border-[#FFD1DC] p-1.5 rounded-2xl shadow-xs">
              <button
                onClick={() => setSubPersonal("ratecard")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  subPersonal === "ratecard" 
                    ? "bg-[#D65A75] text-white shadow-xs" 
                    : "text-slate-700 hover:bg-[#FFE8EC]/50"
                }`}
              >
                🏷️ Rate Card & Promo
              </button>
              <button
                onClick={() => setSubPersonal("template")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  subPersonal === "template" 
                    ? "bg-[#D65A75] text-white shadow-xs" 
                    : "text-slate-700 hover:bg-[#FFE8EC]/50"
                }`}
              >
                💬 Template Chat
              </button>
            </div>

            {subPersonal === "ratecard" && (
              <div className="space-y-3">
                <div className="bg-[#FFE8EC] border border-[#FFD1DC] rounded-3xl p-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xs font-bold text-[#D65A75]">🏷️ Pengaturan Harga Kala Project</h2>
                    <p className="text-[10px] text-[#B26B7D]">Portofolio: https://rifahan.dev</p>
                  </div>
                  <button 
                    onClick={() => setIsPromoAktif(!isPromoAktif)}
                    className={`text-[10px] font-bold px-3 py-2 rounded-xl border transition cursor-pointer ${isPromoAktif ? "bg-[#D65A75] text-white border-[#D65A75]" : "bg-white text-slate-700 border-[#FFD1DC]"}`}
                  >
                    {isPromoAktif ? "✨ Mode Promo Aktif" : "📌 Mode Harga Normal"}
                  </button>
                </div>

                <div className="bg-white border border-[#FFD1DC] p-4 rounded-2xl shadow-sm space-y-2">
                  <h3 className="text-xs font-bold text-slate-800">🤖 Integrasi Notifikasi Bot Telegram</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Bot Token Telegram"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      className="bg-[#FFFDF9] border border-[#FFD1DC] px-3 py-1.5 rounded-xl text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Telegram Chat ID"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="bg-[#FFFDF9] border border-[#FFD1DC] px-3 py-1.5 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={simpanConfigTelegram}
                    className="w-full bg-[#FFE8EC] text-[#D65A75] text-xs font-semibold py-2 rounded-xl border border-[#FFD1DC] cursor-pointer mt-1"
                  >
                    💾 Simpan Konfigurasi Telegram
                  </button>
                </div>
              </div>
            )}

            {subPersonal === "template" && (
              <div className="space-y-3">
                <div className="bg-[#FFE8EC] border border-[#FFD1DC] rounded-3xl p-4">
                  <h2 className="text-xs font-bold text-[#D65A75]">💬 Daftar Template Chat & Portofolio</h2>
                  <p className="text-[10px] text-[#B26B7D]">Semua template sudah otomatis menyertakan link https://rifahan.dev</p>
                </div>

                {[
                  { 
                    title: "☕ UMKM KULINER / SANTAI", 
                    text: "Halo Kak, salam kenal dari Kala Project! Aku nemu profil tokomu di Google Maps/Instagram. Mau bantu nawarin jasa buat website/menu online. Contoh karya aplikasi bisa dicek di https://rifahan.dev ya Kak. Boleh intip sebentar? ✨" 
                  },
                  { 
                    title: "🏢 BISNIS FORMAL & PROFESIONAL", 
                    text: "Selamat pagi/siang Bapak/Ibu. Kami dari Kala Project melihat usaha Bapak/Ibu memiliki potensi berkembang online. Portofolio aplikasi bisnis kami dapat dilihat di https://rifahan.dev. Barangkali tertarik, mari berdiskusi. 🤝" 
                  },
                  { 
                    title: "🚀 FASHION / RETAIL (GEN Z)", 
                    text: "Halo kak! Suka banget sama produknya 😍. Dari Kala Project mau nawarin collab buat naikin omset lewat digital marketing & G-Maps. Intip portofolio app buatan kita yuk di https://rifahan.dev. Minat dibantuin gak kak? 🚀" 
                  },
                  { 
                    title: "📦 RATE CARD PROMO", 
                    text: "Halo Kak, lagi cari vendor buat bikin website / aplikasi? Cek portofolio Kala Project di https://rifahan.dev ya. Kita ada promo paket lengkap mulai Rp 350rb-an aja khusus awal kerja sama. Mau dikirimin rincian harganya, Kak? 📄" 
                  },
                  { 
                    title: "🤝 SOFT CLOSING (JIKA DITOLAK)", 
                    text: "Baik Kak, tidak apa-apa sama sekali, terima kasih banyak ya atas waktunya dari Kala Project! 🙏 Kalau sewaktu-waktu ke depannya butuh partner untuk pembuatan website atau aplikasi usaha, portofolio kami selalu bisa dicek di https://rifahan.dev ya Kak. Sukses selalu untuk bisnisnya! ✨" 
                  }
                ].map((tpl, i) => (
                  <div key={i} className="bg-white border border-[#FFD1DC] p-4 rounded-2xl shadow-sm space-y-2">
                    <p className="text-xs font-bold text-slate-700">{tpl.title}</p>
                    <p className="text-xs text-slate-600 bg-[#FFFDF9] p-3 rounded-xl border border-[#FFD1DC] leading-relaxed">{tpl.text}</p>
                    <button 
                      onClick={() => salinTeks(tpl.text)}
                      className="w-full bg-[#FFE8EC] hover:bg-[#ffd6df] text-[#D65A75] font-semibold text-xs py-2 rounded-xl border border-[#FFD1DC] transition cursor-pointer"
                    >
                      📋 Salin Template Ini
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}