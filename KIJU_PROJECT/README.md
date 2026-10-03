# KIJU_PROJECT 

ระบบจองโต๊ะร้านหมูกระทะออนไลน์ (Customer + Admin) เชื่อม Supabase

## เปิดใช้งาน

1. เปิดโฟลเดอร์โปรเจกต์นี้ด้วย VS Code
2. แนะนำให้ติดตั้ง/ใช้ Live Server
3. เปิด `index.html` เพื่อเข้าหน้าลูกค้า
4. เปิด `admin.html` เพื่อเข้าหน้า Admin

หรือเปิดไฟล์โดยตรง:
- `project/web/user/homepage_user/homepage_user.html`
- `project/web/addmin/homepage_addmin/homepage_addmin.html`


## แผนผังโต๊ะฝั่ง User

หน้า `project/web/user/table_user/table_user.html` ถูกปรับใหม่เป็นแผนผัง 40 โต๊ะ:
- A01-A20: โซน 289 บาท รองรับ 4 คน
- B01-B12: โซน 489 บาท รองรับ 8 คน
- C01-C08: โซน 689 บาท รองรับ 12 คน
- โต๊ะแต่ละตัวแสดงเลขโต๊ะ ความจุ และสถานะว่าง/ไม่ว่าง
- กดโต๊ะว่างแล้วเปิดฟอร์มกรอก ชื่อ, เบอร์โทร, จำนวนคน และกดจองได้ทันที
- จำนวนคนถูกตรวจสอบไม่ให้เกินความจุของโต๊ะ
- สถานะโต๊ะอ่านจาก Supabase และอัปเดตแบบ Realtime
