# Solarcell.db

เว็บแอป **SolarSave** — ประมาณการโซล่าเซลล์ แดชบอร์ด และประวัติ (เชื่อม Google Apps Script)

โฟลเดอร์ **`Solarsave/`** — ระบบจัดการบิลค่าไฟ (Grid + Solar) สำหรับ production + GitHub Pages  
ดูคำแนะตั้งค่า Google Sheet / Apps Script ใน `Solarsave/config.js` และ `Solarsave/google-apps-script/Code.gs`

### Push โค้ดขึ้น Google Apps Script (clasp)

ในโฟลเดอร์ `Solarsave/google-apps-script` มี `.clasp.json` ผูกกับ Script ID ของคุณแล้ว

```bash
cd Solarsave/google-apps-script
npm install
npx clasp login
npm run push
```

ครั้งแรกต้อง `clasp login` (เปิดเบราว์เซอร์ยืนยันบัญชี Google ที่มีสิทธิแก้โปรเจกต์นั้น) จากนั้น `npm run push` จะอัปโหลด `Code.gs` + `appsscript.json` ขึ้น Apps Script โดยตรง

## รันในเครื่อง

เปิดไฟล์ `index.html` ในเบราว์เซอร์ หรือใช้เซิร์ฟเวอร์สแตติก เช่น `npx serve .`

สำหรับแอปบิล (โฟลเดอร์ Solarsave): `npx serve Solarsave` แล้วเปิดหน้าแรกของ Solarsave