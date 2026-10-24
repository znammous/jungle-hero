// بيانات اللعبة الثابتة: المناطق، الرتب، المعدّات، الشخصيات، والإعدادات

// كل منطقة في الغابة = جدول ضرب. الترتيب من الأسهل إلى الأصعب.
const REGIONS = [
  { table: 2,  name: 'شاطئ النهر',     icon: '🏖️', animal: { emoji: '🐢', name: 'السلحفاة' } },
  { table: 10, name: 'غابة الخيزران',  icon: '🎋', animal: { emoji: '🐼', name: 'الباندا' } },
  { table: 5,  name: 'الشلال',          icon: '💦', animal: { emoji: '🦦', name: 'ثعلب الماء' } },
  { table: 3,  name: 'بستان الموز',     icon: '🍌', animal: { emoji: '🐒', name: 'القرد' } },
  { table: 4,  name: 'أشجار الكينا',    icon: '🌳', animal: { emoji: '🐨', name: 'الكوالا' } },
  { table: 6,  name: 'وادي الببغاوات',  icon: '🌴', animal: { emoji: '🦜', name: 'الببغاء' } },
  { table: 11, name: 'تلال الزهور',     icon: '🌺', animal: { emoji: '🦋', name: 'الفراشة' } },
  { table: 9,  name: 'البركان',         icon: '🌋', animal: { emoji: '🦎', name: 'الإغوانا' } },
  { table: 7,  name: 'الكهف المظلم',    icon: '⛰️', animal: { emoji: '🦇', name: 'الخفاش' } },
  { table: 8,  name: 'مستنقع التماسيح', icon: '🌾', animal: { emoji: '🐊', name: 'التمساح' } },
  { table: 12, name: 'قلب الغابة',     icon: '🌲', animal: { emoji: '🐅', name: 'النمر' } },
];

// الرتبة تعتمد على أفضل نتيجة في سباق النهر (عدد الإجابات الصحيحة في دقيقة)
const RANKS = [
  { min: 0,  emoji: '🌱', name: 'مستكشف صغير' },
  { min: 10, emoji: '👣', name: 'متتبّع الأثر' },
  { min: 20, emoji: '🛡️', name: 'حارس الغابة' },
  { min: 30, emoji: '🧭', name: 'قائد البعثة' },
  { min: 40, emoji: '👑', name: 'أسطورة الغابة' },
];

const ITEMS = [
  { id: 'hat',        emoji: '🧢', name: 'قبعة المستكشف',  price: 15 },
  { id: 'boots',      emoji: '🥾', name: 'حذاء المغامرة',  price: 25 },
  { id: 'bag',        emoji: '🎒', name: 'حقيبة الظهر',    price: 30 },
  { id: 'rope',       emoji: '🪢', name: 'الحبل',          price: 35 },
  { id: 'compass',    emoji: '🧭', name: 'البوصلة',        price: 40 },
  { id: 'map',        emoji: '🗺️', name: 'خريطة الكنز',    price: 45 },
  { id: 'lantern',    emoji: '🔦', name: 'الفانوس',        price: 50 },
  { id: 'binoculars', emoji: '🔭', name: 'المنظار',        price: 60 },
  { id: 'camera',     emoji: '📷', name: 'الكاميرا',       price: 70 },
  { id: 'fire',       emoji: '🔥', name: 'نار المخيّم',    price: 80 },
  { id: 'tent',       emoji: '⛺', name: 'الخيمة',         price: 100 },
  { id: 'canoe',      emoji: '🛶', name: 'القارب',         price: 150 },
  { id: 'hut',        emoji: '🛖', name: 'كوخ الشجرة',     price: 250 },
];

// قطع نادرة لا تُباع في المتجر: تأتي من كنز رحلة اليوم والجائزة الأسبوعية فقط
const RARE_ITEMS = [
  { id: 'r-vase',    emoji: '🏺', name: 'الجرّة الأثرية' },
  { id: 'r-statue',  emoji: '🗿', name: 'تمثال المعبد' },
  { id: 'r-fossil',  emoji: '🦴', name: 'العظمة الأحفورية' },
  { id: 'r-shell',   emoji: '🐚', name: 'الصدفة النادرة' },
  { id: 'r-feather', emoji: '🪶', name: 'الريشة الذهبية' },
  { id: 'r-egg',     emoji: '🥚', name: 'البيضة الغامضة' },
  { id: 'r-gem',     emoji: '💎', name: 'جوهرة الغابة' },
  { id: 'r-beetle',  emoji: '🪲', name: 'الخنفساء الذهبية' },
];

const AVATARS = [
  // أطفال ومغامرون
  '🧒', '👦', '👧', '🤠', '🦸', '🧑‍🚀',
  // صيصان وطيور
  '🐣', '🐥', '🐤', '🐧', '🦉', '🦜',
  // حيوانات
  '🐰', '🐱', '🐶', '🐼', '🐨', '🐵', '🦊', '🐯', '🦁', '🐸',
  '🦄', '🐢', '🦒', '🐘', '🐬', '🐞', '🦋', '🐝',
  // ورود ونباتات
  '🌸', '🌷', '🌻', '🌺', '🌼', '🍀',
];

const CONFIG = {
  practiceLength: 15,   // عدد أسئلة جولة التدريب
  raceSeconds: 60,      // مدة سباق النهر
  raceGoal: 40,         // عدد الصخور حتى الضفة الأخرى (= رتبة الأسطورة)
  fastMs: 4000,         // الإجابة الصحيحة أسرع من هذا تُعتبر "متقنة"
  maxBox: 5,            // أعلى صندوق في نظام التكرار المتباعد
  masteredBox: 3,       // المسألة متقنة عند هذا الصندوق أو أعلى
  unlockAt: 0.75,       // نسبة إتقان المنطقة لفتح التالية
  idleCapMs: 20000,     // أقصى وقت يُحسب للسؤال الواحد (حتى لا يُحسب وقت الشرود)
  chestRareChance: 0.3, // احتمال قطعة نادرة في كنز اليوم
  weeklyGoal: 5,        // عدد أيام رحلة اليوم المطلوبة للجائزة الأسبوعية
};
