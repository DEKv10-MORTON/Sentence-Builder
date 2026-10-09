// ฟังก์ชันกลางสำหรับทำความสะอาดข้อความ (ตัดเครื่องหมายวรรคตอน + ช่องว่างส่วนเกินออกทั้งหมด)
function cleanTextForComparison(str) {
  if (!str) return '';
  return str
    .replace(/[.,?!;:"]/g, '') // ตัดเครื่องหมายวรรคตอนออกทั้งหมด
    .replace(/\s+/g, ' ')      // ยุบ space ที่เกินให้เหลือช่องเดียว
    .trim()
    .toLowerCase();
}

// ตรวจสอบคู่คำใน Sandbox (รองรับทุก Level: ม.ต้น -> IELTS)
function validateChunkPair(word1, word2, validChunks) {
  if (!word1 || !word2 || !validChunks) return false;

  const w1 = cleanTextForComparison(word1);
  const w2 = cleanTextForComparison(word2);

  return validChunks.some(chunk => {
    if (!chunk || chunk.length < 2) return false;
    const c1 = cleanTextForComparison(chunk[0]);
    const c2 = cleanTextForComparison(chunk[1]);
    return (c1 === w1 && c2 === w2);
  });
}

// ตรวจสอบประโยคสุดท้าย (รองรับทุก Level: ม.ต้น -> IELTS)
function validateFinalSentence(userWordsArray, correctSentence) {
  if (!userWordsArray || userWordsArray.length === 0) {
    return { isCorrect: false, isEmpty: true };
  }

  const userSentence = userWordsArray.join(' ').trim();
  const targetSentence = correctSentence.trim();

  const cleanUser = cleanTextForComparison(userSentence);
  const cleanTarget = cleanTextForComparison(targetSentence);

  return {
    isCorrect: cleanUser === cleanTarget,
    userSentence: userSentence,
    targetSentence: targetSentence,
    isEmpty: false
  };
}