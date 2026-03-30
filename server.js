const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// 🔥 1. استيراد مكتبة الأدمن (God Mode) 🔥
const admin = require("firebase-admin");

// 🚨 2. قراءة المفتاح السري بذكاء وأمان 🚨
let serviceAccount;

console.log("🔍 Available ENV Variables:", Object.keys(process.env));

if (process.env.FIREBASE_CREDENTIALS) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    console.log("✅ Loaded Firebase Credentials from Railway Variables");
  } catch (err) {
    console.error("❌ Error parsing FIREBASE_CREDENTIALS in Railway:", err);
  }
} else {
  try {
    serviceAccount = require("./serviceAccountKey.json");
    console.log("✅ Loaded Firebase Credentials from local JSON file");
  } catch (err) {
    console.error("❌ Local serviceAccountKey.json not found!");
  }
}

// 🔥 3. تهيئة فايربيز بشكل آمن 🔥
let db = null;
if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log("🔥 Firebase Admin Initialized Successfully!");
} else {
  console.error("🚨 CRITICAL: Firebase Admin failed to initialize. Server will run without DB cleanup.");
}

const app = express();
app.use(cors()); 

app.get('/', (req, res) => {
  res.send('🍪 Biscuits Server is Alive and Kicking! 🚀');
});

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const roomStrokes = {}; 
const wwRooms = {}; 
const ccRooms = {}; 
const bcRooms = {}; 

const socketUsers = {}; 
const disconnectTimers = {}; 

const countriesDB = [
  "اثيوبيا", "اذربيجان", "الارجنتين", "الاردن", "ارمينيا", "اريتريا", "اسبانيا", "استراليا", "استونيا", 
  "افغانستان", "الاكوادور", "البانيا", "المانيا", "الامارات", "امريكا", "الولايات المتحدة", "انتيغوا وباربودا", 
  "اندورا", "اندونيسيا", "انغولا", "اوروغواي", "اوزبكستان", "اوغندا", "اوكرانيا", "ايران", "ايرلندا", 
  "ايسلندا", "ايطاليا", "باكستان", "بالاو", "البحرين", "البرازيل", "بربادوس", "البرتغال", "بروناي", "بريطانيا", "انجلترا", 
  "بلجيكا", "بلغاريا", "بليز", "بنغلاديش", "بنما", "بنين", "بوتان", "بوتسوانا", "بوركينا فاسو", 
  "بوروندي", "البوسنة والهرسك", "بولندا", "بوليفيا", "بيرو", "بيلاروسيا", "تايوان", "تايلاند", 
  "تركمانستان", "تركيا", "ترينيداد وتوباغو", "تشاد", "التشيك", "تشيلي", "تنزانيا", "توجو", "تونس", 
  "توفالو", "تونغا", "تيمور الشرقية", "جامايكا", "الجزائر", "جزر البهاما", "جزر القمر", "جزر المالديف", "جزر سليمان", "جزر مارشال", 
  "جنوب إفريقيا", "جنوب السودان", "جورجيا", "جيبوتي", "الدنمارك", "دومينيكا", "الدومينيكان", 
  "رواندا", "روسيا", "رومانيا", "زامبيا", "زيمبابوي", "ساحل العاج", "ساموا", "سان مارينو", "سانت فنسنت", "سانت كيتس", "سانت لوسيا", "ساو تومي", 
  "سريلانكا", "السعودية", "السلفادور", "سلوفاكيا", "سلوفينيا", "سنغافورة", "السنغال", "سوريا", 
  "سورينام", "السويد", "سويسرا", "سيراليون", "سيشل", "السودان", "صربيا", "الصومال", "الصين", 
  "طاجيكستان", "العراق", "عمان", "الغابون", "غامبيا", "غانا", "غرينادا", "غواتيمالا", "غيانا", 
  "غينيا", "غينيا الاستوائية", "غينيا بيساو", "فاتيكان", "فانواتو", "فرنسا", "الفلبين", "فلسطين", "فنزويلا", "فنلندا", "فيتنام", "فيجي", 
  "قبرص", "قطر", "قيرغيزستان", "كازاخستان", "الكاميرون", "كرواتيا", "كمبوديا", "كندا", "كوبا", 
  "كوريا الجنوبية", "كوريا الشمالية", "كوستاريكا", "كوسوفو", "كولومبيا", "الكونغو", "الكويت", 
  "كيريباتي", "كينيا", "لاتفيا", "لاوس", "لبنان", "لوكسمبورغ", "ليبيا", "ليبيريا", "ليتوانيا", 
  "ليختنشتاين", "ليسوتو", "مالاوي", "مالطا", "مالي", "ماليزيا", "المجر", "مدغشقر", "مصر", "المغرب", "مقدونيا", "المكسيك", 
  "موريتانيا", "موريشيوس", "موزمبيق", "مولدوفا", "موناكو", "مونتينيغرو", "ميانمار", "ميكرونيزيا", 
  "ناميبيا", "ناورو", "النرويج", "النمسا", "نيبال", "النيجر", "نيجيريا", "نيكاراغوا", "نيوزيلندا", 
  "هايتي", "الهند", "هندوراس", "هولندا", "اليابان", "اليمن", "اليونان"
];

const BISCUIT_WORDS = [
  "شبكة", "عيش", "عجلة", "حساب", "رصيد", "نور", "عين", "شاحن", "بحر", "مطب",
  "جزر", "جبنة", "كيك", "حلة", "ديك", "دور", "سلك", "شريط", "حكم", "محطة",
  "كورة", "ضربة", "حجز", "وصل", "فرقة", "بطل", "سلطة", "ورقة", "شمسية", "قوس",
  "مقص", "كوبري", "طاولة", "مسطرة", "ملف", "كارت", "قضية", "محضر", "ختم", "بصمة",
  "فاتورة", "روشتة", "وصلة", "فيشة", "رخصة", "تصريح", "شهادة", "نتيجة", "هدف", "نقطة",
  "كشري", "طعمية", "ملوخية", "محشي", "حواوشي", "بسبوسة", "مانجة", "شاي", "قهوة", "لب",
  "كوارع", "ممبار", "فول", "بطيخ", "قصب", "سحلب", "تمر", "كنافة", "عرقسوس", "كبده",
  "طحينة", "شاورما", "باتيه", "بقسماط", "قرص", "لبن", "زبادي", "عسل", "كفتة", "حمص",
  "بصل", "توم", "فلفل", "شطة", "كمون", "خل", "زيت", "زبدة", "سمنة", "قشطة",
  "رنجة", "فسيخ", "تونة", "جمبري", "سبيط", "مكرونة", "رز", "فينو", "كريب", "وافل",
  "توكتوك", "ميكروباص", "كشك", "رصيف", "إشارة", "يافطة", "موقف", "كمين", "نفق",
  "تاكسي", "مترو", "قطر", "تذكرة", "أجرة", "موتوسيكل", "فيسبا", "مزلقان", "ناصية", "حارة",
  "ميدان", "قهوة", "كافيه", "مطعم", "محل", "سوبرماركت", "مول", "سينما", "مسرح", "ملاهي",
  "جنينة", "شط", "شمسية", "بنزينة", "جراج", "مستشفى", "صيدلية", "بنك", "بوسطة", "قسم", "نادي",
  "شبشب", "غسالة", "ريموت", "مشترك", "تلاجة", "مروحة", "بوتاجاز", "سجادة", "بلكونة",
  "شباك", "باب", "سرير", "كنبة", "دولاب", "مخدة", "بطانية", "حنفية", "دش", "جردل",
  "طفاية", "ولاعة", "شمعة", "لمبة", "نجفة", "مشاية", "ستاير", "مرتبة", "لحاف", "ملاية",
  "فوطة", "صابونة", "ليفة", "شامبو", "معجون", "فرشة", "مشط", "مقص", "قصافة", "إبرة",
  "خيط", "زرار", "سوستة", "مكواة", "طبلية", "صينية", "كوباية", "مج", "طبق", "معلقة",
  "قميص", "تيشيرت", "بنطلون", "شورت", "جيبة", "فستان", "عباية", "طرحة", "جلابية", "بيجامة",
  "شراب", "جزمة", "كوتشي", "صندل", "حزام", "كرافتة", "طاقية", "كاب", "كوفية", "جوانتي",
  "نضارة", "ساعة", "حظاظة", "خاتم", "دبلة", "سلسلة", "حلق", "غويشة", "محفظة", "شنطة",
  "عريس", "عروسة", "حماة", "بواب", "سواق", "تباع", "عمدة", "صنايعي", "دكتور", "ظابط",
  "محامي", "مدرس", "حلاق", "مكواجي", "سباك", "كهربائي", "نجار", "بياع", "زبون", "جار",
  "قاضي", "عسكري", "حرامي", "بلطجي", "شيخ", "سايس", "كمسري", "جزار", "بقال", "خباز",
  "ترزي", "نقاش", "ميكانيكي", "طيار", "قبطان", "بحار", "غواص", "فرح", "عزاء", "عيدية",
  "أسد", "قطة", "كلب", "حمار", "حصان", "فرخة", "ديب", "فار", "تمساح", "قرد",
  "غزالة", "حمامة", "غراب", "نسر", "عصفورة", "بقرة", "جاموسة", "خروف", "معزة", "جمل",
  "قمر", "نجوم", "سما", "سحاب", "مطر", "هوا", "تراب", "طينة", "رملة", "زلط",
  "صخرة", "جبل", "بحر", "نهر", "ترعة", "جزيرة", "شجرة", "وردة", "نخلة", "صحرا",
  "موبايل", "سماعة", "مايك", "شاشة", "كيبورد", "ماوس", "لابتوب", "كمبيوتر", "تابلت", "راوتر",
  "باقة", "فلاشة", "ميموري", "كاميرا", "عدسة", "بطارية", "حجارة", "لعب", "كوتشينة", "دومينو"
];

// 🔥 التعديل: أسئلة Word War تم نقلها للسيرفر 🔥
const WW_PROMPTS = [
  "أكلة بحرف الميم", "حاجة بنلبسها في الشتا", "اسم حيوان بيطير", 
  "ماركة عربيات مشهورة", "دولة أوروبية", "حاجة موجودة في المطبخ",
  "اسم فيلم مصري كوميدي", "حاجة بتتباع في السوبر ماركت", "مهنة بحرف النون",
  "حاجة بتعملها أول ما تصحى من النوم", "كلمة سر مصرية شهيرة",
  "أكلة شعبية مصرية", "حاجة بتخاف منها", "اسم مسلسل رمضاني قديم",
  "حاجة بتلاقيها في جيبك دايماً", "أكتر حاجة بتضيع منك", "مكان تتمنى تسافره",
  "حاجة بتشتريها من الكشك", "اسم فاكهة بحرف الباء", "حاجة بتستخدمها في الحمام",
  "كلمة بتطنش بيها حد بيكلمك", "لون من ألوان الطيف", "حاجة بتتعمل في الأفراح المصرية",
  "شخصية كرتونية مشهورة", "لعبة كنا بنلعبها وإحنا صغيرين", "عذر مصري أصيل للتأخير",
  "حاجة مستحيل تستغنى عنها في يومك", "أكلة بتتاكل في العيد", "حاجة بنشوفها في الشارع المصري كتير"
];

const getRandomWWPrompt = () => WW_PROMPTS[Math.floor(Math.random() * WW_PROMPTS.length)];

// 🛑 4. نظام الحماية وفلتر الكلمات المسيئة (Profanity Filter) 🛑
// تقدر تزود الكلمات اللي إنت عايزها هنا
const BAD_WORDS = [
  // 🔴 الشتائم العربية والمصرية 🔴
  "شرموط", "شرموطة", "متناك", "متناكة", "خول", "علق", "عرص", "معرص", "وسخ", "وسخة", "لبوة", 
  "قحبة", "مومس", "عاهرة", "زاني", "زانية", "زنا", "شاذ", "ديوث", "مأبون", "ابن الكلب",
  "كس", "كسم", "كسمك", "كسك", "كئئئم", "كسمين", "كاسام",
  "زب", "زبي", "زبر", "زبرك", "بز", "بزاز", "بزازك", "طيز", "طيزك",
  "نيك", "نيكة", "منيوك", "منيوكة", "هنيكك", "بيتناك", "بعبص", "بعبصة", "مزه", "مزة",
  
  // 🔴 تعبيرات واختصارات دارجة 🔴
  "احا", "اححا", "أحا", "خخخ", "خخ", "خخخخ", "خخخخخ", "تف"،
  
  // 🔴 الفرانكو (Franco) 🔴
  "kos", "ksm", "ksmk", "kosom", "kosomak", "kosmk", "kosem", 
  "a7a", "a77a", "ah7a", "aha",
  "5wl", "5wal", "5awal", "khawal", 
  "3ars", "m3rs", "me3rs", "m3ras", "ars",
  "sharmout", "sharmouta", "sharmuta",
  "metnak", "mtnak", "metnaka", "mtnaka",
  "zeb", "zeby", "zib", "ziby", 
  "nyak", "nayak", "manyouk", "mnywk",

  // 🔴 الشتائم الإنجليزية 🔴
  "fuck", "fucking", "fucker", "motherfucker", "mf", "stfu",
  "bitch", "bitches", "whore", "slut", "hoe", "cunt", 
  "dick", "cock", "pussy", "vagina", "boobs", "tits", 
  "ass", "asshole", "dumbass", "bastard", 
  "shit", "bullshit", "crap",
  "faggot", "fag", "dyke", 
  "nigger", "nigga", "nigg",
  "porn", "sex", "nude", "nudes"
];
function sanitizeText(text) {
  if (!text) return text;
  let sanitized = text;
  
  BAD_WORDS.forEach(word => {
    // السطر ده بيحول الكلمة لـ Regex بيصطاد تكرار الحروف
    // يعني لو الكلمة "احا" هيصطاد "احححا" و "اححححححححا"
    const regexPattern = word.split('').join('+') + '+';
    const regex = new RegExp(regexPattern, "gi"); 
    sanitized = sanitized.replace(regex, "***");
  });
  
  return sanitized;
}
function getNextAlivePlayerIndex(playersList, currentIndex) {
  let nextIndex = (currentIndex + 1) % playersList.length;
  let loops = 0;
  while (playersList[nextIndex].strikes >= 3 && loops < playersList.length) {
    nextIndex = (nextIndex + 1) % playersList.length;
    loops++;
  }
  return nextIndex;
}

function checkWinCondition(room) {
  const alivePlayers = Object.values(room.players).filter(p => p.strikes < 3);
  if (alivePlayers.length === 1) {
    room.status = 'final-result';
    room.winner = alivePlayers[0];
  }
}

// 🔥 Host Migration في الفايربيز 🔥
async function cleanupFirebaseRoom(roomId, uid) {
  if (!db) {
    console.warn(`⚠️ Skipping Firebase cleanup for room ${roomId} (DB not initialized)`);
    return;
  }
  try {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    
    if (roomSnap.exists) {
      const roomData = roomSnap.data();
      const players = roomData.players || {};
      
      if (players[uid]) {
        delete players[uid];
      }

      const remainingPlayers = Object.keys(players);

      if (remainingPlayers.length === 0) {
        await roomRef.delete();
        console.log(`🧹 [CLEANUP] Deleted empty ghost room from Firebase: ${roomId}`);
      } else {
        let updates = {
          [`players.${uid}`]: admin.firestore.FieldValue.delete()
        };

        if (roomData.hostId === uid) {
          const newHostId = remainingPlayers[0];
          updates['hostId'] = newHostId;
          console.log(`👑 [HOST MIGRATION] Transferred host from ${uid} to ${newHostId} in room ${roomId}`);
        }

        await roomRef.update(updates);
        console.log(`🧹 [CLEANUP] Removed ghost player ${uid} from room ${roomId}`);
      }
    }
  } catch (error) {
    console.error("❌ Firebase Cleanup Error:", error);
  }
}

io.on('connection', (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

// ==========================================
  // 🤡 نظام التحفيل والرياكشنات (Global Reactions)
  // ==========================================
  socket.on('send_reaction', ({ roomId, emoji }) => {
    // 🔥 نجيب الـ UID الحقيقي بتاع اللاعب من السيرفر بدل الـ Socket ID 🔥
    const user = socketUsers[socket.id];
    const realUid = user ? user.uid : socket.id;
    
    io.to(roomId).emit('receive_reaction', { emoji, uid: realUid });
  });
  // ==========================================
  // 🚩 نظام الإبلاغ عن اللاعبين (Reporting System) 🚩
  // ==========================================
  socket.on('report_user', async ({ roomId, reportedUid, reporterUid, reportedName, reason }) => {
    console.log(`🚩 [REPORT] User ${reporterUid} reported ${reportedName} (${reportedUid}) in room ${roomId}. Reason: ${reason}`);
    
    // تسجيل البلاغ في قاعدة بيانات فايربيز للإثبات أمام جوجل بلاي
    if (db) {
      try {
        await db.collection('reports').add({
          roomId,
          reportedUid,
          reporterUid,
          reportedName,
          reason: reason || 'Inappropriate behavior/content',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ [REPORT] Saved to Firebase successfully.`);
      } catch (err) {
        console.error(`❌ [REPORT] Failed to save to Firebase:`, err);
      }
    }
  });

  // ==========================================
  // 🎨 لعبة ارسم وخمن
  // ==========================================
  socket.on('join_room', ({ roomId, uid }) => { 
    socket.join(roomId); 
    if (uid) {
      socketUsers[socket.id] = { roomId, uid, gameType: 'graffiti' };
      if (disconnectTimers[uid]) { 
        clearTimeout(disconnectTimers[uid]); 
        delete disconnectTimers[uid]; 
        io.to(roomId).emit('player_online', { uid });
      }
    }
    if (roomStrokes[roomId]) socket.emit('load_board', roomStrokes[roomId]); 
  });
  socket.on('draw_line', (data) => { if (!data || !data.tool) return; if (!roomStrokes[data.roomId]) roomStrokes[data.roomId] = []; roomStrokes[data.roomId].push(data); socket.to(data.roomId).emit('draw_line', data); });
  socket.on('clear_board', (roomId) => { roomStrokes[roomId] = []; socket.to(roomId).emit('clear_board'); });

  // ==========================================
  // ⚔️ لعبة الكلمة المختلفة (Word War)
  // ==========================================
  socket.on('ww_join', ({ roomId, uid, roomData }) => { 
    socket.join(roomId); 
    if (uid) {
      socketUsers[socket.id] = { roomId, uid, gameType: 'ww' };
      if (disconnectTimers[uid]) { 
        clearTimeout(disconnectTimers[uid]); 
        delete disconnectTimers[uid]; 
        io.to(roomId).emit('player_online', { uid }); 
      }
    }
    if (!wwRooms[roomId]) wwRooms[roomId] = { ...roomData, currentRound: 1, currentPrompt: '' }; 
    else wwRooms[roomId].players = { ...wwRooms[roomId].players, ...roomData.players }; 
    io.to(roomId).emit('ww_state', wwRooms[roomId]); 
  });
  
  // 👇 السيرفر يختار السؤال عند البداية 👇
  socket.on('ww_start', ({ roomId }) => { 
    let room = wwRooms[roomId]; 
    if (room) { 
      room.status = 'writing'; 
      room.currentPrompt = getRandomWWPrompt(); 
      Object.values(room.players).forEach(p => { p.isReady = false; p.currentWord = ''; p.wordStatus = 'pending'; p.roundScore = 0; }); 
      io.to(roomId).emit('ww_state', room); 
    } 
  });

  socket.on('ww_submit', ({ roomId, uid, word }) => {
    let room = wwRooms[roomId];
    if (room && room.players[uid]) {
      // 🛡️ تطبيق الفلتر على الكلمة المدخلة 🛡️
      room.players[uid].currentWord = sanitizeText(word);
      room.players[uid].isReady = true;
      
      const players = Object.values(room.players);
      const isEveryoneReady = players.every(p => p.isReady) && players.length > 1;

      if (isEveryoneReady) {
        room.status = 'clash';
        io.to(roomId).emit('ww_state', room);
      } else {
        io.to(roomId).emit('ww_player_ready', { uid });
      }
    }
  });

  socket.on('ww_time_up', (roomId) => { let room = wwRooms[roomId]; if (room && room.status === 'writing') { room.status = 'clash'; io.to(roomId).emit('ww_state', room); } });
  socket.on('ww_judge_word', ({ roomId, targetUid, status }) => { let room = wwRooms[roomId]; if (room && room.players[targetUid]) { room.players[targetUid].wordStatus = status; room.players[targetUid].roundScore = (status === 'accepted') ? 1 : 0; io.to(roomId).emit('ww_state', room); } });
  
  // 👇 السيرفر يختار سؤال جديد للجولة الجديدة 👇
  socket.on('ww_next_round', ({ roomId }) => { 
    let room = wwRooms[roomId]; 
    if (room) { 
      Object.values(room.players).forEach(p => { p.score = (p.score || 0) + (p.roundScore || 0); }); 
      if (room.currentRound >= room.totalRounds) { 
        room.status = 'final-result'; 
      } else { 
        room.currentRound += 1; 
        room.status = 'writing'; 
        room.currentPrompt = getRandomWWPrompt(); 
        Object.values(room.players).forEach(p => { p.isReady = false; p.currentWord = ''; p.wordStatus = 'pending'; p.roundScore = 0; }); 
      } 
      io.to(roomId).emit('ww_state', room); 
    } 
  });

  socket.on('ww_kick_player', ({ roomId, targetUid }) => { let room = wwRooms[roomId]; if (room && room.players[targetUid]) { delete room.players[targetUid]; io.to(roomId).emit('ww_state', room); } });
  
  socket.on('ww_play_again', (roomId) => {
    let room = wwRooms[roomId];
    if (room) {
      room.status = 'lobby';
      room.currentRound = 1;
      Object.values(room.players).forEach(p => {
        p.score = 0; p.roundScore = 0; p.isReady = false; p.currentWord = ''; p.wordStatus = 'pending';
      });
      io.to(roomId).emit('ww_state', room);
    }
  });

  socket.on('ww_leave', ({ roomId, uid }) => {
    let room = wwRooms[roomId];
    if (room && room.players[uid]) {
      delete room.players[uid];
      const remainingUids = Object.keys(room.players);
      if (remainingUids.length === 0) delete wwRooms[roomId];
      else { if (room.hostId === uid) room.hostId = remainingUids[0]; io.to(roomId).emit('ww_state', room); }
    }
  });

  // ==========================================
  // 🌍 لعبة سلسلة الدول (Country Chain)
  // ==========================================
  socket.on('cc_join', ({ roomId, uid, roomData }) => {
    socket.join(roomId);
    if (uid) {
        socketUsers[socket.id] = { roomId, uid, gameType: 'cc' }; 
        if (disconnectTimers[uid]) { 
          clearTimeout(disconnectTimers[uid]); 
          delete disconnectTimers[uid]; 
          io.to(roomId).emit('player_online', { uid });
        }
    }
    if (!ccRooms[roomId]) {
      ccRooms[roomId] = { ...roomData, currentWord: '', lastLetter: '', turnIndex: 0, status: 'lobby' };
      Object.values(ccRooms[roomId].players).forEach(p => p.strikes = 0);
    } else { ccRooms[roomId].players = { ...ccRooms[roomId].players, ...roomData.players }; }
    io.to(roomId).emit('cc_state', ccRooms[roomId]);
  });

  socket.on('cc_start', (roomId) => { let room = ccRooms[roomId]; if (room) { room.status = 'playing'; room.currentWord = ''; room.lastLetter = ''; room.turnIndex = 0; io.to(roomId).emit('cc_state', room); } });
  socket.on('cc_submit_letter', ({ roomId, uid, letter }) => { let room = ccRooms[roomId]; if (!room || room.status !== 'playing') return; room.currentWord += letter; room.lastLetter = letter; room.lastPlayerUid = uid; if (countriesDB.includes(room.currentWord)) { room.status = 'round_end'; room.roundResult = { reason: 'completed', word: room.currentWord, message: `تم تجميع كلمة (${room.currentWord})!` }; const playersList = Object.values(room.players).sort((a, b) => a.uid.localeCompare(b.uid)); const nextIndex = getNextAlivePlayerIndex(playersList, room.turnIndex); const trappedPlayer = playersList[nextIndex]; trappedPlayer.strikes += 1; room.roundResult.victim = trappedPlayer.name; checkWinCondition(room); } else { const playersList = Object.values(room.players).sort((a, b) => a.uid.localeCompare(b.uid)); room.turnIndex = getNextAlivePlayerIndex(playersList, room.turnIndex); } io.to(roomId).emit('cc_state', room); });
  socket.on('cc_timeout', ({ roomId, currentUid }) => { let room = ccRooms[roomId]; if (!room || room.status !== 'playing') return; if (room.players[currentUid]) { room.players[currentUid].strikes += 1; room.status = 'round_end'; room.roundResult = { reason: 'timeout', word: room.currentWord || 'مفيش', message: 'الوقت خلص!', victim: room.players[currentUid].name }; checkWinCondition(room); io.to(roomId).emit('cc_state', room); } });
  socket.on('cc_challenge', ({ roomId, challengerUid }) => { let room = ccRooms[roomId]; if (!room) return; room.status = 'challenged'; room.challengerUid = challengerUid; room.accusedUid = room.lastPlayerUid; io.to(roomId).emit('cc_state', room); });
  
  socket.on('cc_declare_word', ({ roomId, declaredWord }) => { 
    let room = ccRooms[roomId]; 
    if (!room) return; 
    // 🛡️ تطبيق الفلتر على الكلمة المدخلة 🛡️
    room.declaredWord = sanitizeText(declaredWord); 
    if (room.hostId === room.accusedUid) { room.status = 'voting'; room.votes = { yes: 0, no: 0 }; } 
    else { room.status = 'judging'; } 
    io.to(roomId).emit('cc_state', room); 
  });

  socket.on('cc_judge', ({ roomId, isRealWord }) => { let room = ccRooms[roomId]; if (!room) return; room.status = 'round_end'; if (isRealWord) { room.players[room.challengerUid].strikes += 1; room.roundResult = { reason: 'challenge_failed', word: room.declaredWord, message: 'الكلمة طلعت بجد!', victim: room.players[room.challengerUid].name }; } else { room.players[room.accusedUid].strikes += 1; room.roundResult = { reason: 'challenge_success', word: room.declaredWord, message: 'المتهم كان بيهبد!', victim: room.players[room.accusedUid].name }; } checkWinCondition(room); io.to(roomId).emit('cc_state', room); });
  socket.on('cc_vote', ({ roomId, vote }) => { let room = ccRooms[roomId]; if (!room) return; room.votes[vote] += 1; const alivePlayersCount = Object.values(room.players).filter(p => p.strikes < 3).length; if (room.votes.yes + room.votes.no >= alivePlayersCount - 1) { const isRealWord = room.votes.yes > room.votes.no; room.status = 'round_end'; if (isRealWord) { room.players[room.challengerUid].strikes += 1; room.roundResult = { reason: 'vote_failed', word: room.declaredWord, message: 'الأغلبية صدقت المتهم!', victim: room.players[room.challengerUid].name }; } else { room.players[room.accusedUid].strikes += 1; room.roundResult = { reason: 'vote_success', word: room.declaredWord, message: 'الأغلبية كدبت المتهم!', victim: room.players[room.accusedUid].name }; } checkWinCondition(room); } io.to(roomId).emit('cc_state', room); });
  socket.on('cc_next_round', (roomId) => { let room = ccRooms[roomId]; if (room && room.status !== 'final-result') { room.status = 'playing'; room.currentWord = ''; room.lastLetter = ''; const playersList = Object.values(room.players).sort((a, b) => a.uid.localeCompare(b.uid)); let victimIndex = playersList.findIndex(p => p.name === room.roundResult?.victim); if (victimIndex === -1 || playersList[victimIndex].strikes >= 3) { victimIndex = getNextAlivePlayerIndex(playersList, room.turnIndex); } room.turnIndex = victimIndex; io.to(roomId).emit('cc_state', room); } });
  socket.on('cc_kick_player', ({ roomId, targetUid }) => { let room = ccRooms[roomId]; if (room && room.players[targetUid]) { delete room.players[targetUid]; io.to(roomId).emit('cc_state', room); } });
  
  socket.on('cc_play_again', (roomId) => {
    let room = ccRooms[roomId];
    if (room) {
      room.status = 'lobby';
      room.currentWord = ''; room.lastLetter = ''; room.turnIndex = 0;
      room.winner = null; room.roundResult = null;
      Object.values(room.players).forEach(p => p.strikes = 0);
      io.to(roomId).emit('cc_state', room);
    }
  });

  socket.on('cc_leave', ({ roomId, uid }) => {
    let room = ccRooms[roomId];
    if (room && room.players[uid]) {
      if (room.status === 'lobby') {
        delete room.players[uid];
        const remainingUids = Object.keys(room.players);
        if (remainingUids.length === 0) { delete ccRooms[roomId]; return; } 
        else if (room.hostId === uid) { room.hostId = remainingUids[0]; }
      } else {
        room.players[uid].strikes = 3;
        if (room.hostId === uid) {
          const alivePlayers = Object.values(room.players).filter(p => p.strikes < 3 && p.uid !== uid);
          if (alivePlayers.length > 0) room.hostId = alivePlayers[0].uid;
        }
        if (room.status === 'playing') {
          const playersList = Object.values(room.players).sort((a, b) => a.uid.localeCompare(b.uid));
          if (playersList[room.turnIndex]?.uid === uid) {
            room.turnIndex = getNextAlivePlayerIndex(playersList, room.turnIndex);
          }
        }
        checkWinCondition(room);
      }
      io.to(roomId).emit('cc_state', room);
    }
  });

  // ==========================================
  // 🍪 لعبة شفرة البسكوت (Biscuit Code)
  // ==========================================
  
  socket.on('bc_join', ({ roomId, uid, roomData }) => {
    socket.join(roomId);
    if (uid) {
      socketUsers[socket.id] = { roomId, uid, gameType: 'bc' };
      if (disconnectTimers[uid]) { 
        clearTimeout(disconnectTimers[uid]); 
        delete disconnectTimers[uid]; 
        io.to(roomId).emit('player_online', { uid }); 
      }
    }
    
    if (!bcRooms[roomId]) {
      bcRooms[roomId] = { ...roomData, status: 'lobby' };
    } else {
      const mergedPlayers = { ...roomData.players };
      Object.keys(bcRooms[roomId].players).forEach(pUid => {
        if (mergedPlayers[pUid]) {
          mergedPlayers[pUid].team = bcRooms[roomId].players[pUid].team;
          mergedPlayers[pUid].role = bcRooms[roomId].players[pUid].role;
        }
      });
      bcRooms[roomId].players = mergedPlayers;
    }
    
    io.to(roomId).emit('bc_state', bcRooms[roomId]);
  });

  socket.on('bc_selectRole', ({ roomId, uid, team, role }) => {
    const room = bcRooms[roomId];
    if (room && room.players[uid]) {
      if (role === 'chef') {
        Object.values(room.players).forEach(p => {
          if (p.team === team && p.role === 'chef' && p.uid !== uid) {
            p.role = 'taster';
          }
        });
      }
      room.players[uid].team = team;
      room.players[uid].role = role;
      io.to(roomId).emit('bc_state', room);
    }
  });

  socket.on('bc_startGame', ({ roomId }) => {
    const room = bcRooms[roomId];
    if (!room) return;

    let teamA = [];
    let teamB = [];
    let chefA = null;
    let chefB = null;
    let unassigned = [];

    Object.values(room.players).forEach(p => {
      if (p.team === 'teamA') {
        teamA.push(p.uid);
        if (p.role === 'chef') chefA = p.uid;
      } else if (p.team === 'teamB') {
        teamB.push(p.uid);
        if (p.role === 'chef') chefB = p.uid;
      } else {
        unassigned.push(p.uid);
      }
    });

    unassigned.forEach(uid => {
      if (teamA.length <= teamB.length) {
        teamA.push(uid);
        room.players[uid].team = 'teamA';
        room.players[uid].role = 'taster';
      } else {
        teamB.push(uid);
        room.players[uid].team = 'teamB';
        room.players[uid].role = 'taster';
      }
    });

    if (!chefA && teamA.length > 0) {
      chefA = teamA[0];
      room.players[chefA].role = 'chef';
    }
    if (!chefB && teamB.length > 0) {
      chefB = teamB[0];
      room.players[chefB].role = 'chef';
    }

    const types = [
      ...Array(9).fill('teamA'),
      ...Array(8).fill('teamB'),
      ...Array(7).fill('neutral'),
      'burnt'
    ].sort(() => 0.5 - Math.random());
    
    const shuffledWords = [...BISCUIT_WORDS].sort(() => 0.5 - Math.random()).slice(0, 25);
    const cards = shuffledWords.map((word, index) => ({
      id: index, word, type: types[index], isRevealed: false
    }));

    room.biscuitState = {
      cards,
      currentTurn: 'teamA',
      winner: null,
      activeClue: null,
      guessesLeft: 0,
      teamA,
      teamB,
      chefA, 
      chefB,
      teaA: true,
      teaB: true
    };
    room.status = 'playing';

    io.to(roomId).emit('bc_state', room);
  });

  socket.on('bc_sendClue', ({ roomId, word, count, uid }) => {
    const room = bcRooms[roomId];
    if (!room || !room.biscuitState) return;
    
    const state = room.biscuitState;
    if ((state.currentTurn === 'teamA' && uid === state.chefA) || 
        (state.currentTurn === 'teamB' && uid === state.chefB)) {
      // 🛡️ تطبيق الفلتر على التلميح المدخل 🛡️
      state.activeClue = { word: sanitizeText(word), count };
      state.guessesLeft = count + 1;
      io.to(roomId).emit('bc_state', room);
    }
  });

  socket.on('bc_armTea', ({ roomId, team }) => {
    io.to(roomId).emit('bc_teaArmed', { team });
  });

  socket.on('bc_revealCard', ({ roomId, cardId, uid, useTea }) => {
    const room = bcRooms[roomId];
    if (!room || !room.biscuitState) return;
    const state = room.biscuitState;

    if (state.winner || !state.activeClue) return;

    const isTeamA = state.teamA.includes(uid);
    const isTeamB = state.teamB.includes(uid);
    
    // 🔥 الحماية ضد تخمين الشيف 🔥
    const teamA_Count = state.teamA.length;
    const teamB_Count = state.teamB.length;

    if (uid === state.chefA && teamA_Count > 1) return;
    if (uid === state.chefB && teamB_Count > 1) return;

    if (state.currentTurn === 'teamA' && !isTeamA) return;
    if (state.currentTurn === 'teamB' && !isTeamB) return;

    const card = state.cards.find(c => c.id === cardId);
    if (!card || card.isRevealed) return;

    const myTeam = state.currentTurn;
    const hasTea = myTeam === 'teamA' ? state.teaA : state.teaB;
    const actuallyUsingTea = useTea && hasTea;

    if (actuallyUsingTea) {
      if (myTeam === 'teamA') state.teaA = false;
      if (myTeam === 'teamB') state.teaB = false;
    }

    card.isRevealed = true;

    if (card.type === 'burnt') {
      if (actuallyUsingTea) {
        state.currentTurn = state.currentTurn === 'teamA' ? 'teamB' : 'teamA';
        state.activeClue = null;
        state.guessesLeft = 0;
      } else {
        state.winner = state.currentTurn === 'teamA' ? 'teamB' : 'teamA';
      }
    } else {
      const remA = state.cards.filter(c => c.type === 'teamA' && !c.isRevealed).length;
      const remB = state.cards.filter(c => c.type === 'teamB' && !c.isRevealed).length;
      
      if (remA === 0) state.winner = 'teamA';
      else if (remB === 0) state.winner = 'teamB';
      else {
        if (card.type !== state.currentTurn) {
          state.currentTurn = state.currentTurn === 'teamA' ? 'teamB' : 'teamA';
          state.activeClue = null;
          state.guessesLeft = 0;
        } else {
          state.guessesLeft -= 1;
          if (state.guessesLeft <= 0) {
            state.currentTurn = state.currentTurn === 'teamA' ? 'teamB' : 'teamA';
            state.activeClue = null;
            state.guessesLeft = 0;
          }
        }
      }
    }
    io.to(roomId).emit('bc_state', room);
  });

  socket.on('bc_endTurn', ({ roomId, uid }) => {
    const room = bcRooms[roomId];
    if (!room || !room.biscuitState) return;
    const state = room.biscuitState;
    
    // 🔥 الحماية ضد إنهاء الدور من قبل الشيف 🔥
    const teamA_Count = state.teamA.length;
    const teamB_Count = state.teamB.length;

    if (uid === state.chefA && teamA_Count > 1) return;
    if (uid === state.chefB && teamB_Count > 1) return;

    if (state.currentTurn === 'teamA' && !state.teamA.includes(uid)) return;
    if (state.currentTurn === 'teamB' && !state.teamB.includes(uid)) return;

    state.currentTurn = state.currentTurn === 'teamA' ? 'teamB' : 'teamA';
    state.activeClue = null;
    state.guessesLeft = 0;
    io.to(roomId).emit('bc_state', room);
  });

  socket.on('bc_kick_player', ({ roomId, targetUid }) => {
    let room = bcRooms[roomId];
    if (room && room.players[targetUid]) {
      delete room.players[targetUid];
      io.to(roomId).emit('bc_state', room);
    }
  });

  socket.on('bc_play_again', (roomId) => {
    let room = bcRooms[roomId];
    if (room) {
      room.status = 'lobby';
      room.biscuitState = null;
      
      Object.values(room.players).forEach(p => {
        delete p.team;
        delete p.role;
      });

      io.to(roomId).emit('bc_state', room);
    }
  });

  socket.on('bc_leave', ({ roomId, uid }) => {
    let room = bcRooms[roomId];
    if (room && room.players[uid]) {
      delete room.players[uid];
      const remainingUids = Object.keys(room.players);
      if (remainingUids.length === 0) delete bcRooms[roomId];
      else {
        if (room.hostId === uid) room.hostId = remainingUids[0];
        io.to(roomId).emit('bc_state', room);
      }
    }
  });

  // ==========================================
  // 🔴 معالجة فصل الاتصال (Disconnect Handling & Host Migration)
  // ==========================================
  socket.on('disconnect', () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    const user = socketUsers[socket.id];
    
    if (user) {
      let roomToUpdate = null;
      if (user.gameType === 'cc') roomToUpdate = ccRooms[user.roomId];
      else if (user.gameType === 'ww') roomToUpdate = wwRooms[user.roomId];
      else if (user.gameType === 'bc') roomToUpdate = bcRooms[user.roomId];

      if (roomToUpdate && roomToUpdate.hostId === user.uid) {
        const remainingPlayers = Object.keys(roomToUpdate.players).filter(id => id !== user.uid);
        if (remainingPlayers.length > 0) {
          roomToUpdate.hostId = remainingPlayers[0]; 
          
          if (user.gameType === 'cc') io.to(user.roomId).emit('cc_state', roomToUpdate);
          else if (user.gameType === 'ww') io.to(user.roomId).emit('ww_state', roomToUpdate);
          else if (user.gameType === 'bc') io.to(user.roomId).emit('bc_state', roomToUpdate);
        }
      }

      io.to(user.roomId).emit('player_offline', { uid: user.uid, time: 30 });

      disconnectTimers[user.uid] = setTimeout(() => {
        if (user.gameType === 'cc') {
          let room = ccRooms[user.roomId];
          if (room && room.players[user.uid]) {
            if (room.status === 'lobby') {
              delete room.players[user.uid];
              const remainingUids = Object.keys(room.players);
              if (remainingUids.length === 0) delete ccRooms[user.roomId];
              else if (room.hostId === user.uid) room.hostId = remainingUids[0];
            } else {
              room.players[user.uid].strikes = 3;
              if (room.hostId === user.uid) {
                const alivePlayers = Object.values(room.players).filter(p => p.strikes < 3 && p.uid !== user.uid);
                if (alivePlayers.length > 0) room.hostId = alivePlayers[0].uid;
              }
              if (room.status === 'playing') {
                const playersList = Object.values(room.players).sort((a, b) => a.uid.localeCompare(b.uid));
                if (playersList[room.turnIndex]?.uid === user.uid) {
                  room.turnIndex = getNextAlivePlayerIndex(playersList, room.turnIndex);
                }
              }
              checkWinCondition(room);
            }
            io.to(user.roomId).emit('cc_state', room);
          }
        } 
        else if (user.gameType === 'ww') {
          let room = wwRooms[user.roomId];
          if (room && room.players[user.uid]) {
            delete room.players[user.uid];
            const remainingUids = Object.keys(room.players);
            if (remainingUids.length === 0) delete wwRooms[user.roomId];
            else {
              if (room.hostId === user.uid) room.hostId = remainingUids[0];
              io.to(user.roomId).emit('ww_state', room);
            }
          }
        }
        else if (user.gameType === 'bc') {
          let room = bcRooms[user.roomId];
          if (room && room.players[user.uid]) {
            delete room.players[user.uid];
            const remainingUids = Object.keys(room.players);
            if (remainingUids.length === 0) delete bcRooms[user.roomId];
            else {
              if (room.hostId === user.uid) room.hostId = remainingUids[0];
              io.to(user.roomId).emit('bc_state', room);
            }
          }
        }

        cleanupFirebaseRoom(user.roomId, user.uid);
        delete disconnectTimers[user.uid];
      }, 30000); 
    }
    delete socketUsers[socket.id]; 
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Game Hub Backend is running alive on http://localhost:${PORT}`);
});