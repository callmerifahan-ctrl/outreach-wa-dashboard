export function generateWALink(client: {
  nama: string;
  no_whatsapp: string;
  sumber: string;
  layanan: string;
  status: string;
  catatan?: string;
}) {
  let phone = client.no_whatsapp.replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.slice(1);
  }

  let text = '';

  if (client.status === 'Baru') {
    if (client.sumber === 'Google Maps') {
      text = `Halo Kak ${client.nama}! Sori mau nanya, kemarin pas aku cek di Google Maps kok belum ada link websitunya ya? Lagi ada rencana mau bikin ${client.layanan} kah kak?`;
    } else {
      text = `Halo Kak ${client.nama}! Asik banget liat produk/kontennya. Btw lagi ada rencana mau bikin ${client.layanan} buat naikin penjualan gak kak?`;
    }
  } else if (client.status === 'Follow-up') {
    text = `Pagi Kak ${client.nama}! Sori nih mau nyapa sekalian nanya, yang kemarin sempat kita bahas soal ${client.layanan} gimana kak? Ada yang mau didiskusikan lagi?`;
  } else if (client.status === 'Tertarik') {
    text = `Halo Mas/Kak ${client.nama}, kabarnya gimana? Soal penawaran ${client.layanan} kemarin kira-kira bisa dibantu proses minggu ini kak?`;
  } else {
    text = `Halo Kak ${client.nama}! Mau nanya kabar aja nih, semoga project-nya lancar yaa 👍`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}