function recalculateMockData() {
  state.records = state.records.map(function (r) { return calculateFinancials(r); });
}

function calculateFinancials(record) {
  let gridEnergyCost = 0;
  let solarEnergyCost = 0;
  let totalGridUnits = record.grid;
  let totalSolarUnits = record.solar;
  const ftRate = record.ft || 0;
  const srvFee = record.serviceFee || 0;
  let calcStepsHTML = '';

  if (record.phase === '3tou') {
    const tg = record.touGrid || {};
    const ts = record.touSolar || {};
    const touNum = function (seg) {
      const v = seg;
      if (typeof v === 'number') return v;
      if (v && typeof v === 'object' && typeof v.unit === 'number') return v.unit;
      return 0;
    };
    const pk = touNum(tg.peak);
    const of = touNum(tg.off);
    const ho = touNum(tg.hol);
    const spk = touNum(ts.peak);
    const sof = touNum(ts.off);
    const sho = touNum(ts.hol);
    const gp = pk * record.ratePeak + of * record.rateOffPeak + ho * record.rateHoliday;
    const sp = spk * record.ratePeak + sof * record.rateOffPeak + sho * record.rateHoliday;
    gridEnergyCost = gp;
    solarEnergyCost = sp;
    calcStepsHTML += '<div class="pb-2 border-b border-gray-200 dark:border-gray-700"><strong class="text-blue-600 dark:text-blue-400">1. ค่าพลังงานไฟฟ้าส่วนที่ดึงจากสายส่ง (Grid)</strong><br><div class="pl-4 mt-1">Peak: ฿' + (pk * record.ratePeak).toFixed(2) + ' | Off-Peak: ฿' + (of * record.rateOffPeak).toFixed(2) + ' | Hol: ฿' + (ho * record.rateHoliday).toFixed(2) + '<br><span class="font-bold">รวม Grid Base: ฿' + gridEnergyCost.toFixed(2) + '</span></div></div>';
    calcStepsHTML += '<div class="pb-2 border-b border-gray-200 dark:border-gray-700"><strong class="text-yellow-600 dark:text-yellow-500">2. ค่าพลังงานไฟฟ้าส่วนที่ผลิตจากโซล่า (Solar)</strong><br><div class="pl-4 mt-1">Peak: ฿' + (spk * record.ratePeak).toFixed(2) + ' | Off-Peak: ฿' + (sof * record.rateOffPeak).toFixed(2) + ' | Hol: ฿' + (sho * record.rateHoliday).toFixed(2) + '<br><span class="font-bold">รวม Solar Base: ฿' + solarEnergyCost.toFixed(2) + '</span></div></div>';
  } else {
    gridEnergyCost = totalGridUnits * record.rateNormal;
    solarEnergyCost = totalSolarUnits * record.rateNormal;
    calcStepsHTML += '<div class="pb-2 border-b border-gray-200 dark:border-gray-700"><strong class="text-blue-600 dark:text-blue-400">1. ค่าพลังงานไฟฟ้า (Base Cost)</strong><br><div class="pl-4 mt-1">Grid: ฿' + gridEnergyCost.toFixed(2) + '<br>Solar: ฿' + solarEnergyCost.toFixed(2) + '</div></div>';
  }

  const gridFtCost = totalGridUnits * ftRate;
  let gridSubtotal = gridEnergyCost + gridFtCost + srvFee;
  const gridVat = gridSubtotal * 0.07;
  const valA = gridSubtotal + gridVat;

  const solarFtCost = totalSolarUnits * ftRate;
  const solarFullSubtotal = solarEnergyCost + solarFtCost;
  const solarFullVat = solarFullSubtotal * 0.07;
  const valB = solarFullSubtotal + solarFullVat;

  const discPercent = record.discount / 100;
  const solarDiscAmount = solarEnergyCost * discPercent;
  const solarNetSubtotal = solarEnergyCost - solarDiscAmount;
  const solarNetVat = solarNetSubtotal * 0.07;
  const valC = solarNetSubtotal + solarNetVat;

  const valY = valA + valB;
  const valX = valA + valC;
  const valZ = valY - valX;

  calcStepsHTML += '\n                <div class="pb-2 border-b border-gray-200 dark:border-gray-700">\n                    <strong class="text-gray-700 dark:text-gray-300">3. ค่า Ft (฿' + ftRate + ' / หน่วย) และ ค่าบริการ (฿' + srvFee + ')</strong><br>\n                    <div class="pl-4 mt-1">Grid Ft: ฿' + gridFtCost.toFixed(2) + ' | Solar Ft: ฿' + solarFtCost.toFixed(2) + '<br>ค่าบริการรายเดือน: ฿' + srvFee.toFixed(2) + '</div>\n                </div>\n                <div class="pb-2 border-b border-gray-200 dark:border-gray-700">\n                    <strong class="text-green-600 dark:text-green-400">4. การคำนวณส่วนลดโซล่าเซลล์ (' + record.discount + '%)</strong><br>\n                    <div class="pl-4 mt-1">\n                        มูลค่าไฟ Solar ฐาน: ฿' + solarEnergyCost.toFixed(2) + '<br>\n                        ส่วนลด ' + record.discount + '% = <span class="text-red-500 font-bold">-฿' + solarDiscAmount.toFixed(2) + '</span><br>\n                        <span class="text-xs text-gray-500">* ไม่นำค่า Ft มาคิดรวมในส่วนลด</span><br>\n                        เหลือค่าไฟ Solar สุทธิก่อน VAT = ฿' + solarNetSubtotal.toFixed(2) + '\n                    </div>\n                </div>\n                <div>\n                    <strong class="text-purple-600 dark:text-purple-400">5. ภาษีมูลค่าเพิ่ม (VAT 7%) และรวมบิล</strong><br>\n                    <div class="pl-4 mt-1">\n                        บิลฝั่งการไฟฟ้า (Grid): (฿' + gridSubtotal.toFixed(2) + ' + 7%) = ฿' + valA.toFixed(2) + '<br>\n                        บิลฝั่งโซล่า (Solar): (฿' + solarNetSubtotal.toFixed(2) + ' + 7%) = ฿' + valC.toFixed(2) + '<br>\n                        <span class="font-bold text-lg mt-2 block">รวมยอดลูกค้าชำระ (X) = ฿' + valX.toFixed(2) + '</span>\n                    </div>\n                </div>\n            ';

  return Object.assign({}, record, {
    gridSubtotal: gridSubtotal,
    gridVat: gridVat,
    solarFullSubtotal: solarFullSubtotal,
    solarFullVat: solarFullVat,
    solarNetSubtotal: solarNetSubtotal,
    solarNetVat: solarNetVat,
    valA: valA,
    valB: valB,
    valC: valC,
    valY: valY,
    valX: valX,
    valZ: valZ,
    calcStepsHTML: calcStepsHTML
  });
}

function togglePhaseInputs() {
  const phase = document.getElementById('phaseType').value;
  const mode = document.querySelector('input[name="inputMode"]:checked').value;
  const isMeter = mode === 'meter';

  if (phase === '3tou') {
    document.getElementById('rateNormalBox').classList.add('hidden');
    document.getElementById('rateNormalBox').classList.remove('grid');
    document.getElementById('rateTouBox').classList.remove('hidden');
    document.getElementById('rateTouBox').classList.add('grid');
  } else {
    document.getElementById('rateNormalBox').classList.remove('hidden');
    document.getElementById('rateNormalBox').classList.add('grid');
    document.getElementById('rateTouBox').classList.add('hidden');
    document.getElementById('rateTouBox').classList.remove('grid');
  }

  ['grid1PhaseUnit', 'grid1PhaseMeter', 'grid3PhaseUnit', 'grid3PhaseMeter', 'gridTouUnit', 'gridTouMeter',
    'solar1PhaseUnit', 'solar1PhaseMeter', 'solar3PhaseUnit', 'solar3PhaseMeter', 'solarTouUnit', 'solarTouMeter'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  if (phase === '1') {
    document.getElementById(isMeter ? 'grid1PhaseMeter' : 'grid1PhaseUnit').classList.remove('hidden');
    document.getElementById(isMeter ? 'solar1PhaseMeter' : 'solar1PhaseUnit').classList.remove('hidden');
  } else if (phase === '3') {
    document.getElementById(isMeter ? 'grid3PhaseMeter' : 'grid3PhaseUnit').classList.remove('hidden');
    document.getElementById(isMeter ? 'solar3PhaseMeter' : 'solar3PhaseUnit').classList.remove('hidden');
  } else if (phase === '3tou') {
    document.getElementById(isMeter ? 'gridTouMeter' : 'gridTouUnit').classList.remove('hidden');
    document.getElementById(isMeter ? 'solarTouMeter' : 'solarTouUnit').classList.remove('hidden');
  }
}

function calcDiff(prevId, currId, resId) {
  const p = parseFloat(document.getElementById(prevId).value) || 0;
  const c = parseFloat(document.getElementById(currId).value) || 0;
  const d = Math.max(0, c - p);
  document.getElementById(resId).innerText = d.toFixed(2);
  return d;
}
