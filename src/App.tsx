import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, User, Cpu, Info, LogOut, PlayCircle, Zap, Star, TrendingUp, Home } from 'lucide-react';
import { auth, signInWithGoogle, db, loginGuest } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

// --- Sounds ---
const sounds = {
  deal: new Audio('https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3'),
  throw: new Audio('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'),
  winRound: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
  victory: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3')
};

const MOVE_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3';
const CAPTURE_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3';
const CHECK_SOUND = 'https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3';
const GAME_OVER_SOUND = 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3';

const playSfx = (key: keyof typeof sounds) => {
  const sfx = sounds[key];
  sfx.currentTime = 0;
  sfx.volume = 0.3;
  sfx.play().catch(() => {}); 
};

// --- Constants ---
const SUITS = ["♠", "♥", "♦", "♣"];
const TRUMP_OPTIONS = ["♠", "♥", "♦", "♣", "NT"];
const SUIT_LABELS: Record<string, string> = {
  "♠": "سبيد",
  "♥": "قلب",
  "♦": "ديناري",
  "♣": "كير",
  "NT": "بدون حكم"
};
const SUIT_COLORS: Record<string, string> = {
  "♠": "text-slate-900",
  "♥": "text-rose-600",
  "♦": "text-rose-600",
  "♣": "text-slate-900",
  "NT": "text-emerald-500",
};
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const BID_OPTIONS = [7, 8, 9, 10, 11, 12, 13];

type GamePhase = 'start' | 'bidding' | 'playing' | 'result';

interface Card {
  id: string;
  rank: string;
  suit: string;
  power: number;
}

interface Player {
  id: number;
  name: string;
  isAI: boolean;
  tricksWon: number;
  hand: Card[];
}

interface PlayedCard {
  playerId: number;
  card: Card;
}

interface BiddingState {
  currentBid: number | null;
  currentSuit: string | null;
  bidderId: number | null;
  passCount: number;
  playerActions: (string | null)[];
}

interface GameScore {
  teamA: number;
  teamB: number;
}

interface UserStats {
  wins: number;
  longestStreak: number;
  currentStreak: number;
  totalGames: number;
}

// --- Utils ---
const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach((rank, index) => {
      deck.push({
        id: `${rank}${suit}`,
        rank,
        suit,
        power: index
      });
    });
  });
  return deck.sort(() => Math.random() - 0.5);
};

// --- Chess Game Component ---
function ChessGame({ onBack }: { onBack: () => void }) {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<"white" | "black">(() => Math.random() > 0.5 ? "white" : "black");
  const [optionSquares, setOptionSquares] = useState({});

  function getMoveOptions(square: string) {
    const moves = game.moves({
      square: square as any,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: any = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to as any) && game.get(move.to as any).color !== game.get(square as any).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick() {
    setOptionSquares({});
  }

  function onPieceDragBegin(piece: string, sourceSquare: string) {
    if ((playerColor === "white" && piece[0] === "b") || (playerColor === "black" && piece[0] === "w")) {
       return;
    }
    getMoveOptions(sourceSquare);
  }

  function onPieceDragEnd() {
    setOptionSquares({});
  }
  const [moveFrom, setMoveFrom] = useState("");
  const [captured, setCaptured] = useState<{ white: string[]; black: string[] }>({ white: [], black: [] });

  useEffect(() => {
    // If AI is white, make the first move
    if (playerColor === "black" && game.turn() === "w" && game.history().length === 0) {
      setTimeout(makeRandomMove, 500);
    }
  }, [playerColor]);

  useEffect(() => {
    // Update captured pieces whenever game changes
    const history = game.history({ verbose: true });
    const whiteCap: string[] = [];
    const blackCap: string[] = [];
    history.forEach(move => {
      if (move.captured) {
        if (move.color === 'w') blackCap.push(move.captured);
        else whiteCap.push(move.captured);
      }
    });
    setCaptured({ white: whiteCap, black: blackCap });
  }, [game]);

  function makeRandomMove() {
    setGame((current) => {
      if (current.isGameOver() || current.isDraw()) return current;
      const gameCopy = new Chess(current.fen());
      const possibleMoves = gameCopy.moves();
      
      if (possibleMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * possibleMoves.length);
        try {
          const m = gameCopy.move(possibleMoves[randomIndex]);
          if (m.captured) new Audio(CAPTURE_SOUND).play().catch(() => {});
          else if (gameCopy.isCheck()) new Audio(CHECK_SOUND).play().catch(() => {});
          else new Audio(MOVE_SOUND).play().catch(() => {});
          
          if (gameCopy.isGameOver()) new Audio(GAME_OVER_SOUND).play().catch(() => {});

          return gameCopy;
        } catch (e) {
          console.error("AI Move Error:", e);
          return current;
        }
      }
      return current;
    });
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    setOptionSquares({});
    if ((playerColor === "white" && game.turn() === "b") || (playerColor === "black" && game.turn() === "w")) {
      return false;
    }

    const gameCopy = new Chess(game.fen());
    let moveResult = null;
    
    try {
      moveResult = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
    } catch (e) {
      return false;
    }

    if (moveResult === null) return false;

    if (moveResult.captured) new Audio(CAPTURE_SOUND).play().catch(() => {});
    else if (gameCopy.isCheck()) new Audio(CHECK_SOUND).play().catch(() => {});
    else new Audio(MOVE_SOUND).play().catch(() => {});

    if (gameCopy.isGameOver()) new Audio(GAME_OVER_SOUND).play().catch(() => {});

    setGame(gameCopy);
    if (!gameCopy.isGameOver()) setTimeout(makeRandomMove, 600);
    return true;
  }

  const pieceIcons: { [key: string]: string } = {
    p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚"
  };

  const rules = [
    { title: "الهدف", content: "وضع ملك الخصم في حالة 'كش مات'." },
    { title: "القطع", content: "ملك، وزير، قلعتان، حصانان، فيلان، 8 بيادق." },
    { title: "حركة الملك", content: "مربع واحد بأي اتجاه. لا يمكنه الوقوف في مربع مهدد." },
    { title: "الوزير", content: "بأي عدد من المربعات (أفقي، عمودي، قطري)." },
    { title: "القلعة", content: "أفقي أو عمودي بأي عدد مربعات." },
    { title: "الفيل", content: "قطري فقط." },
    { title: "الحصان", content: "حرف L، ويستطيع القفز فوق القطع." },
    { title: "البيدق", content: "خطوة للأمام (اثنان في البداية). يأكل قطرياً ويترقى في النهاية." },
    { title: "كش مات", content: "عندما لا يستطيع الملك الهروب وتنتهي المباراة." },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 overflow-y-auto" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 pt-16">
        
        {/* Game Area */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button onClick={onBack} title="العودة للقائمة الرئيسية" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all shadow-lg">
                <Home className="w-5 h-5 text-emerald-400" />
              </button>
              <h2 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">طاولة الشطرنج</h2>
            </div>
            <div className="flex gap-4 items-center">
              <div className="bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 border border-white/5">
                أنت تلعب بـ: <span className={playerColor === 'white' ? 'text-white' : 'text-slate-400'}>{playerColor === 'white' ? 'الأبيض' : 'الأسود'}</span>
              </div>
              <div className={`px-6 py-2 rounded-xl font-bold flex items-center gap-3 shadow-lg transition-all ${game.turn() === 'w' ? 'bg-white text-slate-900' : 'bg-slate-700 text-white'}`}>
                <div className={`w-3 h-3 rounded-full ${game.turn() === 'w' ? 'bg-slate-900' : 'bg-white'} ${!game.isGameOver() ? 'animate-pulse' : ''}`} />
                {game.turn() === 'w' ? 'دور الأبيض' : 'دور الأسود'}
              </div>
            </div>
          </div>

          <div className="aspect-square max-w-[600px] mx-auto shadow-2xl rounded-2xl overflow-hidden border-8 border-slate-800 relative">
            <Chessboard 
              {...({
                id: "chessBoard",
                position: game.fen(), 
                onPieceDrop: onDrop,
                onPieceDragBegin: onPieceDragBegin,
                onPieceDragEnd: onPieceDragEnd,
                onSquareClick: onSquareClick,
                boardOrientation: playerColor,
                customSquareStyles: optionSquares,
                customDarkSquareStyle: { backgroundColor: "#1e293b" },
                customLightSquareStyle: { backgroundColor: "#475569" },
                animationDuration: 300
              } as any)}
            />
            {game.isGameOver() && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-50">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl">
                  <Trophy className="w-10 h-10 text-slate-900" />
                </div>
                <h3 className="text-4xl font-black mb-2">
                  {game.isCheckmate() ? (game.turn() === 'w' ? 'فاز الأسود!' : 'فاز الأبيض!') : 'تعادل!'}
                </h3>
                <p className="text-slate-400 mb-8 max-w-xs font-bold">
                  {game.isCheckmate() ? 'تم تحقيق كش ملك بنجاح.' : 'انتهت المباراة بالتعادل.'}
                </p>
                <button 
                  onClick={() => {
                    setGame(new Chess());
                    setPlayerColor(Math.random() > 0.5 ? "white" : "black");
                  }}
                  className="bg-emerald-500 text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-emerald-400 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  مباراة جديدة
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
             <button 
               onClick={() => {
                 setGame(new Chess());
                 setPlayerColor(Math.random() > 0.5 ? "white" : "black");
               }}
               className="bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-white/5"
             >
               <RefreshCw className="w-5 h-5 text-emerald-400" />
               إعادة المباراة
             </button>
             <div className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-center transition-colors ${game.isCheck() ? 'border-red-500/50 bg-red-500/5' : 'border-white/5'}`}>
                <span className="text-slate-500 text-[10px] uppercase font-bold">الحالة</span>
                <span className={`font-bold ${game.isCheck() ? 'text-red-400' : 'text-emerald-400'}`}>
                  {game.isCheckmate() ? "كش مات! انتهت المباراة" : game.isCheck() ? "كش ملك!" : game.isDraw() ? "تعادل!" : "بانتظار الحركة..."}
                </span>
             </div>
          </div>

          {/* Captured Pieces Display */}
          <div className="mt-8 bg-slate-900/50 p-6 rounded-3xl border border-white/5">
             <h3 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-widest">القطع المأسورة</h3>
             <div className="flex justify-between gap-8">
                <div className="flex-1">
                   <p className="text-[10px] font-black text-white/40 mb-2">القطع المفقودة (الأبيض):</p>
                   <div className="flex flex-wrap gap-1 text-2xl text-white/60">
                      {captured.white.map((p, i) => <span key={i}>{pieceIcons[p.toLowerCase()]}</span>)}
                   </div>
                </div>
                <div className="w-px bg-white/5" />
                <div className="flex-1">
                   <p className="text-[10px] font-black text-white/40 mb-2">القطع المفقودة (الأسود):</p>
                   <div className="flex flex-wrap gap-1 text-2xl text-slate-500">
                      {captured.black.map((p, i) => <span key={i}>{pieceIcons[p.toLowerCase()]}</span>)}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Rules Sidebar */}
        <div className="w-full lg:w-96">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[3rem] sticky top-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black">قواعد اللعبة</h3>
            </div>

            <div className="space-y-6">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex flex-col gap-1 border-b border-white/5 pb-4 last:border-0">
                  <span className="text-emerald-400 font-bold text-sm">{rule.title}</span>
                  <p className="text-slate-400 text-sm leading-relaxed">{rule.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentView, setCurrentView] = useState<'selection' | 'whist' | 'chess'>('selection');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('start');
  const [gameScore, setGameScore] = useState<GameScore>({ teamA: 0, teamB: 0 });
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: "أنت", isAI: false, tricksWon: 0, hand: [] },
    { id: 2, name: "عثمان (آلي)", isAI: true, tricksWon: 0, hand: [] },
    { id: 3, name: "عبدو (زميلك)", isAI: true, tricksWon: 0, hand: [] },
    { id: 4, name: "بكري (آلي)", isAI: true, tricksWon: 0, hand: [] },
  ]);
  const [bidding, setBidding] = useState<BiddingState>({
    currentBid: null,
    currentSuit: null,
    bidderId: null,
    passCount: 0,
    playerActions: [null, null, null, null]
  });
  const [roundNum, setRoundNum] = useState(0);
  const [playedCards, setPlayedCards] = useState<PlayedCard[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [winnerMessage, setWinnerMessage] = useState<string | null>(null);
  const [trickWinner, setTrickWinner] = useState<number | null>(null);
  const [isProcessingTrick, setIsProcessingTrick] = useState(false);
  const [trumpSuit, setTrumpSuit] = useState<string | null>(null);
  const [ledSuit, setLedSuit] = useState<string | null>(null);
  const [mvpInfo, setMvpInfo] = useState<Player | null>(null);
  const [tempBidNum, setTempBidNum] = useState<number | null>(null);

  // Firestore Sync
  const fetchStats = async (uid: string) => {
    const docRef = doc(db, 'stats', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserStats(docSnap.data() as UserStats);
    } else {
      const initialStats = { wins: 0, longestStreak: 0, currentStreak: 0, totalGames: 0 };
      await setDoc(docRef, initialStats);
      setUserStats(initialStats);
    }
  };

  const updateStatsAfterGame = async (won: boolean) => {
    if (!user) return;
    const docRef = doc(db, 'stats', user.uid);
    const newStats = { ...(userStats || { wins: 0, longestStreak: 0, currentStreak: 0, totalGames: 0 }) };
    
    newStats.totalGames++;
    if (won) {
      newStats.wins++;
      newStats.currentStreak++;
      if (newStats.currentStreak > newStats.longestStreak) {
        newStats.longestStreak = newStats.currentStreak;
      }
    } else {
      newStats.currentStreak = 0;
    }

    await setDoc(docRef, newStats);
    setUserStats(newStats);
  };

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setPlayers(prev => {
          if (prev.length === 0) return prev;
          return [
            { ...prev[0], name: u.displayName || "أنت" },
            ...prev.slice(1)
          ];
        });
        fetchStats(u.uid);
      }
    });
  }, []);

  // Initialize Game
  const startNewGame = useCallback(() => {
    playSfx('deal');
    const deck = createDeck();
    setPlayers(prev => prev.map((p, i) => ({
      ...p,
      tricksWon: 0,
      hand: deck.slice(i * 13, (i + 1) * 13)
    })));
    setRoundNum(0);
    setPlayedCards([]);
    setWinnerMessage(null);
    setTrickWinner(null);
    setIsProcessingTrick(false);
    setTrumpSuit(null);
    setLedSuit(null);
    setMvpInfo(null);
    
    // Reset Bidding
    setBidding({
      currentBid: null,
      currentSuit: null,
      bidderId: null,
      passCount: 0,
      playerActions: [null, null, null, null]
    });
    setGamePhase('bidding');
    setCurrentPlayerIndex(0);
  }, []);

  const resetMatch = useCallback(() => {
    setGameScore({ teamA: 0, teamB: 0 });
    startNewGame();
  }, [startNewGame]);

  // Bidding Action
  const handleBid = useCallback((bid: number | null, suit: string | null) => {
    setBidding(prev => {
      const newActions = [...prev.playerActions];
      
      if (bid === null) {
        newActions[currentPlayerIndex] = "باص";
        return { 
          ...prev, 
          passCount: prev.passCount + 1, 
          playerActions: newActions 
        };
      } else {
        newActions[currentPlayerIndex] = `${bid} ${suit === 'NT' ? 'بلا' : suit}`;
        return {
          ...prev,
          currentBid: bid,
          currentSuit: suit,
          bidderId: players[currentPlayerIndex].id,
          passCount: 0,
          playerActions: newActions
        };
      }
    });

    // Move turn only if game isn't ending
    setBidding(prev => {
      if (!(prev.passCount >= 4 || (prev.passCount === 3 && prev.currentBid !== null))) {
        setCurrentPlayerIndex((currentPlayerIndex + 1) % 4);
      }
      return prev;
    });
  }, [currentPlayerIndex, players]);

  // Handle Bidding Transitions
  useEffect(() => {
    if (gamePhase === 'bidding') {
      if (bidding.passCount >= 4) {
        const timer = setTimeout(startNewGame, 1000);
        return () => clearTimeout(timer);
      }
      if (bidding.passCount === 3 && bidding.currentBid !== null) {
        const timer = setTimeout(() => {
          setGamePhase('playing');
          setTrumpSuit(bidding.currentSuit);
          setCurrentPlayerIndex(bidding.bidderId! - 1);
          setWinnerMessage(`بدأت اللعبة! الحكم: ${SUIT_LABELS[bidding.currentSuit!]}`);
          setTimeout(() => setWinnerMessage(null), 2000);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [bidding, gamePhase, startNewGame]);

  // AI Bidding Logic
  useEffect(() => {
    if (gamePhase === 'bidding' && players[currentPlayerIndex].isAI) {
      const timer = setTimeout(() => {
        const hand = players[currentPlayerIndex].hand;
        
        // Count power per suit
        const suitScores = SUITS.map(suit => {
          const cardsInSuit = hand.filter(c => c.suit === suit);
          const score = cardsInSuit.length + cardsInSuit.filter(c => c.power >= 9).length * 2;
          return { suit, score };
        }).sort((a,b) => b.score - a.score);

        const bestSuit = suitScores[0];
        const highCards = hand.filter(c => c.power >= 9).length; 
        
        let targetBid = 0;
        if (bestSuit.score >= 10 || highCards >= 6) targetBid = 10;
        else if (bestSuit.score >= 8 || highCards >= 4) targetBid = 8;
        else if (bestSuit.score >= 6 || highCards >= 3) targetBid = 7;

        if (targetBid > (bidding.currentBid || 6)) {
          handleBid(targetBid, bestSuit.suit);
        } else if (highCards >= 6 && targetBid > (bidding.currentBid || 6)) {
          // AI bids No Trump if many high cards
          handleBid(targetBid, "NT");
        } else {
          handleBid(null, null);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, bidding, players, handleBid, currentPlayerIndex]);

  // Handle Card Play
  const playCard = useCallback((playerId: number, cardIndex: number) => {
    if (isProcessingTrick || gamePhase !== 'playing' || playerId - 1 !== currentPlayerIndex) return;
    
    const playerIndex = playerId - 1;
    const player = players[playerIndex];
    const card = player.hand[cardIndex];

    if (!card) return;

    // RULE: Must follow suit if possible
    if (ledSuit && card.suit !== ledSuit) {
      const hasSuit = player.hand.some(c => c.suit === ledSuit);
      if (hasSuit) {
        // Technically this should be handled by UI feedback, but we block here for rules
        console.log("Must follow suit!");
        return;
      }
    }

    // Assign Trump suit on the very first play of the game
    if (roundNum === 0 && playedCards.length === 0) {
      setTrumpSuit(card.suit);
    }

    // Set Led suit for the current trick
    if (playedCards.length === 0) {
      setLedSuit(card.suit);
    }
    
    playSfx('throw');

    setPlayers(prev => {
      const newPlayers = [...prev];
      const p = { ...newPlayers[playerIndex] };
      p.hand = p.hand.filter((_, i) => i !== cardIndex);
      newPlayers[playerIndex] = p;
      return newPlayers;
    });

    setPlayedCards(current => [...current, { playerId, card }]);
    setCurrentPlayerIndex(prev => (prev + 1) % 4);
  }, [isProcessingTrick, gamePhase, currentPlayerIndex, players, ledSuit, roundNum, playedCards.length]);

  // AI Playing Logic
  useEffect(() => {
    if (gamePhase !== 'playing' || isProcessingTrick || trickWinner || winnerMessage) return;

    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.isAI && playedCards.length < 4) {
      const timer = setTimeout(() => {
        // AI choice: Try to follow suit first, otherwise pick anything
        let choiceIndex = -1;
        if (ledSuit) {
          choiceIndex = currentPlayer.hand.findIndex(c => c.suit === ledSuit);
        }
        
        if (choiceIndex === -1) {
          choiceIndex = Math.floor(Math.random() * currentPlayer.hand.length);
        }
        
        if (choiceIndex !== -1) {
          playCard(currentPlayer.id, choiceIndex);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentPlayerIndex, players, playedCards, gamePhase, isProcessingTrick, trickWinner, winnerMessage, playCard, ledSuit]);

  // Trick Resolution
  useEffect(() => {
    if (playedCards.length === 4 && !isProcessingTrick) {
      setIsProcessingTrick(true);
      
      const timer = setTimeout(() => {
        // Determine winner of trick
        // Rules: Highest Trump wins. If no Trump, highest of led suit wins.
        let bestPlay = playedCards[0];
        
        playedCards.forEach(play => {
          const isTrump = play.card.suit === trumpSuit;
          const isBestTrump = bestPlay.card.suit === trumpSuit;
          
          if (isTrump) {
            if (!isBestTrump || play.card.power > bestPlay.card.power) {
              bestPlay = play;
            }
          } else if (!isBestTrump && play.card.suit === ledSuit && play.card.power > bestPlay.card.power) {
            bestPlay = play;
          }
        });

        const winnerId = bestPlay.playerId;
        setTrickWinner(winnerId);
        playSfx('winRound');
        
        setPlayers(prev => prev.map(p => 
          p.id === winnerId ? { ...p, tricksWon: p.tricksWon + 1 } : p
        ));

        // Wait a bit to show the winner before clearing
        const nextTimer = setTimeout(() => {
          setPlayedCards([]); // This triggers the exit animation
          setIsProcessingTrick(false);
          setLedSuit(null); // Reset led suit for next trick
          setRoundNum(prev => {
            const nextRound = prev + 1;
            if (nextRound === 13) setGamePhase('result');
            return nextRound;
          });
          setCurrentPlayerIndex(winnerId - 1); 

          // Clear trick winner after a small delay to allow exit animation to use the ID
          setTimeout(() => setTrickWinner(null), 600);
        }, 1500);

        return () => clearTimeout(nextTimer);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [playedCards, isProcessingTrick]);

  // Result Calculation
  useEffect(() => {
    if (gamePhase === 'result' && !winnerMessage) {
      const teamA = players[0].tricksWon + players[2].tricksWon;
      const teamB = players[1].tricksWon + players[3].tricksWon;
      
      const bidderTeam = bidding.bidderId! % 2 === 1 ? 'TeamA' : 'TeamB';
      const bidderScore = bidderTeam === 'TeamA' ? teamA : teamB;
      const target = bidding.currentBid!;
      
      const success = bidderScore >= target;
      const points = success ? target : -target;

      setGameScore(prev => {
        const newScore = { ...prev };
        if (bidderTeam === 'TeamA') newScore.teamA += points;
        else newScore.teamB += points;
        return newScore;
      });
      
      // Determine MVP (highest tricks won)
      const sortedPlayers = [...players].sort((a,b) => b.tricksWon - a.tricksWon);
      setMvpInfo(sortedPlayers[0]);
      playSfx('victory');

      if (success) {
        const msg = `فوز الفريق المسمي! أحرزوا ${bidderScore} لمّات من التزام ${target}. (+${target} نقطة)`;
        setWinnerMessage(msg);
      } else {
        const msg = `تبويش! الفريق المسمي لم يوفِ بالتزامه. (${points} نقطة)`;
        setWinnerMessage(msg);
      }

      // Check for global match win
      setGameScore(prev => {
        if (prev.teamA >= 13) {
          setWinnerMessage(current => `تـم الجـلد! فاز الفريق الخاص بكم بالمباراة كاملة! 🎉\n${current}`);
          updateStatsAfterGame(true);
        } else if (prev.teamB >= 13) {
          setWinnerMessage(current => `للأسف! الفريق الخصم فاز بالمباراة كاملة. 💀\n${current}`);
          updateStatsAfterGame(false);
        }
        return prev;
      });
    }
  }, [gamePhase, players, bidding, winnerMessage]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Sign in failed:", error);
      setLoginError(error?.message || "حدث خطأ غير متوقع أثناء تسجيل الدخول");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await loginGuest();
    } catch (error: any) {
      console.error("Guest sign in failed:", error);
      if (error?.code === 'auth/admin-restricted-operation' || error?.message?.includes('admin-restricted-operation')) {
        // Fallback to local guest mode if Firebase Anonymous Auth is disabled
        const mockGuest = {
          uid: `guest_${Math.random().toString(36).substr(2, 9)}`,
          displayName: "زائر",
          isAnonymous: true,
          photoURL: null,
          email: null
        };
        
        // Use local storage to persist guest session if needed, but for now just set state
        setUser(mockGuest as any);
        setPlayers(prev => {
          if (prev.length === 0) return prev;
          return [
            { ...prev[0], name: "زائر" },
            ...prev.slice(1)
          ];
        });
        // Clear error and inform user of the alternative
        setLoginError(null); 
        console.info("Using Local Guest Mode. Enable Anonymous Auth in Firebase Console for persistent guest IDs.");
      } else {
        setLoginError("فشل تسجيل الدخول كزائر. تأكد من اتصالك بالإنترنت.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 p-10 rounded-[3rem] shadow-2xl max-w-lg w-full border border-slate-700 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
            <Trophy className="w-32 h-32 text-emerald-500" />
          </div>
          <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-12">
            <PlayCircle className="text-white w-10 h-10" />
          </div>
          <h1 className="text-5xl font-black text-white mb-6 font-sans tracking-tighter">السودان للألعاب</h1>
          <p className="text-slate-400 mb-10 text-lg leading-relaxed font-light">
            مرحباً بك في منصة الألعاب السودانية. اختر لعبتك المفضلة وابدأ التحدي.
          </p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-400 text-sm font-bold animate-pulse">
              {loginError}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className={`w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-4 group active:scale-95 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoggingIn ? (
                <RefreshCw className="w-6 h-6 animate-spin text-slate-900" />
              ) : (
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
              )}
              {isLoggingIn ? 'جاري تسجيل الدخول...' : 'الدخول عبر Google'}
            </button>

            <button 
              onClick={handleGuestSignIn}
              disabled={isLoggingIn}
              className={`w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-4 group active:scale-95 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <User className="w-6 h-6 text-slate-400 group-hover:text-white transition-all" />
              دخول كزائر
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (currentView === 'selection') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="absolute top-8 left-8 flex items-center gap-4">
           {userStats && (
             <div className="flex gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-emerald-400 font-black px-3">
                  <Zap className="w-4 h-4 fill-emerald-400" />
                  {userStats.currentStreak}
                </div>
                <div className="flex items-center gap-2 text-yellow-500 font-black px-3">
                  <Star className="w-4 h-4 fill-yellow-500" />
                  {userStats.wins}
                </div>
             </div>
           )}
           <button onClick={() => signOut(auth)} className="p-3 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
             <LogOut className="w-5 h-5" />
           </button>
        </div>

        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-black text-white mb-12 text-center"
        >
          اختر اللعبة
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          {/* Whist (Zait) */}
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentView('whist')}
            className="group relative bg-emerald-600 rounded-[3rem] p-8 cursor-pointer overflow-hidden shadow-2xl shadow-emerald-900/20"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
              <Trophy className="w-40 h-40" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-4xl font-black text-white mb-2">الزيت السوداني</h3>
                <p className="text-emerald-100 text-lg">اللعبة التقليدية المفضلة للجميع.</p>
              </div>
              <div className="flex items-center gap-3 text-white font-bold bg-black/20 self-start px-6 py-3 rounded-2xl">
                <span>العب الآن</span>
                <PlayCircle className="w-5 h-5" />
              </div>
            </div>
          </motion.div>

          {/* Chess */}
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentView('chess')}
            className="group relative bg-slate-800 rounded-[3rem] p-8 cursor-pointer overflow-hidden shadow-2xl shadow-black/40 border border-white/5"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
              <Trophy className="w-40 h-40 text-white" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Info className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-4xl font-black text-white mb-2">الشطرنج</h3>
                <p className="text-slate-400 text-lg">لعبة الملوك والذكاء الاستراتيجي.</p>
              </div>
              <div className="flex items-center gap-3 text-white font-bold bg-white/10 self-start px-6 py-3 rounded-2xl">
                <span>ابدأ التحدي</span>
                <PlayCircle className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (currentView === 'chess') {
    return <ChessGame onBack={() => setCurrentView('selection')} />;
  }

  if (currentView === 'whist' && gamePhase === 'start') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        {/* User Stats HUD */}
        <div className="absolute top-8 left-8 flex items-center gap-6">
           {userStats && (
             <div className="flex gap-6">
               <div className="flex flex-col items-end">
                 <span className="text-[10px] text-slate-500 font-bold">سلسلة انتصارات</span>
                 <div className="flex items-center gap-1 text-emerald-400 font-black">
                   <Zap className="w-4 h-4 fill-emerald-400" />
                   {userStats.currentStreak}
                 </div>
               </div>
               <div className="flex flex-col items-end">
                 <span className="text-[10px] text-slate-500 font-bold">إجمالي الفوز</span>
                 <div className="flex items-center gap-1 text-yellow-500 font-black">
                   <Star className="w-4 h-4 fill-yellow-500" />
                   {userStats.wins}
                 </div>
               </div>
             </div>
           )}
           <button onClick={() => signOut(auth)} className="p-3 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
             <LogOut className="w-5 h-5" />
           </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-3xl p-12 rounded-[4rem] shadow-2xl max-w-md w-full border border-white/5 text-center relative">
          <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Trophy className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 leading-tight">وست سودانية</h1>
          <p className="text-slate-500 mb-10 text-lg">باشا، هل أنت جاهز للِم اللّمات؟</p>
          
          <div className="flex flex-col gap-4">
            <button onClick={startNewGame} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-5 rounded-3xl transition-all shadow-2xl shadow-emerald-500/30 active:scale-95 text-xl flex items-center justify-center gap-3">
               <PlayCircle className="w-6 h-6" />
               بدء اللعب
            </button>
            <button onClick={() => setCurrentView('selection')} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-3xl transition-all flex items-center justify-center gap-3">
               <Home className="w-5 h-5" />
               العودة للرئيسية
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/30 overflow-hidden relative flex flex-col" dir="rtl">
      
      {/* HUD - Scores */}
      <div className="p-4 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 backdrop-blur-md border-b border-white/5 z-20 gap-4">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto max-w-full pb-2 sm:pb-0 scrollbar-hide">
          {players.map((p, idx) => {
            const isMyTurn = (gamePhase === 'playing' && currentPlayerIndex === idx) || (gamePhase === 'bidding' && currentPlayerIndex === idx);
            const isTeammate = idx === 2; // In 0, 1, 2, 3 indexing, 0 and 2 are partners
            return (
              <div key={p.id} className={`flex flex-col items-center px-6 py-3 rounded-3xl border-2 transition-all duration-500 whitespace-nowrap relative ${isMyTurn ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-110' : 'border-white/5 bg-slate-800/40 opacity-50'}`}>
                <div className="absolute -top-3 flex gap-1">
                  {isTeammate && <span className="bg-blue-500 text-[8px] px-2 py-0.5 rounded-full font-black text-white">زميلي</span>}
                  {p.isAI && <Cpu className="w-3 h-3 text-slate-400" />}
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-black mb-1 ${isMyTurn ? 'text-emerald-400' : 'text-slate-400'}`}>{p.name}</span>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                   <span className="text-xl font-black">{p.tricksWon}</span>
                </div>
                {isMyTurn && <div className="absolute -bottom-2 w-4 h-4 bg-emerald-400 rotate-45" />}
              </div>
            );
          })}
        </div>
        
        {/* Match Score HUD */}
        <div className="flex items-center gap-4 bg-slate-800/80 px-6 py-2 rounded-2xl border border-white/10 shadow-2xl">
          <div className="text-center">
            <div className="text-[8px] text-slate-500 font-bold">فريقكم</div>
            <div className={`text-xl font-black ${gameScore.teamA >= 0 ? 'text-white' : 'text-rose-500'}`}>{gameScore.teamA}</div>
          </div>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <div className="text-center">
            <div className="text-[8px] text-slate-500 font-bold">الخصم</div>
            <div className={`text-xl font-black ${gameScore.teamB >= 0 ? 'text-white' : 'text-rose-500'}`}>{gameScore.teamB}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {trumpSuit && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl flex items-center gap-2">
              <span className="text-[10px] text-emerald-500 font-black uppercase">الحكم: </span>
              <span className={`text-xl font-black ${SUIT_COLORS[trumpSuit]}`}>
                {trumpSuit === "NT" ? "N/T" : trumpSuit}
              </span>
              <span className="text-[10px] font-bold opacity-60">({SUIT_LABELS[trumpSuit]})</span>
            </div>
          )}
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase font-black">الجولة</div>
            <div className="text-lg font-mono font-bold">{Math.min(roundNum + 1, 13)}/13</div>
          </div>
          <button onClick={() => setCurrentView('selection')} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors">
            <Home className="w-5 h-5 text-emerald-400" />
          </button>
          <button onClick={resetMatch} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden felt-gradient felt-texture perspective-1000">
        
        {/* Table Center Design */}
        <div className="w-[600px] h-[600px] rounded-full border-4 border-emerald-400/10 absolute opacity-30 animate-pulse pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/5 rounded-full pointer-events-none" />
        
        {/* Bidding UI Overlay */}
        <AnimatePresence>
          {gamePhase === 'bidding' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute z-40 bg-slate-900/95 border border-white/10 p-8 rounded-[4rem] shadow-2xl backdrop-blur-2xl max-w-sm w-full mx-4"
            >
              <div className="text-center mb-8">
                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">نظام التسمية</span>
                <h3 className="text-2xl font-bold mt-2">
                  {currentPlayerIndex === 0 ? "دورك في التسمية" : `تسمية ${players[currentPlayerIndex].name}`}
                </h3>
                {bidding.currentBid && (
                  <div className="mt-4 flex items-center justify-center gap-3 bg-emerald-500/10 border border-emerald-500/20 py-3 rounded-2xl text-emerald-400 font-black text-xl">
                    {bidding.currentBid} <span className={SUIT_COLORS[bidding.currentSuit!]}>{bidding.currentSuit}</span>
                  </div>
                )}
              </div>

              {currentPlayerIndex === 0 ? (
                <div className="flex flex-col gap-6">
                  <div className="text-sm font-bold text-slate-500 mb-2">١. اختر عدد اللمات</div>
                  <div className="grid grid-cols-4 gap-2">
                    {BID_OPTIONS.map(bid => {
                      const isDisabled = bid <= (bidding.currentBid || 0);
                      return (
                        <button
                          key={bid}
                          disabled={isDisabled}
                          onClick={() => setTempBidNum(bid)}
                          className={`py-3 rounded-xl font-black transition-all border ${
                            tempBidNum === bid 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : isDisabled
                            ? 'bg-slate-800 text-slate-600 border-transparent opacity-40'
                            : 'bg-slate-700 text-white border-white/5 hover:border-white/20'
                          }`}
                        >
                          {bid}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-sm font-bold text-slate-500 mb-2">٢. اختر البوهية (الأتو)</div>
                  <div className="grid grid-cols-5 gap-2">
                    {TRUMP_OPTIONS.map(suit => (
                      <button
                        key={suit}
                        disabled={!tempBidNum}
                        onClick={() => {
                          if (tempBidNum) {
                            handleBid(tempBidNum, suit);
                            setTempBidNum(null);
                          }
                        }}
                        className={`py-4 rounded-xl text-3xl font-bold transition-all border flex flex-col items-center justify-center ${SUIT_COLORS[suit]} bg-slate-800 border-white/5 ${!tempBidNum ? 'opacity-20 grayscale' : 'hover:bg-slate-700 active:scale-95 hover:border-white/20 shadow-lg'}`}
                      >
                        <span className={suit === "NT" ? "text-sm" : ""}>
                          {suit === "NT" ? "N/T" : suit}
                        </span>
                        <span className="text-[8px] font-bold mt-1 text-slate-500">{SUIT_LABELS[suit]}</span>
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => {
                      handleBid(null, null);
                      setTempBidNum(null);
                    }}
                    className="w-full py-4 bg-slate-800/80 text-slate-400 hover:text-rose-400 font-bold border border-white/5 rounded-2xl hover:border-rose-400/30 transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>باص (Pass)</span>
                    <span className="text-[10px] opacity-40 group-hover:opacity-100">← ينتقل الدور</span>
                  </button>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 animate-pulse">يتم التفكير في التسمية...</p>
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="grid grid-cols-2 gap-4 text-right" dir="rtl">
                  {players.map((p, i) => (
                    <div key={p.id} className="flex flex-col gap-1 bg-white/5 p-3 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${currentPlayerIndex === i ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                         <span className={`text-[10px] font-black uppercase ${currentPlayerIndex === i ? 'text-emerald-400' : 'text-slate-500'}`}>
                           {p.name}
                         </span>
                      </div>
                      <span className="text-sm font-black text-white">
                        {bidding.playerActions[i] || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trick Winner / Notifications */}
        <AnimatePresence>
          {trickWinner && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute z-50 pointer-events-none"
            >
              <div className="bg-emerald-500 text-white px-10 py-4 rounded-3xl font-black text-xl shadow-2xl shadow-emerald-500/40">
                لمّة {players[trickWinner - 1].name}!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cards on Table */}
        <div className="relative w-full h-full max-w-4xl mx-auto pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence>
              {playedCards.map((play, idx) => {
                // Professional table positioning: cards move to a neat cross around center
                const offset = 85;
                const pos = [
                  { y: offset, x: 0, r: 0 },    // Player 1 (Bottom)
                  { y: 0, x: offset, r: 90 },   // Player 2 (Right)
                  { y: -offset, x: 0, r: 180 }, // Player 3 (Top)
                  { y: 0, x: -offset, r: 270 }  // Player 4 (Left)
                ][play.playerId - 1];

                return (
                  <motion.div
                    key={`table-${play.playerId}-${play.card.id}-${roundNum}`}
                    initial={{ scale: 2, opacity: 0, y: play.playerId === 1 ? 400 : -400, x: play.playerId === 2 ? 400 : -400 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1, 
                      y: pos.y,
                      x: pos.x,
                      rotate: pos.r + (Math.random() * 10 - 5) // Slight natural tilt
                    }}
                    exit={{ 
                      scale: 0.2, 
                      opacity: 0,
                      x: trickWinner === 2 ? 600 : trickWinner === 4 ? -600 : 0,
                      y: trickWinner === 1 ? 600 : trickWinner === 3 ? -600 : 0,
                      transition: { duration: 0.5, ease: "easeIn" }
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    className="absolute z-10 shadow-2xl"
                  >
                    <PlayingCard card={play.card} size="lg" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900/80 px-2 py-0.5 rounded text-[8px] font-black text-white/50 border border-white/10 uppercase">
                      {players[play.playerId-1].name}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* User Hand Area */}
      <div className="h-64 sm:h-72 bg-slate-900/50 backdrop-blur-3xl border-t border-white/5 relative px-4 flex flex-col items-center justify-end pb-8 group">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
          <div className={`px-6 py-2 rounded-full flex items-center gap-3 text-xs font-black border transition-all duration-300 ${gamePhase === 'playing' && currentPlayerIndex === 0 ? 'bg-emerald-500 border-emerald-400 text-white shadow-2xl shadow-emerald-500/40 animate-bounce' : 'bg-slate-800 border-slate-700 text-slate-500 opacity-50'}`}>
            <User className="w-3 h-3" />
            {gamePhase === 'playing' ? (currentPlayerIndex === 0 ? 'دورك الآن' : 'انتظر دور الخصم') : 'انتظار التسميات'}
          </div>
          
          {gamePhase === 'playing' && currentPlayerIndex === 0 && ledSuit && !players[0].hand.some(c => c.suit === ledSuit) && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              className="bg-rose-500 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-lg flex items-center gap-2 hover:bg-rose-400 transition-all border-2 border-white/20 animate-pulse"
              onClick={() => {
                 setWinnerMessage("ما عندك نفس البوهية؟ ارمي أي حاجة تانية يا باشا!");
                 setTimeout(() => setWinnerMessage(null), 3000);
              }}
            >
              <Zap className="w-3 h-3 fill-white" />
              باص (ما عندي النوع)
            </motion.button>
          )}
        </div>
        
        <div className="flex -space-x-10 sm:-space-x-14 max-w-full overflow-x-visible pb-12 transition-all p-12 group/hand items-end">
          {players[0].hand.map((card, idx) => {
            const canPlay = gamePhase === 'playing' && currentPlayerIndex === 0;
            const hasSuit = ledSuit && players[0].hand.some(c => c.suit === ledSuit);
            const isInvalidInTrick = ledSuit && hasSuit && card.suit !== ledSuit;
            
            // Professional Fan Effect
            const total = players[0].hand.length;
            const cardRotation = (idx - total / 2) * (30 / total);
            const cardY = Math.abs(idx - total / 2) * 4;

            return (
              <motion.div
                key={`hand-${card.id}`}
                layout
                initial={{ y: 200, opacity: 0, rotate: cardRotation }}
                animate={{ 
                  y: cardY, 
                  opacity: 1, 
                  rotate: cardRotation,
                  x: 0
                }}
                whileHover={canPlay && !isInvalidInTrick ? { 
                  y: -120, 
                  rotate: 0, 
                  scale: 1.4, 
                  zIndex: 100,
                  transition: { type: "spring", stiffness: 400, damping: 20 }
                } : {}}
                onClick={() => playCard(1, idx)}
                className={`
                  ${canPlay && !isInvalidInTrick ? 'cursor-pointer active:scale-95 active:rotate-0' : 'opacity-40 grayscale-[50%] pointer-events-none'} 
                  transform-gpu origin-bottom relative transition-all duration-300
                  ${!isInvalidInTrick && canPlay ? 'hover:z-50 shadow-2xl' : ''}
                `}
              >
                <div className="relative group/card">
                  <PlayingCard card={card} />
                  {canPlay && !isInvalidInTrick && (
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Results / Game Over */}
      <AnimatePresence>
        {gamePhase === 'result' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.8, y: 100 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-white/5 p-12 rounded-[5rem] max-w-lg w-full text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_#10b981]" />
              
              <div className="w-28 h-28 bg-yellow-500 text-slate-950 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-6 animate-pulse">
                <Trophy className="w-14 h-14" />
              </div>
              
              <h2 className="text-4xl font-black mb-4 tracking-tighter">نهاية الجولة</h2>
              <p className="text-slate-400 mb-10 text-xl font-light italic leading-relaxed px-4">{winnerMessage}</p>
              
              {mvpInfo && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[3rem] mb-10 flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                       <Zap className="w-6 h-6 fill-white" />
                     </div>
                     <div className="text-right">
                       <span className="text-[10px] text-emerald-500 font-black uppercase">أفضل لاعب (MVP)</span>
                       <div className="text-xl font-black text-white">{mvpInfo.name}</div>
                     </div>
                   </div>
                   <div className="text-2xl font-mono font-black text-emerald-400">×{mvpInfo.tricksWon}</div>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={gameScore.teamA >= 13 || gameScore.teamB >= 13 ? resetMatch : startNewGame} 
                  className="flex-1 bg-white text-slate-950 font-black py-6 rounded-3xl transition-all shadow-2xl hover:bg-slate-100 active:scale-95 flex items-center justify-center gap-3 text-lg"
                >
                  <TrendingUp className="w-5 h-5" />
                  {gameScore.teamA >= 13 || gameScore.teamB >= 13 ? 'مباراة جديدة' : 'جولة أخرى'}
                </button>
                <button onClick={() => setCurrentView('selection')} className="p-6 bg-slate-800 text-white rounded-3xl hover:bg-slate-700 transition-all">
                   <Home className="w-6 h-6" />
                </button>
                <button onClick={() => setGamePhase('start')} className="p-6 bg-slate-800 text-white rounded-3xl hover:bg-slate-700 transition-all">
                   <RefreshCw className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayingCard({ card, size = "md" }: { card: Card; size?: "md" | "lg" }) {
  const isLarge = size === "lg";
  return (
    <div className={`
      ${isLarge ? 'w-28 h-40' : 'w-20 h-28 sm:w-24 sm:h-36'} 
      bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-3 sm:p-4 relative border border-slate-200 card-3d-shadow overflow-hidden
    `}>
      {/* Texture for realism */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
      
      <div className={`flex flex-col items-start ${SUIT_COLORS[card.suit]} z-10`}>
        <span className="text-lg sm:text-xl font-black leading-none">{card.rank}</span>
        <span className="text-xs sm:text-sm font-bold">{card.suit}</span>
      </div>
      
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-6xl ${SUIT_COLORS[card.suit]} opacity-20 filter blur-[0.5px] z-0`}>
        {card.suit}
      </div>

      <div className={`flex flex-col items-end rotate-180 ${SUIT_COLORS[card.suit]} z-10`}>
        <span className="text-lg sm:text-xl font-black leading-none">{card.rank}</span>
        <span className="text-xs sm:text-sm font-bold">{card.suit}</span>
      </div>
    </div>
  );
}
