let currentLevel = 'beginner';
let selectedInAnswer = [];
let sandboxPair = [null, null];

// โหลดแอปพลิเคชัน
window.addEventListener('DOMContentLoaded', async () => {
  await changeLevel('beginner');
});

// เปลี่ยนระดับความยาก
async function changeLevel(level) {
  currentLevel = level;

  ['beginner', 'intermediate', 'advanced'].forEach(lvl => {
    const btn = document.getElementById(`lvl-${lvl}`);
    if (lvl === level) {
      btn.className = "flex-1 py-2 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md";
    } else {
      btn.className = "flex-1 py-2 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all text-purple-300 hover:text-white";
    }
  });

  await loadLevelData(level);
  generateNextQuestion();
}

// สร้างโจทย์ถัดไป
function generateNextQuestion() {
  const q = getRandomQuestion();
  if (!q) return;

  selectedInAnswer = [];
  sandboxPair = [null, null];
  document.getElementById('explanation-box').classList.add('hidden');
  clearSandbox();

  document.getElementById('target-translation').innerText = q.translation;

  renderWordPool(q.shuffledWords);
  renderAnswerZone();
  setupSandboxDropZones();
}

// เรนเดอร์ Word Pool
function renderWordPool(words) {
  const poolEl = document.getElementById('word-pool');
  poolEl.innerHTML = '';

  words.forEach((wordText, index) => {
    const tile = createTileElement(wordText, `word_${index}_${Date.now()}`);
    poolEl.appendChild(tile);
  });
}

// สร้าง Element ของบล็อกคำศัพท์ (Tile) พร้อมฟีเจอร์ Drag & Drop
function createTileElement(text, id) {
  const tile = document.createElement('div');
  tile.className = "px-3.5 py-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-100 text-xs sm:text-sm font-mono cursor-grab active:cursor-grabbing hover:bg-purple-900/60 hover:border-purple-400 transition-all duration-200 select-none shadow-sm flex items-center gap-1.5";
  tile.innerText = text;
  tile.dataset.id = id;
  tile.dataset.text = text;
  tile.draggable = true;

  // HTML5 Drag Event
  tile.ondragstart = (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ text, id }));
    tile.classList.add('opacity-50');
  };

  tile.ondragend = () => {
    tile.classList.remove('opacity-50');
  };

  // คลิกปกติ = ย้ายขึ้นประโยคคำตอบหลัก
  tile.onclick = () => onTileClick(tile, text, id);

  return tile;
}

// เมื่อคลิกคำศัพท์ -> ย้ายขึ้นกล่องประโยคคำตอบหลัก
function onTileClick(tileEl, text, id) {
  // ถ้านำคำนี้ไปวางใน Sandbox อยู่ ให้ถอนออกจาก Sandbox ก่อน
  if (sandboxPair[0] && sandboxPair[0].id === id) sandboxPair[0] = null;
  if (sandboxPair[1] && sandboxPair[1].id === id) sandboxPair[1] = null;
  updateSandboxUI();

  selectedInAnswer.push({ text, id, el: tileEl });
  tileEl.classList.add('hidden');
  renderAnswerZone();
}

// เรนเดอร์โซนประโยคคำตอบ
function renderAnswerZone() {
  const zone = document.getElementById('answer-drop-zone');

  if (selectedInAnswer.length === 0) {
    zone.innerHTML = '<span id="placeholder-text" class="text-xs text-gray-500 italic pl-2">คลิกเลือกบล็อกคำศัพท์ด้านล่างมาวางที่นี่...</span>';
    return;
  }

  zone.innerHTML = '';
  selectedInAnswer.forEach((item, index) => {
    const tile = document.createElement('div');
    tile.className = "px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-xs sm:text-sm font-mono cursor-pointer hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center gap-1 shadow-md animate-pop-in";
    tile.innerText = item.text;

    // คลิกเพื่อเอากลับคืนคลังคำศัพท์
    tile.onclick = () => {
      item.el.classList.remove('hidden');
      selectedInAnswer.splice(index, 1);
      renderAnswerZone();
    };

    zone.appendChild(tile);
  });
}

// ตั้งค่า HTML5 Drop Zone ให้กับกล่อง Sandbox ช่อง 1 และ ช่อง 2
function setupSandboxDropZones() {
  [0, 1].forEach(slotIndex => {
    const slotEl = document.getElementById(`sandbox-slot-${slotIndex + 1}`);

    slotEl.ondragover = (e) => {
      e.preventDefault();
      slotEl.classList.add('border-purple-400', 'bg-purple-900/40');
    };

    slotEl.ondragleave = () => {
      slotEl.classList.remove('border-purple-400', 'bg-purple-900/40');
    };

    slotEl.ondrop = (e) => {
      e.preventDefault();
      slotEl.classList.remove('border-purple-400', 'bg-purple-900/40');

      const dataRaw = e.dataTransfer.getData('text/plain');
      if (!dataRaw) return;

      const data = JSON.parse(dataRaw);
      const targetTile = document.querySelector(`[data-id="${data.id}"]`);

      if (!targetTile || targetTile.classList.contains('hidden')) return;

      // ถ้านำคำนี้ไปวางอีกช่องหนึ่งอยู่แล้ว ให้สลับช่อง
      if (slotIndex === 0 && sandboxPair[1] && sandboxPair[1].id === data.id) sandboxPair[1] = null;
      if (slotIndex === 1 && sandboxPair[0] && sandboxPair[0].id === data.id) sandboxPair[0] = null;

      // ปลด opacity ของคำเก่าในช่องนี้ (ถ้ามี)
      if (sandboxPair[slotIndex]) sandboxPair[slotIndex].el.classList.remove('opacity-40');

      sandboxPair[slotIndex] = { text: data.text, id: data.id, el: targetTile };
      targetTile.classList.add('opacity-40');
      updateSandboxUI();
    };
  });
}

// อัปเดต UI โซนทดจับคู่คำ (Sandbox) พร้อมปุ่มเคลียร์สว่างเมื่อมีคำในช่อง
function updateSandboxUI() {
  const slot1 = document.getElementById('sandbox-slot-1');
  const slot2 = document.getElementById('sandbox-slot-2');
  const clearBtn = document.querySelector("button[onclick='clearSandbox()']");

  slot1.innerText = sandboxPair[0] ? sandboxPair[0].text : '[ ลากคำวางช่องที่ 1 ]';
  slot1.className = sandboxPair[0]
    ? "w-40 h-11 rounded-xl bg-purple-900/80 border-2 border-purple-400 flex items-center justify-center text-xs sm:text-sm font-mono text-white shadow-md cursor-pointer hover:border-purple-300"
    : "w-40 h-11 rounded-xl bg-black/50 border border-dashed border-purple-500/40 flex items-center justify-center text-xs font-mono text-purple-300/60 cursor-pointer hover:border-purple-400 transition-all";

  slot2.innerText = sandboxPair[1] ? sandboxPair[1].text : '[ ลากคำวางช่องที่ 2 ]';
  slot2.className = sandboxPair[1]
    ? "w-40 h-11 rounded-xl bg-purple-900/80 border-2 border-purple-400 flex items-center justify-center text-xs sm:text-sm font-mono text-white shadow-md cursor-pointer hover:border-purple-300"
    : "w-40 h-11 rounded-xl bg-black/50 border border-dashed border-purple-500/40 flex items-center justify-center text-xs font-mono text-purple-300/60 cursor-pointer hover:border-purple-400 transition-all";

  // ปรับสถานะความสว่างของปุ่มเคลียร์
  if (clearBtn) {
    if (sandboxPair[0] || sandboxPair[1]) {
      clearBtn.className = "px-3.5 py-2.5 rounded-xl bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-500/40 text-xs font-semibold transition-all shadow-md animate-fade-in";
    } else {
      clearBtn.className = "px-3.5 py-2.5 rounded-xl bg-gray-800/40 text-gray-500 text-xs transition-all cursor-not-allowed border border-transparent";
    }
  }
}

// เคลียร์โซนทด Sandbox
function clearSandbox() {
  if (sandboxPair[0]) sandboxPair[0].el.classList.remove('opacity-40');
  if (sandboxPair[1]) sandboxPair[1].el.classList.remove('opacity-40');

  sandboxPair = [null, null];
  updateSandboxUI();

  const fb = document.getElementById('sandbox-feedback');
  fb.classList.add('hidden');
}

// ทดสอบจับคู่คำใน Sandbox
function testChunkPair() {
  const fb = document.getElementById('sandbox-feedback');

  if (!sandboxPair[0] || !sandboxPair[1]) {
    fb.innerText = "⚠️ กรุณาลากวางคำใส่ช่องทดให้ครบทั้ง 2 ช่องก่อนกดทดสอบจับคู่ครับ";
    fb.className = "text-xs text-amber-400 block font-medium";
    return;
  }

  const word1 = sandboxPair[0].text;
  const word2 = sandboxPair[1].text;
  const isValid = validateChunkPair(word1, word2, currentQuestion.valid_chunks);

  if (isValid) {
    const mergedText = `${word1} ${word2}`;
    fb.innerHTML = `🟢 <b>ถูกต้อง!</b> "${mergedText}" เป็นคู่กลุ่มคำ (Valid Chunk) ที่ถูกต้อง`;
    fb.className = "text-xs text-emerald-400 block font-medium animate-fade-in";

    sandboxPair[0].el.remove();
    sandboxPair[1].el.remove();

    const poolEl = document.getElementById('word-pool');
    const mergedTile = createTileElement(mergedText, `merged_${Date.now()}`);
    mergedTile.classList.add('border-emerald-400', 'bg-emerald-950/60', 'text-emerald-200');
    poolEl.appendChild(mergedTile);

    sandboxPair = [null, null];
    updateSandboxUI();

  } else {
    fb.innerHTML = `🔴 <b>ยังไม่ถูกต้อง:</b> "${word1} ${word2}" ไม่ใช่คู่คำในประโยคนี้ ลองจับคู่อื่นดูครับ`;
    fb.className = "text-xs text-rose-400 block font-medium animate-shake";
  }
}

// ตรวจประโยคสุดท้าย
function checkFinalSentence() {
  const userWords = selectedInAnswer.map(item => item.text);
  const result = validateFinalSentence(userWords, currentQuestion.correct_sentence);

  const expBox = document.getElementById('explanation-box');
  const expContent = document.getElementById('explanation-content');

  if (result.isEmpty) {
    alert("กรุณาเลือกคำศัพท์ขึ้นมาเรียงเป็นประโยคก่อนตรวจคำตอบครับ!");
    return;
  }

  expBox.classList.remove('hidden');

  if (result.isCorrect) {
    expContent.innerHTML = `
      <div class="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-semibold mb-2">
        🎉 ถูกต้องยอดเยี่ยม! ประโยคของคุณสมบูรณ์ตามหลักไวยากรณ์แล้ว
      </div>
      <p><b>ประโยคที่ถูกต้อง:</b> <span class="font-mono text-purple-200">${result.targetSentence}</span></p>
      <p class="mt-1"><b>วิเคราะห์โครงสร้างภาษา:</b> ${currentQuestion.explanation}</p>
    `;
  } else {
    expContent.innerHTML = `
      <div class="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 font-semibold mb-2">
        ❌ ยังไม่ถูกต้อง ลองตรวจสอบการเรียงลำดับคำอีกครั้งนะครับ
      </div>
      <p><b>ประโยคของคุณ:</b> <span class="font-mono text-gray-400">${result.userSentence}</span></p>
      <p class="mt-1"><b>เฉลยประโยคที่ถูกต้อง:</b> <span class="font-mono text-emerald-300">${result.targetSentence}</span></p>
      <p class="mt-1"><b>คำอธิบาย:</b> ${currentQuestion.explanation}</p>
    `;
  }
}

// รีเซ็ตข้อปัจจุบัน
function resetCurrentQuestion() {
  selectedInAnswer = [];
  document.getElementById('explanation-box').classList.add('hidden');
  clearSandbox();

  renderWordPool(currentQuestion.shuffledWords);
  renderAnswerZone();
}