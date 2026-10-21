/**
 * Sample decks for trying the app without typing words in by hand: the
 * "Thêm bộ từ mẫu" button (lib/actions/sample.ts) and the demo seed
 * (scripts/seed-demo.mjs, run by Node directly — keep this file free of
 * runtime imports so plain type stripping can load it).
 */
import type { LangCode } from "@/lib/lang/types";
import type { PosCode } from "@/lib/pos";

type EnWord = {
  term: string;
  ipa: string;
  pos: PosCode[];
  vi: string;
  en: string;
  ex: [text: string, vi: string];
  emoji: string;
  cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  syn?: string[];
  ant?: string[];
  tip?: string;
};

type ZhWord = {
  term: string;
  pinyin: string;
  pos: PosCode[];
  vi: string;
  en: string;
  ex: [text: string, pinyin: string, vi: string];
  emoji: string;
  hanViet: string;
  hsk?: number;
  measure?: [char: string, pinyin: string];
  tip?: string;
};

export type SampleDeck = {
  key: string;
  name: string;
  description: string;
  topic: string;
} & ({ language: "en"; words: EnWord[] } | { language: "zh"; words: ZhWord[] });

export const SAMPLE_DECKS: SampleDeck[] = [
  {
    key: "en-daily",
    name: "Giao tiếp hằng ngày",
    description: "12 từ tiếng Anh dùng mỗi ngày: cảm ơn, mượn đồ, rủ đi ăn.",
    topic: "Đời sống",
    language: "en",
    words: [
      { term: "appreciate", ipa: "/əˈpriːʃieɪt/", pos: ["verb"], vi: "trân trọng, cảm kích", en: "To be grateful for something.", ex: ["I really appreciate your help.", "Mình thật sự cảm kích vì bạn đã giúp."], emoji: "🙏", cefr: "B1", syn: ["value", "be grateful for"] },
      { term: "borrow", ipa: "/ˈbɑːroʊ/", pos: ["verb"], vi: "mượn", en: "To take something and promise to return it.", ex: ["Can I borrow your pen for a minute?", "Cho mình mượn bút một lát được không?"], emoji: "🖊️", cefr: "A2", ant: ["lend"], tip: "borrow = mượn VỀ mình, lend = cho mượn ĐI." },
      { term: "convenient", ipa: "/kənˈviːniənt/", pos: ["adj"], vi: "tiện lợi", en: "Easy to use or suitable for your plans.", ex: ["The shop is convenient because it's open 24 hours.", "Cửa hàng rất tiện vì mở cửa 24 giờ."], emoji: "🏪", cefr: "B1", ant: ["inconvenient"] },
      { term: "delicious", ipa: "/dɪˈlɪʃəs/", pos: ["adj"], vi: "ngon", en: "Having a very pleasant taste.", ex: ["This soup is absolutely delicious!", "Món súp này ngon tuyệt!"], emoji: "😋", cefr: "A2", syn: ["tasty", "yummy"] },
      { term: "exhausted", ipa: "/ɪɡˈzɔːstɪd/", pos: ["adj"], vi: "kiệt sức", en: "Extremely tired.", ex: ["I was exhausted after the long trip.", "Tôi kiệt sức sau chuyến đi dài."], emoji: "😩", cefr: "B1", syn: ["worn out"] },
      { term: "forecast", ipa: "/ˈfɔːrkæst/", pos: ["noun", "verb"], vi: "dự báo", en: "A statement about what will happen, especially the weather.", ex: ["The weather forecast says it will rain tomorrow.", "Dự báo thời tiết nói ngày mai sẽ mưa."], emoji: "🌦️", cefr: "B1" },
      { term: "grateful", ipa: "/ˈɡreɪtfl/", pos: ["adj"], vi: "biết ơn", en: "Feeling thankful.", ex: ["We are grateful for your support.", "Chúng tôi biết ơn sự ủng hộ của bạn."], emoji: "💛", cefr: "B1", syn: ["thankful"] },
      { term: "hesitate", ipa: "/ˈhezɪteɪt/", pos: ["verb"], vi: "do dự, ngần ngại", en: "To pause before doing or saying something.", ex: ["Don't hesitate to ask if you need anything.", "Đừng ngần ngại hỏi nếu bạn cần gì nhé."], emoji: "🤔", cefr: "B1" },
      { term: "neighbor", ipa: "/ˈneɪbər/", pos: ["noun"], vi: "hàng xóm", en: "A person who lives near you.", ex: ["Our neighbor has a friendly dog.", "Nhà hàng xóm có một chú chó rất thân thiện."], emoji: "🏡", cefr: "A2" },
      { term: "recommend", ipa: "/ˌrekəˈmend/", pos: ["verb"], vi: "giới thiệu, gợi ý", en: "To suggest something as good.", ex: ["Can you recommend a good restaurant nearby?", "Bạn gợi ý giúp mình một quán ngon gần đây không?"], emoji: "👍", cefr: "B1", syn: ["suggest"] },
      { term: "schedule", ipa: "/ˈskedʒuːl/", pos: ["noun"], vi: "lịch trình, thời gian biểu", en: "A plan of times when things will happen.", ex: ["My schedule is very busy this week.", "Lịch của tôi tuần này rất kín."], emoji: "📅", cefr: "B1" },
      { term: "umbrella", ipa: "/ʌmˈbrelə/", pos: ["noun"], vi: "cái ô, cái dù", en: "A folding cover that protects you from rain.", ex: ["Take an umbrella, it's going to rain.", "Mang theo ô nhé, trời sắp mưa đấy."], emoji: "☂️", cefr: "A2" },
    ],
  },
  {
    key: "en-travel",
    name: "Du lịch & khám phá",
    description: "Đặt phòng, ra sân bay, mua quà lưu niệm.",
    topic: "Du lịch",
    language: "en",
    words: [
      { term: "adventure", ipa: "/ədˈventʃər/", pos: ["noun"], vi: "cuộc phiêu lưu", en: "An exciting or unusual experience.", ex: ["Backpacking through Vietnam was a real adventure.", "Đi phượt khắp Việt Nam là một cuộc phiêu lưu thực sự."], emoji: "🧭", cefr: "B1" },
      { term: "destination", ipa: "/ˌdestɪˈneɪʃn/", pos: ["noun"], vi: "điểm đến", en: "The place someone is going to.", ex: ["Da Nang is a popular destination for tourists.", "Đà Nẵng là điểm đến được nhiều du khách yêu thích."], emoji: "📍", cefr: "B1" },
      { term: "explore", ipa: "/ɪkˈsplɔːr/", pos: ["verb"], vi: "khám phá", en: "To travel around a place to learn about it.", ex: ["We spent the afternoon exploring the old town.", "Chúng tôi dành cả buổi chiều khám phá phố cổ."], emoji: "🔍", cefr: "B1" },
      { term: "itinerary", ipa: "/aɪˈtɪnəreri/", pos: ["noun"], vi: "lịch trình chuyến đi", en: "A detailed plan of a journey.", ex: ["Our itinerary includes three days in Hoi An.", "Lịch trình của chúng tôi có ba ngày ở Hội An."], emoji: "🗺️", cefr: "C1" },
      { term: "luggage", ipa: "/ˈlʌɡɪdʒ/", pos: ["noun"], vi: "hành lý", en: "The bags you take on a trip.", ex: ["Please don't leave your luggage unattended.", "Vui lòng không để hành lý mà không có người trông."], emoji: "🧳", cefr: "A2", syn: ["baggage"] },
      { term: "passport", ipa: "/ˈpæspɔːrt/", pos: ["noun"], vi: "hộ chiếu", en: "An official document for travelling abroad.", ex: ["Don't forget your passport!", "Đừng quên hộ chiếu nhé!"], emoji: "🛂", cefr: "A2" },
      { term: "reservation", ipa: "/ˌrezərˈveɪʃn/", pos: ["noun"], vi: "sự đặt chỗ trước", en: "An arrangement to keep a table, room or seat for you.", ex: ["I have a reservation for two at 7 p.m.", "Tôi đã đặt bàn cho hai người lúc 7 giờ tối."], emoji: "🛎️", cefr: "B1", syn: ["booking"] },
      { term: "scenery", ipa: "/ˈsiːnəri/", pos: ["noun"], vi: "phong cảnh", en: "The natural features of an area, such as mountains.", ex: ["The scenery in Ha Giang is breathtaking.", "Phong cảnh ở Hà Giang đẹp đến nghẹt thở."], emoji: "🏞️", cefr: "B1" },
      { term: "souvenir", ipa: "/ˌsuːvəˈnɪr/", pos: ["noun"], vi: "quà lưu niệm", en: "Something you buy to remember a place.", ex: ["I bought a lantern as a souvenir.", "Tôi mua một chiếc đèn lồng làm quà lưu niệm."], emoji: "🎁", cefr: "B1" },
      { term: "departure", ipa: "/dɪˈpɑːrtʃər/", pos: ["noun"], vi: "sự khởi hành", en: "The act of leaving a place.", ex: ["Our departure was delayed by two hours.", "Chuyến khởi hành của chúng tôi bị hoãn hai tiếng."], emoji: "🛫", cefr: "B1", ant: ["arrival"] },
    ],
  },
  {
    key: "zh-hello",
    name: "HSK 1 · Chào hỏi & gia đình",
    description: "Những câu đầu tiên khi gặp bạn mới và nói về gia đình.",
    topic: "Giao tiếp",
    language: "zh",
    words: [
      { term: "你好", pinyin: "nǐ hǎo", pos: ["interj"], vi: "xin chào", en: "hello", ex: ["你好，我叫小明。", "nǐ hǎo, wǒ jiào xiǎo míng.", "Xin chào, mình tên là Tiểu Minh."], emoji: "👋", hanViet: "nhĩ hảo", hsk: 1 },
      { term: "谢谢", pinyin: "xiè xie", pos: ["verb"], vi: "cảm ơn", en: "thank you", ex: ["谢谢你的帮助。", "xiè xie nǐ de bāng zhù.", "Cảm ơn sự giúp đỡ của bạn."], emoji: "🙏", hanViet: "tạ tạ", hsk: 1 },
      { term: "再见", pinyin: "zài jiàn", pos: ["interj"], vi: "tạm biệt", en: "goodbye", ex: ["明天见，再见！", "míng tiān jiàn, zài jiàn!", "Mai gặp nhé, tạm biệt!"], emoji: "🌇", hanViet: "tái kiến", hsk: 1, tip: "再 = lại, 见 = gặp → “gặp lại”." },
      { term: "朋友", pinyin: "péng you", pos: ["noun"], vi: "bạn bè", en: "friend", ex: ["他是我的好朋友。", "tā shì wǒ de hǎo péng you.", "Cậu ấy là bạn thân của tôi."], emoji: "🤝", hanViet: "bằng hữu", hsk: 1, measure: ["个", "gè"] },
      { term: "妈妈", pinyin: "mā ma", pos: ["noun"], vi: "mẹ", en: "mom", ex: ["我妈妈是老师。", "wǒ mā ma shì lǎo shī.", "Mẹ tôi là giáo viên."], emoji: "👩", hanViet: "ma ma", hsk: 1 },
      { term: "爸爸", pinyin: "bà ba", pos: ["noun"], vi: "bố", en: "dad", ex: ["爸爸在家看书。", "bà ba zài jiā kàn shū.", "Bố đang đọc sách ở nhà."], emoji: "👨", hanViet: "ba ba", hsk: 1 },
      { term: "老师", pinyin: "lǎo shī", pos: ["noun"], vi: "giáo viên, thầy cô", en: "teacher", ex: ["老师，早上好！", "lǎo shī, zǎo shang hǎo!", "Chào buổi sáng thầy/cô ạ!"], emoji: "🧑‍🏫", hanViet: "lão sư", hsk: 1, measure: ["位", "wèi"] },
      { term: "学生", pinyin: "xué shēng", pos: ["noun"], vi: "học sinh, sinh viên", en: "student", ex: ["我是大学生。", "wǒ shì dà xué shēng.", "Tôi là sinh viên đại học."], emoji: "🎒", hanViet: "học sinh", hsk: 1 },
      { term: "喜欢", pinyin: "xǐ huan", pos: ["verb"], vi: "thích", en: "to like", ex: ["我喜欢喝茶。", "wǒ xǐ huan hē chá.", "Tôi thích uống trà."], emoji: "❤️", hanViet: "hỉ hoan", hsk: 1 },
      { term: "家", pinyin: "jiā", pos: ["noun"], vi: "nhà, gia đình", en: "home, family", ex: ["我家有四口人。", "wǒ jiā yǒu sì kǒu rén.", "Nhà tôi có bốn người."], emoji: "🏠", hanViet: "gia", hsk: 1 },
      { term: "名字", pinyin: "míng zi", pos: ["noun"], vi: "tên", en: "name", ex: ["你叫什么名字？", "nǐ jiào shén me míng zi?", "Bạn tên là gì?"], emoji: "📛", hanViet: "danh tự", hsk: 1 },
      { term: "高兴", pinyin: "gāo xìng", pos: ["adj"], vi: "vui vẻ, vui mừng", en: "happy, glad", ex: ["认识你很高兴。", "rèn shi nǐ hěn gāo xìng.", "Rất vui được làm quen với bạn."], emoji: "😊", hanViet: "cao hứng", hsk: 1 },
    ],
  },
  {
    key: "zh-food",
    name: "Đồ ăn Trung Hoa",
    description: "Gọi món, khen ngon và nói mình đói bụng.",
    topic: "Ẩm thực",
    language: "zh",
    words: [
      { term: "饺子", pinyin: "jiǎo zi", pos: ["noun"], vi: "sủi cảo, bánh chẻo", en: "dumpling", ex: ["过年的时候我们吃饺子。", "guò nián de shí hou wǒ men chī jiǎo zi.", "Dịp Tết chúng tôi ăn sủi cảo."], emoji: "🥟", hanViet: "giảo tử" },
      { term: "米饭", pinyin: "mǐ fàn", pos: ["noun"], vi: "cơm", en: "cooked rice", ex: ["我每天都吃米饭。", "wǒ měi tiān dōu chī mǐ fàn.", "Ngày nào tôi cũng ăn cơm."], emoji: "🍚", hanViet: "mễ phạn", hsk: 1, measure: ["碗", "wǎn"] },
      { term: "面条", pinyin: "miàn tiáo", pos: ["noun"], vi: "mì sợi", en: "noodles", ex: ["这家的面条很好吃。", "zhè jiā de miàn tiáo hěn hǎo chī.", "Mì của quán này rất ngon."], emoji: "🍜", hanViet: "diện điều", hsk: 2, measure: ["碗", "wǎn"] },
      { term: "茶", pinyin: "chá", pos: ["noun"], vi: "trà", en: "tea", ex: ["请喝茶。", "qǐng hē chá.", "Mời uống trà."], emoji: "🍵", hanViet: "trà", hsk: 1, measure: ["杯", "bēi"] },
      { term: "好吃", pinyin: "hǎo chī", pos: ["adj"], vi: "ngon", en: "delicious", ex: ["妈妈做的菜最好吃。", "mā ma zuò de cài zuì hǎo chī.", "Món mẹ nấu là ngon nhất."], emoji: "😋", hanViet: "hảo cật", hsk: 2, tip: "好 (tốt) + 吃 (ăn) = ăn thấy tốt → ngon." },
      { term: "饿", pinyin: "è", pos: ["adj"], vi: "đói", en: "hungry", ex: ["我饿了，我们去吃饭吧。", "wǒ è le, wǒ men qù chī fàn ba.", "Tôi đói rồi, mình đi ăn thôi."], emoji: "🤤", hanViet: "ngạ", hsk: 3 },
      { term: "菜单", pinyin: "cài dān", pos: ["noun"], vi: "thực đơn", en: "menu", ex: ["服务员，请给我菜单。", "fú wù yuán, qǐng gěi wǒ cài dān.", "Phục vụ ơi, cho tôi xin thực đơn."], emoji: "📋", hanViet: "thái đơn" },
      { term: "水果", pinyin: "shuǐ guǒ", pos: ["noun"], vi: "hoa quả, trái cây", en: "fruit", ex: ["我喜欢吃水果。", "wǒ xǐ huan chī shuǐ guǒ.", "Tôi thích ăn hoa quả."], emoji: "🍎", hanViet: "thủy quả", hsk: 1 },
      { term: "辣", pinyin: "là", pos: ["adj"], vi: "cay", en: "spicy", ex: ["四川菜很辣。", "sì chuān cài hěn là.", "Món Tứ Xuyên rất cay."], emoji: "🌶️", hanViet: "lạt" },
      { term: "咖啡", pinyin: "kā fēi", pos: ["noun"], vi: "cà phê", en: "coffee", ex: ["你要一杯咖啡吗？", "nǐ yào yì bēi kā fēi ma?", "Bạn có muốn một ly cà phê không?"], emoji: "☕", hanViet: "già phê", hsk: 2, measure: ["杯", "bēi"] },
    ],
  },
];

/** Decks owned by the demo friend (scripts/seed-demo.mjs): one public, one shared with the group. */
export const FRIEND_DECKS: SampleDeck[] = [
  {
    key: "en-ielts-env",
    name: "IELTS · Môi trường",
    description: "Từ vựng chủ đề môi trường hay gặp trong IELTS Writing.",
    topic: "Môi trường",
    language: "en",
    words: [
      { term: "sustainable", ipa: "/səˈsteɪnəbl/", pos: ["adj"], vi: "bền vững", en: "Able to continue without harming the environment.", ex: ["We need more sustainable ways to travel.", "Chúng ta cần những cách di chuyển bền vững hơn."], emoji: "♻️", cefr: "B2" },
      { term: "pollution", ipa: "/pəˈluːʃn/", pos: ["noun"], vi: "sự ô nhiễm", en: "Damage to air, water or land by harmful substances.", ex: ["Air pollution is a serious problem in big cities.", "Ô nhiễm không khí là vấn đề nghiêm trọng ở các thành phố lớn."], emoji: "🏭", cefr: "B1" },
      { term: "renewable", ipa: "/rɪˈnuːəbl/", pos: ["adj"], vi: "có thể tái tạo", en: "Naturally replaced, such as wind or solar power.", ex: ["Solar power is a renewable energy source.", "Điện mặt trời là nguồn năng lượng tái tạo."], emoji: "☀️", cefr: "B2" },
      { term: "emission", ipa: "/iˈmɪʃn/", pos: ["noun"], vi: "khí thải, sự phát thải", en: "Gas or other substance sent into the air.", ex: ["Cars are a major source of carbon emissions.", "Ô tô là nguồn phát thải carbon lớn."], emoji: "💨", cefr: "B2" },
      { term: "conserve", ipa: "/kənˈsɜːrv/", pos: ["verb"], vi: "bảo tồn, tiết kiệm", en: "To protect something or use less of it.", ex: ["Turn off the lights to conserve energy.", "Tắt đèn để tiết kiệm năng lượng."], emoji: "💡", cefr: "B2" },
      { term: "ecosystem", ipa: "/ˈiːkoʊsɪstəm/", pos: ["noun"], vi: "hệ sinh thái", en: "All the living things in an area and their environment.", ex: ["Mangrove forests protect the coastal ecosystem.", "Rừng ngập mặn bảo vệ hệ sinh thái ven biển."], emoji: "🌿", cefr: "B2" },
      { term: "deforestation", ipa: "/diːˌfɔːrɪˈsteɪʃn/", pos: ["noun"], vi: "nạn phá rừng", en: "The cutting down of forests.", ex: ["Deforestation threatens many animal species.", "Nạn phá rừng đe dọa nhiều loài động vật."], emoji: "🪓", cefr: "C1" },
      { term: "resilient", ipa: "/rɪˈzɪliənt/", pos: ["adj"], vi: "kiên cường, mau phục hồi", en: "Able to recover quickly from difficulties.", ex: ["Coral reefs are less resilient than we thought.", "Rạn san hô kém khả năng phục hồi hơn chúng ta tưởng."], emoji: "🌱", cefr: "B2" },
    ],
  },
  {
    key: "zh-market",
    name: "Tiếng Trung đi chợ",
    description: "Hỏi giá, mặc cả và mua đồ — bộ từ chung của nhóm.",
    topic: "Mua sắm",
    language: "zh",
    words: [
      { term: "多少钱", pinyin: "duō shao qián", pos: ["phrase"], vi: "bao nhiêu tiền", en: "how much (money)", ex: ["这个多少钱？", "zhè ge duō shao qián?", "Cái này bao nhiêu tiền?"], emoji: "💰", hanViet: "đa thiểu tiền", hsk: 1 },
      { term: "便宜", pinyin: "pián yi", pos: ["adj"], vi: "rẻ", en: "cheap", ex: ["这件衣服很便宜。", "zhè jiàn yī fu hěn pián yi.", "Bộ quần áo này rất rẻ."], emoji: "🏷️", hanViet: "tiện nghi", hsk: 2 },
      { term: "贵", pinyin: "guì", pos: ["adj"], vi: "đắt", en: "expensive", ex: ["太贵了！", "tài guì le!", "Đắt quá!"], emoji: "💸", hanViet: "quý", hsk: 2 },
      { term: "买", pinyin: "mǎi", pos: ["verb"], vi: "mua", en: "to buy", ex: ["我想买一斤苹果。", "wǒ xiǎng mǎi yì jīn píng guǒ.", "Tôi muốn mua một cân táo."], emoji: "🛒", hanViet: "mãi", hsk: 1 },
      { term: "卖", pinyin: "mài", pos: ["verb"], vi: "bán", en: "to sell", ex: ["你们卖水果吗？", "nǐ men mài shuǐ guǒ ma?", "Các bạn có bán hoa quả không?"], emoji: "🏪", hanViet: "mại", hsk: 2, tip: "买 mǎi (thanh 3) là mua, 卖 mài (thanh 4) là bán — chữ bán có thêm 十 ở trên." },
      { term: "超市", pinyin: "chāo shì", pos: ["noun"], vi: "siêu thị", en: "supermarket", ex: ["我去超市买东西。", "wǒ qù chāo shì mǎi dōng xi.", "Tôi đi siêu thị mua đồ."], emoji: "🛍️", hanViet: "siêu thị" },
      { term: "一点儿", pinyin: "yì diǎnr", pos: ["phrase"], vi: "một chút", en: "a little", ex: ["可以便宜一点儿吗？", "kě yǐ pián yi yì diǎnr ma?", "Có thể bớt một chút không?"], emoji: "🤏", hanViet: "nhất điểm nhi", hsk: 1 },
      { term: "东西", pinyin: "dōng xi", pos: ["noun"], vi: "đồ vật, đồ đạc", en: "thing, stuff", ex: ["你买了什么东西？", "nǐ mǎi le shén me dōng xi?", "Bạn đã mua những gì?"], emoji: "📦", hanViet: "đông tây", hsk: 1 },
    ],
  },
];

/* Mirrors lib/lang normalize/readingKey for these hand-written terms (tests/unit/sample-data.test.ts checks it). */
function normalizeSample(term: string, language: LangCode) {
  return language === "zh" ? term.replace(/\s+/g, "") : term.trim().replace(/\s+/g, " ").toLowerCase();
}
function pinyinKey(pinyin: string) {
  return pinyin
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Insert-ready `words` rows (without deck_id / created_by). */
export function sampleWordRows(deck: SampleDeck) {
  if (deck.language === "en") {
    return deck.words.map((w) => ({
      language: "en" as const,
      term: w.term,
      normalized: normalizeSample(w.term, "en"),
      reading: w.ipa,
      reading_key: null,
      parts_of_speech: w.pos,
      meaning_vi: w.vi,
      meaning_en: w.en,
      examples: [{ text: w.ex[0], reading: null, vi: w.ex[1] }],
      synonyms: w.syn ?? [],
      antonyms: w.ant ?? [],
      collocations: [],
      word_family: [],
      topic: deck.topic,
      emoji: w.emoji,
      lang_extra: { cefr: w.cefr, us_ipa: w.ipa },
      personal_note: w.tip ?? null,
      ai_generated: false,
    }));
  }
  return deck.words.map((w) => ({
    language: "zh" as const,
    term: w.term,
    normalized: normalizeSample(w.term, "zh"),
    reading: w.pinyin,
    reading_key: pinyinKey(w.pinyin),
    parts_of_speech: w.pos,
    meaning_vi: w.vi,
    meaning_en: w.en,
    examples: [{ text: w.ex[0], reading: w.ex[1], vi: w.ex[2] }],
    synonyms: [],
    antonyms: [],
    collocations: [],
    word_family: [],
    topic: deck.topic,
    emoji: w.emoji,
    lang_extra: {
      han_viet: w.hanViet,
      ...(w.hsk ? { hsk: { level: w.hsk, version: "2.0" as const } } : {}),
      ...(w.measure ? { measure_words: [{ char: w.measure[0], pinyin: w.measure[1] }] } : {}),
    },
    personal_note: w.tip ?? null,
    ai_generated: false,
  }));
}
