# KIJU_PROJECT — เวอร์ชันแก้ไข

ระบบจองโต๊ะร้านหมูกระทะออนไลน์ (Customer + Admin) เชื่อม Supabase

## เปิดใช้งาน

1. เปิดโฟลเดอร์โปรเจกต์นี้ด้วย VS Code
2. แนะนำให้ติดตั้ง/ใช้ Live Server
3. เปิด `index.html` เพื่อเข้าหน้าลูกค้า
4. เปิด `admin.html` เพื่อเข้าหน้า Admin

หรือเปิดไฟล์โดยตรง:
- `project/web/user/homepage_user/homepage_user.html`
- `project/web/addmin/homepage_addmin/homepage_addmin.html`

## จุดที่แก้ไข

- แก้ path `supabase.js` ให้ทุกหน้าโหลดไฟล์กลางตัวเดียวกัน
- แก้ลำดับการโหลด Supabase SDK ให้ถูกต้อง
- เพิ่มการตรวจสอบชื่อ เบอร์โทร จำนวนคน เวลา และความจุโต๊ะ
- ป้องกันการจองโต๊ะที่ถูกจองไปพร้อมกัน
- ถ้าการสร้าง reservation ล้มเหลว จะคืนโต๊ะเป็น `available`
- เพิ่มการตรวจสอบ error จาก Supabase ใน API หลัก
- ปรับ Realtime ให้ refresh หน้าโดยไม่ทำให้เกิด unhandled error
- เพิ่มหน้า `index.html` และ `admin.html` สำหรับเข้าใช้งานง่าย

## หมายเหตุ

โปรเจกต์ใช้ Supabase ตาม URL/Publishable Key ที่มีอยู่ใน `javascript/supabase.js`
หากข้อมูลไม่ขึ้น ให้ตรวจสอบว่าโปรเจกต์ Supabase ยังใช้งานอยู่ และตารางที่ใช้มีชื่อ/คอลัมน์ตรงกับโค้ด เช่น:
`tables`, `customers`, `reservations`, `notifications`, `income`


## แผนผังโต๊ะฝั่ง User

หน้า `project/web/user/table_user/table_user.html` ถูกปรับใหม่เป็นแผนผัง 40 โต๊ะ:
- A01-A20: โซน 289 บาท รองรับ 4 คน
- B01-B12: โซน 489 บาท รองรับ 8 คน
- C01-C08: โซน 689 บาท รองรับ 12 คน
- โต๊ะแต่ละตัวแสดงเลขโต๊ะ ความจุ และสถานะว่าง/ไม่ว่าง
- กดโต๊ะว่างแล้วเปิดฟอร์มกรอก ชื่อ, เบอร์โทร, จำนวนคน และกดจองได้ทันที
- จำนวนคนถูกตรวจสอบไม่ให้เกินความจุของโต๊ะ
- สถานะโต๊ะอ่านจาก Supabase และอัปเดตแบบ Realtime

### เตรียมข้อมูลโต๊ะใน Supabase

หากในฐานข้อมูลยังไม่มีโต๊ะ 1-40 ให้เปิดไฟล์ `database/seed_tables.sql` แล้วรันใน Supabase SQL Editor ก่อนใช้งานระบบจองจริง
