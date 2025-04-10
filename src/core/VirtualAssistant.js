import React, { useState, useEffect } from 'react';
import './VirtualAssistant.css';
import { askAboutProducts } from './langchainService';
import { isAuthenticated } from '../auth';

const VirtualAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hello! I'm your shopping assistant. You can ask me anything about our products. For example, try 'Tell me about a specific product' or 'What products do you have?'", isBot: true }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);

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

    const handleUserMessage = async (message) => {
        setIsLoading(true);
        
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
        } catch (error) {
            console.error("Error processing query:", error);
            setMessages(prev => [...prev, { 
                text: "Sorry, I encountered an error while processing your request. Please try again later.", 
                isBot: true 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (inputMessage.trim() === '' || isLoading) return;

        // Add user message
        setMessages(prev => [...prev, { text: inputMessage, isBot: false }]);
        
        // Process the message
        handleUserMessage(inputMessage);
        
        setInputMessage('');
    };

    return (
        <div className={`virtual-assistant ${isOpen ? 'open' : ''}`}>
            <button 
                className="assistant-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? '×' : '💬'}
            </button>
            
            {isOpen && (
                <div className="assistant-container">
                    <div className="assistant-header">
                        <h3>Product Assistant</h3>
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
                    </div>
                    
                    <form onSubmit={handleSendMessage} className="input-container">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder={user ? "Ask about products or your order history..." : "Ask anything about our products..."}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading}>
                            {isLoading ? '...' : 'Send'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default VirtualAssistant; 