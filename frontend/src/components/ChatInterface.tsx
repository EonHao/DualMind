import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, message } from 'antd';
import { SendOutlined, PlusOutlined } from '@ant-design/icons';
import ChatMessage from './ChatMessage';
import { ChatMessage as ChatMessageType } from '../types';
import { useInitChatSession, useSendChatMessage, useChatHistory } from '../hooks/useApi';
import './ChatInterface.css';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface ChatInterfaceProps {
  onStrategyGenerated: (strategy: string) => void;
  onStrategyConfirm?: (strategy: string) => void;
  onLastLLMMessageChange?: (message: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onStrategyGenerated: _onStrategyGenerated, onLastLLMMessageChange }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastLLMMessage, setLastLLMMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API hooks
  const initChatMutation = useInitChatSession();
  const sendMessageMutation = useSendChatMessage();
  const { data: chatHistory } = useChatHistory(sessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 当最后LLM消息变化时，通知父组件
  useEffect(() => {
    if (onLastLLMMessageChange && lastLLMMessage) {
      onLastLLMMessageChange(lastLLMMessage);
    }
  }, [lastLLMMessage, onLastLLMMessageChange]);

  // 组件挂载时，如果没有sessionId，自动初始化聊天会话
  useEffect(() => {
    if (!sessionId) {
      handleInitChat();
    }
  }, []);

  // 当有聊天历史时，加载历史消息
  useEffect(() => {
    if (chatHistory?.success && chatHistory.data) {
      const historyMessages: ChatMessageType[] = chatHistory.data.messages.map(msg => ({
        id: msg.id,
        type: msg.type as 'user' | 'llm',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(historyMessages);
      
      // 更新最后一条LLM消息
      const lastLLMMsg = historyMessages.filter(msg => msg.type === 'llm').pop();
      if (lastLLMMsg) {
        setLastLLMMessage(lastLLMMsg.content);
      }
    }
  }, [chatHistory]);

  // 初始化聊天会话
  const handleInitChat = async () => {
    try {
      const result = await initChatMutation.mutateAsync();
      if (result.success && result.data) {
        setSessionId(result.data.sessionId);
        // 添加欢迎消息
        const welcomeMessage: ChatMessageType = {
          id: result.data.sessionId + '_welcome',
          type: 'llm',
          content: result.data.content,
          timestamp: new Date(result.data.timestamp),
        };
        setMessages([welcomeMessage]);
        setLastLLMMessage(result.data.content);
        message.success('Chat session initialized');
      } else {
        message.error(result.error?.message || 'Failed to initialize chat session');
      }
    } catch (error) {
      message.error('Failed to initialize chat session');
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !sessionId) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const result = await sendMessageMutation.mutateAsync({
        sessionId,
        message: inputValue,
      });

      if (result.success && result.data) {
        const llmMessage: ChatMessageType = {
          id: result.data.id,
          type: result.data.type as 'user' | 'llm',
          content: result.data.content,
          timestamp: new Date(result.data.timestamp),
        };
        setMessages(prev => [...prev, llmMessage]);
        setLastLLMMessage(result.data.content);
      } else {
        message.error(result.error?.message || 'Failed to send message');
      }
    } catch (error) {
      message.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  return (
    <Card className="chat-interface glassmorphism">
      <div className="chat-header">
        <div className="chat-title-section">
          <Title level={1} className="chat-title">LLM Chat</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleInitChat}
            loading={initChatMutation.isPending}
            className="new-session-button"
          >
            New Session
          </Button>
        </div>
        <Paragraph className="chat-description">
          Interact with the LLM to refine your PR strategy. The final strategy will be used in the simulation.
        </Paragraph>
      </div>
      
      <div className="chat-messages">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="loading-message">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input">
        <div className="input-container">
          <TextArea
            className="message-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={3}
            disabled={isLoading}
          />
          <Button
            className="send-button"
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
          />
        </div>
      </div>

    </Card>
  );
};

export default ChatInterface;
