import { useCallback, useEffect, useRef, useState } from "react";

interface AudioNodes {
    oscillator: OscillatorNode;
    gain: GainNode;
}

interface PianoProps {
    onRecordingComplete: (base64Audio: string) => void;
}

const Piano: React.FC<PianoProps> = ({ onRecordingComplete }) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const activeNotesRef = useRef<Map<string, AudioNodes>>(new Map());
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(10);
    const [base64Audio, setBase64Audio] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const recordingTimeoutRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Failed to convert blob to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };
    
    const startRecording = useCallback(() => {
        if (!audioContextRef.current || isRecording) return;
    
        // Create MediaStreamDestination if it doesn't exist
        if (!destinationRef.current) {
            destinationRef.current = audioContextRef.current.createMediaStreamDestination();
        }
    
        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(destinationRef.current.stream);
        const chunks: BlobPart[] = [];
    
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };
    
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            try {
                const base64 = await blobToBase64(blob);
                setBase64Audio(base64);
                console.log('Recording converted to base64');
                onRecordingComplete(base64);
            } catch (error) {
                console.error('Failed to convert recording:', error);
            }

            setIsRecording(false);
            setTimeLeft(10);

            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    
        setTimeLeft(10);
        setIsRecording(true);
        mediaRecorder.start(100); // Request data every 100ms
        mediaRecorderRef.current = mediaRecorder;
    
        // Start countdown
        countdownIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (mediaRecorderRef.current?.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Stop recording after 10 seconds
        recordingTimeoutRef.current = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        }, 10000);
    }, [isRecording]);

    // Cleanup function for recording
    useEffect(() => {
        return () => {
            if (recordingTimeoutRef.current) {
                clearTimeout(recordingTimeoutRef.current);
            }
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

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
        // Also connect to recording destination if recording
        if (destinationRef.current) {
            gainNode.connect(destinationRef.current);
        }

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
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Piano</h1>
                <button
                    onClick={startRecording}
                    disabled={isRecording}
                    className={`px-4 py-2 rounded ${
                        isRecording 
                            ? 'bg-red-500 text-white cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                >
                    {isRecording ? `Recording... (${timeLeft}s)` : 'Record Melody'}
                </button>
            </div>
            <div className="flex">
                {notes.map(({ note, key, freq }) => (
                    <div
                        key={note}
                        onMouseDown={() => startNote(key, freq)}
                        onMouseUp={() => stopNote(key)}
                        onMouseLeave={() => stopNote(key)}
                        className={`w-16 h-40 border border-gray-300 cursor-pointer flex flex-col items-center justify-between p-4 select-none transition-colors ${
                            activeKeys.has(key) 
                                ? 'bg-gray-300' 
                                : 'bg-white hover:bg-gray-100'
                        }`}
                    >
                        <span>{note}</span>
                        <span className="text-gray-500">({key})</span>
                    </div>
                ))}
            </div>
            {base64Audio && (
                <div className="mt-4">
                    <p>Recording converted to base64</p>
                    <p className="text-xs text-gray-500 truncate">{base64Audio.substring(0, 50)}...</p>
                </div>
            )}
        </div>
    );
};

export default Piano;
