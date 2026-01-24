import React from 'react';
import { Drawer, Typography, Card, Tag, Space } from 'antd';
import { MessageOutlined, UserOutlined, ShareAltOutlined } from '@ant-design/icons';
import './MessageHistoryModal.css';

const { Text, Paragraph } = Typography;

interface MessageStep {
  id: string;
  type: string;
  sender: string;
  platform: string;
  receivers: string[];
  content: string;
  delay: number;
  duration: number;
}

interface MessageHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  messageSteps: MessageStep[];
  currentStep: number;
  onMessageClick?: (messageIndex: number) => void;
}

const MessageHistoryModal: React.FC<MessageHistoryModalProps> = ({
  visible,
  onClose,
  messageSteps,
  currentStep,
  onMessageClick
}) => {
  // 获取平台颜色
  const getPlatformColor = (platformName: string) => {
    const colors: { [key: string]: string } = {
      'Weibo': '#1DA1F2',
      'WeChat': '#07C160',
      'TikTok': '#FF6B9D',
      'Forum': '#8B5CF6'
    };
    return colors[platformName] || '#1DA1F2';
  };

  // 获取平台图标
  const getPlatformIcon = (platformName: string) => {
    const icons: { [key: string]: string } = {
      'Weibo': '📱',
      'WeChat': '💬',
      'TikTok': '🎵',
      'Forum': '💭'
    };
    return icons[platformName] || '📱';
  };

  // 获取消息状态
  const getMessageStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return { status: 'completed', text: 'Completed', color: 'success' };
    } else if (stepIndex === currentStep) {
      return { status: 'active', text: 'Active', color: 'processing' };
    } else {
      return { status: 'pending', text: '', color: 'default' };
    }
  };

  return (
    <Drawer
      title={
        <div className="message-history-header">
          <MessageOutlined style={{ marginRight: 8, color: '#2563eb' }} />
          <span>Message Propagation History</span>
        </div>
      }
      placement="right"
      width={480}
      onClose={onClose}
      open={visible}
      className="message-history-drawer"
      bodyStyle={{ padding: 0 }}
    >
      <div className="message-history-content">
        <div className="message-list">
          {messageSteps.map((step, index) => {
            const messageStatus = getMessageStatus(index);
            const platformColor = getPlatformColor(step.platform);
            
            return (
              <Card
                key={step.id}
                className={`message-card ${messageStatus.status} ${onMessageClick ? 'clickable-message' : ''}`}
                size="small"
                style={{ 
                  marginBottom: 12,
                  cursor: onMessageClick ? 'pointer' : 'default'
                }}
                onClick={() => onMessageClick?.(index)}
              >
                <div className="message-card-header">
                  <div className="message-meta">
                    <Space>
                      <Tag 
                        color={platformColor}
                        icon={<span style={{ marginRight: 4 }}>{getPlatformIcon(step.platform)}</span>}
                      >
                        {step.platform}
                      </Tag>
                      {messageStatus.text && (
                        <Tag color={messageStatus.color as any}>
                          {messageStatus.text}
                        </Tag>
                      )}
                    </Space>
                  </div>
                  <div className="message-number">
                    #{index + 1}
                  </div>
                </div>

                <div className="message-sender">
                  <UserOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                  <Text strong>{step.sender}</Text>
                </div>

                <div className="message-content">
                  <Paragraph 
                    ellipsis={{ rows: 3, expandable: true, symbol: 'extend' }}
                    style={{ margin: '8px 0' }}
                  >
                    {step.content}
                  </Paragraph>
                </div>

                <div className="message-receivers">
                  <ShareAltOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                  <Text type="secondary">
                    Receivers: {step.receivers.length > 0 ? step.receivers.join(', ') : 'None'}
                  </Text>
                </div>

              </Card>
            );
          })}
        </div>

        {messageSteps.length === 0 && (
          <div className="empty-messages">
            <MessageOutlined style={{ fontSize: 48, color: '#8c8c8c', marginBottom: 16 }} />
            <Text type="secondary">No message data available</Text>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default MessageHistoryModal;
