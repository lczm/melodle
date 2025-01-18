import { useCallback, useEffect, useRef, useState } from "react";

interface AudioNodes {
    oscillator: OscillatorNode;
    gain: GainNode;
}

const Piano: React.FC = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const activeNotesRef = useRef<Map<string, AudioNodes>>(new Map());
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    // Note frequencies in Hz with their corresponding keyboard keys
    const notes = [
        { note: 'C', key: 'a', freq: 261.63 },
        { note: 'D', key: 's', freq: 293.66 },
        { note: 'E', key: 'd', freq: 329.63 },
        { note: 'F', key: 'f', freq: 349.23 },
        { note: 'G', key: 'g', freq: 392.00 },
        { note: 'A', key: 'h', freq: 440.00 },
        { note: 'B', key: 'j', freq: 493.88 },
        { note: 'C2', key: 'k', freq: 523.25 }
    ];

    const startNote = useCallback((key: string, frequency: number) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Don't start a new note if it's already playing
        if (activeNotesRef.current.has(key)) {
            return;
        }

        const audioContext = audioContextRef.current;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

        oscillator.start();
        
        activeNotesRef.current.set(key, {
            oscillator,
            gain: gainNode
        });
    }, []);

    const stopNote = useCallback((key: string) => {
        const nodes = activeNotesRef.current.get(key);
        if (nodes && audioContextRef.current) {
            const { oscillator, gain } = nodes;
            
            // Gradual release
            gain.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.1);
            
            setTimeout(() => {
                oscillator.stop();
                oscillator.disconnect();
                gain.disconnect();
                activeNotesRef.current.delete(key);
            }, 100);
        }
    }, []);

    useEffect(() => {
        const pressedKeys = new Set<string>();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return; // Ignore key repeat events
            
            const key = e.key.toLowerCase();
            const note = notes.find(n => n.key === key);
            
            if (note && !pressedKeys.has(key)) {
                pressedKeys.add(key);
                setActiveKeys(prev => new Set(prev).add(key));
                startNote(key, note.freq);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (pressedKeys.has(key)) {
                pressedKeys.delete(key);
                setActiveKeys(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(key);
                    return newSet;
                });
                stopNote(key);
            }
        };

        // Handle edge cases when window loses focus
        const handleBlur = () => {
            pressedKeys.forEach(key => {
                stopNote(key);
                setActiveKeys(new Set());
            });
            pressedKeys.clear();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            // Clean up any playing notes
            activeNotesRef.current.forEach((_, key) => stopNote(key));
        };
    }, [startNote, stopNote]);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Piano</h1>
            <div className="flex">
                {notes.map(({ note, key, freq }) => (
                    <div
                        key={note}
                        onMouseDown={() => startNote(key, freq)}
                        onMouseUp={() => stopNote(key)}
                        onMouseLeave={() => stopNote(key)}
                        className={`w-16 h-40 bg-white border border-gray-300 cursor-pointer hover:bg-gray-100 flex flex-col items-center justify-between p-4 select-none ${
                            activeKeys.has(key) ? 'bg-gray-200' : ''
                        }`}
                    >
                        <span>{note}</span>
                        <span className="text-gray-500">({key})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Piano;
