"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface CatatanRiwayat {
  tanggal: string;
  teks: string;
}

interface Prospek {
  id: number;
  nama: string;
  perusahaan: string;
  whatsapp: string;
  kategori: string;
  status: "Baru" | "Follow-up" | "Deal" | "Ditolak";
  tanggal: string;
  riwayatCatatan?: CatatanRiwayat[];
}

export default function Home() {
  const [modeUtama, setModeUtama] = useState<"prospek" | "personal">("prospek");
  const [subProspek, setSubProspek] = useState<"list" | "kalender" | "tambah">("list");
  const [subPersonal, setSubPersonal] = useState<"ratecard" | "template">("ratecard");

  const todayStr = new Date().toISOString().split("T")[0];

  // State dikosongkan agar murni mengambil dari Supabase tanpa tertimpa data dummy
  const [prospekList, setProspekList] = useState<Prospek[]>([]);

  const [filterStatus, setFilterStatus] = useState<string>("Semua");
  const [filterKategori, setFilterKategori] = useState<string>("Semua");
  const [pencarian, setPencarian] = useState("");
  const [isTerhubung, setIsTerhubung] = useState(true);

  // State Form Quick Input (Di Halaman Utama)
  const [qNama, setQNama] = useState("");
  const [qWhatsapp, setQWhatsapp] = useState("");
  const [qKategori, setQKategori] = useState("Google Maps");

  // State Form Lengkap & Edit (Tab Tambah / Mode Edit)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inputNama, setInputNama] = useState("");
  const [inputPerusahaan, setInputPerusahaan] = useState("");
  const [inputWhatsapp, setInputWhatsapp] = useState("");
  const [inputKategori, setInputKategori] = useState("Google Maps");
  const [inputStatus, setInputStatus] = useState<"Baru" | "Follow-up" | "Deal" | "Ditolak">("Baru");
  const [inputTanggal, setInputTanggal] = useState(todayStr);
  const [inputCatatan, setInputCatatan] = useState("");

  // State Input Catatan Tambahan per Klien di Kartu
  const [aktifInputCatatanId, setAktifInputCatatanId] = useState<number | null>(null);
  const [teksCatatanBaru, setTeksCatatanBaru] = useState("");

  // State Mode Promo Rate Card
  const [isPromoAktif, setIsPromoAktif] = useState(true);

  useEffect(() => {
    fetchProspek();
  }, []);

  const fetchProspek = async () => {
    try {
      const { data, error } = await supabase
        .from("prospek")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      if (data) setProspekList(data);
      setIsTerhubung(true);
    } catch (err) {
      console.error("Gagal terhubung ke Supabase:", err);
      setIsTerhubung(false);
    }
  };

  // Fungsi Quick Input dari Beranda
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

    const dataBaru: Prospek = {
      id: Date.now(),
      nama: qNama,
      perusahaan: "Usaha Mandiri / " + qKategori,
      whatsapp: formatWa,
      kategori: qKategori,
      status: "Baru",
      tanggal: todayStr,
      riwayatCatatan: [{ tanggal: todayStr, teks: "Input cepat dari beranda jemput bola" }]
    };

    try {
      const { data, error } = await supabase.from("prospek").insert([dataBaru]).select();
      if (error) throw error;
      if (data) setProspekList([data[0], ...prospekList]);
    } catch (err) {
      setProspekList([dataBaru, ...prospekList]);
    }

    setQNama("");
    setQWhatsapp("");
    alert("✅ Prospek baru berhasil ditambahkan!");
  };

  // Simpan / Update Form Lengkap
  const simpanProspekLengkap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNama.trim()) return;

    let formatWa = inputWhatsapp.trim();
    if (formatWa.startsWith("0")) {
      formatWa = "62" + formatWa.slice(1);
    }

    if (editingId !== null) {
      const listBaru = prospekList.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            nama: inputNama,
            perusahaan: inputPerusahaan || "Usaha Mandiri",
            whatsapp: formatWa,
            kategori: inputKategori,
            status: inputStatus,
            tanggal: inputTanggal
          };
        }
        return item;
      });

      setProspekList(listBaru);

      try {
        await supabase.from("prospek").update({
          nama: inputNama,
          perusahaan: inputPerusahaan || "Usaha Mandiri",
          whatsapp: formatWa,
          kategori: inputKategori,
          status: inputStatus,
          tanggal: inputTanggal
        }).eq("id", editingId);
      } catch (err) {}

      setEditingId(null);
      alert("✅ Data prospek berhasil diperbarui!");
    } else {
      const dataBaru: Prospek = {
        id: Date.now(),
        nama: inputNama,
        perusahaan: inputPerusahaan || "Usaha Mandiri",
        whatsapp: formatWa,
        kategori: inputKategori,
        status: inputStatus,
        tanggal: inputTanggal,
        riwayatCatatan: inputCatatan ? [{ tanggal: todayStr, teks: inputCatatan }] : []
      };

      try {
        const { data, error } = await supabase.from("prospek").insert([dataBaru]).select();
        if (error) throw error;
        if (data) setProspekList([data[0], ...prospekList]);
      } catch (err) {
        setProspekList([dataBaru, ...prospekList]);
      }
    }

    setInputNama("");
    setInputPerusahaan("");
    setInputWhatsapp("");
    setInputCatatan("");
    setSubProspek("list");
  };

  const mulaiEditProspek = (item: Prospek) => {
    setEditingId(item.id);
    setInputNama(item.nama);
    setInputPerusahaan(item.perusahaan);
    setInputWhatsapp(item.whatsapp);
    setInputKategori(item.kategori);
    setInputStatus(item.status);
    setInputTanggal(item.tanggal);
    setSubProspek("tambah");
  };

  const ubahStatusCepat = async (id: number, statusBaru: "Baru" | "Follow-up" | "Deal" | "Ditolak") => {
    const listBaru = prospekList.map((item) => item.id === id ? { ...item, status: statusBaru } : item);
    setProspekList(listBaru);
    try {
      await supabase.from("prospek").update({ status: statusBaru }).eq("id", id);
    } catch (err) {}
  };

  const tambahCatatanBaru = async (id: number) => {
    if (!teksCatatanBaru.trim()) return;

    const listBaru = prospekList.map((item) => {
      if (item.id === id) {
        const riwayatLama = item.riwayatCatatan || [];
        const catatanBaruList = [{ tanggal: todayStr, teks: teksCatatanBaru }, ...riwayatLama];
        return { ...item, riwayatCatatan: catatanBaruList };
      }
      return item;
    });

    setProspekList(listBaru);
    setAktifInputCatatanId(null);
    setTeksCatatanBaru("");

    const targetItem = listBaru.find(i => i.id === id);
    try {
      await supabase.from("prospek").update({ riwayatCatatan: targetItem?.riwayatCatatan }).eq("id", id);
    } catch (err) {}
  };

  const hapusProspek = async (id: number) => {
    if (!confirm("Yakin ingin menghapus data prospek ini?")) return;
    setProspekList(prospekList.filter(item => item.id !== id));
    try {
      await supabase.from("prospek").delete().eq("id", id);
    } catch (err) {}
  };

  const salinTeks = (teks: string) => {
    navigator.clipboard.writeText(teks);
    alert("Berhasil disalin! Siap ditempel.");
  };

  const exportLaporan = () => {
    const totalDealCount = prospekList.filter(i => i.status === "Deal").length;
    let laporan = `📊 *LAPORAN PROSPEK JEMPUT BOLA*\n`;
    laporan += `Total Klien: ${prospekList.length} | Deal: ${totalDealCount}\n\n`;
    
    prospekList.forEach((item, idx) => {
      laporan += `${idx + 1}. *${item.nama}* (${item.perusahaan})\n   Status: [${item.status}] | WA: ${item.whatsapp}\n\n`;
    });

    salinTeks(laporan);
  };

  const listFollowUpHariIni = prospekList.filter(item => item.tanggal === todayStr && (item.status === "Baru" || item.status === "Follow-up"));

  const totalDeal = prospekList.filter(i => i.status === "Deal").length;
  const totalDitolak = prospekList.filter(i => i.status === "Ditolak").length;
  const totalProses = prospekList.filter(i => i.status === "Baru" || i.status === "Follow-up").length;

  const filteredList = prospekList.filter((item) => {
    const cocokPencarian =
      item.nama.toLowerCase().includes(pencarian.toLowerCase()) ||
      item.perusahaan.toLowerCase().includes(pencarian.toLowerCase()) ||
      item.whatsapp.toLowerCase().includes(pencarian.toLowerCase());

    const cocokStatus = filterStatus === "Semua" || item.status === filterStatus;
    const cocokKategori = filterKategori === "Semua" || item.kategori === filterKategori;

    return cocokPencarian && cocokStatus && cocokKategori;
  });

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-slate-800 flex flex-col font-sans pb-16">
      <div className="max-w-5xl w-full mx-auto p-4 md:p-6 space-y-4">
        
        {/* HEADER / JUDUL UTAMA */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-[#FFD1DC] p-4 rounded-3xl shadow-xs gap-3">
          <div>
            <h1 className="text-sm md:text-base font-extrabold text-[#D65A75] flex items-center gap-1.5">
              🚀 rifahan.dev • Sales Tracker Jemput Bola
            </h1>
            <p className="text-[11px] text-slate-400">Dashboard Manajemen Klien & Portofolio</p>
          </div>
          
          {/* SAKLAR UTAMA */}
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

        {/* ================= AREA MODE PROSPEK ================= */}
        {modeUtama === "prospek" && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-white border border-[#FFD1DC] p-1.5 rounded-2xl max-w-md">
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
                  setInputNama(""); setInputPerusahaan(""); setInputWhatsapp(""); setInputCatatan("");
                }}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-xl transition cursor-pointer ${subProspek === "tambah" ? "bg-[#FFE8EC] text-[#D65A75]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                ➕ {editingId !== null ? "Edit Data" : "Form Baru"}
              </button>
            </div>

            {subProspek === "list" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                
                {/* KOLOM KIRI */}
                <div className="space-y-3 lg:col-span-1">
                  
                  {/* WIDGET STATISTIK PROSPEK */}
                  <div className="grid grid-cols-3 lg:grid-cols-3 gap-2">
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

                  {/* QUICK INPUT FORM */}
                  <div className="bg-white border border-[#FFD1DC] rounded-2xl p-3.5 shadow-sm space-y-2.5">
                    <p className="text-[11px] font-bold text-[#D65A75]">⚡ Quick Input Prospek Baru</p>
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
                          value={qKategori}
                          onChange={(e) => setQKategori(e.target.value)}
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
                          + Simpan Kilat
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* STATUS DATABASE & LAPORAN */}
                  <div className="flex items-center justify-between bg-white border border-[#FFD1DC] rounded-2xl p-3 shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-600">STATUS DATABASE</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {isTerhubung ? "Terhubung (Supabase) ⚡" : "Mode Offline / Lokal 💾"}
                      </p>
                    </div>
                    <button
                      onClick={exportLaporan}
                      className="bg-[#FFE8EC] hover:bg-[#ffd6df] text-[#D65A75] text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-[#FFD1DC] transition cursor-pointer"
                    >
                      📤 Salin Laporan
                    </button>
                  </div>

                </div>

                {/* KOLOM KANAN */}
                <div className="space-y-3 lg:col-span-2">
                  
                  {/* WIDGET ALERT FOLLOW-UP HARI INI */}
                  {listFollowUpHariIni.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 shadow-xs space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-600 text-sm">🔔</span>
                        <p className="text-xs font-bold text-amber-800">Perhatian: {listFollowUpHariIni.length} Klien Perlu Dihubungi Hari Ini!</p>
                      </div>
                      <div className="space-y-1">
                        {listFollowUpHariIni.map(item => (
                          <div key={item.id} className="bg-white/80 border border-amber-100 p-2 rounded-xl flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-slate-700">{item.nama} ({item.perusahaan})</span>
                            <a
                              href={`https://wa.me/${item.whatsapp}?text=${encodeURIComponent(`Halo Kak ${item.nama}, mau silaturahmi menanyakan kelanjutan diskusi kita kemarin ya Kak.`)}`}
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

                  {/* FILTER DAN PENCARIAN */}
                  <div className="bg-white border border-[#FFD1DC] rounded-2xl p-3.5 shadow-sm space-y-2.5">
                    <input
                      type="text"
                      placeholder="Cari nama, perusahaan, atau nomor WA..."
                      value={pencarian}
                      onChange={(e) => setPencarian(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                    />
                    
                    <div className="flex flex-wrap gap-1.5 items-center justify-between">
                      {/* Filter Status */}
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

                      {/* Filter Kategori Sumber */}
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
                        <p className="text-xs text-slate-400">Belum ada data prospek yang cocok atau database masih kosong.</p>
                      </div>
                    ) : (
                      filteredList.map((item) => (
                        <div key={item.id} className="bg-white border border-[#FFD1DC] p-4 rounded-2xl shadow-sm space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">{item.nama}</h4>
                              <p className="text-[11px] text-slate-500">{item.perusahaan} <span className="text-[10px] text-[#D65A75]">({item.kategori})</span></p>
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
                                <option value="Deal">Deal</option>
                                <option value="Ditolak">Ditolak</option>
                              </select>

                              <button
                                onClick={() => mulaiEditProspek(item)}
                                className="text-slate-400 hover:text-[#D65A75] text-xs p-1 cursor-pointer"
                                title="Edit Data Klien"
                              >
                                ✏️
                              </button>

                              <button
                                onClick={() => hapusProspek(item.id)}
                                className="text-slate-400 hover:text-red-500 text-xs p-1 cursor-pointer"
                                title="Hapus Prospek"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* TIMELINE RIWAYAT CATATAN */}
                          <div className="space-y-1.5 bg-[#FFFDF9] border border-[#FFD1DC] p-2.5 rounded-xl">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500">📝 Riwayat Obrolan / Catatan:</span>
                              <button
                                onClick={() => setAktifInputCatatanId(aktifInputCatatanId === item.id ? null : item.id)}
                                className="text-[10px] font-bold text-[#D65A75] hover:underline cursor-pointer"
                              >
                                {aktifInputCatatanId === item.id ? "Tutup" : "+ Tambah Catatan"}
                              </button>
                            </div>

                            <div className="space-y-1 pt-1">
                              {item.riwayatCatatan && item.riwayatCatatan.length > 0 ? (
                                item.riwayatCatatan.map((rc, idx) => (
                                  <div key={idx} className="text-[11px] text-slate-600 border-l-2 border-[#D65A75] pl-2 py-0.5">
                                    <span className="text-[9px] text-slate-400 font-mono">[{rc.tanggal}]</span> {rc.teks}
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">Belum ada catatan interaksi.</p>
                              )}
                            </div>

                            {aktifInputCatatanId === item.id && (
                              <div className="pt-2 flex gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Tulis hasil chat/obrolan baru..."
                                  value={teksCatatanBaru}
                                  onChange={(e) => setTeksCatatanBaru(e.target.value)}
                                  className="bg-white border border-[#FFD1DC] px-2.5 py-1 rounded-lg text-xs flex-1 focus:outline-none"
                                />
                                <button
                                  onClick={() => tambahCatatanBaru(item.id)}
                                  className="bg-[#D65A75] text-white text-[10px] font-bold px-3 py-1 rounded-lg cursor-pointer"
                                >
                                  Simpan
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-1 border-t border-[#FFFDF9]">
                            <span className="text-[10px] text-slate-400 font-mono">
                              📱 {item.whatsapp} • 📅 {item.tanggal}
                            </span>
                            <a
                              href={`https://wa.me/${item.whatsapp}?text=${encodeURIComponent(`Halo Kak ${item.nama}, salam kenal dari rifahan.dev! Boleh intip portofolio kita ya.`)}`}
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
              <div className="bg-white border border-[#FFD1DC] rounded-3xl p-5 shadow-sm space-y-4 max-w-xl mx-auto">
                <h2 className="text-sm font-bold text-[#D65A75]">📅 Kalender Jadwal Follow-up</h2>
                <div className="space-y-2">
                  {prospekList.map((item) => (
                    <div key={item.id} className="border border-[#FFD1DC] p-3 rounded-2xl bg-[#FFFDF9] flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800">🗓️ {item.tanggal}</span>
                        <p className="text-slate-600 font-medium mt-0.5">{item.nama} - {item.perusahaan}</p>
                      </div>
                      <span className="bg-[#FFE8EC] text-[#D65A75] px-2 py-0.5 rounded-lg text-[10px] font-semibold">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subProspek === "tambah" && (
              <div className="bg-white border border-[#FFD1DC] rounded-3xl p-5 shadow-sm space-y-4 max-w-xl mx-auto">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-[#D65A75]">
                    {editingId !== null ? "✏️ Edit Data Klien" : "➕ Form Lengkap Input Prospek"}
                  </h2>
                  {editingId !== null && (
                    <button 
                      onClick={() => { 
                        setEditingId(null); 
                        setSubProspek("list"); 
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-semibold"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
                
                <form onSubmit={simpanProspekLengkap} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Nama Klien / Toko *</label>
                    <input
                      type="text"
                      placeholder="Contoh: Toko Bu Irma"
                      value={inputNama}
                      onChange={(e) => setInputNama(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Nama Perusahaan / Usaha</label>
                    <input
                      type="text"
                      placeholder="Contoh: Kuliner Enak G-Maps"
                      value={inputPerusahaan}
                      onChange={(e) => setInputPerusahaan(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">No. WhatsApp *</label>
                    <input
                      type="text"
                      placeholder="Contoh: 628131991832..."
                      value={inputWhatsapp}
                      onChange={(e) => setInputWhatsapp(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Kategori Sumber</label>
                    <select
                      value={inputKategori}
                      onChange={(e) => setInputKategori(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 text-slate-700"
                    >
                      <option value="Google Maps">Google Maps</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Rekomendasi">Rekomendasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Status Prospek</label>
                    <select
                      value={inputStatus}
                      onChange={(e) => setInputStatus(e.target.value as any)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 text-slate-700"
                    >
                      <option value="Baru">Baru</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Deal">Deal</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Tanggal Follow-up</label>
                    <input
                      type="date"
                      value={inputTanggal}
                      onChange={(e) => setInputTanggal(e.target.value)}
                      className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1"
                    />
                  </div>
                  {editingId === null && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Catatan Awal</label>
                      <input
                        type="text"
                        placeholder="Contoh: Belum ada budget, hubungi bulan depan"
                        value={inputCatatan}
                        onChange={(e) => setInputCatatan(e.target.value)}
                        className="w-full bg-[#FFFDF9] border border-[#FFD1DC] px-3.5 py-2 rounded-xl text-xs mt-1 focus:outline-none"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-[#D65A75] hover:bg-[#c24e67] text-white text-xs font-semibold py-3 rounded-xl transition shadow-sm cursor-pointer mt-2"
                  >
                    {editingId !== null ? "💾 Simpan Perubahan" : "🚀 Simpan Prospek Lengkap"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= AREA MODE PERSONAL ================= */}
        {modeUtama === "personal" && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="flex gap-1 bg-white border border-[#FFD1DC] p-1.5 rounded-2xl">
              <button
                onClick={() => setSubPersonal("ratecard")}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-xl transition cursor-pointer ${subPersonal === "ratecard" ? "bg-[#FFE8EC] text-[#D65A75]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                🏷️ Rate Card & Promo
              </button>
              <button
                onClick={() => setSubPersonal("template")}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-xl transition cursor-pointer ${subPersonal === "template" ? "bg-[#FFE8EC] text-[#D65A75]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                💬 Template Chat
              </button>
            </div>

            {subPersonal === "ratecard" && (
              <div className="space-y-3">
                <div className="bg-[#FFE8EC] border border-[#FFD1DC] rounded-3xl p-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xs font-bold text-[#D65A75]">🏷️ Pengaturan Harga</h2>
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
                  <h3 className="text-xs font-bold text-slate-800">🌐 Website Bisnis / Company Profile</h3>
                  <p className="text-sm font-extrabold text-[#D65A75]">
                    {isPromoAktif ? "Rp 350.000 (Harga Promo Awal)" : "Rp 750.000 - Rp 1.500.000"}
                  </p>
                  <button 
                    onClick={() => salinTeks(isPromoAktif ? "Promo Pembuatan Website Bisnis khusus bulan ini hanya Rp 350.000 saja! Cek portofolio di https://rifahan.dev" : "Jasa Pembuatan Website Bisnis profesional mulai Rp 750.000. Cek portofolio di https://rifahan.dev")}
                    className="w-full bg-[#FFE8EC] text-[#D65A75] text-xs font-semibold py-2 rounded-xl border border-[#FFD1DC] cursor-pointer"
                  >
                    📋 Salin Penawaran Web
                  </button>
                </div>

                <div className="bg-white border border-[#FFD1DC] p-4 rounded-2xl shadow-sm space-y-2">
                  <h3 className="text-xs font-bold text-slate-800">📱 Mobile / Web App Custom</h3>
                  <p className="text-sm font-extrabold text-[#D65A75]">
                    {isPromoAktif ? "Rp 1.500.000 (Special Pilot Project)" : "Mulai Rp 2.500.000"}
                  </p>
                  <button 
                    onClick={() => salinTeks(isPromoAktif ? "Promo Pembuatan Web/Mobile App khusus awal kerja sama Rp 1.500.000. Cek portofolio di https://rifahan.dev" : "Jasa Pembuatan Web App mulai Rp 2.500.000. Cek portofolio di https://rifahan.dev")}
                    className="w-full bg-[#FFE8EC] text-[#D65A75] text-xs font-semibold py-2 rounded-xl border border-[#FFD1DC] cursor-pointer"
                  >
                    📋 Salin Penawaran App
                  </button>
                </div>
              </div>
            )}

            {subPersonal === "template" && (
              <div className="space-y-3">
                <div className="bg-[#FFE8EC] border border-[#FFD1DC] rounded-3xl p-4">
                  <h2 className="text-xs font-bold text-[#D65A75]">💬 Template Awal Chat & Portofolio</h2>
                  <p className="text-[10px] text-[#B26B7D]">Semua template sudah dilengkapi link https://rifahan.dev</p>
                </div>

                {[
                  { 
                    title: "☕ UMKM KULINER / SANTAI", 
                    text: "Halo Kak, salam kenal ya! Aku nemu profil tokomu di Google Maps/Instagram. Mau bantu nawarin jasa buat website/menu online. Contoh karya aplikasi bisa dicek di https://rifahan.dev ya Kak. Boleh intip sebentar? ✨" 
                  },
                  { 
                    title: "🏢 BISNIS FORMAL & PROFESIONAL", 
                    text: "Selamat pagi/siang Bapak/Ibu. Kami melihat usaha Bapak/Ibu memiliki potensi berkembang online. Portofolio aplikasi bisnis kami dapat dilihat di https://rifahan.dev. Barangkali tertarik, mari berdiskusi. 🤝" 
                  },
                  { 
                    title: "🚀 FASHION / RETAIL (GEN Z)", 
                    text: "Halo kak! Suka banget sama produknya 😍. Mau nawarin collab buat naikin omset lewat digital marketing & G-Maps. Intip portofolio app buatan kita yuk di https://rifahan.dev. Minat dibantuin gak kak? 🚀" 
                  },
                  { 
                    title: "📦 LANGSUNG BAWA RATE CARD PROMO", 
                    text: "Halo Kak, lagi cari vendor buat bikin website / aplikasi? Cek portofolio kita di https://rifahan.dev ya. Kita ada promo paket lengkap mulai Rp 350rb-an aja khusus awal kerja sama. Mau dikirimin rincian harganya, Kak? 📄" 
                  },
                  { 
                    title: "🤝 BALASAN JIKA DITOLAK (SOFT CLOSING)", 
                    text: "Baik Kak, tidak apa-apa sama sekali, terima kasih banyak ya atas waktunya! 🙏 Kalau sewaktu-waktu ke depannya butuh partner untuk pembuatan website atau aplikasi usaha, portofolio kami selalu bisa dicek di https://rifahan.dev ya Kak. Sukses selalu untuk bisnisnya! ✨" 
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