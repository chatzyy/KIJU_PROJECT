// ===== ไฟล์กลาง: โหลดทุกหน้าต่อจาก CDN =====
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="/project/web/js/supabase.js"></script>
const SUPABASE_URL = 'https://dmaiwgzpzthfqiqyeiii.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fuz7hFQUSvhtYp91Yxd1gQ_b7GGRkku';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const todayISO = () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); };

const API = {
  async tables() { const { data, error } = await sb.from('tables').select('*').order('table_id'); if (error) throw error; return data; },
  async stats() { const t = await this.tables(); return { total: t.length, free: t.filter(x => x.status === 'available').length }; },
  // อัปเดตแบบ Realtime
  live(names, fn) {
    const ch = sb.channel('live-' + Math.random());
    names.forEach(n => ch.on('postgres_changes', { event: '*', schema: 'public', table: n }, fn));
    ch.subscribe();
  },
  // ---- ลูกค้า ----
  async book({ name, phone, partySize, tableId, time }) {
    const { data: t } = await sb.from('tables').update({ status: 'reserved' })
      .eq('table_id', tableId).eq('status', 'available').select();
    if (!t || !t.length) throw new Error('โต๊ะนี้ไม่ว่างแล้ว');
    const { data: c } = await sb.from('customers').insert({ name, phone }).select().single();
    const [h, m] = time.split(':'); const rt = new Date(); rt.setHours(h, m, 0, 0);
    const num = 'Q' + (Math.floor(Math.random() * 9000) + 1000);
    const { data: r, error } = await sb.from('reservations').insert({
      reservation_number: num, customer_id: c.customer_id, table_id: tableId,
      party_size: partySize, reserved_time: rt.toISOString(), status: 'waiting' }).select().single();
    if (error) { await sb.from('tables').update({ status: 'available' }).eq('table_id', tableId); throw error; }
    localStorage.setItem('reservation_id', r.reservation_id);
    localStorage.setItem('customer_id', c.customer_id);
    await this.notify(r, `จองสำเร็จ คิว ${num} โต๊ะ ${tableId} กรุณามาก่อนเวลาจอง`);
    return r;
  },
  async notify(r, message) {
    await sb.from('notifications').insert({ customer_id: r.customer_id, reservation_id: r.reservation_id, message });
  },
  async myReservation() {
    const id = localStorage.getItem('reservation_id'); if (!id) return null;
    const { data } = await sb.from('reservations').select('*').eq('reservation_id', id).single();
    return data;
  },
  async myNotifications() {
    const id = localStorage.getItem('customer_id'); if (!id) return [];
    const { data } = await sb.from('notifications').select('*').eq('customer_id', id).order('created_at', { ascending: false });
    return data || [];
  },
  // ---- พนักงาน ----
  async reservations(statuses = ['waiting', 'called']) {
    const { data } = await sb.from('reservations').select('*, customers(name, phone)')
      .in('status', statuses).order('reserved_time'); return data || [];
  },
  async setStatus(r, status) {
    await sb.from('reservations').update({ status }).eq('reservation_id', r.reservation_id);
    const tableStatus = { called: 'reserved', seated: 'occupied', cancelled: 'available', no_show: 'available', done: 'cleaning' }[status];
    if (tableStatus) await sb.from('tables').update({ status: tableStatus }).eq('table_id', r.table_id);
    const msg = { called: `ถึงคิว ${r.reservation_number} แล้ว เชิญที่โต๊ะ ${r.table_id}`,
      cancelled: `คิว ${r.reservation_number} ถูกยกเลิก`, no_show: `คิว ${r.reservation_number} ถูกตัดสิทธิ์ (No-show)` }[status];
    if (msg) await this.notify(r, msg);
  },
  async checkout(r) { // เช็คบิล: บันทึกรายได้ + โต๊ะเป็น cleaning
    const { data: t } = await sb.from('tables').select('price').eq('table_id', r.table_id).single();
    await sb.from('income').insert({ table_id: r.table_id, price: t.price, total: t.price });
    await this.setStatus(r, 'done');
  },
  async setTableStatus(id, status) { await sb.from('tables').update({ status }).eq('table_id', id); },
  async autoNoShow() { // กฎ 10 นาที
    const limit = new Date(Date.now() - 10 * 60000).toISOString();
    const { data } = await sb.from('reservations').select('*').eq('status', 'waiting').lt('reserved_time', limit);
    for (const r of data || []) await this.setStatus(r, 'no_show');
  },
  async dashboard() {
    const [res, inc, st] = await Promise.all([
      sb.from('reservations').select('party_size,reserved_time,status').gte('created_at', todayISO()),
      sb.from('income').select('total').gte('created_at', todayISO()), this.stats()]);
    const ok = (res.data || []).filter(r => r.status !== 'cancelled');
    const byHour = {}; ok.forEach(r => { const h = new Date(r.reserved_time).getHours(); byHour[h] = (byHour[h] || 0) + 1; });
    return { bookings: (res.data || []).length, customers: ok.reduce((s, r) => s + r.party_size, 0),
      income: (inc.data || []).reduce((s, r) => s + Number(r.total), 0), free: st.free, byHour };
  },
};