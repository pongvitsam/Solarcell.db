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

### อัปโหลด Apps Script อัตโนมัติ (GitHub Actions — ทำครั้งเดียว)

หลัง `clasp login` บนเครื่องคุณแล้ว:

1. เปิดไฟล์ **`~/.clasprc.json`** (Windows: `C:\Users\<ชื่อผู้ใช้>\.clasprc.json`) แล้วคัดลอก **ทั้งไฟล์** (เป็น JSON ยาว ๆ)
2. ที่ GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: **`CLASPRC_JSON`**
   - Value: วาง JSON ทั้งก้อน
3. ทุกครั้งที่ push ไป `main` / `master` และมีการแก้ใน `Solarsave/google-apps-script/` workflow **`Push SolarSave Apps Script (clasp)`** จะรัน `clasp push` ให้

ถ้ายังไม่ตั้ง secret workflow จะข้ามขั้นนี้โดยไม่ล้ม build อื่น (แค่แสดง notice ใน log)

**ความปลอดภัย:** `CLASPRC_JSON` คือ OAuth token — อย่าแชร์ publicly; ถ้า leak ให้ revoke ที่ Google Account และรัน `clasp login` ใหม่แล้วอัปเดต secret

## รันในเครื่อง

เปิดไฟล์ `index.html` ในเบราว์เซอร์ หรือใช้เซิร์ฟเวอร์สแตติก เช่น `npx serve .`

สำหรับแอปบิล (โฟลเดอร์ Solarsave): `npx serve Solarsave` แล้วเปิดหน้าแรกของ Solarsave

### GitHub Pages ยังเห็นหน้าเก่า?

1. Repo → **Settings → Pages → Build and deployment**  
   - แนะนำ: **Source = GitHub Actions** (workflow `Deploy SolarSave`)  
   - หรือ: **Deploy from branch** → branch `main` → folder **`/Solarsave`** (ไม่ใช่ `/ (root)`)
2. รอ workflow เขียว 1–2 นาที แล้วเปิดเว็บแบบ **hard refresh** (Ctrl+Shift+R)
3. หน้าใหม่มี title **「ระบบจัดการบิลค่าไฟ (Grid + Solar)」** และหน้า login เลือก ผู้ใช้ไฟ / เจ้าหน้าที่  
   หน้าเก่า (ประมาณการโซล่า) อยู่ที่ `legacy/index.html` เท่านั้น