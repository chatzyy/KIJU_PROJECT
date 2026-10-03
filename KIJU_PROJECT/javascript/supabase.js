// Supabase API กลางของโปรเจกต์ KIJU
// ไฟล์นี้ต้องถูกโหลดหลัง @supabase/supabase-js

const SUPABASE_URL = 'https://dmaiwgzpzthfqiqyeiii.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fuz7hFQUSvhtYp91Yxd1gQ_b7GGRkku';

if (!window.supabase) {
  throw new Error('ไม่พบ Supabase SDK: กรุณาโหลด @supabase/supabase-js ก่อน supabase.js');
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

function throwIfError(error, fallback = 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล') {
  if (error) {
    console.error(error);
    throw new Error(error.message || fallback);
  }
}

const API = {
  // ---------- โต๊ะ ----------
  async tables() {
    const { data, error } = await sb
      .from('restaurant_tables')
      .select('*')
      .order('table_id');

    throwIfError(error);
    return data || [];
  },

  async stats() {
    const t = await this.tables();
    return {
      total: t.length,
      free: t.filter(x => x.status === 'available').length
    };
  },

  // ---------- Realtime ----------
  live(names, fn) {
    const channel = sb.channel('kiju-live-' + Math.random().toString(36).slice(2));

    names.forEach(name => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: name },
        () => Promise.resolve(fn()).catch(console.error)
      );
    });

    channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Supabase Realtime ใช้งานไม่ได้ กรุณาตรวจสอบการเปิด Realtime ของตารางใน Supabase');
      }
    });

    return channel;
  },

  // ---------- ลูกค้า: จองโต๊ะ ----------
  async book({ name, phone, partySize, tableId, time }) {
    name = String(name || '').trim();
    phone = String(phone || '').trim();
    partySize = Number(partySize);
    tableId = String(tableId || '').trim();
    time = String(time || '').trim() || new Date().toTimeString().slice(0, 5);

    if (!name) throw new Error('กรุณากรอกชื่อ');
    if (!phone) throw new Error('กรุณากรอกเบอร์โทรศัพท์');
    if (!/^[0-9]{9,10}$/.test(phone)) {
      throw new Error('เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก');
    }
    if (!Number.isInteger(partySize) || partySize <= 0) {
      throw new Error('จำนวนคนไม่ถูกต้อง');
    }
    if (!tableId) throw new Error('กรุณาเลือกโต๊ะ');
    if (!/^\d{2}:\d{2}$/.test(time)) {
      throw new Error('กรุณาเลือกเวลา');
    }

    // ตรวจสอบโต๊ะและจำนวนที่นั่งก่อนจอง
    const { data: table, error: tableError } = await sb
      .from('restaurant_tables')
      .select('table_id, capacity, status')
      .eq('table_id', tableId)
      .single();

    throwIfError(tableError, 'ไม่พบโต๊ะที่เลือก');

    if (table.status !== 'available') {
      throw new Error('โต๊ะนี้ไม่ว่างแล้ว กรุณาเลือกโต๊ะอื่น');
    }

    if (partySize > Number(table.capacity)) {
      throw new Error(`โต๊ะนี้รองรับได้สูงสุด ${table.capacity} คน`);
    }

    // จองโต๊ะแบบมีเงื่อนไข เพื่อป้องกันการกดจองพร้อมกัน
    const { data: lockedTable, error: lockError } = await sb
      .from('restaurant_tables')
      .update({ status: 'reserved' })
      .eq('table_id', tableId)
      .eq('status', 'available')
      .select('table_id')
      .maybeSingle();

    throwIfError(lockError);

    if (!lockedTable) {
      throw new Error('โต๊ะนี้เพิ่งถูกจอง กรุณาเลือกโต๊ะอื่น');
    }

    let customer = null;

    try {
      const { data: c, error: customerError } = await sb
        .from('customers')
        .insert({ name, phone })
        .select()
        .single();

      throwIfError(customerError, 'บันทึกข้อมูลลูกค้าไม่สำเร็จ');
      customer = c;

      const [h, m] = time.split(':').map(Number);
      const reservationDate = new Date();
      reservationDate.setHours(h, m, 0, 0);

      const num = 'Q' + (Math.floor(Math.random() * 9000) + 1000);

      const { data: r, error: reservationError } = await sb
        .from('reservations')
        .insert({
          reservation_number: num,
          customer_id: customer.customer_id,
          table_id: tableId,
          people: partySize,
          reservation_date: reservationDate.toISOString().slice(0, 10),
          reservation_time: time,
          status: 'waiting'
        })
        .select()
        .single();

      throwIfError(reservationError, 'บันทึกการจองไม่สำเร็จ');

      localStorage.setItem('reservation_id', String(r.reservation_id));
      localStorage.setItem('customer_id', String(customer.customer_id));

      // การแจ้งเตือนไม่ควรทำให้การจองที่บันทึกสำเร็จแล้วถูกยกเลิก
      try {
        await this.notify(
          r,
          `จองสำเร็จ คิว ${num} โต๊ะ ${tableId} เวลา ${time} น.`
        );
      } catch (notificationError) {
        console.warn('สร้างการแจ้งเตือนไม่สำเร็จ:', notificationError);
      }

      return r;
    } catch (error) {
      // ถ้าบันทึกการจองไม่สำเร็จ ให้คืนสถานะโต๊ะ
      await sb
        .from('restaurant_tables')
        .update({ status: 'available' })
        .eq('table_id', tableId)
        .eq('status', 'reserved');

      throw error;
    }
  },

  async notify(r, message) {
    const { error } = await sb
      .from('notifications')
      .insert({
        customer_id: r.customer_id,
        reservation_id: r.reservation_id,
        message
      });

    throwIfError(error, 'สร้างการแจ้งเตือนไม่สำเร็จ');
  },

  async myReservation() {
    const id = localStorage.getItem('reservation_id');
    if (!id) return null;

    const { data, error } = await sb
      .from('reservations')
      .select('*')
      .eq('reservation_id', id)
      .maybeSingle();

    throwIfError(error);
    return data || null;
  },

  async myNotifications() {
    const id = localStorage.getItem('customer_id');
    if (!id) return [];

    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    throwIfError(error);
    return data || [];
  },

  // ---------- พนักงาน: รายการจอง ----------
  async reservations(statuses = ['waiting', 'called']) {
    const { data, error } = await sb
      .from('reservations')
      .select('*, customers(name, phone)')
      .in('status', statuses)
      .order('reservation_date').order('reservation_time');

    throwIfError(error);
    return data || [];
  },

  async setStatus(r, status) {
    if (!r || !r.reservation_id) {
      throw new Error('ไม่พบข้อมูลการจอง');
    }

    const allowed = ['waiting', 'called', 'seated', 'cancelled', 'no_show', 'done'];
    if (!allowed.includes(status)) {
      throw new Error('สถานะการจองไม่ถูกต้อง');
    }

    const { error } = await sb
      .from('reservations')
      .update({ status })
      .eq('reservation_id', r.reservation_id);

    throwIfError(error);

    const tableStatus = {
      called: 'reserved',
      seated: 'occupied',
      cancelled: 'available',
      no_show: 'available',
      done: 'cleaning'
    }[status];

    if (tableStatus && r.table_id != null) {
      const { error: tableError } = await sb
        .from('restaurant_tables')
        .update({ status: tableStatus })
        .eq('table_id', r.table_id);

      throwIfError(tableError, 'เปลี่ยนสถานะโต๊ะไม่สำเร็จ');
    }

    const message = {
      called: `ถึงคิว ${r.reservation_number} แล้ว เชิญที่โต๊ะ ${r.table_id}`,
      cancelled: `คิว ${r.reservation_number} ถูกยกเลิก`,
      no_show: `คิว ${r.reservation_number} ถูกตัดสิทธิ์ (No-show)`
    }[status];

    if (message) {
      // ไม่ให้การแจ้งเตือนที่ผิดพลาดทำให้การเปลี่ยนสถานะล้มเหลว
      try {
        await this.notify(r, message);
      } catch (error) {
        console.warn(error);
      }
    }

    return true;
  },

  async checkout(r) {
    if (!r || !r.reservation_id) {
      throw new Error('ไม่พบข้อมูลการจอง');
    }

    if (r.status !== 'seated') {
      throw new Error('เช็คบิลได้เฉพาะโต๊ะที่กำลังทาน');
    }

    const { data: table, error: tableError } = await sb
      .from('restaurant_tables')
      .select('price')
      .eq('table_id', r.table_id)
      .single();

    throwIfError(tableError, 'ไม่พบข้อมูลราคาโต๊ะ');

    const price = Number(table.price);
    if (!Number.isFinite(price)) {
      throw new Error('ราคาโต๊ะไม่ถูกต้อง');
    }

    const { error: incomeError } = await sb
      .from('income')
      .insert({
        table_id: r.table_id,
        price,
        total: price
      });

    throwIfError(incomeError, 'บันทึกรายได้ไม่สำเร็จ');

    await this.setStatus(r, 'done');
    return true;
  },

  async setTableStatus(id, status) {
    const allowed = ['available', 'reserved', 'occupied', 'cleaning'];
    if (!allowed.includes(status)) {
      throw new Error('สถานะโต๊ะไม่ถูกต้อง');
    }

    const { error } = await sb
      .from('restaurant_tables')
      .update({ status })
      .eq('table_id', id);

    throwIfError(error);
  },

  async autoNoShow() {
    const now = new Date(Date.now() - 10 * 60000);
    const date = now.toLocaleDateString('en-CA');
    const time = now.toTimeString().slice(0, 8);

    const { data, error } = await sb
      .from('reservations')
      .select('*')
      .eq('status', 'waiting')
      .or(`reservation_date.lt.${date},and(reservation_date.eq.${date},reservation_time.lt.${time})`);

    throwIfError(error);

    for (const r of data || []) {
      try {
        await this.setStatus(r, 'no_show');
      } catch (error) {
        console.error('เปลี่ยน No-show ไม่สำเร็จ', error);
      }
    }
  },

  // ---------- Dashboard ----------
  async dashboard() {
    const [res, inc, st] = await Promise.all([
      sb
        .from('reservations')
        .select('people,reservation_date,reservation_time,status'),
      sb
        .from('income')
        .select('total'),
      this.stats()
    ]);

    throwIfError(res.error);
    throwIfError(inc.error);

    const rows = res.data || [];
    const ok = rows.filter(r => r.status !== 'cancelled');

    const byHour = {};
    ok.forEach(r => {
      const h = Number(String(r.reservation_time || '00:00').slice(0, 2));
      byHour[h] = (byHour[h] || 0) + 1;
    });

    return {
      bookings: rows.length,
      customers: ok.reduce((sum, r) => sum + Number(r.people || 0), 0),
      income: (inc.data || []).reduce((sum, r) => sum + Number(r.total || 0), 0),
      free: st.free,
      byHour
    };
  }
};
