
export const CardType = {
  ATTACK: 'attack',
  DODGE: 'dodge',
  HEAL: 'heal',
  DRAW: 'draw',
  AOE: 'aoe',
  DAMAGE_SCROLL: 'damage_scroll',
  DISCARD_SCROLL: 'discard_scroll',
  STEAL_SCROLL: 'steal_scroll',
  DUEL: 'duel',
  NEGATE: 'negate',
  SKIP_TURN: 'skip_turn',
  EQUIP_ARMOR: 'equip_armor',
  EQUIP_WEAPON: 'equip_weapon',
  EQUIP_OFF_HORSE: 'equip_off_horse',
  EQUIP_DEF_HORSE: 'equip_def_horse'
} as const;

export type CardType = typeof CardType[keyof typeof CardType];

export interface CardDef {
  id: string;
  name: string;
  description: string;
  type: CardType;
  icon: string;
  color: string;
  damage?: number;
  attackRange?: number;
}

export interface PlayingCard extends CardDef {
  uniqueId: string;
  suit: 'spade' | 'heart' | 'club' | 'diamond';
  number: number;
}

export interface Skill {
  name: string;
  description: string;
  isPassive?: boolean;
  isUltimate?: boolean;
  ultType?: 'target' | 'self' | 'aoe' | 'global';
  ultCondition?: string;
}

export interface Character {
  id: string;
  name: string;
  maxHp: number;
  avatar: string;
  skills: Skill[];
}

export interface Player {
  id: string;
  isAi: boolean;
  character: Character;
  hp: number;
  maxHp: number;
  hand: PlayingCard[];
  equips: {
    weapon?: PlayingCard;
    armor?: PlayingCard;
    offHorse?: PlayingCard;
    defHorse?: PlayingCard;
  };
  isTurn: boolean;
  isDying: boolean;
  skippedTurn?: boolean;
  hasPlayedAttack: number; // 0, 1, 2...
  flags: { [key: string]: boolean | number };
}

export interface GameState {
  players: Player[];
  deck: PlayingCard[];
  discardPile: PlayingCard[];
  turnIndex: number;
  phase: 'START' | 'DRAW' | 'PLAY' | 'DISCARD' | 'END';
  logs: LogEntry[];
  pendingAction: PendingAction | null;
  winner: Player | null;
  cardsToDiscard: string[];
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'damage' | 'heal' | 'important' | 'judgement' | 'skill';
}

export interface PendingAction {
  type: 'RESPONSE_CARD' | 'JUDGEMENT';
  sourceId: string;
  targetId: string;
  cardUsed: PlayingCard;
  cardNeeded?: CardType;
  message: string;
  judgementStep?: 'DRAW';
  actionAfter?: 'DAMAGE' | 'RESOLVE' | 'JUDGEMENT' | 'START_DUEL' | 'DUEL_ROUND';
}

export interface ChatMessage {
  id: string;
  playerId: string;
  text: string;
}
