
import { CardDef, CardType, Character } from './types';

export const EMOTES = [
  { id: 1, text: "👊 决一死战!", icon: "😠" },
  { id: 2, text: "🛡️ 手下留情", icon: "🥺" },
  { id: 3, text: "⚡ 快点出牌", icon: "😡" },
  { id: 4, text: "😂 就这?", icon: "😆" },
  { id: 5, text: "🆘 救命!", icon: "😭" },
  { id: 6, text: "🤝 结盟吗?", icon: "🤔" }
];

export const CHARACTERS: Character[] = [
  { id: 'naruto', name: '漩涡鸣人', maxHp: 4, avatar: '🍥', skills: [{ name: '九尾暴走', description: '锁定技：体力≤2时，摸牌阶段多摸1张。' }, { name: '风遁·螺旋手里剑', description: '【限定技】对一名角色造成2点伤害。', isUltimate: true, ultType: 'target', ultCondition: '体力≤2' }] },
  { id: 'sasuke', name: '宇智波佐助', maxHp: 3, avatar: '⚡', skills: [{ name: '千鸟', description: '锁定技：你的【螺旋丸】无视防具。' }, { name: '因陀罗之矢', description: '【限定技】对所有其他角色造成1点雷伤。', isUltimate: true, ultType: 'aoe', ultCondition: '手牌≥3' }] },
  { id: 'kakashi', name: '旗木卡卡西', maxHp: 4, avatar: '👁️', skills: [{ name: '神威', description: '锁定技：计算与其他角色距离始终-1。' }, { name: '雷切·双穿光', description: '【限定技】对一名角色造成1点伤害并弃置其装备。', isUltimate: true, ultType: 'target', ultCondition: '装备有武器' }] },
  { id: 'sakura', name: '春野樱', maxHp: 4, avatar: '🌸', skills: [{ name: '百豪', description: '锁定技：回合结束若受伤，回复1点体力并弃1牌。' }, { name: '创造再生', description: '【限定技】体力回复至上限。', isUltimate: true, ultType: 'self', ultCondition: '已受伤' }] },
  { id: 'gaara', name: '我爱罗', maxHp: 5, avatar: '🏜️', skills: [{ name: '绝对防御', description: '锁定技：开局自动装备【上忍马甲】。' }, { name: '沙漠层大葬', description: '【限定技】令一名角色跳过下回合且受1点伤。', isUltimate: true, ultType: 'target', ultCondition: '装备有防具' }] },
  { id: 'itachi', name: '宇智波鼬', maxHp: 3, avatar: '🦅', skills: [{ name: '天照', description: '锁定技：你的【豪火球】伤害+1。' }, { name: '十拳剑', description: '【限定技】对一名角色造成2点伤害。', isUltimate: true, ultType: 'target', ultCondition: '体力≤2' }] },
  { id: 'tsunade', name: '纲手', maxHp: 5, avatar: '🐌', skills: [{ name: '怪力', description: '锁定技：【医疗丸】回复量+1。' }, { name: '百豪之术', description: '【限定技】摸2牌，回2血。', isUltimate: true, ultType: 'self', ultCondition: '体力≤3' }] },
  { id: 'jiraiya', name: '自来也', maxHp: 4, avatar: '🐸', skills: [{ name: '仙人模式', description: '摸牌阶段可少摸1张，改为使用【影分身】。' }, { name: '五右卫门', description: '【限定技】全场1点火伤。', isUltimate: true, ultType: 'aoe', ultCondition: '手牌≥3' }] },
  { id: 'orochimaru', name: '大蛇丸', maxHp: 3, avatar: '🐍', skills: [{ name: '秽土转生', description: '限定技：濒死回复1血并翻面。' }, { name: '八岐大蛇', description: '【限定技】手牌补至5张，回1血。', isUltimate: true, ultType: 'self', ultCondition: '体力≤1' }] },
  { id: 'pain', name: '佩恩', maxHp: 5, avatar: '🧿', skills: [{ name: '神罗天征', description: '锁定技：他人计算与你距离+1。' }, { name: '地爆天星', description: '【限定技】令全场各弃2张牌。', isUltimate: true, ultType: 'global', ultCondition: '体力≤3' }] },
  { id: 'madara', name: '宇智波斑', maxHp: 4, avatar: '☄️', skills: [{ name: '无限月读', description: '锁定技：开局全场受1点伤。' }, { name: '天碍震星', description: '【限定技】全场1点伤，你摸3牌。', isUltimate: true, ultType: 'global', ultCondition: '体力≤2' }] },
  { id: 'minato', name: '波风水门', maxHp: 3, avatar: '🟡', skills: [{ name: '飞雷神', description: '锁定技：计算他人距离始终为1。' }, { name: '金色闪光', description: '【限定技】造成2点伤害（无法闪避）。', isUltimate: true, ultType: 'target', ultCondition: '手牌≥3' }] },
];

export const CARD_LIBRARY: CardDef[] = [
  { id: 'atk', name: '螺旋丸', description: '基本牌。造成1点伤害。', type: CardType.ATTACK, icon: 'fa-burst', color: 'text-orange-500' },
  { id: 'dodge', name: '替身术', description: '基本牌。抵消伤害。', type: CardType.DODGE, icon: 'fa-wind', color: 'text-blue-500' },
  { id: 'heal', name: '医疗丸', description: '基本牌。回复1点体力。', type: CardType.HEAL, icon: 'fa-heart', color: 'text-red-500' },
  { id: 'draw', name: '影分身', description: '锦囊。摸两张牌。', type: CardType.DRAW, icon: 'fa-clone', color: 'text-yellow-500' },
  { id: 'fireball', name: '豪火球之术', description: '判定♥♦造成1点火伤。', type: CardType.DAMAGE_SCROLL, icon: 'fa-fire', color: 'text-red-600' },
  { id: 'chidori', name: '千鸟流', description: '判定♠♣全场雷伤。', type: CardType.AOE, icon: 'fa-bolt', color: 'text-blue-400' },
  { id: 'duel', name: '雷切对决', description: '决斗，输者受1伤。', type: CardType.DUEL, icon: 'fa-handshake-slash', color: 'text-purple-600' },
  { id: 'steal', name: '手里剑投掷', description: '距离1，获得对方一张牌。', type: CardType.STEAL_SCROLL, icon: 'fa-hand-holding', color: 'text-green-600' },
  { id: 'dismantle', name: '树界降诞', description: '弃置对方一张牌。', type: CardType.DISCARD_SCROLL, icon: 'fa-leaf', color: 'text-green-800' },
  { id: 'tsukuyomi', name: '无限月读', description: '令对手跳过出牌。', type: CardType.SKIP_TURN, icon: 'fa-eye', color: 'text-red-800' },
  { id: 'negate', name: '反螺旋丸', description: '抵消锦囊效果。', type: CardType.NEGATE, icon: 'fa-ban', color: 'text-gray-600' },
  { id: 'vest', name: '上忍马甲', description: '防具。免疫黑色螺旋丸。', type: CardType.EQUIP_ARMOR, icon: 'fa-shield-halved', color: 'text-green-700' },
  { id: 'susanoo', name: '须佐能乎', description: '防具。免疫属性伤害。', type: CardType.EQUIP_ARMOR, icon: 'fa-ghost', color: 'text-purple-500' },
  { id: 'kunai', name: '战术苦无', description: '武器。距离 2。', type: CardType.EQUIP_WEAPON, icon: 'fa-khanda', color: 'text-gray-700', attackRange: 2 },
  { id: 'kusanagi', name: '草薙剑', description: '武器。距离 3。', type: CardType.EQUIP_WEAPON, icon: 'fa-screwdriver-wrench', color: 'text-indigo-600', attackRange: 3 },
  { id: 'shuriken_large', name: '风魔手里剑', description: '武器。距离 4。', type: CardType.EQUIP_WEAPON, icon: 'fa-fan', color: 'text-gray-800', attackRange: 4 },
  { id: 'akamaru', name: '赤丸', description: '进攻马 -1。', type: CardType.EQUIP_OFF_HORSE, icon: 'fa-dog', color: 'text-orange-700' },
  { id: 'gamabunta', name: '蛤蟆文太', description: '防御马 +1。', type: CardType.EQUIP_DEF_HORSE, icon: 'fa-frog', color: 'text-red-700' }
];

export const generateDeck = (): any[] => {
  let deck: any[] = [];
  const counts: Record<string, number> = {
    'atk': 24, 'dodge': 24, 'heal': 16, 'draw': 12, 
    'fireball': 6, 'chidori': 3, 'duel': 4, 'steal': 6, 'dismantle': 6,
    'tsukuyomi': 3, 'negate': 7, 
    'vest': 3, 'susanoo': 2,
    'kunai': 2, 'kusanagi': 1, 'shuriken_large': 1,
    'akamaru': 3, 'gamabunta': 3
  };

  Object.entries(counts).forEach(([id, count]) => {
    const def = CARD_LIBRARY.find(c => c.id === id);
    if (def) {
      for (let i = 0; i < count; i++) {
        deck.push({
          ...def,
          uniqueId: `${id}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          suit: ['spade', 'heart', 'club', 'diamond'][Math.floor(Math.random() * 4)] as any,
          number: Math.floor(Math.random() * 13) + 1
        });
      }
    }
  });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
};
