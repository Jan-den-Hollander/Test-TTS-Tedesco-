/**
 * Magische Spiegel — Verjaardagsspiegel voor Kinderen
 * Gebaseerd op Specchio dell'Anima — Efteling / Anton Piek stijl
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Helpers ───────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
      ]);
    } catch (err) {
      const isLast = attempt === maxAttempts;
      const isRetryable = err?.message?.includes('timeout') ||
                          err?.message?.includes('503') ||
                          err?.message?.includes('overloaded');
      if (isLast || !isRetryable) throw err;
      await sleep(attempt * 1500);
    }
  }
}

// ── Verjaardagsfeitjes per dag/maand ─────────────────────────────────────
// Claude API wordt gebruikt om dynamisch feitjes te genereren,
// maar hier zijn standaard fallbacks per maand voor offline werking
const MONTH_THEMES = {
  1: "januari — de maand van nieuwe beginnen",
  2: "februari — de maand van het hart",
  3: "maart — de maand van de lente",
  4: "april — de maand van bloemen en grappige dagen",
  5: "mei — de maand van de mooiste bloesems",
  6: "juni — de maand van de zomer",
  7: "juli — de warmste maand",
  8: "augustus — de maand van zonnen en avontuur",
  9: "september — de maand van het nieuwe schooljaar",
  10: "oktober — de maand van pompoenen en herfst",
  11: "november — de maand van de sterren",
  12: "december — de maand van lichtjes en magie",
};

// ── Setup stappen ─────────────────────────────────────────────────────────
const SETUP_STEPS = {
  NAME: 'name',
  DATE: 'date',
  DONE: 'done',
};

// ── Systeem prompt voor Claude ────────────────────────────────────────────
const buildBirthdayPrompt = (name, birthDay, birthMonth, daysUntil) => {
  const monthName = ['januari','februari','maart','april','mei','juni',
    'juli','augustus','september','oktober','november','december'][birthMonth - 1];

  let timing = '';
  if (daysUntil === 0) timing = 'VANDAAG is de verjaardag!';
  else if (daysUntil > 0 && daysUntil <= 7) timing = `Over ${daysUntil} dag${daysUntil === 1 ? '' : 'en'} is de verjaardag!`;
  else if (daysUntil < 0 && daysUntil >= -7) timing = `De verjaardag was ${Math.abs(daysUntil)} dag${Math.abs(daysUntil) === 1 ? '' : 'en'} geleden!`;

  return `Je bent de Magische Spiegel, een betoverde spiegel uit een sprookjesbos. Je spreekt als een vriendelijke, warme, en vrolijke spiegel uit het Efteling-sprookjesbos. Je toon is magisch, warm en kindvriendelijk.

Het kind heet: ${name}
Verjaardag: ${birthDay} ${monthName}
${timing}

Geef een korte maar hartelijke verjaardagsboodschap (max 3 zinnen) EN precies 2 of 3 echte historische feitjes die op ${birthDay} ${monthName} in het verleden hebben plaatsgevonden en die kinderen leuk vinden. Denk aan: geboortedag van een artiest/tekenfilmfiguur, ontdekking van een dier, uitvinding van een speelgoed, opening van een pretpark, etc.

Antwoord ALLEEN als JSON zonder uitleg of markdown:
{
  "nl": "Nederlandse verjaardagsboodschap",
  "en": "English birthday message",
  "fr": "Message d'anniversaire en français",
  "de": "Geburtstagsnachricht auf Deutsch",
  "facts": [
    {"year": 1984, "nl": "Nederlandstalig feitje", "en": "English fact", "fr": "Fait en français", "de": "Fakt auf Deutsch"},
    {"year": 1995, "nl": "Nederlandstalig feitje 2", "en": "English fact 2", "fr": "Fait 2 en français", "de": "Fakt 2 auf Deutsch"}
  ]
}`;
};

// ── Decoratieve SVG elementen (Anton Piek / Efteling stijl) ───────────────
function OrnateFrame({ width = 260, height = 320 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5e642" />
          <stop offset="30%" stopColor="#d4a017" />
          <stop offset="60%" stopColor="#b8860b" />
          <stop offset="80%" stopColor="#f0c040" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        <linearGradient id="goldGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="50%" stopColor="#c49a0c" />
          <stop offset="100%" stopColor="#f5e642" />
        </linearGradient>
        <filter id="goldGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Buitenste decoratieve rand */}
      <ellipse cx="130" cy="160" rx="120" ry="148" fill="none" stroke="url(#goldGrad)" strokeWidth="8" />
      <ellipse cx="130" cy="160" rx="112" ry="140" fill="none" stroke="url(#goldGrad2)" strokeWidth="2.5" opacity="0.6" />
      <ellipse cx="130" cy="160" rx="104" ry="132" fill="none" stroke="#f5e642" strokeWidth="1" opacity="0.3" />

      {/* Bovenkant decoratie — kroon/bloem */}
      <path d="M130 8 L138 22 L154 16 L146 30 L162 28 L150 40 L166 42 L152 50 L165 56 L148 58 L155 72 L138 65 L130 78 L122 65 L105 72 L112 58 L95 56 L108 50 L94 42 L110 40 L98 28 L114 30 L106 16 L122 22 Z" fill="url(#goldGrad)" filter="url(#goldGlow)" />
      
      {/* Kleine sterren op kroon */}
      <circle cx="130" cy="8" r="3" fill="#fff8c0" opacity="0.9" />
      <circle cx="108" cy="18" r="2" fill="#fff8c0" opacity="0.7" />
      <circle cx="152" cy="18" r="2" fill="#fff8c0" opacity="0.7" />

      {/* Zijkant decoraties links */}
      <path d="M10 120 Q18 110, 20 125 Q22 140, 14 145 Q6 150, 10 120 Z" fill="url(#goldGrad)" opacity="0.8" />
      <path d="M8 155 Q16 145, 18 160 Q20 175, 12 178 Q4 182, 8 155 Z" fill="url(#goldGrad)" opacity="0.8" />
      <path d="M12 190 Q20 180, 22 195 Q24 210, 16 213 Q8 217, 12 190 Z" fill="url(#goldGrad)" opacity="0.8" />

      {/* Zijkant decoraties rechts */}
      <path d="M250 120 Q242 110, 240 125 Q238 140, 246 145 Q254 150, 250 120 Z" fill="url(#goldGrad)" opacity="0.8" />
      <path d="M252 155 Q244 145, 242 160 Q240 175, 248 178 Q256 182, 252 155 Z" fill="url(#goldGrad)" opacity="0.8" />
      <path d="M248 190 Q240 180, 238 195 Q236 210, 244 213 Q252 217, 248 190 Z" fill="url(#goldGrad)" opacity="0.8" />

      {/* Onderkant decoratie */}
      <path d="M90 305 Q110 295, 130 300 Q150 295, 170 305 Q155 312, 130 315 Q105 312, 90 305 Z" fill="url(#goldGrad)" />
      
      {/* Kleine rozetten op hoekpunten van ellips */}
      {[
        [38, 75], [222, 75], [18, 160], [242, 160], [38, 245], [222, 245]
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle r="6" fill="url(#goldGrad)" />
          <circle r="3" fill="#fff8c0" opacity="0.8" />
          {[0,60,120,180,240,300].map((angle, j) => (
            <line key={j} x1="0" y1="0"
              x2={Math.cos(angle*Math.PI/180)*9}
              y2={Math.sin(angle*Math.PI/180)*9}
              stroke="#d4a017" strokeWidth="1.5" opacity="0.6" />
          ))}
        </g>
      ))}
    </svg>
  );
}

function MagicParticles() {
  const particles = Array.from({length: 12}, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    color: ['#f5e642','#fff8c0','#ffb347','#ff9de2','#a8edea'][i % 5],
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '50% 50% 48% 48%', zIndex: 3 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: p.color,
          opacity: 0,
          animation: `sparkle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          boxShadow: `0 0 ${p.size}px ${p.color}`,
        }} />
      ))}
    </div>
  );
}

function Firefly({ x, y, delay, duration }) {
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: 6, height: 6, borderRadius: '50%',
      background: '#f5e642',
      boxShadow: '0 0 8px #f5e642, 0 0 16px rgba(245,230,66,0.5)',
      animation: `firefly ${duration}s ease-in-out ${delay}s infinite`,
      pointerEvents: 'none',
    }} />
  );
}

const FIREFLIES = Array.from({length: 18}, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  delay: Math.random() * 4, duration: 3 + Math.random() * 3,
}));

// ── Talen ─────────────────────────────────────────────────────────────────
const LANG_LABELS = { nl: '🇳🇱 NL', en: '🇬🇧 EN', fr: '🇫🇷 FR', de: '🇩🇪 DE' };

// ── Setup invoer stap component ───────────────────────────────────────────
function SetupStep({ step, name, setName, birthInput, setBirthInput, onListenName, onListenDate, isListening, onConfirm, listenTarget }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 20,
        background: 'rgba(20,10,40,0.92)', borderRadius: '50% 50% 48% 48%', zIndex: 10,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>
        {step === SETUP_STEPS.NAME ? '👤' : '🎂'}
      </div>
      <p style={{ color: '#f5e642', fontFamily: "'IM Fell English', serif", fontSize: 13, textAlign: 'center', margin: '0 0 12px', lineHeight: 1.5, textShadow: '0 0 10px rgba(245,230,66,0.5)' }}>
        {step === SETUP_STEPS.NAME
          ? 'Hoe heet jij, lief kind?'
          : `Wanneer ben jij geboren, ${name}?`}
      </p>
      {step === SETUP_STEPS.NAME ? (
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Typ je naam..."
          style={{
            background: 'rgba(245,230,66,0.08)', border: '1px solid rgba(245,230,66,0.4)',
            borderRadius: 12, padding: '8px 14px', color: '#f5e642',
            fontSize: 16, textAlign: 'center', outline: 'none',
            fontFamily: "'IM Fell English', serif", width: '80%', marginBottom: 10,
          }}
        />
      ) : (
        <input
          value={birthInput}
          onChange={e => setBirthInput(e.target.value)}
          placeholder="DD-MM of DD-MM-JJJJ"
          style={{
            background: 'rgba(245,230,66,0.08)', border: '1px solid rgba(245,230,66,0.4)',
            borderRadius: 12, padding: '8px 14px', color: '#f5e642',
            fontSize: 16, textAlign: 'center', outline: 'none',
            fontFamily: "'IM Fell English', serif", width: '80%', marginBottom: 10,
          }}
        />
      )}
      
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onMouseDown={step === SETUP_STEPS.NAME ? onListenName : onListenDate}
          onTouchStart={step === SETUP_STEPS.NAME ? onListenName : onListenDate}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: isListening && listenTarget === step ? 'rgba(200,50,50,0.8)' : 'rgba(245,230,66,0.15)',
            border: '2px solid rgba(245,230,66,0.5)',
            color: '#f5e642', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'all 0.2s',
          }}
          title="Spreek in de microfoon"
        >
          {isListening && listenTarget === step ? '🔴' : '🎤'}
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: '8px 20px', borderRadius: 20,
            background: 'linear-gradient(135deg, #d4a017, #f5e642)',
            border: 'none', color: '#2a1a00', fontWeight: 700,
            cursor: 'pointer', fontSize: 13,
            fontFamily: "'IM Fell English', serif",
            boxShadow: '0 2px 12px rgba(212,160,23,0.5)',
          }}
        >
          Verder ✨
        </button>
      </div>
      <p style={{ fontSize: 10, color: 'rgba(245,230,66,0.4)', marginTop: 10, textAlign: 'center' }}>
        {step === SETUP_STEPS.DATE ? 'Bijv: 15-04 of 15-04-2015' : ''}
      </p>
    </motion.div>
  );
}

// ── Tekstballon component ─────────────────────────────────────────────────
function SpeechBubble({ message, lang, setLang, onSpeak }) {
  if (!message) return null;
  const mainText = message[lang] || message.nl || '';
  const facts = message.facts || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        width: '100%', maxWidth: 420,
        background: 'linear-gradient(160deg, rgba(40,25,10,0.97) 0%, rgba(25,15,5,0.99) 100%)',
        border: '2px solid rgba(212,160,23,0.6)',
        borderRadius: 18, padding: '14px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(212,160,23,0.1)',
        position: 'relative', zIndex: 5,
      }}
    >
      {/* Driehoekje omhoog naar spiegel */}
      <div style={{
        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
        borderBottom: '12px solid rgba(212,160,23,0.6)',
      }} />
      <div style={{
        position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
        borderBottom: '10px solid rgba(40,25,10,0.97)',
      }} />

      {/* Taal knoppen */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        {Object.entries(LANG_LABELS).map(([l, label]) => (
          <button key={l} onClick={() => setLang(l)} style={{
            padding: '2px 8px', borderRadius: 12,
            background: lang === l ? 'rgba(212,160,23,0.3)' : 'transparent',
            border: `1px solid ${lang === l ? 'rgba(212,160,23,0.8)' : 'rgba(212,160,23,0.2)'}`,
            color: lang === l ? '#f5e642' : 'rgba(245,230,66,0.4)',
            fontSize: 10, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {label}
          </button>
        ))}
        <button onClick={onSpeak} style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 16, opacity: 0.6,
        }}>🔊</button>
      </div>

      {/* Hoofdtekst */}
      <p style={{
        margin: '0 0 10px', color: '#f5e642',
        fontFamily: "'IM Fell English', serif",
        fontSize: 14, lineHeight: 1.7,
        textShadow: '0 0 8px rgba(245,230,66,0.3)',
      }}>
        ✨ {mainText}
      </p>

      {/* Feitjes */}
      {facts.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(212,160,23,0.2)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 9, color: 'rgba(212,160,23,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            ✦ Op jouw verjaardag in het verleden ✦
          </p>
          {facts.map((f, i) => (
            <div key={i} style={{
              background: 'rgba(245,230,66,0.05)',
              border: '1px solid rgba(212,160,23,0.15)',
              borderRadius: 10, padding: '6px 10px',
            }}>
              <span style={{ color: '#d4a017', fontSize: 10, fontWeight: 700 }}>{f.year} · </span>
              <span style={{ color: 'rgba(245,230,66,0.75)', fontSize: 11, fontStyle: 'italic' }}>
                {f[lang] || f.nl}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Hoofd App ─────────────────────────────────────────────────────────────
export default function MagischeSpiegel() {
  const [setupStep, setSetupStep] = useState(SETUP_STEPS.NAME);
  const [childName, setChildName] = useState('');
  const [birthInput, setBirthInput] = useState('');
  const [birthDay, setBirthDay] = useState(null);
  const [birthMonth, setBirthMonth] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [message, setMessage] = useState(null);
  const [lang, setLang] = useState('nl');
  const [status, setStatus] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [listenTarget, setListenTarget] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('magic_mirror_key') || ''; } catch { return ''; }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [daysInfo, setDaysInfo] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { /* camera niet beschikbaar */ }
  };

  // Bereken dagen tot/na verjaardag
  const computeDaysUntil = (day, month) => {
    const now = new Date();
    const thisYear = now.getFullYear();
    let bday = new Date(thisYear, month - 1, day);
    const diff = Math.round((bday - now) / (1000 * 60 * 60 * 24));
    // Als > 7 of < -7, check volgend/vorig jaar
    if (diff > 180) { bday = new Date(thisYear - 1, month - 1, day); return Math.round((bday - now) / (1000 * 60 * 60 * 24)); }
    if (diff < -180) { bday = new Date(thisYear + 1, month - 1, day); return Math.round((bday - now) / (1000 * 60 * 60 * 24)); }
    return diff;
  };

  const parseBirthDate = (input) => {
    const clean = input.trim().replace(/\//g, '-');
    const parts = clean.split('-');
    if (parts.length >= 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return { day: d, month: m };
    }
    return null;
  };

  const handleConfirmName = () => {
    if (!childName.trim()) { setStatus('Zeg eerst je naam! 🌟'); return; }
    setSetupStep(SETUP_STEPS.DATE);
    setStatus('');
  };

  const handleConfirmDate = () => {
    const parsed = parseBirthDate(birthInput);
    if (!parsed) { setStatus('Ik begrijp de datum niet. Probeer bijv. 15-04 ✨'); return; }
    setBirthDay(parsed.day);
    setBirthMonth(parsed.month);
    const days = computeDaysUntil(parsed.day, parsed.month);
    setDaysInfo(days);
    setSetupStep(SETUP_STEPS.DONE);
    fetchBirthdayMessage(childName, parsed.day, parsed.month, days);
  };

  // ── Microfoon luisteren ────────────────────────────────────────────────
  const startListening = (target, lang = 'nl-NL') => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus('Microfoon niet beschikbaar in deze browser 🎤'); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => { setIsListening(true); setListenTarget(target); setStatus('Ik luister... 👂'); };
    rec.onresult = (e) => {
      const heard = e.results[0][0].transcript;
      setStatus('');
      if (target === SETUP_STEPS.NAME) {
        setChildName(heard.replace(/[^a-zA-ZÀ-ÿ\s-]/g, '').trim());
      } else if (target === SETUP_STEPS.DATE) {
        // Probeer datum te herkennen uit gesproken tekst
        const nums = heard.match(/\d+/g);
        if (nums && nums.length >= 2) {
          setBirthInput(`${nums[0]}-${nums[1]}`);
        } else {
          setBirthInput(heard);
        }
      }
    };
    rec.onerror = () => { setIsListening(false); setListenTarget(null); setStatus('Ik hoorde je niet goed 🌟'); };
    rec.onend = () => { setIsListening(false); setListenTarget(null); };
    rec.start();
  };

  // ── AI verjaardagsboodschap ────────────────────────────────────────────
  const fetchBirthdayMessage = async (name, day, month, days) => {
    setIsThinking(true);
    setStatus('De spiegel denkt na... ✨');
    const key = apiKey || '';
    if (!key) {
      setIsThinking(false);
      setStatus('Voer een API sleutel in 🔑');
      return;
    }

    const prompt = buildBirthdayPrompt(name, day, month, days);

    try {
      const response = await fetchWithRetry(() =>
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          }),
        }).then(r => r.json())
      );

      const raw = response.content?.[0]?.text || '{}';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleaned);
      setMessage(data);
      setStatus('');
      if (data.nl) speakText(data.nl);
    } catch (err) {
      setStatus('De spiegel kon niet antwoorden. Probeer opnieuw! 🌟');
    }
    setIsThinking(false);
  };

  // ── Browser TTS ────────────────────────────────────────────────────────
  const speakText = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utt = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const langCode = { nl: 'nl', en: 'en', fr: 'fr', de: 'de' }[lang] || 'nl';
    const v = voices.find(v => v.lang.startsWith(langCode)) || voices[0];
    if (v) utt.voice = v;
    utt.rate = 0.9; utt.pitch = 1.1;
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const saveKey = (k) => {
    setApiKey(k);
    try { localStorage.setItem('magic_mirror_key', k); } catch {}
    setShowKeyModal(false);
  };

  const handleReset = () => {
    setSetupStep(SETUP_STEPS.NAME);
    setChildName('');
    setBirthInput('');
    setBirthDay(null);
    setBirthMonth(null);
    setMessage(null);
    setDaysInfo(null);
    setStatus('');
    window.speechSynthesis.cancel();
  };

  // Bereken welk soort begroeting
  const getDaysBanner = () => {
    if (daysInfo === null) return null;
    if (daysInfo === 0) return { emoji: '🎂', text: 'Gefeliciteerd! Vandaag is jouw dag!', color: '#f5e642' };
    if (daysInfo > 0 && daysInfo <= 7) return { emoji: '⏳', text: `Nog ${daysInfo} dag${daysInfo === 1 ? '' : 'en'} tot jouw verjaardag!`, color: '#ffb347' };
    if (daysInfo < 0 && daysInfo >= -7) return { emoji: '🎉', text: `Jouw verjaardag was ${Math.abs(daysInfo)} dag${Math.abs(daysInfo) === 1 ? '' : 'en'} geleden!`, color: '#a8edea' };
    return null;
  };
  const banner = getDaysBanner();

  const isDone = setupStep === SETUP_STEPS.DONE;

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=UnifrakturMaguntia&display=swap');
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.9; transform: scale(1.2); }
        }
        @keyframes firefly {
          0% { opacity: 0; transform: translate(0,0); }
          25% { opacity: 0.8; }
          50% { opacity: 0.3; transform: translate(${Math.random()>0.5?'':'-'}${20+Math.random()*30}px, ${Math.random()>0.5?'':'-'}${15+Math.random()*20}px); }
          75% { opacity: 0.7; }
          100% { opacity: 0; transform: translate(0,0); }
        }
        @keyframes mirrorPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(212,160,23,0.3), 0 0 80px rgba(212,160,23,0.1), inset 0 0 30px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 60px rgba(212,160,23,0.5), 0 0 120px rgba(212,160,23,0.2), inset 0 0 30px rgba(0,0,0,0.5); }
        }
        @keyframes titleShimmer {
          0%, 100% { text-shadow: 0 0 10px rgba(245,230,66,0.5), 0 2px 4px rgba(0,0,0,0.8); }
          50% { text-shadow: 0 0 20px rgba(245,230,66,0.9), 0 0 40px rgba(245,230,66,0.4), 0 2px 4px rgba(0,0,0,0.8); }
        }
        @keyframes speakingRing {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes thinkingDot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes bannerGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(245,230,66,0.3); }
          50% { box-shadow: 0 0 24px rgba(245,230,66,0.7); }
        }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(245,230,66,0.3); }
      `}</style>

      {/* Achtergrond */}
      <div style={styles.bg} />
      <div style={styles.bgForest} />

      {/* Vuurvliegjes */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {FIREFLIES.map(f => <Firefly key={f.id} {...f} />)}
      </div>

      {/* Titel */}
      <header style={styles.header}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={styles.title}>✦ Magische Spiegel ✦</h1>
          <p style={styles.subtitle}>Vertel mij wie jij bent...</p>
        </div>
      </header>

      {/* Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ ...styles.banner, borderColor: banner.color, color: banner.color, animation: 'bannerGlow 2s ease-in-out infinite' }}
          >
            {banner.emoji} {banner.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spiegel sectie */}
      <div style={styles.mirrorSection}>
        <div style={{ position: 'relative', width: 260, height: 320 }}>
          {/* Gouden lijst SVG */}
          <OrnateFrame width={260} height={320} />

          {/* Spiegel zelf */}
          <div style={styles.mirrorFrame}>
            <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
            
            {/* Magische glinstering overlay */}
            {isDone && <MagicParticles />}

            {/* Setup overlay */}
            <AnimatePresence>
              {setupStep !== SETUP_STEPS.DONE && (
                <SetupStep
                  step={setupStep}
                  name={childName}
                  setName={setChildName}
                  birthInput={birthInput}
                  setBirthInput={setBirthInput}
                  onListenName={() => startListening(SETUP_STEPS.NAME)}
                  onListenDate={() => startListening(SETUP_STEPS.DATE)}
                  isListening={isListening}
                  listenTarget={listenTarget}
                  onConfirm={setupStep === SETUP_STEPS.NAME ? handleConfirmName : handleConfirmDate}
                />
              )}
            </AnimatePresence>

            {/* Denkende bellen */}
            {isThinking && (
              <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 15 }}>
                {[0,200,400].map((d, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#f5e642',
                    animation: `thinkingDot 1s ease-in-out ${d}ms infinite`,
                    boxShadow: '0 0 6px #f5e642',
                  }} />
                ))}
              </div>
            )}

            {/* Spreek-ring */}
            {isSpeaking && (
              <div style={{
                position: 'absolute', inset: -4, borderRadius: '50% 50% 48% 48%',
                border: '3px solid #f5e642',
                animation: 'speakingRing 1s ease-in-out infinite',
                pointerEvents: 'none', zIndex: 4,
              }} />
            )}
          </div>

          {/* Naam badge */}
          {isDone && childName && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={styles.nameBadge}
            >
              ✦ {childName} ✦
            </motion.div>
          )}
        </div>
      </div>

      {/* Status */}
      {status ? (
        <p style={styles.status}>{status}</p>
      ) : null}

      {/* Tekstballon */}
      <AnimatePresence>
        {message && (
          <div style={{ width: '100%', maxWidth: 420, padding: '0 12px', marginTop: 8 }}>
            <SpeechBubble
              message={message}
              lang={lang}
              setLang={setLang}
              onSpeak={() => speakText(message[lang] || message.nl)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Volgend kind knop */}
      {isDone && !isThinking && message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          style={{ marginTop: 14, zIndex: 5, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
          <button onClick={handleReset} style={styles.btnNextChild}>
            ✨ Volgend kind ✨
          </button>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(245,230,66,0.3)', fontStyle: 'italic' }}>
            Tik hier als een ander kind aan de beurt is
          </p>
        </motion.div>
      )}

      {/* API sleutel knop */}
      <button onClick={() => setShowKeyModal(true)} style={styles.btnKey}>
        <Key size={10} style={{ marginRight: 4 }} />
        {apiKey ? 'API sleutel ✓' : 'API sleutel invoeren'}
      </button>

      {/* API sleutel modal */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.modal}
            onClick={(e) => e.target === e.currentTarget && setShowKeyModal(false)}
          >
            <div style={styles.modalBox}>
              <h2 style={styles.modalTitle}>🔑 API Sleutel</h2>
              <p style={styles.modalHint}>
                Gratis sleutel via claude.ai of via de Anthropic API.<br />
                De sleutel wordt alleen op jouw apparaat opgeslagen.
              </p>
              <input
                type="password"
                id="keyInput"
                defaultValue={apiKey}
                placeholder="sk-ant-..."
                style={styles.modalInput}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setShowKeyModal(false)} style={styles.modalBtnCancel}>Annuleer</button>
                <button
                  onClick={() => saveKey(document.getElementById('keyInput').value)}
                  style={styles.modalBtnSave}
                >Opslaan</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = {
  app: {
    minHeight: '100vh',
    background: '#0d0a04',
    color: '#f0e8d0',
    fontFamily: "'IM Fell English', serif",
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 0 40px', position: 'relative', overflow: 'hidden',
  },
  bg: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(60,35,5,0.8) 0%, rgba(10,6,2,0.95) 60%, #050300 100%)',
    pointerEvents: 'none', zIndex: 0,
  },
  bgForest: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: `
      radial-gradient(ellipse at 10% 90%, rgba(20,50,10,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 90% 90%, rgba(20,50,10,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(30,60,10,0.4) 0%, transparent 40%)
    `,
  },
  header: {
    width: '100%', maxWidth: 480,
    padding: '20px 16px 10px',
    display: 'flex', justifyContent: 'center',
    position: 'relative', zIndex: 5,
  },
  title: {
    margin: 0, fontSize: 22, fontWeight: 700,
    fontFamily: "'IM Fell English', serif",
    color: '#f5e642',
    animation: 'titleShimmer 3s ease-in-out infinite',
    letterSpacing: '0.05em',
  },
  subtitle: {
    margin: '4px 0 0', fontSize: 11,
    color: 'rgba(245,230,66,0.45)',
    letterSpacing: '0.15em',
    fontStyle: 'italic',
  },
  banner: {
    width: '100%', maxWidth: 420,
    margin: '0 12px 10px',
    padding: '8px 16px',
    background: 'rgba(20,12,0,0.85)',
    border: '1px solid',
    borderRadius: 20,
    fontSize: 13, textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: '0.05em',
    zIndex: 5, position: 'relative',
  },
  mirrorSection: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    position: 'relative', zIndex: 5, marginBottom: 8,
  },
  mirrorFrame: {
    position: 'absolute',
    top: 16, left: 20,
    width: 220, height: 282,
    borderRadius: '50% 50% 47% 47%',
    overflow: 'hidden',
    background: 'linear-gradient(160deg, #0d1a0a 0%, #050a04 100%)',
    animation: 'mirrorPulse 4s ease-in-out infinite',
    zIndex: 1,
  },
  video: {
    width: '100%', height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    filter: 'brightness(0.85) contrast(1.05) saturate(0.8)',
  },
  nameBadge: {
    position: 'absolute', bottom: -8, left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, rgba(30,18,2,0.95), rgba(20,12,0,0.95))',
    border: '1px solid rgba(212,160,23,0.5)',
    borderRadius: 20, padding: '4px 18px',
    fontSize: 12, color: '#f5e642',
    whiteSpace: 'nowrap', zIndex: 10,
    letterSpacing: '0.08em',
    boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
  },
  status: {
    fontSize: 12, color: 'rgba(245,230,66,0.6)',
    fontStyle: 'italic', margin: '4px 0',
    zIndex: 5, textAlign: 'center', position: 'relative',
  },
  btnNextChild: {
    padding: '11px 28px',
    background: 'linear-gradient(135deg, #8B6914, #d4a017, #f5e642, #d4a017, #8B6914)',
    backgroundSize: '200% auto',
    border: 'none', borderRadius: 30,
    color: '#1a0e00', fontWeight: 700, cursor: 'pointer',
    fontSize: 14, fontFamily: "'IM Fell English', serif",
    letterSpacing: '0.08em',
    boxShadow: '0 4px 20px rgba(212,160,23,0.5), 0 0 40px rgba(212,160,23,0.2)',
    transition: 'all 0.2s',
  },
  btnKey: {
    marginTop: 14, padding: '5px 14px',
    background: 'transparent',
    border: '1px solid rgba(212,160,23,0.15)',
    borderRadius: 20, fontSize: 10,
    color: 'rgba(212,160,23,0.4)',
    letterSpacing: '0.1em', cursor: 'pointer',
    display: 'flex', alignItems: 'center',
    position: 'relative', zIndex: 5,
    fontFamily: "'IM Fell English', serif",
  },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modalBox: {
    background: 'linear-gradient(160deg, #1a100a, #0d0804)',
    border: '2px solid rgba(212,160,23,0.5)',
    borderRadius: 20, padding: 24, maxWidth: 300, width: '90%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
  },
  modalTitle: {
    margin: '0 0 4px', fontWeight: 400, fontSize: 18,
    color: '#f5e642', textAlign: 'center',
    fontFamily: "'IM Fell English', serif",
  },
  modalHint: {
    margin: '0 0 14px', fontSize: 11, lineHeight: 1.6,
    color: 'rgba(245,230,66,0.45)', textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(212,160,23,0.3)',
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13, color: '#f0e8d0', outline: 'none', textAlign: 'center',
  },
  modalBtnCancel: {
    flex: 1, padding: '9px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12,
    fontFamily: "'IM Fell English', serif",
  },
  modalBtnSave: {
    flex: 1, padding: '9px',
    background: 'linear-gradient(135deg, #d4a017, #f5e642)',
    border: 'none', borderRadius: 10,
    color: '#1a0e00', fontWeight: 700, cursor: 'pointer',
    fontSize: 12, fontFamily: "'IM Fell English', serif",
    letterSpacing: '0.05em',
  },
};
