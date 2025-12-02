import React, { useState, useEffect, useRef } from 'react';

const ByersLights = () => {
  const [inputValue, setInputValue] = useState('');
  const [showDialog, setShowDialog] = useState(true);
  const [dialogMessage, setDialogMessage] = useState('click anywhere to start');
  const [isStarted, setIsStarted] = useState(false);
  const [activeLetter, setActiveLetter] = useState(null);

  const audioContextRef = useRef(null);
  const soundBufferRef = useRef(null);
  const currentSourceRef = useRef(null); // ensure only one sound at a time

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const colors = ['#FF0077', '#FF6A00', '#00F5FF', '#00FF00'];

  // helpers
  const isAlpha = (char) => /^[A-Za-z]$/.test(char);

  const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

  const getRandomRotation = () => {
    const angle = (Math.random() - 0.5) * 90;
    return angle;
  };

  // audio setup
  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioCtx();
    loadSound();
  }, []);

  const loadSound = async () => {
    try {
      const response = await fetch('/bulb.mp3'); // bulb.mp3 in public/
      const arrayBuffer = await response.arrayBuffer();
      if (!audioContextRef.current) return;
      soundBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Failed to load sound:', error);
    }
  };

  const playSound = async () => {
    if (!soundBufferRef.current || !audioContextRef.current) return;

    // resume context if needed (autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (e) {
        console.error('Error resuming audio context:', e);
      }
    }

    // stop previous sound so they don't stack and get louder
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {
        // ignore if already stopped
      }
      currentSourceRef.current = null;
    }

    const source = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();

    source.buffer = soundBufferRef.current;
    gainNode.gain.value = 0.5;

    source.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    source.start();

    currentSourceRef.current = source;
  };

  // bulb behavior
  const turnBulbOn = (letter, duration = 1000) => {
    if (!isAlpha(letter)) return;

    const upper = letter.toUpperCase();
    setActiveLetter(upper);
    playSound();

    setTimeout(() => {
      setActiveLetter((prev) => (prev === upper ? null : prev));
    }, duration);
  };

  const flickerAll = () => {
    // similar to flickerRandomly in JS: trigger all letters
    letters.forEach((letter, idx) => {
      setTimeout(() => {
        turnBulbOn(letter, 500);
      }, idx * 50);
    });
  };

  const displayMessage = (duration = 1000) => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('q') || '';
    let searchQuery = '';

    try {
      searchQuery = encoded ? atob(encoded) : '';
    } catch {
      searchQuery = '';
    }

    if (!searchQuery) {
      flickerAll();
      return;
    }

    const phrase = searchQuery.split('').filter((v) => v.trim());
    phrase.forEach((letter, idx) => {
      setTimeout(() => {
        turnBulbOn(letter, duration);
        if (idx === phrase.length - 1) {
          setTimeout(() => {
            flickerAll();
          }, duration);
        }
      }, duration * idx);
    });
  };

  // events
  const handleStart = () => {
    if (isStarted) return;
    setIsStarted(true);
    setShowDialog(false);
    displayMessage(1000);
  };

  const handleInput = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.length > 0) {
      const lastChar = value.slice(-1);
      turnBulbOn(lastChar, 1000);
    }
  };

  const handleLetterClick = (letter) => {
    if (!isStarted) return;
    setInputValue((prev) => prev + letter);
    turnBulbOn(letter, 1000);
  };

  const handleCopy = () => {
    if (!inputValue || !isStarted) return;

    const url = new URL(window.location.href);
    const filtered = inputValue
      .split('')
      .filter((char) => isAlpha(char.toUpperCase()));

    // continuous letters, same as JS version fix
    url.searchParams.set('q', btoa(filtered.join('')));

    navigator.clipboard.writeText(url.toString());
    setDialogMessage('message link copied to clipboard!');
    setShowDialog(true);

    setTimeout(() => {
      setShowDialog(false);
    }, 2000);
  };

  const Bulb = ({ letter, isActive }) => {
    const [color] = useState(getRandomColor());
    const [rotation] = useState(getRandomRotation());
    const [flickerDuration] = useState((Math.random() * 0.9 + 0.5).toFixed(2));
    const [flickerDelay] = useState((Math.random() * 0.6).toFixed(2));

    return (
      <div
        className="flex flex-col items-center gap-2 lg:gap-4 cursor-pointer"
        onClick={() => handleLetterClick(letter)}
      >
        <div
          className={`w-5 h-6 lg:w-8 lg:h-10 rounded-full transition-all duration-500 ${
            isActive ? 'opacity-100 animate-pulse' : 'opacity-15'
          }`}
          style={{
            backgroundColor: color,
            transform: `rotate(${rotation}deg)`,
            boxShadow: isActive
              ? `0 0 20px 2px ${color}, 0 1px 4px 1px ${color}, 0 0 5px 2px ${color}, inset -2px -4px 1px rgba(0,0,0,0.6)`
              : 'none',
            animation: isActive ? `flicker ${flickerDuration}s infinite` : 'none',
            animationDelay: `${flickerDelay}s`,
          }}
        />
        <div className="text-2xl lg:text-8xl text-white font-['Mansalva',cursive] select-none">
          {letter}
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-black flex flex-col max-w-[1200px] mx-auto"
      onClick={handleStart}
    >
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Mansalva&display=swap');

        @keyframes flicker {
          0%, 100% { opacity: 1; filter: brightness(1) saturate(1.3); }
          7% { opacity: 0.6; filter: brightness(0.5) saturate(0.8); }
          12% { opacity: 0.2; filter: brightness(0.2) saturate(0.5); }
          18% { opacity: 0.9; filter: brightness(1.2) saturate(1.4); }
          45% { opacity: 1; filter: brightness(1.1) saturate(1.2); }
          58% { opacity: 0.5; filter: brightness(0.7) saturate(0.9); }
          70% { opacity: 1; filter: brightness(1.5) saturate(1.6); }
        }

        @keyframes blink {
          0%, 100% { top: 100px; }
          50% { top: 90px; }
        }
      `}</style>

      {/* Header */}
      <header className="h-[70px] flex items-center justify-between px-5 text-white font-['Mansalva',cursive] text-base lg:text-2xl">
        <div>Upside Down Lights</div>
        <div>
          made with ♥ by{' '}
          <a
            href="https://github.com/satya-supercluster"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-chartreuse-400 transition-colors"
          >
            satyam
          </a>
        </div>
      </header>

      {/* Light Wall */}
      <main className="flex-1 flex flex-col items-center justify-start mt-20 px-5">
        <div className="w-full lg:w-[70%] max-w-7xl">
          {/* Row 1: A-H */}
          <div className="flex justify-center items-center gap-4 lg:gap-14 flex-wrap lg:flex-nowrap mb-2 lg:mb-4">
            {letters.slice(0, 8).map((letter) => (
              <Bulb
                key={letter}
                letter={letter}
                isActive={activeLetter === letter}
              />
            ))}
          </div>

          {/* Row 2: I-Q */}
          <div className="flex justify-center items-center gap-4 lg:gap-14 flex-wrap lg:flex-nowrap mb-2 lg:mb-4">
            {letters.slice(8, 17).map((letter) => (
              <Bulb
                key={letter}
                letter={letter}
                isActive={activeLetter === letter}
              />
            ))}
          </div>

          {/* Row 3: R-Z */}
          <div className="flex justify-center items-center gap-4 lg:gap-14 flex-wrap lg:flex-nowrap">
            {letters.slice(17, 26).map((letter) => (
              <Bulb
                key={letter}
                letter={letter}
                isActive={activeLetter === letter}
              />
            ))}
          </div>
        </div>

        {/* Input and Actions */}
        <div className="flex flex-col items-center gap-4 mt-12 w-full">
          <input
            type="text"
            value={inputValue}
            onChange={handleInput}
            placeholder="Type here..."
            className="w-[90%] lg:w-[30%] bg-transparent border-none border-b border-slate-50 text-slate-50 text-3xl px-3 py-2 font-['Mansalva',cursive] outline-none placeholder:text-white/50 caret-slate-50"
            disabled={!isStarted}
          />

          <button
            onClick={handleCopy}
            disabled={!isStarted}
            className="px-3 py-2 rounded-lg bg-white/[0.04] text-slate-50 border border-white/[0.08] text-xl font-['Mansalva',cursive] cursor-pointer hover:bg-white/[0.06] hover:shadow-[0_10px_30px_rgba(2,6,23,0.7)] active:translate-y-[1px] active:scale-[0.99] focus-visible:outline-none focus-visible:border-indigo-500/60 focus-visible:shadow-[0_0_0_4px_rgba(99,102,241,0.12),0_8px_20px_rgba(2,6,23,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Copy your message link
          </button>

          {/* Dialog/Snackbar */}
          {showDialog && (
            <div className="fixed top-[100px] bg-green-400 shadow-[2px_2px_4px_theme(colors.green.400)] rounded-lg px-3 py-3 text-center mx-5 font-['Mansalva',cursive] text-xl lg:w-[20%] animate-[blink_1.2s_linear_infinite]">
              {dialogMessage}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ByersLights;
