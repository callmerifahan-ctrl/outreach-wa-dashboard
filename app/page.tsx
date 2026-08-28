'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardClient() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('belum_dihubungi');

  // State untuk Daftar Template Pesan (Bisa ditambah/edit)
  const [templates, setTemplates] = useState<any[]>([
    {
      id: 'santai',
      nama: 'Santai / UMKM',
      teks: 'Halo Kak {nama}, salam kenal ya! Saya lihat profil bisnisnya di {sumber}, kebetulan kami bantu pembuatan {layanan} profesional untuk ningkatin omset bisnis. Boleh diskusi sebentar? 🙏'
    },
    {
      id: 'penawaran',
      nama: 'Penawaran Langsung',
      teks: 'Halo {nama}, perkenalkan kami dari tim pengembang digital. Apakah saat ini bisnisnya sedang butuh optimasi {layanan} untuk jangkau lebih banyak pelanggan? Kami ada penawaran spesial minggu ini. Tertarik info lengkapnya? 🚀'
    },
    {
      id: 'formal',
      nama: 'Formal / Korporat',
      teks: 'Selamat pagi/siang Bapak/Ibu {nama}. Mohon izin menginfokan terkait layanan {layanan} dari kami, barangkali ada kebutuhan untuk pengembangan digital usahanya. Terima kasih sebelumnya. 😊'
    },
    {
      id: 'genz',
      nama: 'Gaul / Gen-Z',
      teks: 'Halo Kak {nama}! 👋 Spill dikit dong, bisnisnya di {sumber} udah pake {layanan} belum? Kita bantu bikin makin aesthetic & gacor penjualannya. Yuk ngobrol santai dulu! ✨'
    }
  ]);

  const [selectedTemplateId, setSelectedTemplateId] = useState('santai');

  // State untuk Modal Preview & Edit Chat WA sebelum kirim
  const [activeChatClient, setActiveChatClient] = useState<any | null>(null);
  const [customChatText, setCustomChatText] = useState('');

  // State Form Klien
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nama: '',
    no_whatsapp: '',
    sumber: 'Google Maps',
    layanan: 'Landing Page',
    status: 'Baru',
    catatan: '',
    tgl_followup: new Date().toISOString().split('T')[0],
    followup_count: 0,
    potensi_cuan: 0,
  });

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wa_clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase.from('wa_clients').update(form).eq('id', editingId);
      if (!error) {
        setEditingId(null);
        resetForm();
        fetchClients();
      } else {
        alert('Gagal mengupdate data: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('wa_clients').insert([form]);
      if (!error) {
        resetForm();
        fetchClients();
      } else {
        alert('Gagal menyimpan data: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setForm({
      nama: '',
      no_whatsapp: '',
      sumber: 'Google Maps',
      layanan: 'Landing Page',
      status: 'Baru',
      catatan: '',
      tgl_followup: new Date().toISOString().split('T')[0],
      followup_count: 0,
      potensi_cuan: 0,
    });
  };

  const handleEdit = (client: any) => {
    setEditingId(client.id);
    setForm({
      nama: client.nama,
      no_whatsapp: client.no_whatsapp,
      sumber: client.sumber,
      layanan: client.layanan,
      status: client.status,
      catatan: client.catatan || '',
      tgl_followup: client.tgl_followup || new Date().toISOString().split('T')[0],
      followup_count: client.followup_count || 0,
      potensi_cuan: client.potensi_cuan || 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus prospek ini?')) {
      const { error } = await supabase.from('wa_clients').delete().eq('id', id);
      if (!error) fetchClients();
      else alert('Gagal menghapus: ' + error.message);
    }
  };

  // Fungsi memunculkan Modal Chat dengan template terpilih
  const openChatModal = (client: any) => {
    const tpl = templates.find(t => t.id === selectedTemplateId) || templates[0];
    let generatedText = tpl.teks
      .replace(/{nama}/g, client.nama)
      .replace(/{sumber}/g, client.sumber)
      .replace(/{layanan}/g, client.layanan);

    setActiveChatClient(client);
    setCustomChatText(generatedText);
  };

  // Eksekusi kirim WhatsApp & update hitungan follow-up
  const sendWhatsAppMessage = async () => {
    if (!activeChatClient) return;

    let phone = activeChatClient.no_whatsapp.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    const newCount = (activeChatClient.followup_count || 0) + 1;
    await supabase
      .from('wa_clients')
      .update({ 
        followup_count: newCount, 
        status: activeChatClient.status === 'Baru' ? 'Follow-up' : activeChatClient.status 
      })
      .eq('id', activeChatClient.id);
    
    fetchClients();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(customChatText)}`, '_blank');
    setActiveChatClient(null);
  };

  const handleQuickStatusChange = async (id: number, newStatus: string) => {
    await supabase.from('wa_clients').update({ status: newStatus }).eq('id', id);
    fetchClients();
  };

  const exportToCSV = () => {
    const headers = 'Nama,No WhatsApp,Sumber,Layanan,Status,Tanggal Follow-Up,Potensi Cuan,Catatan,Jumlah Follow-Up\n';
    const rows = clients.map(c => 
      `"${c.nama}","${c.no_whatsapp}","${c.sumber}","${c.layanan}","${c.status}","${c.tgl_followup}",${c.potensi_cuan || 0},"${c.catatan || ''}",${c.followup_count || 0}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prospek_wa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const countBelumDihubungi = clients.filter((c) => c.status === 'Baru' && (c.followup_count || 0) === 0).length;
  const countHariIni = clients.filter((c) => c.tgl_followup <= todayStr && c.status !== 'Tertarik' && c.status !== 'Gagal').length;
  const countFollowUp = clients.filter((c) => c.status === 'Follow-up').length;
  const countTertarik = clients.filter((c) => c.status === 'Tertarik').length;
  const totalProspek = clients.length;
  const totalCuan = clients.reduce((acc, c) => acc + (Number(c.potensi_cuan) || 0), 0);

  const filteredClients = clients.filter((c) => {
    const matchSearch = c.nama.toLowerCase().includes(search.toLowerCase()) || c.no_whatsapp.includes(search);
    let matchTab = true;
    if (activeTab === 'belum_dihubungi') {
      matchTab = c.status === 'Baru' && (c.followup_count || 0) === 0;
    } else if (activeTab === 'hari_ini') {
      matchTab = c.tgl_followup <= todayStr && c.status !== 'Tertarik' && c.status !== 'Gagal';
    } else if (activeTab === 'follow_up') {
      matchTab = c.status === 'Follow-up';
    } else if (activeTab === 'tertarik') {
      matchTab = c.status === 'Tertarik';
    } else if (activeTab === 'gagal') {
      matchTab = c.status === 'Gagal';
    }
    return matchSearch && matchTab;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 font-sans bg-[#FAF8F5] min-h-screen text-gray-700 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-[#EFECE6]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#4A443B] tracking-tight">🌸 WA Client / Jemput Bola Pro</h1>
          <p className="text-sm text-[#8C8275] mt-1">Dashboard manajemen prospek lengkap dengan kustomisasi template gaya bahasa WA.</p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-[#D8E2DC] text-[#3B4D43] px-4 py-2.5 rounded-2xl font-bold hover:bg-[#C8D5CD] transition text-xs flex items-center gap-2 shadow-sm cursor-pointer"
        >
          📊 Export ke Excel (CSV)
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#EAE4DC] p-5 rounded-3xl shadow-sm border border-[#DFD8CE]">
          <p className="text-xs font-bold text-[#6D6356] uppercase tracking-wider">Total Prospek</p>
          <p className="text-3xl font-extrabold text-[#4A443B] mt-2">{totalProspek}</p>
        </div>
        <div className="bg-[#FFE5D9] p-5 rounded-3xl shadow-sm border border-[#FADCD0]">
          <p className="text-xs font-bold text-[#8C5D50] uppercase tracking-wider">Belum Dihubungi</p>
          <p className="text-3xl font-extrabold text-[#70463B] mt-2">{countBelumDihubungi}</p>
        </div>
        <div className="bg-[#D8E2DC] p-5 rounded-3xl shadow-sm border border-[#C8D5CD]">
          <p className="text-xs font-bold text-[#556B60] uppercase tracking-wider">Jatuh Tempo Hari Ini</p>
          <p className="text-3xl font-extrabold text-[#3B4D43] mt-2">{countHariIni}</p>
        </div>
        <div className="bg-[#E8F1F2] p-5 rounded-3xl shadow-sm border border-[#D6E5E7]">
          <p className="text-xs font-bold text-[#4F6D7A] uppercase tracking-wider">Estimasi Potensi Cuan</p>
          <p className="text-2xl font-extrabold text-[#38515C] mt-2">Rp {totalCuan.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Grid: Form Input & Pengelola Template Gaya Bahasa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Prospek */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#EFECE6] lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-[#4A443B]">
              {editingId ? '✏️ Edit Data Prospek' : '+ Tambah Prospek Baru'}
            </h2>
            {editingId && (
              <button
                onClick={() => { setEditingId(null); resetForm(); }}
                className="text-xs bg-[#EFECE6] text-[#6D6356] px-3 py-1.5 rounded-xl font-bold hover:bg-[#DFD8CE] transition"
              >
                Batal Edit
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nama Klien / Bisnis"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition"
              required
            />
            <input
              type="text"
              placeholder="No. WA (cth: 08123456789)"
              value={form.no_whatsapp}
              onChange={(e) => setForm({ ...form, no_whatsapp: e.target.value })}
              className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition"
              required
            />
            <select
              value={form.sumber}
              onChange={(e) => setForm({ ...form, sumber: e.target.value })}
              className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition"
            >
              <option value="Google Maps">Google Maps</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="LinkedIn">LinkedIn</option>
            </select>
            <select
              value={form.layanan}
              onChange={(e) => setForm({ ...form, layanan: e.target.value })}
              className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition"
            >
              <option value="Landing Page">Landing Page</option>
              <option value="Web Custom">Web Custom</option>
              <option value="Mobile App">Mobile App</option>
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition"
            >
              <option value="Baru">Baru</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Tertarik">Tertarik</option>
              <option value="Gagal">Gagal</option>
            </select>
            <input
              type="date"
              value={form.tgl_followup}
              onChange={(e) => setForm({ ...form, tgl_followup: e.target.value })}
              className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition"
            />
            <input
              type="number"
              placeholder="Potensi Cuan / Budget (Rp)"
              value={form.potensi_cuan}
              onChange={(e) => setForm({ ...form, potensi_cuan: Number(e.target.value) })}
              className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition"
            />
            <input
              type="text"
              placeholder="Catatan Singkat (opsional)"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition"
            />
            <button type="submit" className="md:col-span-2 bg-[#C8D5CD] text-[#2F3E35] p-3 rounded-2xl font-bold hover:bg-[#B7C6BC] transition cursor-pointer shadow-sm">
              {editingId ? 'Simpan Perubahan' : 'Simpan Prospek'}
            </button>
          </form>
        </div>

        {/* Kotak Pengaturan Template Pesan WA */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#EFECE6] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#4A443B] mb-2">💬 Template Gaya Bahasa WA</h2>
            <p className="text-xs text-[#8C8275] mb-4">Pilih gaya bahasa yang aktif. Gunakan tag <code className="bg-[#FAF8F5] px-1 py-0.5 rounded text-[#4A443B] font-bold">{`{nama}`}</code>, <code className="bg-[#FAF8F5] px-1 py-0.5 rounded text-[#4A443B] font-bold">{`{layanan}`}</code>, dan <code className="bg-[#FAF8F5] px-1 py-0.5 rounded text-[#4A443B] font-bold">{`{sumber}`}</code>.</p>
            
            <div className="space-y-3">
              {templates.map((tpl) => (
                <div 
                  key={tpl.id} 
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    selectedTemplateId === tpl.id ? 'border-[#6D6356] bg-[#FAF8F5]' : 'border-[#EFECE6] hover:border-[#DFD8CE]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-[#4A443B]">{tpl.nama}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedTemplateId === tpl.id ? 'bg-[#6D6356] text-white' : 'bg-[#EFECE6] text-[#8C8275]'}`}>
                      {selectedTemplateId === tpl.id ? 'Aktif' : 'Pilih'}
                    </span>
                  </div>
                  <textarea
                    value={tpl.teks}
                    onChange={(e) => {
                      const updated = templates.map(t => t.id === tpl.id ? { ...t, teks: e.target.value } : t);
                      setTemplates(updated);
                    }}
                    rows={2}
                    className="w-full text-xs p-2 rounded-xl bg-white border border-[#EFECE6] text-black outline-none focus:ring-1 focus:ring-[#D8E2DC] resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel: Search */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#EFECE6] flex items-center justify-between">
        <input
          type="text"
          placeholder="🔍 Cari nama klien atau nomor WA..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-3 border border-[#EFECE6] rounded-2xl text-black bg-[#FAF8F5] focus:bg-white focus:ring-2 focus:ring-[#D8E2DC] outline-none transition w-full md:w-96 text-sm"
        />
        <div className="text-xs font-bold text-[#8C8275] hidden md:block">
          Template aktif saat ini: <span className="text-[#4A443B] uppercase">{templates.find(t => t.id === selectedTemplateId)?.nama}</span>
        </div>
      </div>

      {/* Tab Kategori Pemilahan Utama */}
      <div className="flex flex-wrap gap-2 border-b border-[#EFECE6] pb-2">
        {[
          { id: 'belum_dihubungi', label: `🔥 Belum Dihubungi (${countBelumDihubungi})` },
          { id: 'hari_ini', label: `⚠️ Jatuh Tempo Hari Ini (${countHariIni})` },
          { id: 'follow_up', label: `💬 Sedang Follow-up (${countFollowUp})` },
          { id: 'tertarik', label: `🌟 Tertarik (${countTertarik})` },
          { id: 'gagal', label: '❌ Gagal' },
          { id: 'semua', label: `📁 Semua Klien (${totalProspek})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#4A443B] text-white shadow-sm'
                : 'bg-white text-[#8C8275] hover:bg-[#EFECE6] border border-[#EFECE6]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#EFECE6] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#FAF8F5] border-b border-[#EFECE6] text-xs text-[#8C8275] uppercase tracking-wider">
            <tr>
              <th className="p-4">Klien</th>
              <th className="p-4">Sumber / Layanan</th>
              <th className="p-4">Status (Quick Edit)</th>
              <th className="p-4">Follow-Up</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2EC] text-sm text-black">
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-[#8C8275]">Memuat data...</td></tr>
            ) : filteredClients.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-[#8C8275]">Tidak ada data dalam kategori ini.</td></tr>
            ) : (
              filteredClients.map((c) => {
                const isDue = c.tgl_followup <= todayStr && c.status !== 'Tertarik' && c.status !== 'Gagal';
                const isUncontacted = c.status === 'Baru' && (c.followup_count || 0) === 0;
                return (
                  <tr key={c.id} className="hover:bg-[#FAF8F5]/85 transition">
                    <td className="p-4 font-medium">
                      <div className="text-[#4A443B] font-bold flex items-center gap-2 flex-wrap">
                        {c.nama}
                        {isUncontacted && (
                          <span className="text-[10px] bg-[#FFE5D9] text-[#70463B] px-2 py-0.5 rounded-full font-bold">
                            🔥 Belum Dihubungi
                          </span>
                        )}
                        {(c.followup_count || 0) > 0 && (
                          <span className="text-[10px] bg-[#EFECE6] text-[#6D6356] px-2 py-0.5 rounded-full font-semibold">
                            💬 {c.followup_count}x
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#8C8275] mt-0.5">{c.no_whatsapp}</div>
                      {c.potensi_cuan > 0 && (
                        <div className="text-xs font-bold text-[#38515C] mt-1">
                          💰 Rp {Number(c.potensi_cuan).toLocaleString('id-ID')}
                        </div>
                      )}
                      {c.catatan && <div className="text-xs text-[#8C8275] italic mt-1">"{c.catatan}"</div>}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] bg-[#EFECE6] text-[#6D6356] px-2.5 py-0.5 rounded-lg font-medium">{c.sumber}</span>
                        <span className="text-xs font-semibold text-[#4A443B]">{c.layanan}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={c.status}
                        onChange={(e) => handleQuickStatusChange(c.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold outline-none cursor-pointer border-none ${
                          c.status === 'Baru' ? 'bg-[#D8E2DC] text-[#3B4D43]' :
                          c.status === 'Follow-up' ? 'bg-[#FFE5D9] text-[#70463B]' :
                          c.status === 'Tertarik' ? 'bg-[#E8F1F2] text-[#38515C]' : 'bg-[#FCEADE] text-[#8C4A4A]'
                        }`}
                      >
                        <option value="Baru">Baru</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Tertarik">Tertarik</option>
                        <option value="Gagal">Gagal</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <div className={`text-xs font-bold ${isDue ? 'text-[#8C4A4A] bg-[#FCEADE] px-2.5 py-1 rounded-xl inline-block' : 'text-[#8C8275]'}`}>
                        {c.tgl_followup} {isDue && '⚠️'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openChatModal(c)}
                          className="inline-flex items-center gap-1 bg-[#B5C99A] text-[#2C3E21] px-3 py-1.5 rounded-xl hover:bg-[#A3B887] text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          💬 Chat WA
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          className="bg-[#E8F1F2] text-[#38515C] px-2.5 py-1.5 rounded-xl hover:bg-[#D6E5E7] text-xs font-bold transition cursor-pointer"
                          title="Edit Data"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="bg-[#FCEADE] text-[#8C4A4A] px-2.5 py-1.5 rounded-xl hover:bg-[#F8D7C8] text-xs font-bold transition cursor-pointer"
                          title="Hapus Data"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* POPUP MODAL: Preview & Edit Pesan WA Sebelum Kirim */}
      {activeChatClient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl border border-[#EFECE6] space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#4A443B]">
                🚀 Preview & Edit Pesan untuk <span className="text-[#38515C]">{activeChatClient.nama}</span>
              </h3>
              <button 
                onClick={() => setActiveChatClient(null)}
                className="text-xs bg-[#EFECE6] text-[#6D6356] px-2.5 py-1 rounded-xl font-bold hover:bg-[#DFD8CE]"
              >
                ✕ Batal
              </button>
            </div>
            <p className="text-xs text-[#8C8275]">
              Kamu bisa edit bebas teks di bawah ini khusus buat klien ini sebelum diarahkan ke aplikasi WhatsApp.
            </p>
            <textarea
              value={customChatText}
              onChange={(e) => setCustomChatText(e.target.value)}
              rows={5}
              className="w-full p-3 text-sm text-black bg-[#FAF8F5] border border-[#EFECE6] rounded-2xl outline-none focus:ring-2 focus:ring-[#D8E2DC] resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(customChatText);
                  alert('✨ Teks berhasil disalin ke clipboard!');
                }}
                className="bg-[#EFECE6] text-[#6D6356] px-4 py-2.5 rounded-2xl font-bold text-xs hover:bg-[#DFD8CE] transition cursor-pointer"
              >
                📋 Salin Teks Saja
              </button>
              <button
                onClick={sendWhatsAppMessage}
                className="bg-[#B5C99A] text-[#2C3E21] px-5 py-2.5 rounded-2xl font-bold text-xs hover:bg-[#A3B887] transition shadow-sm cursor-pointer"
              >
                Kirim ke WhatsApp Sekarang 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}