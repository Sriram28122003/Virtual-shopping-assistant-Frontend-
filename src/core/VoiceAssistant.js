import React, { useState, useEffect, useRef } from 'react';
import './VirtualAssistant.css'; // Reuse the same CSS
import { askAboutProducts } from './langchainService';
import { isAuthenticated } from '../auth';

const VoiceAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hello! I'm your voice shopping assistant. Click the microphone to start speaking.", isBot: true }
    ]);
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [transcript, setTranscript] = useState('');
    
    // Refs for speech recognition and synthesis
    const recognitionRef = useRef(null);
    const synthesisRef = useRef(window.speechSynthesis);

    useEffect(() => {
        // Check if user is authenticated and set user info
        const checkAuth = () => {
            const auth = isAuthenticated();
            if (auth) {
                setUser({
                    id: auth.user._id,
                    token: auth.token
                });
            } else {
                setUser(null);
            }
        };

        checkAuth();
        // Set up an interval to check authentication status periodically
        const interval = setInterval(checkAuth, 60000); // Check every minute

        return () => clearInterval(interval);
    }, []);

    // Initialize speech recognition
    useEffect(() => {
        if (window.SpeechRecognition || window.webkitSpeechRecognition) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setTranscript(transcript);
                handleUserMessage(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                setMessages(prev => [...prev, { 
                    text: "Sorry, I couldn't hear you. Please try again.", 
                    isBot: true 
                }]);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        } else {
            console.error('Speech recognition not supported in this browser');
            setMessages(prev => [...prev, { 
                text: "Sorry, speech recognition is not supported in your browser.", 
                isBot: true 
            }]);
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const handleUserMessage = async (message) => {
        setIsLoading(true);
        
        // Add user message
        setMessages(prev => [...prev, { text: message, isBot: false }]);
        
        // Add a loading message
        setMessages(prev => [...prev, { 
            text: "Let me find that information for you...", 
            isBot: true 
        }]);

        try {
            // Send the query to OpenAI with user information
            const response = await askAboutProducts(message, user);
            
            setMessages(prev => [...prev, { 
                text: response, 
                isBot: true 
            }]);

            // Speak the response
            speakResponse(response);
        } catch (error) {
            console.error("Error processing query:", error);
            const errorMessage = "Sorry, I encountered an error while processing your request. Please try again later.";
            setMessages(prev => [...prev, { 
                text: errorMessage, 
                isBot: true 
            }]);
            speakResponse(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const startListening = () => {
        if (recognitionRef.current) {
            setTranscript('');
            setIsListening(true);
            recognitionRef.current.start();
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const speakResponse = (text) => {
        // Cancel any ongoing speech
        synthesisRef.current.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Get available voices and set to a female voice if available
        const voices = synthesisRef.current.getVoices();
        const femaleVoice = voices.find(voice => voice.name.includes('female') || voice.name.includes('Female'));
        if (femaleVoice) {
            utterance.voice = femaleVoice;
        }
        
        synthesisRef.current.speak(utterance);
    };

    return (
        <div className={`virtual-assistant voice-assistant ${isOpen ? 'open' : ''}`}>
            <button 
                className="assistant-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? '×' : '🎤'}
            </button>
            
            {isOpen && (
                <div className="assistant-container">
                    <div className="assistant-header">
                        <h3>Voice Assistant</h3>
                        <button onClick={() => setIsOpen(false)}>×</button>
                    </div>
                    
                    <div className="messages-container">
                        {messages.map((message, index) => (
                            <div 
                                key={index} 
                                className={`message ${message.isBot ? 'bot' : 'user'}`}
                            >
                                {message.text}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message bot loading">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        )}
                        {isListening && (
                            <div className="message bot listening">
                                <span className="pulse"></span>
                                Listening...
                            </div>
                        )}
                    </div>
                    
                    <div className="input-container voice-input">
                        <button 
                            className={`voice-button ${isListening ? 'listening' : ''}`}
                            onClick={isListening ? stopListening : startListening}
                            disabled={isLoading}
                        >
                            {isListening ? 'Stop' : 'Start'} Listening
                        </button>
                        {transcript && (
                            <div className="transcript">
                                You said: {transcript}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceAssistant; 