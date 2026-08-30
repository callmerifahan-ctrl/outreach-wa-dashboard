'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfebkqdexgnlwbdzdhqv.supabase.co';
const supabaseKey = 'sb_publishable_69l8_45AAPqjeCsFdSbeXA_Y2qfJTzT'; 
const _supabase = createClient(supabaseUrl, supabaseKey);

interface ClientItem {
  id: number;
  nama: string;
  no_whatsapp: string;
  kategori: string;
  layanan: string;
  status: string;
  tanggal_followup: string;
  catatan: string;
  pesan_masuk?: string;
  balasan_bot?: string;
}

export default function ProspectDashboard() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  
  // State modul tambahan
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showRateCard, setShowRateCard] = useState<boolean>(false);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  
  // State Navigasi Kalender
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  const [newClient, setNewClient] = useState({
    nama: '',
    no_whatsapp: '',
    kategori: 'Google Maps',
    layanan: 'Website',
    status: 'Baru',
    tanggal_followup: new Date().toISOString().split('T')[0],
    catatan: ''
  });

  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await _supabase
      .from('wa_logs')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Gagal memuat data:', error.message);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nama || !newClient.no_whatsapp) {
      alert('Nama dan Nomor WhatsApp wajib diisi ya! ✨');
      return;
    }

    const { error } = await _supabase
      .from('wa_logs')
      .insert([newClient]);

    if (error) {
      alert(`Gagal menambah data: ${error.message}`);
    } else {
      alert('Berhasil menjemput bola klien baru! 🎉');
      setNewClient({
        nama: '',
        no_whatsapp: '',
        kategori: 'Google Maps',
        layanan: 'Website',
        status: 'Baru',
        tanggal_followup: new Date().toISOString().split('T')[0],
        catatan: ''
      });
      setShowAddForm(false);
      fetchClients();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const { error } = await _supabase
      .from('wa_logs')
      .update({
        nama: editingClient.nama,
        no_whatsapp: editingClient.no_whatsapp,
        kategori: editingClient.kategori,
        layanan: editingClient.layanan,
        status: editingClient.status,
        tanggal_followup: editingClient.tanggal_followup,
        catatan: editingClient.catatan,
      })
      .eq('id', editingClient.id);

    if (error) {
      alert(`Gagal mengupdate data: ${error.message}`);
    } else {
      alert('Data berhasil diupdate! ✨');
      setEditingClient(null);
      fetchClients();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus data prospek ini? 🗑️')) return;

    const { error } = await _supabase
      .from('wa_logs')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Gagal menghapus data: ${error.message}`);
    } else {
      alert('Data berhasil dihapus! 🧹');
      setEditingClient(null);
      fetchClients();
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredClients = clients.filter((client) => {
    const matchSearch = 
      client.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.no_whatsapp?.includes(searchQuery) ||
      client.pesan_masuk?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (selectedStatus === 'Semua') return true;
    if (selectedStatus === 'Hari Ini') return client.tanggal_followup === todayStr;
    if (selectedStatus === 'Terlewat') return client.tanggal_followup && client.tanggal_followup < todayStr && client.status !== 'Tertarik' && client.status !== 'Gagal';
    
    return client.status === selectedStatus || (!client.status && selectedStatus === 'Baru');
  });

  const totalProspekUnik = new Set(clients.map(c => c.no_whatsapp)).size;

  // Logika Kalender Bulanan
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  return (
    <div className="min-h-screen bg-[#FFFDF9] p-4 md:p-8 font-sans text-slate-700">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Pastel */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#FFE8EC] p-6 rounded-3xl shadow-sm border border-[#FFD1DC] gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#D65A75]">🌸 WA Jemput Bola Dashboard</h1>
            <p className="text-xs text-[#B26B7D] mt-0.5">Dilengkapi Kalender Prospek, Rate Card, & Template Chat</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className="bg-[#FFF0F3] hover:bg-[#FFE8EC] text-[#D65A75] border border-[#FFD1DC] px-3 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition"
            >
              {showCalendar ? '✕ Tutup Kalender' : '📅 Kalender Jadwal'}
            </button>
            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className="bg-[#FFF0F3] hover:bg-[#FFE8EC] text-[#D65A75] border border-[#FFD1DC] px-3 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition"
            >
              {showTemplates ? '✕ Tutup Template' : '💬 Template Chat'}
            </button>
            <button 
              onClick={() => setShowRateCard(!showRateCard)}
              className="bg-[#FFF0F3] hover:bg-[#FFE8EC] text-[#D65A75] border border-[#FFD1DC] px-3 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition"
            >
              {showRateCard ? '✕ Tutup Rate Card' : '🏷️ Rate Card'}
            </button>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#D65A75] hover:bg-[#C24963] text-white px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition"
            >
              {showAddForm ? '✕ Tutup Form' : '➕ Tambah Prospek'}
            </button>
            <button 
              onClick={fetchClients}
              className="bg-white/80 hover:bg-white text-[#D65A75] px-3 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Kalender Interaktif Ber-tag */}
        {showCalendar && (
          <div className="bg-[#FFFDF9] p-6 rounded-3xl shadow-md border border-[#FFD1DC] space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-[#FFD1DC] pb-3">
              <h2 className="font-bold text-[#D65A75] flex items-center gap-2">
                <span>📅</span> Kalender Jadwal Follow-up Prospek
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                >
                  ◀ Bulan Lalu
                </button>
                <span className="text-xs font-bold text-[#D65A75] px-2">
                  {monthNames[month]} {year}
                </span>
                <button 
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                >
                  Bulan Depan ▶
                </button>
              </div>
            </div>

            {/* Grid Hari */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                <div key={d} className="text-xs font-bold text-[#B26B7D] py-1">{d}</div>
              ))}

              {/* Blank space sebelum hari pertama */}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="h-24 bg-transparent"></div>
              ))}

              {/* Kotak Tanggal */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const dayNum = index + 1;
                const formattedMonth = String(month + 1).padStart(2, '0');
                const formattedDay = String(dayNum).padStart(2, '0');
                const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

                // Cari klien yang tanggal follow-up nya sama dengan tanggal ini
                const clientsOnThisDay = clients.filter(c => c.tanggal_followup === dateStr);
                const isToday = dateStr === todayStr;

                return (
                  <div 
                    key={dateStr} 
                    className={`h-24 bg-white border rounded-2xl p-1.5 flex flex-col justify-between overflow-y-auto transition ${
                      isToday ? 'border-[#D65A75] ring-2 ring-[#FFD1DC]' : 'border-pink-100 hover:border-pink-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg ${isToday ? 'bg-[#D65A75] text-white' : 'text-slate-600'}`}>
                        {dayNum}
                      </span>
                      {clientsOnThisDay.length > 0 && (
                        <span className="text-[10px] bg-pink-100 text-[#D65A75] font-bold px-1 rounded-full">
                          {clientsOnThisDay.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 mt-1">
                      {clientsOnThisDay.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => setEditingClient(c)}
                          className={`text-[9px] px-1.5 py-0.5 rounded-md truncate cursor-pointer font-medium ${
                            c.status === 'Tertarik' ? 'bg-[#DCFCE7] text-[#15803D]' :
                            c.status === 'Follow-up' ? 'bg-[#FEF3C7] text-[#B45309]' :
                            c.status === 'Gagal' ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#E0F2FE] text-[#0369A1]'
                          }`}
                          title={`${c.nama} (${c.status || 'Baru'})`}
                        >
                          {c.nama}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 text-center italic">*Klik nama klien pada kalender untuk melihat atau mengedit detail datanya.</p>
          </div>
        )}

        {/* Template Chat Section dengan Portofolio */}
        {showTemplates && (
          <div className="bg-[#FFFDF9] p-6 rounded-3xl shadow-md border border-[#FFD1DC] space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-[#FFD1DC] pb-3">
              <h2 className="font-bold text-[#D65A75] flex items-center gap-2">
                <span>💬</span> Template Awalan Chat Jemput Bola + Portofolio
              </h2>
              <span className="text-xs bg-[#FFE8EC] text-[#B26B7D] px-3 py-1 rounded-full font-semibold">Klik untuk Salin</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#D65A75] uppercase">☕ UMKM Kuliner / Santai</h3>
                  <p className="text-xs text-slate-600 mt-1 italic">&quot;Halo Kak, salam kenal ya! Aku nemu profil tokomu di Google Maps/Instagram. Mau bantu nawarin jasa buat website/menu online. Contoh karya aplikasi yang pernah kubikin bisa dicek di https://rifahan-dev.vercel.app ya Kak. Boleh intip sebentar? ✨&quot;</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("Halo Kak, salam kenal ya! Aku nemu profil tokomu di Google Maps/Instagram. Mau bantu nawarin jasa buat website/menu online. Contoh karya aplikasi yang pernah kubikin bisa dicek di https://rifahan-dev.vercel.app ya Kak. Boleh intip sebentar? ✨");
                    alert('Template Kuliner disalin! 📋');
                  }}
                  className="bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] py-2 rounded-xl text-xs font-semibold transition mt-2"
                >
                  Salin Template Ini 📋
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#D65A75] uppercase">🤝 Bisnis Formal & Profesional</h3>
                  <p className="text-xs text-slate-600 mt-1 italic">&quot;Selamat pagi/siang Bapak/Ibu. Kami melihat usaha Bapak/Ibu memiliki potensi berkembang online. Portofolio aplikasi bisnis yang kami kembangkan dapat dilihat di https://rifahan-dev.vercel.app. Barangkali tertarik, mari berdiskusi. 🤝&quot;</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("Selamat pagi/siang Bapak/Ibu. Kami melihat usaha Bapak/Ibu memiliki potensi berkembang online. Portofolio aplikasi bisnis yang kami kembangkan dapat dilihat di https://rifahan-dev.vercel.app. Barangkali tertarik, mari berdiskusi. 🤝");
                    alert('Template Formal disalin! 📋');
                  }}
                  className="bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] py-2 rounded-xl text-xs font-semibold transition mt-2"
                >
                  Salin Template Ini 📋
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#D65A75] uppercase">🚀 Fashion / Retail (Gen Z)</h3>
                  <p className="text-xs text-slate-600 mt-1 italic">&quot;Halo kak! Suka banget sama produknya 😍. Mau nawarin collab buat naikin omset lewat digital marketing & G-Maps. Intip portofolio app buatan kita yuk di https://rifahan-dev.vercel.app. Minat dibantuin gak kak? 🚀&quot;</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("Halo kak! Suka banget sama produknya 😍. Mau nawarin collab buat naikin omset lewat digital marketing & G-Maps. Intip portofolio app buatan kita yuk di https://rifahan-dev.vercel.app. Minat dibantuin gak kak? 🚀");
                    alert('Template Fashion disalin! 📋');
                  }}
                  className="bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] py-2 rounded-xl text-xs font-semibold transition mt-2"
                >
                  Salin Template Ini 📋
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#D65A75] uppercase">📋 Langsung Bawa Rate Card</h3>
                  <p className="text-xs text-slate-600 mt-1 italic">&quot;Halo Kak, lagi cari vendor buat bikin website / aplikasi? Cek portofolio kita di https://rifahan-dev.vercel.app ya. Kita ada promo paket lengkap mulai Rp 500rb-an aja. Mau dikirimin rincian harganya, Kak? 📋&quot;</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("Halo Kak, lagi cari vendor buat bikin website / aplikasi? Cek portofolio kita di https://rifahan-dev.vercel.app ya. Kita ada promo paket lengkap mulai Rp 500rb-an aja. Mau dikirimin rincian harganya, Kak? 📋");
                    alert('Template Rate Card disalin! 📋');
                  }}
                  className="bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] py-2 rounded-xl text-xs font-semibold transition mt-2"
                >
                  Salin Template Ini 📋
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rate Card & Portofolio Section */}
        {showRateCard && (
          <div className="bg-[#FFFDF9] p-6 rounded-3xl shadow-md border border-[#FFD1DC] space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-[#FFD1DC] pb-3">
              <h2 className="font-bold text-[#D65A75] flex items-center gap-2">
                <span>🏷️</span> Rate Card & Showcase Portofolio Aplikasi
              </h2>
              <span className="text-xs bg-[#FFE8EC] text-[#B26B7D] px-3 py-1 rounded-full font-semibold">Siap Salin & Kirim</span>
            </div>

            {/* Showcase Portofolio */}
            <div className="bg-[#FFE8EC]/50 p-4 rounded-2xl border border-[#FFD1DC] space-y-2">
              <h3 className="text-xs font-bold text-[#D65A75] uppercase tracking-wider">✨ Bukti Karya / Portofolio Utama</h3>
              <p className="text-xs text-slate-600">Beberapa project yang sudah berhasil dikembangkan dapat dilihat secara lengkap melalui:</p>
              <a 
                href="https://rifahan-dev.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block text-xs font-bold text-[#D65A75] underline hover:text-[#C24963]"
              >
                🌐 https://rifahan-dev.vercel.app
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-2">
                <h3 className="font-bold text-[#D65A75]">🌐 Website Bisnis</h3>
                <p className="text-xs text-slate-500">Landing page / Company profile super cepat & responsive.</p>
                <p className="text-sm font-extrabold text-slate-800">Rp 750.000 - Rp 1.500.000</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("Halo kak, untuk jasa Website Bisnis mulai Rp 750.000 sudah termasuk Domain & Hosting 1 tahun. Portofolio bisa dicek di https://rifahan-dev.vercel.app ✨");
                    alert('Promo Web disalin!');
                  }}
                  className="w-full bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] py-2 rounded-xl text-xs font-semibold transition"
                >
                  Salin Promo Web 📋
                </button>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-2">
                <h3 className="font-bold text-[#D65A75]">📱 Mobile / Web App</h3>
                <p className="text-xs text-slate-500">Aplikasi custom interaktif (Journaling, Dashboard, dll).</p>
                <p className="text-sm font-extrabold text-slate-800">Mulai Rp 2.500.000</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("Halo kak, kami menyediakan jasa pembuatan Web & Mobile App custom. Lihat portofolionya di https://rifahan-dev.vercel.app 📱");
                    alert('Promo App disalin!');
                  }}
                  className="w-full bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] py-2 rounded-xl text-xs font-semibold transition"
                >
                  Salin Promo App 📋
                </button>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-2">
                <h3 className="font-bold text-[#D65A75]">📈 Digital Marketing</h3>
                <p className="text-xs text-slate-500">Optimasi G-Maps, IG Ads, & pengelolaan konten sosmed.</p>
                <p className="text-sm font-extrabold text-slate-800">Rp 500.000 / bulan</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("Halo kak, untuk paket Digital Marketing & Optimasi Google Maps harganya Rp 500.000/bulan biar toko makin ramai dicari pelanggan! 🚀");
                    alert('Promo Marketing disalin!');
                  }}
                  className="w-full bg-[#FFE8EC] hover:bg-[#FFD1DC] text-[#D65A75] py-2 rounded-xl text-xs font-semibold transition"
                >
                  Salin Promo Marketing 📋
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistik Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#E0F2FE] p-5 rounded-3xl border border-[#BAE6FD] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#0284C7]">TOTAL DATA / PESAN</p>
              <h3 className="text-2xl font-bold text-[#0369A1] mt-1">{clients.length}</h3>
            </div>
            <span className="text-2xl">💬</span>
          </div>
          <div className="bg-[#F3E8FF] p-5 rounded-3xl border border-[#E9D5FF] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#7E22CE]">PROSPEK UNIK</p>
              <h3 className="text-2xl font-bold text-[#6B21A8] mt-1">{totalProspekUnik}</h3>
            </div>
            <span className="text-2xl">👥</span>
          </div>
          <div className="bg-[#DCFCE7] p-5 rounded-3xl border border-[#BBF7D0] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#15803D]">STATUS DATABASE</p>
              <h3 className="text-sm font-bold text-[#166534] mt-1">Terhubung (Supabase) ⚡</h3>
            </div>
            <span className="text-2xl">🟢</span>
          </div>
        </div>

        {/* Form Input Tambah Klien Baru */}
        {showAddForm && (
          <div className="bg-[#FFE8EC] p-6 rounded-3xl shadow-md border border-[#FFD1DC] space-y-4 animate-fadeIn">
            <h2 className="font-bold text-[#D65A75] flex items-center gap-2 border-b border-[#FFD1DC] pb-3">
              <span>🎯</span> Form Input Prospek Baru (Jemput Bola)
            </h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#B26B7D] block mb-1">Nama Klien / Toko *</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Toko Bu Irma"
                    value={newClient.nama} 
                    onChange={(e) => setNewClient({...newClient, nama: e.target.value})}
                    className="w-full bg-white border border-[#FFD1DC] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#D65A75]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#B26B7D] block mb-1">No. WhatsApp *</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 628131991832..."
                    value={newClient.no_whatsapp} 
                    onChange={(e) => setNewClient({...newClient, no_whatsapp: e.target.value})}
                    className="w-full bg-white border border-[#FFD1DC] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#D65A75]"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#B26B7D] block mb-1">Kategori</label>
                  <select 
                    value={newClient.kategori} 
                    onChange={(e) => setNewClient({...newClient, kategori: e.target.value})}
                    className="w-full bg-white border border-[#FFD1DC] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#D65A75]"
                  >
                    <option value="Google Maps">Google Maps</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#B26B7D] block mb-1">Layanan</label>
                  <select 
                    value={newClient.layanan} 
                    onChange={(e) => setNewClient({...newClient, layanan: e.target.value})}
                    className="w-full bg-white border border-[#FFD1DC] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#D65A75]"
                  >
                    <option value="Mobile App">Mobile App</option>
                    <option value="Website">Website</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#B26B7D] block mb-1">Status</label>
                  <select 
                    value={newClient.status} 
                    onChange={(e) => setNewClient({...newClient, status: e.target.value})}
                    className="w-full bg-white border border-[#FFD1DC] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#D65A75]"
                  >
                    <option value="Baru">Baru</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Tertarik">Tertarik</option>
                    <option value="Gagal">Gagal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#B26B7D] block mb-1">Tanggal Follow-up</label>
                <input 
                  type="date" 
                  value={newClient.tanggal_followup} 
                  onChange={(e) => setNewClient({...newClient, tanggal_followup: e.target.value})}
                  className="w-full bg-white border border-[#FFD1DC] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#D65A75]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#B26B7D] block mb-1">Catatan Singkat</label>
                <textarea 
                  placeholder="Catatan hasil riset atau penawaran..."
                  value={newClient.catatan} 
                  onChange={(e) => setNewClient({...newClient, catatan: e.target.value})}
                  className="w-full bg-white border border-[#FFD1DC] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#D65A75]"
                  rows={2}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[#D65A75] hover:bg-[#C24963] text-white font-semibold py-3 rounded-2xl transition shadow-sm"
              >
                Simpan Prospek Baru 🚀
              </button>
            </form>
          </div>
        )}

        {/* Form Edit & Delete Modal */}
        {editingClient && (
          <div className="bg-[#F3E8FF] p-6 rounded-3xl shadow-md border border-[#E9D5FF] space-y-4">
            <div className="flex justify-between items-center border-b border-[#E9D5FF] pb-3">
              <h2 className="font-bold text-[#7E22CE] flex items-center gap-2">
                <span>🌷</span> Edit Data Klien
              </h2>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleDelete(editingClient.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  🗑️ Hapus Data
                </button>
                <button 
                  onClick={() => setEditingClient(null)}
                  className="text-xs text-[#9333EA] hover:text-[#6B21A8] font-semibold"
                >
                  ✕ Batal
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#7E22CE] block mb-1">Nama Klien</label>
                  <input 
                    type="text" 
                    value={editingClient.nama || ''} 
                    onChange={(e) => setEditingClient({...editingClient, nama: e.target.value})}
                    className="w-full bg-white border border-[#E9D5FF] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7E22CE] block mb-1">No. WhatsApp</label>
                  <input 
                    type="text" 
                    value={editingClient.no_whatsapp || ''} 
                    onChange={(e) => setEditingClient({...editingClient, no_whatsapp: e.target.value})}
                    className="w-full bg-white border border-[#E9D5FF] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#7E22CE] block mb-1">Kategori</label>
                  <select 
                    value={editingClient.kategori || 'Google Maps'} 
                    onChange={(e) => setEditingClient({...editingClient, kategori: e.target.value})}
                    className="w-full bg-white border border-[#E9D5FF] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#A855F7]"
                  >
                    <option value="Google Maps">Google Maps</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7E22CE] block mb-1">Layanan</label>
                  <select 
                    value={editingClient.layanan || 'Website'} 
                    onChange={(e) => setEditingClient({...editingClient, layanan: e.target.value})}
                    className="w-full bg-white border border-[#E9D5FF] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#A855F7]"
                  >
                    <option value="Mobile App">Mobile App</option>
                    <option value="Website">Website</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7E22CE] block mb-1">Status</label>
                  <select 
                    value={editingClient.status || 'Baru'} 
                    onChange={(e) => setEditingClient({...editingClient, status: e.target.value})}
                    className="w-full bg-white border border-[#E9D5FF] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#A855F7]"
                  >
                    <option value="Tertarik">Tertarik</option>
                    <option value="Baru">Baru</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Gagal">Gagal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7E22CE] block mb-1">Tanggal Follow-up</label>
                <input 
                  type="date" 
                  value={editingClient.tanggal_followup || ''} 
                  onChange={(e) => setEditingClient({...editingClient, tanggal_followup: e.target.value})}
                  className="w-full bg-white border border-[#E9D5FF] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#A855F7]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7E22CE] block mb-1">Catatan Singkat</label>
                <textarea 
                  value={editingClient.catatan || ''} 
                  onChange={(e) => setEditingClient({...editingClient, catatan: e.target.value})}
                  className="w-full bg-white border border-[#E9D5FF] rounded-2xl p-3 text-sm focus:outline-none focus:border-[#A855F7]"
                  rows={2}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-semibold py-3 rounded-2xl transition shadow-sm"
              >
                Simpan Perubahan ✨
              </button>
            </form>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 space-y-4">
          <input 
            type="text" 
            placeholder="🔍 Cari nama, nomor WA, atau catatan..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FFFDF9] border border-pink-200 rounded-2xl p-3 text-sm focus:outline-none focus:border-[#D65A75]"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Semua', 'Hari Ini', 'Terlewat', 'Baru', 'Follow-up', 'Tertarik', 'Gagal'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedStatus === status 
                    ? 'bg-[#D65A75] text-white shadow-sm' 
                    : 'bg-[#FFF0F3] text-[#B26B7D] hover:bg-[#FFE8EC]'
                }`}
              >
                {status === 'Hari Ini' ? '🔔 Follow-up Hari Ini' : status === 'Terlewat' ? '⚠️ Terlewat' : status}
              </button>
            ))}
          </div>
        </div>

        {/* List Data Klien */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl text-center text-slate-400 text-sm border border-slate-100 shadow-sm">
              Memuat data...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl text-center text-slate-400 text-sm border border-slate-100 shadow-sm">
              Belum ada data prospek di kategori ini. Yuk jemput bola klien baru! 🎯
            </div>
          ) : (
            filteredClients.map((client) => (
              <div 
                key={client.id} 
                className="bg-white p-5 rounded-3xl shadow-sm border border-pink-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-pink-200 transition"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{client.nama || 'Tanpa Nama'}</h3>
                    <span className={`text-[10px] px-3 py-0.5 rounded-full font-bold ${
                      client.status === 'Tertarik' ? 'bg-[#DCFCE7] text-[#15803D]' :
                      client.status === 'Baru' || !client.status ? 'bg-[#E0F2FE] text-[#0369A1]' :
                      client.status === 'Follow-up' ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#FEE2E2] text-[#B91C1C]'
                    }`}>
                      {client.status || 'Baru'}
                    </span>
                    {client.tanggal_followup && (
                      <span className="text-[10px] bg-pink-50 text-[#D65A75] px-2.5 py-0.5 rounded-full font-medium">
                        📅 {client.tanggal_followup}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">+{client.no_whatsapp}</p>
                  
                  {client.pesan_masuk && (
                    <div className="bg-[#FFFDF9] p-2.5 rounded-2xl border border-pink-50 text-xs space-y-1">
                      <p className="text-slate-600"><span className="font-semibold text-[#D65A75]">Pesan:</span> {client.pesan_masuk}</p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 pt-0.5">
                    {client.kategori || 'Google Maps'} • {client.layanan || 'Website'} {client.catatan ? `• "${client.catatan}"` : ''}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button 
                    onClick={() => setEditingClient(client)}
                    className="bg-[#FDF2F8] hover:bg-[#FCE7F3] text-[#DB2777] px-4 py-2 rounded-2xl text-xs font-semibold transition"
                  >
                    Edit
                  </button>
                  <a 
                    href={`https://wa.me/${client.no_whatsapp}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] px-4 py-2 rounded-2xl text-xs font-semibold transition text-center"
                  >
                    Chat WA 💬
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}