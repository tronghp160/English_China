import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TZ = "Asia/Ho_Chi_Minh";
const DAY = 86_400_000;

function studyDay(offset = 0) {
  const shifted = new Date(Date.now() - 4 * 3_600_000 + offset * DAY);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(shifted);
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function findUser(email) {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit || data.users.length < 1000) return hit ?? null;
  }
}

console.log("Looking up demo@example.com...");
const demoUser = await findUser("demo@example.com");
if (!demoUser) {
  console.error("User demo@example.com not found!");
  process.exit(1);
}
const userId = demoUser.id;
console.log("User ID:", userId);

// 1. Seed 35-day streak and XP for Level 14+ (Unlocks all outfits & tricks)
console.log("Seeding daily_stats (35 days streak, 4,500+ XP)...");
const statsRows = [];
for (let offset = -34; offset <= 0; offset++) {
  const day = studyDay(offset);
  const isToday = offset === 0;
  statsRows.push({
    user_id: userId,
    day,
    reviews: isToday ? 25 : 30,
    correct: isToday ? 22 : 26,
    new_learned: isToday ? 5 : 4,
    words_added: 0,
    xp: isToday ? 130 : 130,
    goal_reached: true,
  });
}
await must(sb.from("daily_stats").upsert(statsRows), "daily_stats");

const totalCorrect = statsRows.reduce((acc, r) => acc + r.correct, 0);

// 2. Bones Ledger (Give 888 extra bones)
console.log("Seeding bin_ledger (888 bones)...");
await sb.from("bin_ledger").delete().eq("user_id", userId);
await must(
  sb.from("bin_ledger").insert([
    {
      user_id: userId,
      kind: "trip",
      amount: 888,
      ref: "demo_full_resources_bonus",
      study_day: studyDay(0),
    },
  ]),
  "bin_ledger",
);

// 3. Room items & Inventory
console.log("Seeding bin_items (almost all items owned + 1 streak scarf)...");
await sb.from("bin_items").delete().eq("user_id", userId);
const ownedItemIds = [
  // bowl (leave bowl_gold to test buy in shop)
  "bowl_basic", "bowl_blue", "bowl_bamboo",
  // bed (leave bed_cloud to test buy in shop)
  "bed_none", "bed_cushion", "bed_basket", "bed_royal",
  // wall
  "wall_none", "wall_sun", "wall_bone", "wall_hanzi", "wall_map",
  // toy
  "toy_none", "toy_yarn", "toy_duck", "toy_frisbee", "toy_kite",
  // rug (leave rug_rainbow to test buy in shop)
  "rug_basic", "rug_stripes", "rug_paw",
  // corner
  "corner_none", "corner_cactus", "corner_monstera", "corner_lantern", "corner_bus",
];
const itemRows = ownedItemIds.map((item_id) => ({ user_id: userId, item_id, qty: 1 }));
itemRows.push({ user_id: userId, item_id: "streak_scarf", qty: 1 }); // 1 scarf owned (max 2)
await must(sb.from("bin_items").insert(itemRows), "bin_items");

// 4. Equipped room
console.log("Seeding bin_room (equipped setup)...");
await sb.from("bin_room").delete().eq("user_id", userId);
await must(
  sb.from("bin_room").insert([
    { user_id: userId, slot: "bowl", item_id: "bowl_bamboo" },
    { user_id: userId, slot: "bed", item_id: "bed_royal" },
    { user_id: userId, slot: "wall", item_id: "wall_map" },
    { user_id: userId, slot: "toy", item_id: "toy_kite" },
    { user_id: userId, slot: "rug", item_id: "rug_paw" },
    { user_id: userId, slot: "corner", item_id: "corner_bus" },
  ]),
  "bin_room",
);

// 5. Companions / Buddies
// 3 hatched (miu, panda, duck) + 1 ready egg to test hatching (bunny)
console.log("Seeding bin_buddies...");
await sb.from("bin_buddies").delete().eq("user_id", userId);
await must(
  sb.from("bin_buddies").insert([
    {
      user_id: userId,
      species: "miu",
      name: "Miu",
      start_correct: 0,
      egg_at: new Date(Date.now() - 10 * DAY).toISOString(),
      hatched_at: new Date(Date.now() - 8 * DAY).toISOString(),
    },
    {
      user_id: userId,
      species: "panda",
      name: "Panda",
      start_correct: 0,
      egg_at: new Date(Date.now() - 7 * DAY).toISOString(),
      hatched_at: new Date(Date.now() - 5 * DAY).toISOString(),
    },
    {
      user_id: userId,
      species: "duck",
      name: "Vịt Quạc",
      start_correct: 0,
      egg_at: new Date(Date.now() - 4 * DAY).toISOString(),
      hatched_at: new Date(Date.now() - 2 * DAY).toISOString(),
    },
    {
      user_id: userId,
      species: "bunny",
      name: "Thỏ Bông",
      start_correct: Math.max(0, totalCorrect - 65), // >= 60 correct answers -> READY to hatch!
      egg_at: new Date(Date.now() - 1 * DAY).toISOString(),
      hatched_at: null,
    },
  ]),
  "bin_buddies",
);

// 6. Postcards & Historic Trips
console.log("Seeding bin_trips (6 postcards)...");
await sb.from("bin_trips").delete().eq("user_id", userId);
const sampleTrips = [
  {
    offset: -6,
    lang: "en",
    place_id: "london",
    word_term: "umbrella",
    bones: 6,
    item_id: "corner_bus",
    story: {
      source: "template",
      lines: [
        { target: "In London, Bin saw Big Ben and heard the bells chime!", vi: "Ở Luân Đôn, Bin đã thấy tháp Big Ben và nghe tiếng chuông ngân vang!" },
        { target: "The red double-decker buses were everywhere.", vi: "Những chiếc xe buýt hai tầng màu đỏ chạy khắp nơi." },
      ],
    },
  },
  {
    offset: -5,
    lang: "zh",
    place_id: "beijing",
    word_term: "熊猫",
    bones: 8,
    item_id: "toy_kite",
    story: {
      source: "template",
      lines: [
        { target: "在北京，Bin参观了故宫，红墙金瓦真壮观！", vi: "Ở Bắc Kinh, Bin đã thăm Cố Cung, tường đỏ ngói vàng thật tráng lệ!" },
        { target: "天气很好，Bin还放了龙风筝。", vi: "Thời tiết rất đẹp, Bin còn được thả diều rồng." },
      ],
      pinyin: [
        "Zài Běijīng, Bin cānguānle gùgōng, hóng qiáng jīn wǎ zhēn zhuàngguān!",
        "Tiānqì hěn hǎo, Bin hái fàngle lóng fēngzhēng.",
      ],
    },
  },
  {
    offset: -4,
    lang: "en",
    place_id: "new_york",
    word_term: "liberty",
    bones: 7,
    item_id: "wall_map",
    story: {
      source: "template",
      lines: [
        { target: "In New York, Bin visited the Statue of Liberty by ferry!", vi: "Tại New York, Bin đã đi phà ngắm Tượng Nữ thần Tự do!" },
        { target: "The city skyline was glowing in the golden sunset.", vi: "Đường chân trời thành phố rực sáng trong ánh hoàng hôn." },
      ],
    },
  },
  {
    offset: -3,
    lang: "zh",
    place_id: "shanghai",
    word_term: "外滩",
    bones: 9,
    item_id: "corner_lantern",
    story: {
      source: "template",
      lines: [
        { target: "在上海的外滩，东方明珠塔的灯光五彩斑斓！", vi: "Tại Bến Thượng Hải, tháp Đông Phương Minh Châu rực rỡ sắc màu!" },
        { target: "Bin đã mua một chiếc đèn lồng đỏ rất xinh.", vi: "Bin đã mua một chiếc đèn lồng đỏ rất xinh." },
      ],
      pinyin: [
        "Zài Shànghǎi de wàitān, dōngfāng míngzhū tǎ de dēngguāng wǔcǎi bānlán!",
        "Bin mǎile yī zhǎn hóng dēnglóng, hěn piàoliang.",
      ],
    },
  },
  {
    offset: -2,
    lang: "en",
    place_id: "edinburgh",
    word_term: "castle",
    bones: 6,
    item_id: "bed_royal",
    story: {
      source: "template",
      lines: [
        { target: "In Edinburgh, Bin climbed up to the ancient castle on the hill.", vi: "Ở Edinburgh, Bin đã leo lên lâu đài cổ kính trên đồi." },
        { target: "The bagpipe music echoed through the cobblestone streets.", vi: "Tiếng kèn túi vang vọng khắp những con phố lát đá." },
      ],
    },
  },
  {
    offset: -1,
    lang: "zh",
    place_id: "chengdu",
    word_term: "竹子",
    bones: 10,
    item_id: null,
    story: {
      source: "template",
      lines: [
        { target: "在成都的大熊猫基地，Bin看见大熊猫在吃竹子！", vi: "Tại Cơ sở Gấu trúc Thành Đô, Bin thấy gấu trúc đang gặm tre!" },
        { target: "大熊猫滚来滚去，憨态可掬，太可爱了！", vi: "Gấu trúc lăn tròn ngộ nghĩnh, trông đáng yêu vô cùng!" },
      ],
      pinyin: [
        "Zài Chéngdū de dàxióngmāo jīdì, Bin kànjiàn dàxióngmāo zài chī zhúzi!",
        "Dàxióngmāo gǔn lái gǔn qù, hāntài kějū, tài kě'ài le!",
      ],
    },
  },
];

const tripInserts = sampleTrips.map((t) => {
  const d = studyDay(t.offset);
  const time = new Date(`${d}T15:00:00+07:00`).toISOString();
  return {
    user_id: userId,
    study_day: d,
    lang: t.lang,
    place_id: t.place_id,
    word_term: t.word_term,
    story: t.story,
    bones: t.bones,
    item_id: t.item_id,
    started_at: time,
    returns_at: time,
    collected_at: time,
  };
});
await must(sb.from("bin_trips").insert(tripInserts), "bin_trips");

// 7. Settings & Prefs
console.log("Updating user_settings & prefs (wearing Crown, Panda companion, quests available)...");
const { data: currentSettings } = await sb.from("user_settings").select("prefs").eq("user_id", userId).maybeSingle();
const existingPrefs = currentSettings?.prefs || {};
await must(
  sb
    .from("user_settings")
    .update({
      prefs: {
        ...existingPrefs,
        mascot: true,
        mascot_name: "Bin",
        bin_outfit: "crown", // Wearing the King Crown!
        bin_buddy: "panda",  // Active companion
        quests_claimed: {},  // Unclaimed today so user can test clicking claim!
        sound: true,
        haptics: true,
      },
    })
    .eq("user_id", userId),
  "user_settings",
);

console.log(`
✅ SEED BIN FULL COMPLETED!
-----------------------------------------------
Tài khoản: demo@example.com (Mật khẩu: sotu1234)
- Level: 14 (4,500+ XP) -> Mở khóa toàn bộ trò làm trò (sit, spin, rollOver, dance, highFive)
- Streak: Chuỗi 35 ngày -> Mở khóa toàn bộ trang phục (Vương miện Crown, Mũ phù thủy Wizard, v.v.)
- Xương (Bones): 900+ khúc xương có sẵn trong ví
- Đồ nội thất: Mở khóa hầu hết vật phẩm (kể cả đồ hiếm từ các chuyến đi)
- Shop test: Còn Bát vàng, Nệm mây, Thảm cầu vồng trong shop để bấm "Mua" test trừ xương
- Khăn giữ chuỗi: Có sẵn 1 khăn trong kho, có thể mua thêm cái thứ 2 trong shop
- Bạn nhỏ (Buddies): Miu, Panda, Vịt Quạc đã nở. Thỏ Bông (Bunny) là trứng sẵn sàng nở (bấm 3 lần để nở)!
- Bưu thiếp: Đã có sẵn 6 bưu thiếp từ London, Bắc Kinh, New York, Thượng Hải, Edinburgh, Thành Đô tại /bin/postcards
- Chuyến đi (Trip): Hôm nay đã đủ điều kiện, sẵn sàng bấm "Đi dạo" ngay lập tức!
- Nhiệm vụ hôm nay (Quests): Cả 3 nhiệm vụ đã hoàn thành, sẵn sàng bấm "Nhận thưởng"!
-----------------------------------------------
`);
