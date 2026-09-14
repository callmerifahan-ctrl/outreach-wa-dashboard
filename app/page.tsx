"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Inisialisasi Supabase
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
  pesan_template?: string;
}

export default function DashboardProspek() {
  const [prospekList, setProspekList] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [nama, setNama] = useState("");
  const [noWa, setNoWa] = useState("");
  const [sumber, setSumber] = useState("Google Maps");

  // Fetch data dari Supabase
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wa_clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProspekList(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Simpan Prospek Baru
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
        },
      ])
      .select();

    if (!error && data) {
      setProspekList((prev) => [data[0], ...prev]);
      setNama("");
      setNoWa("");
    }
  };

  // HANDLER UTAMA: Chat WA + Otomatisasi Status & Tanggal
  const handleChatWA = async (prospek: ClientType) => {
    // 1. Hitung tanggal +3 hari dari sekarang
    const nextFollowUp = new Date();
    nextFollowUp.setDate(nextFollowUp.getDate() + 3);
    const nextFollowUpStr = nextFollowUp.toISOString().split("T")[0];

    // 2. Update status & tanggal di Supabase
    const { error } = await supabase
      .from("wa_clients")
      .update({
        status: "Follow-up",
        tgl_followup: nextFollowUpStr,
      })
      .eq("id", prospek.id);

    // 3. Update state lokal (UI langsung bersih dari pengingat)
    if (!error) {
      setProspekList((prev) =>
        prev.map((item) =>
          item.id === prospek.id
            ? { ...item, status: "Follow-up", tgl_followup: nextFollowUpStr }
            : item
        )
      );
    }

    // 4. Buka WhatsApp Web / Apps
    const pesanDefault = prospek.pesan_template || 
      `Halo Kak! Saya dari Kala Project mau tanyakan terkait kebutuhan website untuk ${prospek.nama}.`;
    
    // Format nomor HP ke standar internasional (62)
    let formattedWa = prospek.no_wa.replace(/\D/g, "");
    if (formattedWa.startsWith("0")) {
      formattedWa = "62" + formattedWa.slice(1);
    }

    const waUrl = `https://wa.me/${formattedWa}?text=${encodeURIComponent(pesanDefault)}`;
    window.open(waUrl, "_blank");
  };

  // Filter daftar klien yang harus dihubungi hari ini
  const todayStr = new Date().toISOString().split("T")[0];
  const listFollowUpHariIni = prospekList.filter(
    (item) =>
      item.tgl_followup === todayStr &&
      (item.status === "Baru" || item.status === "Follow-up")
  );

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 bg-gray-50 min-h-screen">
      {/* Quick Input Form */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-pink-100 space-y-3">
        <h2 className="font-bold text-gray-800 text-sm">⚡ Quick Input ke wa_clients</h2>
        <form onSubmit={handleSimpan} className="space-y-2">
          <input
            type="text"
            placeholder="Nama Klien/Toko..."
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
          <input
            type="text"
            placeholder="No WA (628... / 08...)"
            value={noWa}
            onChange={(e) => setNoWa(e.target.value)}
            className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
          <div className="flex gap-2">
            <select
              value={sumber}
              onChange={(e) => setSumber(e.target.value)}
              className="w-full p-2 text-sm border rounded-lg bg-white"
            >
              <option value="Google Maps">Google Maps</option>
              <option value="Instagram">Instagram</option>
              <option value="Manual">Manual</option>
            </select>
            <button
              type="submit"
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded-lg text-sm whitespace-nowrap"
            >
              + Simpan
            </button>
          </div>
        </form>
      </div>

      {/* Kotak Pengingat Hari Ini */}
      {listFollowUpHariIni.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
          <h3 className="text-amber-800 font-bold text-sm flex items-center gap-1">
            🔔 Perhatian: {listFollowUpHariIni.length} Klien Perlu Dihubungi Hari Ini!
          </h3>
          <div className="space-y-2">
            {listFollowUpHariIni.map((klien) => (
              <div
                key={klien.id}
                className="bg-white p-3 rounded-lg border border-amber-100 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-gray-800 text-sm">{klien.nama}</p>
                  <p className="text-xs text-gray-500">({klien.layanan})</p>
                </div>
                <button
                  onClick={() => handleChatWA(klien)}
                  className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1"
                >
                  💬 Chat WA
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daftar Semua Prospek */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
        <h3 className="font-bold text-gray-800 text-sm">📋 Daftar Prospek</h3>
        {loading ? (
          <p className="text-xs text-gray-400">Loading data...</p>
        ) : (
          <div className="space-y-2">
            {prospekList.map((item) => (
              <div
                key={item.id}
                className="p-3 border rounded-lg flex justify-between items-center text-sm"
              >
                <div>
                  <p className="font-semibold">{item.nama}</p>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {item.status}
                  </span>
                </div>
                <button
                  onClick={() => handleChatWA(item)}
                  className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded text-xs font-semibold"
                >
                  Chat WA
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}