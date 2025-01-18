import { useCallback, useEffect, useRef, useState } from "react";

const Piano: React.FC = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
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

    const startNote = useCallback((frequency: number) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current.disconnect();
        }
        if (gainNodeRef.current) {
            gainNodeRef.current.disconnect();
        }

        const audioContext = audioContextRef.current;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);

        oscillator.start();
        
        oscillatorRef.current = oscillator;
        gainNodeRef.current = gainNode;
    }, []);

    const stopNote = useCallback(() => {
        if (gainNodeRef.current && audioContextRef.current) {
            gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.1);
            
            setTimeout(() => {
                if (oscillatorRef.current) {
                    oscillatorRef.current.stop();
                    oscillatorRef.current.disconnect();
                    oscillatorRef.current = null;
                }
                if (gainNodeRef.current) {
                    gainNodeRef.current.disconnect();
                    gainNodeRef.current = null;
                }
            }, 100);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const note = notes.find(n => n.key === key);
            if (note && !activeKeys.has(key)) {
                setActiveKeys(prev => new Set(prev).add(key));
                startNote(note.freq);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (activeKeys.has(key)) {
                setActiveKeys(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(key);
                    return newSet;
                });
                stopNote();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activeKeys, startNote, stopNote]);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Piano</h1>
            <div className="flex">
                {notes.map(({ note, key, freq }) => (
                    <div
                        key={note}
                        onMouseDown={() => startNote(freq)}
                        onMouseUp={stopNote}
                        onMouseLeave={stopNote}
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
