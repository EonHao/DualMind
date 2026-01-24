import React from 'react';
import { Avatar } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import { ChatMessage as ChatMessageType } from '../types';
import './ChatMessage.css';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.type === 'user';
  
  return (
    <div className={`chat-message ${isUser ? 'user-message' : 'llm-message'}`}>
      <div className="message-avatar">
        <Avatar
          size={40}
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          className={isUser ? 'user-avatar' : 'llm-avatar'}
        />
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">{isUser ? 'User' : 'LLM'}</span>
        </div>
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'llm-bubble'}`}>
          <p className="message-text">{message.content}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
