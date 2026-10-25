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

// غابة القسمة: نفس ترتيب الجداول، وكل منطقة = القسمة على عددها (56 ÷ 7)
const DIV_REGIONS = [
  { table: 2,  name: 'واحة النخيل',      icon: '🏜️', animal: { emoji: '🐫', name: 'الجمل' } },
  { table: 10, name: 'سهول السافانا',    icon: '🌾', animal: { emoji: '🦒', name: 'الزرافة' } },
  { table: 5,  name: 'بحيرة الفلامنغو',  icon: '🏞️', animal: { emoji: '🦩', name: 'الفلامنغو' } },
  { table: 3,  name: 'جزيرة جوز الهند',  icon: '🥥', animal: { emoji: '🦀', name: 'السلطعون' } },
  { table: 4,  name: 'شاطئ الجليد',      icon: '🧊', animal: { emoji: '🐧', name: 'البطريق' } },
  { table: 6,  name: 'وادي الفيلة',      icon: '🏕️', animal: { emoji: '🐘', name: 'الفيل' } },
  { table: 11, name: 'حقل عبّاد الشمس',  icon: '🌻', animal: { emoji: '🐝', name: 'النحلة' } },
  { table: 9,  name: 'الصحراء الحمراء',  icon: '🌵', animal: { emoji: '🦂', name: 'العقرب' } },
  { table: 7,  name: 'غابة الضباب',      icon: '🌫️', animal: { emoji: '🦉', name: 'البومة' } },
  { table: 8,  name: 'نهر أفراس النهر',  icon: '🛶', animal: { emoji: '🦛', name: 'فرس النهر' } },
  { table: 12, name: 'جبل النسور',       icon: '🏔️', animal: { emoji: '🦅', name: 'النسر' } },
];

// عالم الغابات: كل غابة عملية حسابية. needs = تُفتح عند فتح عدد من مناطق غابة أخرى
// total = عدد المسائل المختلفة فيها، soon = لم تُبنَ بعد
const WORLDS = [
  { id: 'mul', name: 'غابة الضرب', icon: '✖️', op: '×', regions: REGIONS, unit: 'جدول', skill: 'الجداول', total: 78,
    hint: 'اختر منطقة لتتدرّب على جدولها. أتقنها لتفتح المنطقة التالية وتكتشف حيوانها!' },
  { id: 'div', name: 'غابة القسمة', icon: '➗', op: '÷', regions: DIV_REGIONS, unit: 'القسمة على', skill: 'القسمة', total: 132,
    needs: { world: 'mul', regions: 4 },
    hint: 'كل منطقة فيها القسمة على عدد. القسمة عكس الضرب: <span dir="ltr">7 × 8 = 56</span> إذن <span dir="ltr">56 ÷ 7 = 8</span>' },
  { id: 'add', name: 'غابة الجمع والطرح', icon: '➕', soon: true },
  { id: 'frac', name: 'غابة الكسور', icon: '🍕', soon: true },
  { id: 'neg', name: 'غابة السالب والموجب', icon: '🌡️', soon: true },
];

// الرتبة تعتمد على أفضل نتيجة في سباق النهر (عدد الإجابات الصحيحة في دقيقة)
const RANKS = [
  { min: 0,  emoji: '🌱', name: 'مستكشف صغير' },
  { min: 10, emoji: '👣', name: 'متتبّع الأثر' },
  { min: 20, emoji: '🛡️', name: 'حارس الغابة' },
  { min: 30, emoji: '🧭', name: 'قائد البعثة' },
  { min: 40, emoji: '🏕️', name: 'زعيم المستكشفين' },
  // رتب الأبطال السريعين جداً
  { min: 50, emoji: '🗺️', name: 'سيّد الأدغال' },
  { min: 60, emoji: '🏆', name: 'بطل الاستكشاف' },
  { min: 70, emoji: '👑', name: 'أسطورة الغابة' },
];

// region = رقم المنطقة (من 0) التي يجب الوصول إليها حتى تظهر الأداة في المتجر
const ITEMS = [
  { id: 'hat',        emoji: '🧢', name: 'قبعة المستكشف',  price: 20,  region: 0 },
  { id: 'boots',      emoji: '🥾', name: 'حذاء المغامرة',  price: 30,  region: 0 },
  { id: 'bag',        emoji: '🎒', name: 'حقيبة الظهر',    price: 45,  region: 1 },
  { id: 'rope',       emoji: '🪢', name: 'الحبل',          price: 60,  region: 2 },
  { id: 'canoe',      emoji: '🛶', name: 'القارب',         price: 120, region: 2 },
  { id: 'compass',    emoji: '🧭', name: 'البوصلة',        price: 70,  region: 3 },
  { id: 'binoculars', emoji: '🔭', name: 'المنظار',        price: 90,  region: 4 },
  { id: 'camera',     emoji: '📷', name: 'الكاميرا',       price: 110, region: 5 },
  { id: 'map',        emoji: '🗺️', name: 'خريطة الكنز',    price: 130, region: 6 },
  { id: 'fire',       emoji: '🔥', name: 'نار المخيّم',    price: 150, region: 7 },
  { id: 'lantern',    emoji: '🔦', name: 'الفانوس',        price: 160, region: 8 },
  { id: 'tent',       emoji: '⛺', name: 'الخيمة',         price: 200, region: 9 },
  { id: 'hut',        emoji: '🛖', name: 'كوخ الشجرة',     price: 300, region: 10 },
];

// قطع نادرة لا تُباع في المتجر: تأتي من كنز رحلة اليوم والجائزة الأسبوعية فقط
const RARE_ITEMS = [
  { id: 'r-vase',    emoji: '🏺', name: 'الجرّة الأثرية' },
  { id: 'r-statue',  emoji: '🗝️', name: 'المفتاح العتيق' },  // المعرّف القديم باقٍ حتى لا تضيع القطعة ممن جمعها
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
  // حيوانات الغابة
  '🦍', '🐒', '🐊', '🦎', '🐍', '🦥', '🐆', '🦓',
  // جواهر وكنوز
  '💎', '👑', '🔮', '⭐', '🌟', '🏆',
  // ورود ونباتات
  '🌸', '🌷', '🌻', '🌺', '🌼', '🍀',
  // من بيئة الغابة
  '🌴', '🌳', '🌲', '🌿', '🍃', '🌵', '🍄', '🪴', '🌾', '🍁', '🌈', '🏝️', '🌋',
  // فواكه
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍐', '🫐',
  // خضروات
  '🥕', '🌽', '🥦', '🍅', '🥒', '🫑', '🍆', '🥔', '🧅', '🥬', '🫛', '🧄',
];

const CONFIG = {
  practiceLength: 15,   // عدد أسئلة جولة التدريب
  raceSeconds: 60,      // مدة سباق النهر
  fastMs: 4000,         // الإجابة الصحيحة أسرع من هذا تُعتبر "متقنة"
  maxBox: 5,            // أعلى صندوق في نظام التكرار المتباعد
  masteredBox: 3,       // المسألة متقنة عند هذا الصندوق أو أعلى
  unlockAt: 0.75,       // نسبة إتقان المنطقة لفتح التالية
  idleCapMs: 20000,     // أقصى وقت يُحسب للسؤال الواحد (حتى لا يُحسب وقت الشرود)
  chestRareChance: 0.3, // احتمال قطعة نادرة في كنز اليوم
  weeklyGoal: 5,        // عدد أيام رحلة اليوم المطلوبة للجائزة الأسبوعية
};

// اقتصاد العملات: كل المكافآت في مكان واحد لتسهل موازنتها
const COINS = {
  perCorrect: 0.5,      // عملة لكل إجابتين صحيحتين
  roundDone: 3,         // إكمال جولة تدريب أو إحماء أو مراجعة
  perfect: 2,           // جولة بلا أخطاء
  raceRecord: 5,        // رقم قياسي جديد في السباق
  duelWin: 5,           // الفوز في سباق الإخوة
  unlock: 10,           // فتح منطقة جديدة
  animal: 20,           // اكتشاف حيوان
  chestMin: 10,         // كنز رحلة اليوم: من 10 إلى 20
  chestMax: 20,
  weekly: 30,           // الجائزة الأسبوعية (تتضاعف إذا لم تبقَ قطع نادرة)
  shield: 40,           // درع السلسلة
};

const MAX_SHIELDS = 3;  // أقصى عدد دروع يحملها المستكشف

// اقتراحات جاهزة لجوائز العائلة (ولي الأمر يضيف ويحذف ويغيّر السعر)
const REWARD_PRESETS = [
  { emoji: '🍕', name: 'اختيار عشاء الجمعة',     price: 200 },
  { emoji: '🎮', name: 'نصف ساعة لعب إضافية',    price: 150 },
  { emoji: '🍦', name: 'آيس كريم',               price: 120 },
  { emoji: '📖', name: 'اختيار القصة التي نقرأها', price: 180 },
  { emoji: '🏞️', name: 'نزهة في الحديقة',         price: 300 },
  { emoji: '🌙', name: 'تمديد وقت النوم',          price: 160 },
  { emoji: '📺', name: 'مشاهدة حلقة كرتون هادف',   price: 140 },
];
const REWARD_EMOJIS = ['🎁', '🍕', '🍦', '🎮', '📖', '📺', '🏞️', '🌙', '🧸', '📚', '⚽', '🎨', '🛍️'];
