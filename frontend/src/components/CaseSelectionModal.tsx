import React, { useState } from 'react';
import { Modal, Typography, Button, Spin, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { HistoricalCase } from '../types';
import { apiClient } from '../services/api';
import './CaseSelectionModal.css';

const { Title, Text } = Typography;

interface CaseSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onCaseSelect: (caseItem: HistoricalCase) => void;
  historicalCases: HistoricalCase[];
}

const CaseSelectionModal: React.FC<CaseSelectionModalProps> = ({
  visible,
  onClose,
  onCaseSelect,
  historicalCases,
}) => {
  const [selectedCase, setSelectedCase] = useState<HistoricalCase | null>(null);
  const [detailedCase, setDetailedCase] = useState<HistoricalCase | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleCaseClick = async (caseItem: HistoricalCase) => {
    setSelectedCase(caseItem);
    setLoadingDetail(true);
    
    try {
      // 获取案例详细信息（包含完整的strategies）
      const response = await apiClient.getHistoricalCaseDetail(caseItem.id);
      if (response.success && response.data) {
        setDetailedCase(response.data);
      } else {
        message.error('Failed to load case details');
        setDetailedCase(null);
      }
    } catch (error) {
      console.error('Error loading case details:', error);
      message.error('Error loading case details');
      setDetailedCase(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleConfirm = () => {
    if (selectedCase && detailedCase) {
      onCaseSelect(detailedCase); // 传递包含完整信息的详细案例
      onClose();
      // 清理状态
      setSelectedCase(null);
      setDetailedCase(null);
    }
  };


  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width="95vw"
      style={{ 
        maxWidth: '1400px',
        paddingBottom: 0,
        top: 20
      }}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
      className="case-selection-modal"
      maskClosable={false}
      destroyOnClose
    >
      <div className="modal-content">
        <div className="modal-header">
          <Title level={2} className="modal-title">Select PR Case Study</Title>
        </div>

        <div className="modal-body">
          <div className="case-list-section">
            <div className="case-list">
              {historicalCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className={`case-item ${selectedCase?.id === caseItem.id ? 'selected' : ''}`}
                  onClick={() => handleCaseClick(caseItem)}
                >
                  <div className="case-header">
                    <Title level={4} className="case-title">{caseItem.title}</Title>
                    {selectedCase?.id === caseItem.id && (
                      <CheckOutlined className="check-icon" />
                    )}
                  </div>
                  <Text className="case-description">{caseItem.description}</Text>
                </div>
              ))}
            </div>
          </div>

          <div className="case-details-section">
            <div className="details-header">
              <Title level={3} className="details-title">Detailed PR Strategy Description</Title>
            </div>
            <div className="details-content">
              {loadingDetail ? (
                <div className="loading-container">
                  <Spin size="large" tip="Loading case details..." />
                </div>
              ) : selectedCase && detailedCase ? (
                <div className="strategy-details">
                  {/* 显示案例背景 */}
                  {detailedCase.background && (
                    <div className="strategy-section" style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <Title level={5} className="strategy-round" style={{ color: '#52c41a !important' }}>
                        Case Background
                      </Title>
                      <Text className="strategy-text">
                        {detailedCase.background}
                      </Text>
                      <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
                        <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <strong>Industry:</strong> {detailedCase.industry}
                        </Text>
                        <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <strong>Difficulty:</strong> {detailedCase.difficulty}
                        </Text>
                        <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <strong>Total Rounds:</strong> {detailedCase.totalRounds}
                        </Text>
                      </div>
                    </div>
                  )}
                  
                  {/* 显示所有轮次策略 */}
                  {detailedCase.strategies && detailedCase.strategies.length > 0 ? (
                    detailedCase.strategies.map((strategy: any, index: number) => (
                      <div key={index} className="strategy-section">
                        <Title level={5} className="strategy-round">
                          Round {strategy.round}: {strategy.title}
                        </Title>
                        <Text className="strategy-text">
                          {strategy.content}
                        </Text>
                        {strategy.timeline && (
                          <Text className="strategy-timeline" style={{ 
                            display: 'block', 
                            marginTop: '4px', 
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontStyle: 'italic'
                          }}>
                            Timeline: {strategy.timeline}
                          </Text>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="empty-details">
                      <Text className="empty-text">No strategy details available for this case</Text>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-details">
                  <Text className="empty-text">Select a case study to view detailed strategy</Text>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button
            type="primary"
            size="large"
            onClick={handleConfirm}
            disabled={!selectedCase}
            className="confirm-button"
          >
            Confirm & Return
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CaseSelectionModal;
