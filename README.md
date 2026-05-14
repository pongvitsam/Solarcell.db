# Solarcell.db

เว็บแอป **SolarSave** — ประมาณการโซล่าเซลล์ แดชบอร์ด และประวัติ (เชื่อม Google Apps Script)

## รันในเครื่อง

เปิดไฟล์ `index.html` ในเบราว์เซอร์ หรือใช้เซิร์ฟเวอร์สแตติก เช่น `npx serve .`

## Gemini (ฟีเจอร์ "วิเคราะห์ด้วย AI")

ไม่เก็บ API key ใน repository แล้ว ตั้งค่าในเบราว์เซอร์ (ครั้งเดียวต่อเครื่อง):

```js
localStorage.setItem('gemini_api_key', 'YOUR_KEY_HERE');
```

จากนั้นรีเฟรชหน้าแล้วลองกดวิเคราะห์ด้วย AI อีกครั้ง

**ถ้าเคย commit key ลง Git มาก่อน:** ให้ไปที่ [Google AI Studio](https://aistudio.google.com/apikey) หยุดใช้ key เดิมแล้วสร้าง key ใหม่