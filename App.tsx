
import React, { useState, useEffect, useRef } from 'react';
import { CHARACTERS, generateDeck, CARD_LIBRARY, EMOTES } from './constants';
import { CardType, GameState, Player, PlayingCard, PendingAction, Character, LogEntry, Skill, ChatMessage } from './types';

// ================= APP LOGIC =================
const DELAY_AI_ACTION = 1000;
const DELAY_AI_RESPONSE = 1200;
const DELAY_JUDGEMENT = 1500;
const TOTAL_PLAYERS = 5;

const getDistance = (source: Player, target: Player, allPlayers: Player[]): number => {
  if (source.character.id === 'minato') return 1;
  const alivePlayers = allPlayers.filter(p => p.hp > 0);
  
  if (alivePlayers.length === 2) return 1;

  const sIdx = alivePlayers.findIndex(p => p.id === source.id);
  const tIdx = alivePlayers.findIndex(p => p.id === target.id);
  if (sIdx === -1 || tIdx === -1) return 999;
  
  const rawDist = Math.abs(sIdx - tIdx);
  let dist = Math.min(rawDist, alivePlayers.length - rawDist);
  if (source.character.id === 'kakashi') dist -= 1;
  if (source.equips.offHorse) dist -= 1;
  if (target.character.id === 'pain' && alivePlayers.length > 2) dist += 1;
  if (target.equips.defHorse) dist += 1;
  return Math.max(1, dist);
};

const getAttackRange = (player: Player): number => {
  let range = player.equips.weapon ? player.equips.weapon.attackRange! : 1;
  if (player.character.id === 'sasuke') range += 1;
  return range;
};

const isImmuneToAttack = (source: Player, target: Player, card?: PlayingCard): boolean => {
  if (source.character.id === 'sasuke') return false;
  if (target.equips.armor?.id === 'vest' && card?.type === CardType.ATTACK) {
      if (card.suit === 'spade' || card.suit === 'club') return true; 
  }
  return false;
};

const checkUltimateAvailable = (player: Player): boolean => {
    if (player.isAi) return false;
    if ((player.flags['ult_cooldown'] as number) > 0) return false;
    
    switch (player.character.id) {
        case 'naruto': return player.hp <= 2;
        case 'sasuke': return player.hand.length >= 3;
        case 'kakashi': return !!player.equips.weapon;
        case 'sakura': return player.hp < player.maxHp;
        case 'gaara': return !!player.equips.armor;
        case 'itachi': return player.hp <= 2;
        case 'tsunade': return player.hp <= 3;
        case 'jiraiya': return player.hand.length >= 3;
        case 'orochimaru': return player.hp <= 1;
        case 'pain': return player.hp <= 3;
        case 'madara': return player.hp <= 2;
        case 'minato': return player.hand.length >= 3;
        default: return true;
    }
};

// --- 视觉特效组件 ---
const VisualEffect = ({ type }: { type: string }) => {
    let content = null;
    switch(type) {
        case 'RASENGAN': 
            content = <i className="fa-solid fa-hurricane text-blue-500 text-6xl animate-rasengan filter drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"></i>; 
            break;
        case 'LOG': 
            content = (
                <div className="animate-smoke flex flex-col items-center">
                    <i className="fa-solid fa-tree text-green-800 text-5xl"></i>
                    <i className="fa-solid fa-cloud text-gray-300 text-6xl -mt-8 opacity-80"></i>
                </div>
            );
            break;
        case 'FIRE':
            content = <i className="fa-solid fa-fire text-orange-500 text-6xl animate-fire filter drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]"></i>;
            break;
        case 'LIGHTNING':
            content = <i className="fa-solid fa-bolt text-yellow-400 text-6xl animate-lightning filter drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]"></i>;
            break;
        case 'HEAL':
            content = <i className="fa-solid fa-heart text-green-500 text-5xl animate-heal"></i>;
            break;
        case 'BLOOD':
            content = <i className="fa-solid fa-burst text-red-600 text-6xl animate-blood opacity-80"></i>;
            break;
        default: return null;
    }
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            {content}
        </div>
    );
}

interface CardComponentProps {
  card: PlayingCard;
  onClick?: () => void;
  isSelected?: boolean;
  isPlayable?: boolean;
  size?: 'small' | 'normal';
  isDiscardSelected?: boolean;
}

const CardComponent: React.FC<CardComponentProps> = ({ card, onClick, isSelected, isPlayable = true, size = 'normal', isDiscardSelected }) => {
  const suitIcon = {
    spade: '♠', heart: '♥', club: '♣', diamond: '♦'
  }[card.suit];
  
  const suitColor = (card.suit === 'heart' || card.suit === 'diamond') ? 'text-red-500' : 'text-black';

  return (
    <div 
      onClick={isPlayable ? onClick : undefined}
      className={`
        relative flex-shrink-0 bg-white rounded-lg shadow-md border 
        ${size === 'small' ? 'w-10 h-14' : 'w-20 h-28'} 
        ${isSelected ? 'ring-4 ring-orange-500 -translate-y-6 z-50' : ''} 
        ${isDiscardSelected ? 'ring-4 ring-red-600 -translate-y-4 z-40' : ''} 
        ${isPlayable ? 'cursor-pointer active:scale-95' : 'opacity-60 cursor-not-allowed grayscale'} 
        transition-all duration-200 select-none overflow-hidden
      `}
    >
      {isDiscardSelected && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shadow-md border-2 border-white animate-pop">
              弃
            </div>
        </div>
      )}

      <div className={`absolute top-0.5 left-1 text-[10px] font-bold leading-none ${suitColor} z-10`}>
        <div>{card.number === 1 ? 'A' : card.number > 10 ? ['J','Q','K'][card.number-11] : card.number}</div>
        <div>{suitIcon}</div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <i className={`fa-solid ${card.icon} ${card.color} ${size === 'small' ? 'text-lg' : 'text-3xl'}`}></i>
        {size === 'normal' && (
          <div className="text-center px-1 mt-1 w-full flex flex-col items-center">
            <div className="font-bold text-[10px] text-gray-800 leading-tight truncate">{card.name}</div>
            <div className="text-[7px] text-gray-500 leading-tight scale-90 mt-0.5 line-clamp-3 w-full text-center px-0.5">{card.description}</div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-0.5 right-1 text-[8px] text-gray-400 font-mono">
        {card.type.includes('equip') ? '装备' : (card.type === 'attack' ? '基本' : '锦囊')}
      </div>
    </div>
  );
};

interface PlayerAvatarProps {
  player: Player;
  isCurrentTurn: boolean;
  isUser: boolean;
  position: 'top-grid' | 'bottom';
  onClick?: () => void;
  activeEffect?: string;
  activeChat?: string;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, isCurrentTurn, isUser, position, onClick, activeEffect, activeChat }) => {
  if (player.hp <= 0) return (
      <div className={`flex flex-col items-center justify-center opacity-40 grayscale ${position === 'top-grid' ? 'w-full' : 'w-24'}`}>
          <div className="text-2xl">☠️</div>
          <div className="text-[10px] text-gray-400">{player.character.name}</div>
      </div>
  );

  return (
    <div onClick={onClick} className={`
      relative flex flex-col items-center p-1.5 rounded-xl transition-all duration-300 cursor-pointer active:scale-95
      ${isCurrentTurn ? 'bg-orange-100 ring-2 ring-orange-500 shadow-lg scale-105' : 'bg-gray-800/80 border border-gray-600'}
      ${player.isDying ? 'animate-pulse ring-4 ring-red-600 bg-red-100' : ''}
      ${position === 'bottom' ? 'min-w-[100px]' : 'w-full h-full justify-start min-h-[90px]'}
    `}>
      {activeEffect && <VisualEffect type={activeEffect} />}
      {/* Chat Bubble */}
      {activeChat && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded-lg shadow-lg border border-gray-300 animate-chat-pop z-50 whitespace-nowrap">
              {activeChat}
          </div>
      )}
      
      <div className="relative pointer-events-none">
        <div className={`${position === 'bottom' ? 'w-14 h-14 text-3xl' : 'w-10 h-10 text-xl'} rounded-full bg-white border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-sm`}>
          {player.character.avatar}
        </div>
        
        {/* Equips Indicator */}
        <div className="absolute -bottom-2 -right-2 flex flex-wrap max-w-[40px] gap-0.5 justify-center">
          {player.equips.weapon && <div className="w-3 h-3 bg-red-700 text-white rounded-full text-[6px] flex items-center justify-center border border-white" title={player.equips.weapon.name}><i className={`fa-solid ${player.equips.weapon.icon}`}></i></div>}
          {player.equips.armor && <div className="w-3 h-3 bg-green-700 text-white rounded-full text-[6px] flex items-center justify-center border border-white" title={player.equips.armor.name}><i className={`fa-solid ${player.equips.armor.icon}`}></i></div>}
          {player.equips.offHorse && <div className="w-3 h-3 bg-orange-600 text-white rounded-full text-[6px] flex items-center justify-center border border-white" title={player.equips.offHorse.name}><i className="fa-solid fa-minus"></i></div>}
          {player.equips.defHorse && <div className="w-3 h-3 bg-blue-600 text-white rounded-full text-[6px] flex items-center justify-center border border-white" title={player.equips.defHorse.name}><i className="fa-solid fa-plus"></i></div>}
        </div>
      </div>

      <div className={`mt-2 text-[10px] font-bold px-2 rounded-full shadow-sm whitespace-nowrap pointer-events-none ${isCurrentTurn ? 'text-gray-800 bg-white/80' : 'text-gray-200'}`}>
        {player.character.name}
      </div>

      <div className="flex gap-0.5 mt-1 pointer-events-none flex-wrap justify-center px-1">
        {Array.from({ length: player.maxHp }).map((_, i) => (
          <div key={i} className={`
            w-1.5 h-2.5 rounded-[1px] border-[0.5px] border-gray-500
            ${i < player.hp 
              ? (player.hp === 1 ? 'bg-red-500 animate-pulse' : (player.hp <= 2 ? 'bg-yellow-400' : 'bg-green-500')) 
              : 'bg-gray-600'}
          `}></div>
        ))}
      </div>

      {!isUser && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[9px] rounded-full pointer-events-none font-mono">
          🎴{player.hand.length}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null); 
  const [showCharSelect, setShowCharSelect] = useState(true);
  const [previewChar, setPreviewChar] = useState<Character | null>(null); 
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showEmoteMenu, setShowEmoteMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false); // Toggle log view

  const [animatingCards, setAnimatingCards] = useState<{id: string, card: PlayingCard, type: string}[]>([]);
  const [visualEffects, setVisualEffects] = useState<{id: string, targetId: string, type: string}[]>([]);
  const [chatMessages, setChatMessages] = useState<{id: string, playerId: string, text: string}[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.logs]);

  const addLog = (text: string, type: 'info' | 'damage' | 'heal' | 'important' | 'judgement' | 'skill' = 'info') => {
    setGameState(prev => {
      if (!prev) return null;
      const logId = `${Date.now()}-${Math.random()}`;
      return {
        ...prev,
        logs: [...prev.logs, { id: logId, text, type }].slice(-12)
      };
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const triggerAnim = (card: PlayingCard, type: 'PLAY' | 'DISCARD') => {
     const id = Math.random().toString(36);
     setAnimatingCards(prev => [...prev, { id, card, type }]);
     setTimeout(() => { setAnimatingCards(prev => prev.filter(a => a.id !== id)); }, 1000);
  };

  const triggerVisual = (targetId: string, type: string) => {
      const id = Math.random().toString(36);
      setVisualEffects(prev => [...prev, { id, targetId, type }]);
      setTimeout(() => { setVisualEffects(prev => prev.filter(e => e.id !== id)); }, 1200);
  };

  const triggerChat = (playerId: string, text: string) => {
      const id = Math.random().toString(36);
      setChatMessages(prev => [...prev, { id, playerId, text }]);
      setTimeout(() => {
          setChatMessages(prev => prev.filter(m => m.id !== id));
      }, 3000); 
  };

  const reshuffleDeck = (state: GameState): PlayingCard[] => {
      if (state.deck.length > 0) return state.deck;
      
      const newDeck = [...state.discardPile];
      // Shuffle
      for (let i = newDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
      }
      
      state.discardPile = [];
      addLog("牌堆已耗尽，重新洗牌！", "important");
      return newDeck;
  };

  const startGame = (charId: string) => {
    const userChar = CHARACTERS.find(c => c.id === charId)!;
    const aiChars = CHARACTERS.filter(c => c.id !== charId).sort(() => 0.5 - Math.random()).slice(0, TOTAL_PLAYERS - 1);
    const deck = generateDeck();
    
    // Player gets 6 cards, AI gets 5 (BUFF)
    const createPlayer = (id: string, char: Character, isAi: boolean): Player => ({
        id, isAi, character: char, hp: char.maxHp, maxHp: char.maxHp, 
        hand: deck.splice(0, isAi ? 5 : 6), equips: {}, isTurn: false, isDying: false, hasPlayedAttack: 0, flags: { ult_cooldown: 0 }
    });

    let players = [createPlayer('user', userChar, false)];
    aiChars.forEach((char, idx) => players.push(createPlayer(`ai${idx+1}`, char, true)));

    // Passive: Gaara starts with Vest
    players = players.map(p => {
       if (p.character.id === 'gaara') {
          const vestDef = CARD_LIBRARY.find(c => c.id === 'vest');
          if (vestDef) p.equips.armor = { ...vestDef, uniqueId: 'skill-gaara-vest', suit: 'diamond', number: 1 };
       }
       return p;
    });

    // Passive: Madara damages everyone else
    players.forEach(p => {
        if (p.character.id === 'madara') {
            players.forEach(target => {
                if (target.id !== p.id) target.hp = Math.max(1, target.hp - 1);
            });
        }
    });

    setGameState({
      players,
      deck,
      discardPile: [],
      turnIndex: 0, 
      phase: 'START',
      logs: [{ id: 'init', text: '5人混战开始! 击败所有对手!', type: 'important' }],
      pendingAction: null,
      winner: null,
      cardsToDiscard: []
    });
    setPreviewChar(null);
    setShowCharSelect(false);
  };

  // --- Game Loop ---
  useEffect(() => {
    if (!gameState || gameState.winner || gameState.pendingAction) return;

    const currentPlayer = gameState.players[gameState.turnIndex];
    if (currentPlayer.hp <= 0) {
      nextTurn();
      return;
    }

    if (currentPlayer.isAi) {
        if (gameState.phase === 'PLAY') {
            const timer = setTimeout(() => executeAiTurn(), DELAY_AI_ACTION);
            timeouts.current.push(timer);
        } else if (gameState.phase === 'DISCARD') {
            const timer = setTimeout(() => handleDiscardPhase(currentPlayer), 800);
            timeouts.current.push(timer);
        }
    } 
    
    if (gameState.phase === 'START') {
      const timer = setTimeout(() => runPhase(currentPlayer), 500);
      timeouts.current.push(timer);
    } else if (gameState.phase === 'DRAW') {
       const timer = setTimeout(() => runPhase(currentPlayer), 500);
       timeouts.current.push(timer);
    } else if (gameState.phase === 'END') {
       const timer = setTimeout(() => checkDiscardRequirement(currentPlayer), 500);
       timeouts.current.push(timer);
    }
    
    return () => timeouts.current.forEach(clearTimeout);
  }, [gameState?.phase, gameState?.turnIndex, gameState?.pendingAction, gameState?.players]); 

  // --- Response / Judgement Loop ---
  useEffect(() => {
    if (!gameState || gameState.winner || !gameState.pendingAction) return;

    if (gameState.pendingAction.type === 'RESPONSE_CARD') {
       const { targetId, cardNeeded } = gameState.pendingAction;
       const targetPlayer = gameState.players.find(p => p.id === targetId);

       if (targetPlayer && targetPlayer.isAi && cardNeeded) {
          const timer = setTimeout(() => {
             const cardToPlay = targetPlayer.hand.find(c => c.type === cardNeeded);
             if (cardToPlay) {
                triggerAnim(cardToPlay, 'PLAY');
                addLog(`${targetPlayer.character.name} 使用了 【${cardToPlay.name}】`, 'info');
                setGameState(prev => {
                   if(!prev) return null;
                   const p = prev.players.find(pl => pl.id === targetId)!;
                   const newHand = p.hand.filter(c => c.uniqueId !== cardToPlay.uniqueId);
                   const discard = [...prev.discardPile, cardToPlay];
                   const updatedPlayers = prev.players.map(pl => pl.id === targetId ? {...pl, hand: newHand} : pl);
                   return { ...prev, players: updatedPlayers, discardPile: discard };
                });
                setTimeout(() => resolveResponse(true, cardToPlay), 500);
             } else {
                resolveResponse(false);
             }
          }, DELAY_AI_RESPONSE);
          timeouts.current.push(timer);
       }
    }

    if (gameState.pendingAction.type === 'JUDGEMENT') {
        if (!gameState.pendingAction.judgementStep) {
           const timer = setTimeout(() => {
              setGameState(prev => prev ? { ...prev, pendingAction: { ...prev.pendingAction!, judgementStep: 'DRAW' } } : null);
           }, 500);
           timeouts.current.push(timer);
        } else if (gameState.pendingAction.judgementStep === 'DRAW') {
            const timer = setTimeout(() => {
               const suits = ['heart', 'diamond', 'spade', 'club'];
               const randomSuit = suits[Math.floor(Math.random() * 4)];
               const randomNumber = Math.floor(Math.random() * 13) + 1;
               const suitIcon = randomSuit === 'heart' || randomSuit === 'diamond' ? '🔴' : '⚫';
               
               addLog(`判定结果：${suitIcon} ${randomNumber}`, 'judgement');
               
               const cardUsed = gameState.pendingAction!.cardUsed;
               let isSuccess = false;
               
               if (cardUsed.id === 'fireball' && (randomSuit === 'heart' || randomSuit === 'diamond')) isSuccess = true;
               if (cardUsed.id === 'chidori' && (randomSuit === 'spade' || randomSuit === 'club')) isSuccess = true;

               if (isSuccess) {
                   addLog("判定成功！忍术生效！", 'important');
                   if (cardUsed.id === 'fireball') triggerVisual(gameState.pendingAction!.targetId, 'FIRE');
                   else if (cardUsed.id === 'chidori') triggerVisual('ALL', 'LIGHTNING');
                   resolveCardEffect(gameState.pendingAction!.sourceId, gameState.pendingAction!.targetId, cardUsed);
               } else {
                   addLog("判定失败！忍术失效！", 'info');
               }
               setGameState(prev => prev ? { ...prev, pendingAction: null } : null);
            }, DELAY_JUDGEMENT);
            timeouts.current.push(timer);
        }
    }
    
    return () => timeouts.current.forEach(clearTimeout);
  }, [gameState?.pendingAction]);

  const runPhase = (player: Player) => {
    if (!gameState) return;

    if (gameState.phase === 'START') {
      const newCooldown = Math.max(0, (player.flags['ult_cooldown'] as number || 0) - 1);
      setGameState(prev => ({ ...prev!, players: prev!.players.map(p => p.id === player.id ? { ...p, hasPlayedAttack: 0, flags: { ...p.flags, ult_cooldown: newCooldown } } : p) }));

      if (player.skippedTurn) {
        addLog(`${player.character.name} 陷入无限月读，跳过出牌！`, 'important');
        setGameState(prev => ({
          ...prev!,
          players: prev!.players.map(p => p.id === player.id ? { ...p, skippedTurn: false } : p),
          phase: 'END'
        }));
      } else {
        setGameState(prev => ({ ...prev!, phase: 'DRAW' }));
      }
    } 
    else if (gameState.phase === 'DRAW') {
      let drawCount = player.isAi ? 2 : 3;
      if (player.character.id === 'naruto' && player.hp <= 2) drawCount += 1;
      
      // Deck Check & Shuffle
      let currentDeck = [...gameState.deck];
      let currentDiscard = gameState.discardPile;
      if (currentDeck.length < drawCount) {
          const combined = [...currentDeck, ...currentDiscard];
          // Shuffle Logic
          for (let i = combined.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [combined[i], combined[j]] = [combined[j], combined[i]];
          }
          currentDeck = combined;
          currentDiscard = [];
          addLog("牌堆已重置！", "important");
      }

      const drawnCards = currentDeck.slice(0, drawCount);
      const remainingDeck = currentDeck.slice(drawCount);

      setGameState(prev => {
        const updatedPlayers = prev!.players.map(p => 
          p.id === player.id ? { ...p, hand: [...p.hand, ...drawnCards] } : p
        );
        return {
          ...prev!,
          players: updatedPlayers,
          deck: remainingDeck,
          discardPile: currentDiscard,
          phase: 'PLAY'
        };
      });
      addLog(`${player.character.name} 摸了 ${drawCount} 张牌`);
    }
  };

  const nextTurn = () => {
    if (!gameState) return;
    let nextIdx = (gameState.turnIndex + 1) % gameState.players.length;
    
    let loops = 0;
    while (gameState.players[nextIdx].hp <= 0 && loops < gameState.players.length) {
      nextIdx = (nextIdx + 1) % gameState.players.length;
      loops++;
    }

    setGameState(prev => ({
      ...prev!,
      turnIndex: nextIdx,
      phase: 'START',
      selectedCardIdx: null,
      activeSkill: null,
      pendingAction: null
    }));
  };

  const checkDiscardRequirement = (player: Player) => {
    const limit = player.isAi ? player.hp : player.hp + 1;
    if (player.hand.length > limit) {
      addLog(`${player.character.name} 需要弃置 ${player.hand.length - limit} 张牌`);
      setGameState(prev => ({ ...prev!, phase: 'DISCARD' }));
    } else {
      nextTurn();
    }
  };

  // --- AI Logic ---
  const executeAiTurn = () => {
    if (!gameState) return;
    const player = gameState.players[gameState.turnIndex];
    const opponents = gameState.players.filter(p => p.id !== player.id && p.hp > 0);
    
    // CHAT RANDOMIZER
    if (Math.random() < 0.15) triggerChat(player.id, EMOTES[Math.floor(Math.random()*EMOTES.length)].text);

    const calculateThreat = (target: Player): number => {
        let score = 0;
        if (target.hp === 1) score += 50; 
        else score += (target.maxHp - target.hp) * 5;
        score += target.hand.length * 2;
        if (target.equips.armor && player.character.id !== 'sasuke') score -= 15; 
        if (target.equips.defHorse) score -= 5; 
        
        // Low aggro on user
        if (!target.isAi) score -= 15; 
        return score;
    };

    const getBestTargetGlobal = (): Player | null => {
        const validTargets = opponents.filter(p => true);
        if (validTargets.length === 0) return null;
        return validTargets.sort((a, b) => calculateThreat(b) - calculateThreat(a))[0];
    };

    // 1. Emergency Heal
    if (player.hp <= 2) {
      const healCard = player.hand.find(c => c.type === CardType.HEAL);
      if (healCard) { handleCardPlay(player, null, healCard); return; }
      const drawCard = player.hand.find(c => c.type === CardType.DRAW);
      if (drawCard) { handleCardPlay(player, null, drawCard); return; }
    }

    // 2. Equip Logic
    const equipCards = player.hand.filter(c => 
         c.type === CardType.EQUIP_WEAPON || 
         c.type === CardType.EQUIP_ARMOR ||
         c.type === CardType.EQUIP_OFF_HORSE ||
         c.type === CardType.EQUIP_DEF_HORSE
    );
    if (equipCards.length > 0) {
        const toEquip = equipCards[0];
        handleCardPlay(player, null, toEquip);
        return;
    }

    const getBestTarget = (range: number, card: PlayingCard): Player | null => {
        const validTargets = opponents.filter(p => getDistance(player, p, gameState.players) <= range && !isImmuneToAttack(player, p, card));
        if (validTargets.length === 0) return null;
        return validTargets.sort((a, b) => calculateThreat(b) - calculateThreat(a))[0];
    };

    // 3. Control
    const skipCard = player.hand.find(c => c.type === CardType.SKIP_TURN);
    if (skipCard) {
      const target = opponents.sort((a,b) => calculateThreat(b) - calculateThreat(a))[0];
      if (target) { handleCardPlay(player, target.id, skipCard); return; }
    }

    // 4. Attack
    const attackCard = player.hand.find(c => c.type === CardType.ATTACK);
    if (attackCard && player.hasPlayedAttack < 1) {
      const range = getAttackRange(player);
      const target = getBestTarget(range, attackCard);
      if (target) {
        handleCardPlay(player, target.id, attackCard);
        return;
      }
    }

    // 5. Scrolls
    const damageScroll = player.hand.find(c => c.type === CardType.DAMAGE_SCROLL || c.type === CardType.DUEL);
    if (damageScroll) {
       const target = getBestTargetGlobal();
       if (target) { handleCardPlay(player, target.id, damageScroll); return; }
    }

    // 6. Steal / Dismantle
    const stealCard = player.hand.find(c => c.type === CardType.STEAL_SCROLL);
    if (stealCard) {
         const validStealTarget = opponents.find(p => getDistance(player, p, gameState.players) <= 1 && (p.hand.length > 0 || Object.values(p.equips).some(e=>!!e)));
         if (validStealTarget) { handleCardPlay(player, validStealTarget.id, stealCard); return; }
    }

    const dismantleCard = player.hand.find(c => c.type === CardType.DISCARD_SCROLL);
    if (dismantleCard) {
         const target = getBestTargetGlobal();
         if (target) { handleCardPlay(player, target.id, dismantleCard); return; }
    }

    // 7. AOE / Draw / Heal Topup
    const aoeCard = player.hand.find(c => c.type === CardType.AOE);
    if (aoeCard) { handleCardPlay(player, null, aoeCard); return; }

    const drawCardTactical = player.hand.find(c => c.type === CardType.DRAW);
    if (drawCardTactical) { handleCardPlay(player, null, drawCardTactical); return; }

    const healCardTopUp = player.hand.find(c => c.type === CardType.HEAL);
    if (healCardTopUp && player.hp < player.maxHp) { handleCardPlay(player, null, healCardTopUp); return; }

    // End turn
    setGameState(prev => ({ ...prev!, phase: 'END' }));
  };

  const handleDiscardPhase = (player: Player) => {
    if (!gameState) return;
    
    const limit = player.isAi ? player.hp : player.hp + 1;
    const countNeeded = player.hand.length - limit;
    if (countNeeded <= 0) {
       nextTurn();
       return;
    }

    const scoreCard = (c: PlayingCard) => {
       if (c.type === CardType.HEAL) return 10;
       if (c.type === CardType.DODGE) return 8;
       if (c.type === CardType.ATTACK) return 5;
       if (c.type.includes('equip')) return 6;
       return 1;
    };

    const sortedHand = [...player.hand].sort((a, b) => scoreCard(a) - scoreCard(b)); 
    const toDiscard = sortedHand.slice(0, countNeeded);
    const kept = sortedHand.slice(countNeeded);

    toDiscard.forEach(c => triggerAnim(c, 'DISCARD'));

    addLog(`${player.character.name} 弃置了 ${countNeeded} 张牌`);

    setGameState(prev => ({
        ...prev!,
        discardPile: [...prev!.discardPile, ...toDiscard],
        players: prev!.players.map(p => p.id === player.id ? { ...p, hand: kept } : p),
        phase: 'END'
    }));
  };

  // --- Interaction Handlers ---

  const handleCardPlay = (source: Player, targetId: string | null, card: PlayingCard) => {
      if (!gameState) return;
      
      triggerAnim(card, 'PLAY'); 
      const newHand = source.hand.filter(c => c.uniqueId !== card.uniqueId);
      let newDiscard = [...gameState.discardPile, card];
      let updatedPlayers = gameState.players.map(p => p.id === source.id ? { ...p, hand: newHand } : p);
      
      setGameState(prev => ({
          ...prev!,
          players: updatedPlayers,
          discardPile: newDiscard,
          selectedCardIdx: null
      }));

      addLog(`${source.character.name} 使用了 【${card.name}】`);

      if (card.type.includes('equip')) {
          newDiscard.pop();
          setGameState(prev => {
              const p = prev!.players.find(x => x.id === source.id)!;
              let newEquips = { ...p.equips };
              
              let oldEquip: PlayingCard | undefined;
              if (card.type === CardType.EQUIP_ARMOR) { oldEquip = p.equips.armor; newEquips.armor = card; }
              if (card.type === CardType.EQUIP_WEAPON) { oldEquip = p.equips.weapon; newEquips.weapon = card; }
              if (card.type === CardType.EQUIP_OFF_HORSE) { oldEquip = p.equips.offHorse; newEquips.offHorse = card; }
              if (card.type === CardType.EQUIP_DEF_HORSE) { oldEquip = p.equips.defHorse; newEquips.defHorse = card; }
              
              const finalDiscard = oldEquip ? [...prev!.discardPile, oldEquip] : prev!.discardPile;
              
              return {
                  ...prev!,
                  players: prev!.players.map(x => x.id === source.id ? { ...x, equips: newEquips } : x),
                  discardPile: finalDiscard
              };
          });
      }
      else if (card.type === CardType.ATTACK) {
          setGameState(prev => ({
              ...prev!,
              players: prev!.players.map(p => p.id === source.id ? { ...p, hasPlayedAttack: p.hasPlayedAttack + 1 } : p),
              pendingAction: {
                  type: 'RESPONSE_CARD',
                  sourceId: source.id,
                  targetId: targetId!,
                  cardNeeded: CardType.DODGE,
                  cardUsed: card,
                  message: `${source.character.name} 对你使用了螺旋丸，是否使用替身术？`,
                  actionAfter: 'DAMAGE'
              }
          }));
      }
      else if (card.type === CardType.DUEL) {
          setGameState(prev => ({ ...prev!, pendingAction: { type: 'RESPONSE_CARD', sourceId: source.id, targetId: targetId!, cardNeeded: CardType.NEGATE, cardUsed: card, message: `${source.character.name} 对你使用决斗，是否使用反螺旋丸？`, actionAfter: 'START_DUEL' } }));
      } else if (card.type === CardType.AOE) {
          setGameState(prev => ({ ...prev!, pendingAction: { type: 'JUDGEMENT', sourceId: source.id, targetId: 'ALL_OTHERS', cardUsed: card, message: '正在判定千鸟流...' } }));
      } else if (card.type === CardType.DAMAGE_SCROLL) {
          setGameState(prev => ({ ...prev!, pendingAction: { type: 'RESPONSE_CARD', sourceId: source.id, targetId: targetId!, cardNeeded: CardType.NEGATE, cardUsed: card, message: `${source.character.name} 对你使用豪火球，是否使用反螺旋丸？`, actionAfter: 'JUDGEMENT' } }));
      } else if (([CardType.STEAL_SCROLL, CardType.DISCARD_SCROLL, CardType.SKIP_TURN] as string[]).includes(card.type)) {
          setGameState(prev => ({ ...prev!, pendingAction: { type: 'RESPONSE_CARD', sourceId: source.id, targetId: targetId!, cardNeeded: CardType.NEGATE, cardUsed: card, message: `${source.character.name} 对你使用${card.name}，是否使用反螺旋丸？`, actionAfter: 'RESOLVE' } }));
      } else {
          resolveCardEffect(source.id, targetId, card);
      }
  };

  const resolveResponse = (playedCard: boolean, responseCard?: PlayingCard) => {
     if (!gameState || !gameState.pendingAction) return;
     const { sourceId, targetId, cardUsed, actionAfter } = gameState.pendingAction;
     
     if (playedCard) {
         if (actionAfter === 'DUEL_ROUND') {
             setGameState(prev => ({ ...prev!, pendingAction: { type: 'RESPONSE_CARD', sourceId: targetId, targetId: sourceId, cardNeeded: CardType.ATTACK, cardUsed: cardUsed, message: `决斗继续！请打出螺旋丸。`, actionAfter: 'DUEL_ROUND' } }));
             return;
         }
         addLog(gameState.pendingAction.cardNeeded === CardType.NEGATE ? `忍术被反螺旋丸抵消了！` : `抵抗成功！`);
         triggerVisual(targetId, 'LOG');
         setGameState(prev => ({ ...prev!, pendingAction: null }));
     } else {
         if (actionAfter === 'DAMAGE') { applyDamage(sourceId, targetId, 1); setGameState(prev => ({ ...prev!, pendingAction: null })); }
         else if (actionAfter === 'RESOLVE') { resolveCardEffect(sourceId, targetId, cardUsed); setGameState(prev => ({ ...prev!, pendingAction: null })); }
         else if (actionAfter === 'JUDGEMENT') { setGameState(prev => ({ ...prev!, pendingAction: { type: 'JUDGEMENT', sourceId: sourceId, targetId: targetId, cardUsed: cardUsed, message: `正在判定${cardUsed.name}...` } })); }
         else if (actionAfter === 'START_DUEL') { setGameState(prev => ({ ...prev!, pendingAction: { type: 'RESPONSE_CARD', sourceId: sourceId, targetId: targetId, cardNeeded: CardType.ATTACK, cardUsed: cardUsed, message: `决斗开始！请打出螺旋丸。`, actionAfter: 'DUEL_ROUND' } })); }
         else if (actionAfter === 'DUEL_ROUND') { applyDamage(sourceId, targetId, 1); setGameState(prev => ({ ...prev!, pendingAction: null })); }
         else { setGameState(prev => ({ ...prev!, pendingAction: null })); }
     }
  };

  const resolveCardEffect = (sourceId: string, targetId: string | null, card: PlayingCard) => {
      setGameState(prev => {
          if (!prev) return null;
          let updatedPlayers = [...prev.players];
          const source = updatedPlayers.find(p => p.id === sourceId)!;
          let deck = [...prev.deck];
          let discardPile = [...prev.discardPile];

          if (card.type === CardType.HEAL) { 
             source.hp = Math.min(source.hp + (source.character.id === 'tsunade' ? 2 : 1), source.maxHp); 
             addLog(`${source.character.name} 回复了体力`);
             triggerVisual(sourceId, 'HEAL');
          }
          else if (card.type === CardType.DRAW) {
             if (deck.length < 2) {
                 const combined = [...deck, ...discardPile];
                 // shuffle logic
                 for (let i = combined.length - 1; i > 0; i--) {
                     const j = Math.floor(Math.random() * (i + 1));
                     [combined[i], combined[j]] = [combined[j], combined[i]];
                 }
                 deck = combined;
                 discardPile = [];
                 addLog("牌堆重洗！", "important");
             }
             const drawn = deck.slice(0, 2); 
             source.hand = [...source.hand, ...drawn]; 
             deck = deck.slice(2);
             addLog(`${source.character.name} 发动影分身摸牌`); 
          }
          else if (card.type === CardType.SKIP_TURN) { const t = updatedPlayers.find(p => p.id === targetId)!; t.skippedTurn = true; addLog(`${t.character.name} 中了无限月读`); }
          // ... other effects ...
          else if (card.type === CardType.AOE) { triggerVisual('ALL', 'LIGHTNING'); updatedPlayers.forEach(p => { if (p.id !== sourceId) applyDamageState(p, 1, sourceId, updatedPlayers); }); }
          else if (card.type === CardType.DAMAGE_SCROLL) { const t = updatedPlayers.find(p => p.id === targetId)!; triggerVisual(targetId, 'FIRE'); applyDamageState(t, source.character.id === 'itachi' ? 2 : 1, sourceId, updatedPlayers); }
          
          return { ...prev, players: updatedPlayers, deck, discardPile };
      });
  };

  // ... Ultimate Logic ...
  const handleUltimateTrigger = (source: Player, skill: Skill, targetId?: string) => {
      if (!gameState) return;
      addLog(`${source.character.name} 发动了限定技【${skill.name}】！`, 'skill');
      setGameState(prev => ({ ...prev!, players: prev!.players.map(p => p.id === source.id ? { ...p, flags: { ...p.flags, 'ult_cooldown': 10 } } : p), activeSkill: null }));
      setGameState(prev => {
          let updatedPlayers = [...prev!.players];
          const src = updatedPlayers.find(p => p.id === source.id)!;
          const tgt = targetId ? updatedPlayers.find(p => p.id === targetId) : null;
          const oppIds = updatedPlayers.filter(p => p.id !== source.id && p.hp > 0).map(p => p.id);
          
          // Simplied Ult Effects mapping
          if (src.character.id === 'naruto' && tgt) { triggerVisual(tgt.id, 'RASENGAN'); applyDamageState(tgt, 2, source.id, updatedPlayers); }
          else if (src.character.id === 'sasuke') { triggerVisual('ALL', 'LIGHTNING'); oppIds.forEach(id => applyDamageState(updatedPlayers.find(p => p.id === id)!, 1, source.id, updatedPlayers)); }
          else if (src.character.id === 'kakashi' && tgt) { triggerVisual(tgt.id, 'LIGHTNING'); applyDamageState(tgt, 1, source.id, updatedPlayers); if (tgt.hp > 0) { ['weapon','armor','offHorse','defHorse'].forEach(s => tgt.equips[s as keyof typeof tgt.equips] = undefined); } }
          else if (src.character.id === 'sakura') { triggerVisual(src.id, 'HEAL'); src.hp = src.maxHp; }
          else if (src.character.id === 'gaara' && tgt) { tgt.skippedTurn = true; applyDamageState(tgt, 1, source.id, updatedPlayers); }
          else if (src.character.id === 'itachi' && tgt) { triggerVisual(tgt.id, 'FIRE'); applyDamageState(tgt, 2, source.id, updatedPlayers); }
          else if (src.character.id === 'tsunade') { triggerVisual(src.id, 'HEAL'); src.hp = Math.min(src.maxHp, src.hp + 2); src.hand.push(...prev!.deck.slice(0, 2)); return { ...prev!, deck: prev!.deck.slice(2), players: updatedPlayers }; }
          else if (src.character.id === 'jiraiya') { triggerVisual('ALL', 'FIRE'); oppIds.forEach(id => applyDamageState(updatedPlayers.find(p => p.id === id)!, 1, source.id, updatedPlayers)); }
          else if (src.character.id === 'orochimaru') { triggerVisual(src.id, 'HEAL'); src.hp = Math.min(src.maxHp, src.hp + 1); const need = Math.max(0, 5 - src.hand.length); if (need > 0) { src.hand.push(...prev!.deck.slice(0, need)); return { ...prev!, deck: prev!.deck.slice(need), players: updatedPlayers }; } }
          else if (src.character.id === 'pain') oppIds.forEach(id => { const t = updatedPlayers.find(p => p.id === id)!; if (t.hand.length > 0) t.hand.splice(0, Math.min(2, t.hand.length)); });
          else if (src.character.id === 'madara') { triggerVisual('ALL', 'BLOOD'); updatedPlayers.forEach(p => { if (p.hp > 0) applyDamageState(p, 1, source.id, updatedPlayers); }); src.hand.push(...prev!.deck.slice(0, 3)); return { ...prev!, deck: prev!.deck.slice(3), players: updatedPlayers }; }
          else if (src.character.id === 'minato' && tgt) { triggerVisual(tgt.id, 'RASENGAN'); applyDamageState(tgt, 2, source.id, updatedPlayers); }
          
          return { ...prev!, players: updatedPlayers };
      });
  };

  const applyDamageState = (target: Player, amount: number, sourceId: string, playersRef: Player[]) => {
      target.hp -= amount;
      triggerVisual(target.id, 'BLOOD');
      addLog(`${target.character.name} 受到 ${amount} 点伤害`, 'damage');
      if (target.hp <= 0) {
         addLog(`${target.character.name} 阵亡！`, 'important'); 
      }
  };

  const applyDamage = (sourceId: string, targetId: string, amount: number) => {
      setGameState(prev => {
          const newPlayers = prev!.players.map(p => ({ ...p }));
          const t = newPlayers.find(p => p.id === targetId)!;
          applyDamageState(t, amount, sourceId, newPlayers);
          const survivors = newPlayers.filter(p => p.hp > 0);
          if (survivors.length === 1) return { ...prev!, players: newPlayers, winner: survivors[0] };
          return { ...prev!, players: newPlayers };
      });
  };

  const handleCardClick = (idx: number) => { if (gameState?.phase === 'PLAY' && gameState.turnIndex === 0) { setActiveSkill(null); setSelectedCardIdx(selectedCardIdx === idx ? null : idx); } };
  const handleUltClick = () => { if (gameState?.phase === 'PLAY' && !gameState.players[0].flags['used_ult']) { const ult = gameState.players[0].character.skills.find(s => s.isUltimate); if (ult && checkUltimateAvailable(gameState.players[0])) { if (ult.ultType === 'target') { setSelectedCardIdx(null); setActiveSkill(ult); setShowTargetModal(true); } else handleUltimateTrigger(gameState.players[0], ult); } else showToast("未满足条件或冷却中！"); } };
  const handleTargetSelection = (targetId: string) => {
      if (activeSkill) { handleUltimateTrigger(gameState.players[0], activeSkill, targetId); setShowTargetModal(false); return; }
      if (selectedCardIdx !== null) { handleCardPlay(gameState.players[0], targetId, gameState.players[0].hand[selectedCardIdx]); setShowTargetModal(false); }
  };
  const handleDiscardClick = (idx: number) => { setGameState(prev => { if (!prev) return null; const c = prev.players[0].hand[idx]; const sel = prev.cardsToDiscard || []; return { ...prev, cardsToDiscard: sel.includes(c.uniqueId) ? sel.filter(id => id !== c.uniqueId) : [...sel, c.uniqueId] }; }); };
  const confirmDiscard = () => { 
      const user = gameState!.players[0]; 
      const discarded = user.hand.filter(c => gameState!.cardsToDiscard!.includes(c.uniqueId));
      discarded.forEach(c => triggerAnim(c, 'DISCARD'));
      const newHand = user.hand.filter(c => !gameState!.cardsToDiscard!.includes(c.uniqueId)); 
      setGameState(prev => ({ ...prev!, players: prev!.players.map(p => p.id === 'user' ? { ...p, hand: newHand } : p), phase: 'END', cardsToDiscard: [] })); 
  };

  const handlePlaySelected = () => {
      if (activeSkill) { setActiveSkill(null); return; }
      if (selectedCardIdx === null || !gameState) return;
      const card = gameState.players[0].hand[selectedCardIdx];
      if (card.type === CardType.ATTACK && gameState.players[0].hasPlayedAttack >= 2) {
           showToast("每回合只能使用两张螺旋丸！");
           return;
      }
      const targetCards = [CardType.ATTACK, CardType.DUEL, CardType.DAMAGE_SCROLL, CardType.STEAL_SCROLL, CardType.DISCARD_SCROLL, CardType.SKIP_TURN];
      if ((targetCards as string[]).includes(card.type)) setShowTargetModal(true);
      else handleCardPlay(gameState.players[0], null, card);
  };

  // --- INSPECT LOGIC ---
  const toggleInspect = (player: Player) => {
      if (inspectedPlayer && inspectedPlayer.id === player.id) {
          setInspectedPlayer(null);
      } else {
          setInspectedPlayer(player);
      }
  };

  // ... UI Rendering ...
  // (Same structure as HTML version: EquipmentSection, VisualEffect, CardComponent, PlayerAvatar, Main Layout)
  
  const EquipmentSection = ({ equips }: {equips: any}) => (
      <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-2 rounded-lg">
          {['weapon','armor','offHorse','defHorse'].map(k => (
              <div key={k} className="flex flex-col"><span className="text-[10px] text-gray-400">{k}</span>{equips[k] ? <span className="text-xs font-bold">{equips[k].name}</span> : <span className="text-gray-300">-</span>}</div>
          ))}
      </div>
  );

  if (showCharSelect) {
       return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-900 text-white">
              <h1 className="text-3xl font-bold text-orange-500 mb-4">火影杀 <span className="text-sm text-gray-400">5人模式</span></h1>
              <div className="grid grid-cols-3 gap-3 w-full max-w-md overflow-y-auto max-h-[70vh]">
                  {CHARACTERS.map(c => (
                      <div key={c.id} onClick={() => setPreviewChar(c)} className="bg-gray-800 p-3 rounded-lg flex flex-col items-center gap-2 border border-gray-700 active:border-orange-500">
                          <div className="text-4xl">{c.avatar}</div>
                          <div className="text-xs">{c.name}</div>
                      </div>
                  ))}
              </div>
              {previewChar && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setPreviewChar(null)}>
                      <div className="bg-white text-gray-900 p-6 rounded-xl w-full max-w-sm" onClick={e=>e.stopPropagation()}>
                          <div className="text-center mb-4"><div className="text-6xl">{previewChar.avatar}</div><h2 className="text-2xl font-bold">{previewChar.name}</h2></div>
                          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">{previewChar.skills.map(s => <div key={s.name}><div className="font-bold text-orange-600">{s.name}</div><div className="text-xs">{s.description}</div></div>)}</div>
                          <button onClick={() => startGame(previewChar.id)} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold">出战</button>
                      </div>
                  </div>
              )}
          </div>
       );
  }

  if (!gameState) return null;
  const user = gameState.players[0];
  const ais = gameState.players.slice(1);
  const userUlt = user.character.skills.find(s => s.isUltimate);

  return (
      <div className="w-full h-full bg-[#1a1a1a] flex flex-col relative overflow-hidden text-gray-100 font-sans">
          {/* Anim Layer */}
          {animatingCards.map(anim => <div key={anim.id} className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none"><CardComponent card={anim.card} size="normal" /></div>)}
          
          {/* Top: AI Grid */}
          <div className="flex-none p-2 grid grid-cols-2 gap-2 z-10 pt-12">
              {ais.map((ai, idx) => (
                  <PlayerAvatar key={ai.id} player={ai} isCurrentTurn={gameState.turnIndex === idx+1} isUser={false} position="top-grid" onClick={() => toggleInspect(ai)} activeEffect={visualEffects.find(v => v.targetId === ai.id || v.targetId === 'ALL')?.type} activeChat={chatMessages.find(c => c.playerId === ai.id)?.text} />
              ))}
          </div>

          {/* Top: Expandable Logs Bar (FIXED POSITION) */}
          <div className={`absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md transition-all duration-300 ${showLog ? 'h-auto max-h-40' : 'h-8'} overflow-hidden border-b border-white/10`}>
              <div className="flex justify-between items-center px-4 h-8 cursor-pointer" onClick={() => setShowLog(!showLog)}>
                  <span className="text-xs text-gray-300 flex items-center gap-2 truncate">
                      <i className="fa-solid fa-scroll text-orange-500"></i> 
                      {gameState.logs[gameState.logs.length-1]?.text || "等待行动..."}
                  </span>
                  <i className={`fa-solid fa-chevron-down text-xs text-gray-500 transition-transform ${showLog ? 'rotate-180' : ''}`}></i>
              </div>
              {showLog && (
                  <div className="p-2 space-y-1 overflow-y-auto max-h-32 no-scrollbar bg-black/20">
                      {gameState.logs.slice().reverse().map((log) => (
                          <div key={log.id} className={`text-[10px] border-l-2 pl-2 ${log.type === 'damage' ? 'border-red-500 text-red-300' : (log.type === 'important' ? 'border-yellow-500 text-yellow-200' : 'border-gray-600 text-gray-400')}`}>
                              {log.text}
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* Top Left: Deck Info (Under Log Bar) */}
          <div className="absolute top-10 left-2 flex gap-2 text-[10px] text-gray-500 z-0 pointer-events-none">
             <div className="bg-black/40 px-2 py-0.5 rounded">牌堆: {gameState.deck.length}</div>
             <div className="bg-black/40 px-2 py-0.5 rounded">弃牌: {gameState.discardPile.length}</div>
          </div>

          {/* Modals & Overlays */}
          {gameState.pendingAction?.type === 'JUDGEMENT' && <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40"><div className="bg-white text-black px-6 py-3 rounded-full font-bold animate-bounce">{gameState.pendingAction.message}</div></div>}
          
          {/* Bottom: Player Area (Fixed Layout) */}
          <div className="fixed bottom-0 w-full z-40 bg-gray-900/95 border-t border-gray-700 pb-safe pt-2 flex flex-col">
              
              <div className="flex justify-between items-end px-4 mb-2">
                  <div className="relative">
                      <PlayerAvatar player={user} isCurrentTurn={gameState.turnIndex === 0} isUser={true} position="bottom" onClick={() => toggleInspect(user)} activeEffect={visualEffects.find(v => v.targetId === user.id || v.targetId === 'ALL')?.type} activeChat={chatMessages.find(c => c.playerId === user.id)?.text} />
                      {/* Emote Trigger */}
                      <button onClick={() => setShowEmoteMenu(!showEmoteMenu)} className="absolute -top-2 -right-2 bg-white text-black rounded-full w-6 h-6 flex items-center justify-center shadow-md text-xs border border-gray-300">💬</button>
                      {/* Emote Menu */}
                      {showEmoteMenu && (
                          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl p-2 w-32 grid grid-cols-2 gap-2 z-50 animate-pop">
                              {EMOTES.map(e => (
                                  <button key={e.id} onClick={() => { triggerChat(user.id, e.text); setShowEmoteMenu(false); }} className="text-xl hover:bg-gray-100 p-1 rounded">{e.icon}</button>
                              ))}
                          </div>
                      )}
                  </div>

                  <div className="flex gap-2 items-center mb-1">
                      {userUlt && gameState.phase === 'PLAY' && gameState.turnIndex === 0 && (
                          <button onClick={handleUltClick} disabled={(user.flags['ult_cooldown'] as number) > 0} className={`w-10 h-10 rounded-full border-2 border-yellow-400 flex items-center justify-center text-lg ${(user.flags['ult_cooldown'] as number) > 0 ? 'bg-gray-600 opacity-50' : 'bg-yellow-600 animate-pulse'}`}>
                              <i className="fa-solid fa-dragon text-white"></i>
                              {(user.flags['ult_cooldown'] as number) > 0 && <span className="absolute text-[10px] bg-black text-white w-4 h-4 rounded-full -top-1 -right-1 flex items-center justify-center">{user.flags['ult_cooldown']}</span>}
                          </button>
                      )}
                      {gameState.phase === 'PLAY' && gameState.turnIndex === 0 && (
                          <>
                              <button onClick={handlePlaySelected} disabled={selectedCardIdx === null} className={`px-4 py-1.5 rounded-full font-bold shadow text-sm ${selectedCardIdx !== null ? 'bg-orange-600 text-white' : 'bg-gray-600 text-gray-400'}`}>出牌</button>
                              <button onClick={() => setGameState(prev => ({...prev!, phase: 'END'}))} className="px-4 py-1.5 bg-gray-700 text-white rounded-full font-bold shadow text-sm">结束</button>
                          </>
                      )}
                      {gameState.phase === 'DISCARD' && gameState.turnIndex === 0 && (
                          <button onClick={confirmDiscard} className="px-4 py-1.5 bg-red-700 text-white rounded-full font-bold shadow text-sm animate-pulse">确认弃牌</button>
                      )}
                  </div>
              </div>

              {/* Hand Row */}
              <div className="w-full h-32 overflow-x-auto custom-scrollbar px-4 flex items-end">
                  <div className="flex gap-[-15px] items-end pr-8 mx-auto min-w-min pl-2">
                      {user.hand.map((card, idx) => (
                          <div key={card.uniqueId} className="-ml-4 first:ml-0 transition-all hover:-translate-y-6 duration-200 z-0 hover:z-50" style={{ zIndex: selectedCardIdx === idx ? 50 : idx }}>
                              <CardComponent 
                                  card={card} 
                                  isPlayable={gameState.turnIndex === 0 && (gameState.phase === 'PLAY' || gameState.phase === 'DISCARD')}
                                  isSelected={selectedCardIdx === idx}
                                  isDiscardSelected={gameState.phase === 'DISCARD' && gameState.cardsToDiscard?.includes(card.uniqueId)}
                                  onClick={() => gameState.phase === 'DISCARD' ? handleDiscardClick(idx) : handleCardClick(idx)}
                              />
                          </div>
                      ))}
                      <div className="w-4 flex-shrink-0"></div>
                  </div>
              </div>
          </div>

          {/* Overlays */}
          {showTargetModal && <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"><div className="bg-white p-4 rounded-lg text-black w-3/4"><h3 className="text-lg font-bold mb-4">选择目标</h3><div className="flex flex-wrap gap-2 justify-center">{gameState.players.filter(p => p.id !== 'user' && p.hp > 0).map(p => <button key={p.id} onClick={() => {handleTargetSelection(p.id); setShowTargetModal(false);}} className="bg-gray-200 p-2 rounded hover:bg-orange-200">{p.character.avatar} {p.character.name}</button>)}</div><button onClick={() => setShowTargetModal(false)} className="mt-4 text-sm text-gray-500 w-full">取消</button></div></div>}
          
          {inspectedPlayer && (
              <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-6" onClick={() => setInspectedPlayer(null)}>
                  <div className="bg-white text-gray-900 rounded-xl p-5 max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-4 mb-4 border-b pb-3"><div className="text-5xl">{inspectedPlayer.character.avatar}</div><div><h2 className="text-2xl font-bold">{inspectedPlayer.character.name}</h2><div className="flex gap-1 mt-1">{Array.from({length: inspectedPlayer.maxHp}).map((_, i) => <div key={i} className={`w-3 h-3 rounded-full ${i < inspectedPlayer.hp ? 'bg-green-500' : 'bg-gray-300'}`}></div>)}</div></div></div>
                      <EquipmentSection equips={inspectedPlayer.equips} />
                      <div className="space-y-2 max-h-40 overflow-y-auto">{inspectedPlayer.character.skills.map(s => <div key={s.name}><div className="font-bold text-xs text-orange-600">{s.name}</div><div className="text-[10px] text-gray-500">{s.description}</div></div>)}</div>
                  </div>
              </div>
          )}

          {gameState.winner && <div className="absolute inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center text-white"><div className="text-6xl mb-4">🏆</div><h2 className="text-4xl font-bold mb-4">{gameState.winner.id === 'user' ? '胜利!' : '失败...'}</h2><button onClick={() => setShowCharSelect(true)} className="bg-orange-500 px-8 py-3 rounded-full font-bold">再来一局</button></div>}
          
          {toastMessage && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm z-[80]">{toastMessage}</div>}
      </div>
  );
}
