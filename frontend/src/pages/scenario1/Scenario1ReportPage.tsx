import React from 'react';
import { Card, Typography, Button, Row, Col, Progress, Tag, Space, Popover } from 'antd';
import { ArrowLeftOutlined, CloseOutlined, ReloadOutlined, TrophyOutlined, BarChartOutlined } from '@ant-design/icons';
import { ReportResponse } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Scenario1ReportPage.css';

const { Title, Text, Paragraph } = Typography;

interface Scenario1ReportPageProps {
  reportData: ReportResponse;
  onBack: () => void;
  onClose: () => void;
  onReset: () => void;
}

const Scenario1ReportPage: React.FC<Scenario1ReportPageProps> = ({
  reportData,
  onBack,
  onClose,
  onReset,
}) => {
  const { evaluation } = reportData;
  const overallScore = evaluation.overall_ideal_achievement_percentage || 0;
  const rating = evaluation.rating || 'Pending Assessment';

  // Get color based on rating
  const getRatingColor = (rating: string): string => {
    if (rating?.includes('Excellent') || rating?.includes('优秀')) return '#52c41a';
    if (rating?.includes('Good') || rating?.includes('良好')) return '#1890ff';
    if (rating?.includes('Average') || rating?.includes('中等')) return '#faad14';
    if (rating?.includes('Poor') || rating?.includes('较差')) return '#ff7a45';
    if (rating?.includes('Failed') || rating?.includes('不合格')) return '#f5222d';
    return '#d9d9d9';
  };

  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a';
    if (score >= 75) return '#1890ff';
    if (score >= 60) return '#faad14';
    if (score >= 40) return '#ff7a45';
    return '#f5222d';
  };

  return (
    <div className="scenario1-report-page">
      <div className="page-header">
        <Title level={2} className="page-title">
          <TrophyOutlined className="title-icon" />
          PR Strategy Analysis Report
        </Title>
        <Text className="page-description">
          Comprehensive evaluation of your public relations strategy effectiveness
        </Text>
      </div>

      <div className="report-content">
        {/* Overall Evaluation Card */}
        <Card className="overall-evaluation-card glassmorphism">
          <div className="overall-score-section">
            <Row gutter={[24, 16]} align="middle">
              <Col xs={24} sm={8} md={6}>
                <div className="score-display">
                  <div className="score-circle">
                    <Progress
                      type="circle"
                      percent={overallScore}
                      strokeColor={getScoreColor(overallScore)}
                      format={() => (
                        <div className="score-text">
                          <div className="score-value">{overallScore.toFixed(1)}</div>
                          <div className="score-label">pts</div>
                        </div>
                      )}
                      size={120}
                    />
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8} md={6}>
                <div className="rating-section">
                  <Title level={3} className="rating-title">Overall Rating</Title>
                  <Tag 
                    className="rating-tag" 
                    color={getRatingColor(rating)}
                    icon={<TrophyOutlined />}
                  >
                    {rating}
                  </Tag>
                  <Paragraph className="rating-description">
                    Based on comprehensive analysis across 9 key dimensions of PR effectiveness
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} sm={8} md={12}>
                <div className="score-breakdown-compact">
                  <Title level={4} className="breakdown-title">Score Breakdown</Title>
                  <div className="breakdown-mini-grid">
                    {Object.entries(evaluation.dimension_scores || {}).map(([dimensionName, dimensionData]) => {
                      const details = dimensionData.details;
                      const score = details?.ideal_achievement_percentage || details?.percentage || 0;
                      const weight = dimensionData.weight || 0;
                      const contribution = (score * weight).toFixed(1);
                      
                      return (
                        <div key={dimensionName} className="breakdown-mini-item">
                          <div className="mini-item-header">
                            <span className="mini-dimension-name">{dimensionName}</span>
                            <span className="mini-contribution">{contribution}</span>
                          </div>
                        <Progress
                          percent={score}
                          strokeColor={getScoreColor(score)}
                          showInfo={false}
                          size="small"
                        />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Card>

        {/* Dimension Analysis */}
        <Card className="dimensions-card glassmorphism">
          <Title level={3} className="section-title">
            <BarChartOutlined className="section-icon" />
            Dimension Analysis
          </Title>
          <div className="dimensions-grid">
            {Object.entries(evaluation.dimension_scores || {}).map(([dimensionName, dimensionData]) => {
              const details = dimensionData.details;
              const score = details?.ideal_achievement_percentage || details?.percentage || 0;
              const weight = dimensionData.weight || 0;

              return (
                <Card key={dimensionName} className="dimension-card">
                  <div className="dimension-header">
                    <Title level={4} className="dimension-title">{dimensionName}</Title>
                    <div className="dimension-meta">
                      <Tag 
                        style={{
                          borderRadius: 12,
                          padding: '0 10px',
                          fontWeight: 500,
                          background: 'rgba(37, 99, 235, 0.12)',
                          border: '1px solid rgba(37, 99, 235, 0.18)',
                          color: '#2563eb',
                        }}
                      >
                        Weight: {(weight * 100).toFixed(0)}%
                      </Tag>
                      <div className="dimension-score">
                        <Progress
                          type="circle"
                          percent={score}
                          strokeColor={getScoreColor(score)}
                          format={() => (
                            <div className="dimension-score-text">
                              <div className="dimension-score-value">{score.toFixed(1)}</div>
                              <div className="dimension-score-unit">pts</div>
                            </div>
                          )}
                          size={50}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {details?.description && (
                    <div className="dimension-description">
                      <Text className="description-text">{details.description}</Text>
                    </div>
                  )}
                  
                  {details?.key_features && details.key_features.length > 0 && (
                    <div className="key-features">
                      <Text strong>Key Features:</Text>
                      <ul className="features-list">
                        {details.key_features.map((feature: string, index: number) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {details?.reasoning && (
                    <div className="reasoning-section">
                      <Popover
                        content={
                          <div className="reasoning-popover-content">
                            <Text className="reasoning-text">{details.reasoning}</Text>
                          </div>
                        }
                        title="Detailed Analysis"
                        trigger="click"
                        placement="topLeft"
                        overlayClassName="reasoning-popover"
                      >
                        <Button 
                          type="link" 
                          className="reasoning-summary"
                          size="small"
                        >
                          Detailed Analysis
                        </Button>
                      </Popover>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </Card>

        {/* Detailed Analysis Report */}
        <Card className="detailed-report-card glassmorphism">
          <Title level={3} className="section-title">
            <BarChartOutlined className="section-icon" />
            Detailed Analysis Report
          </Title>
          <div className="report-content-text">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
            >
              {reportData.content}
            </ReactMarkdown>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="action-buttons">
          <Space size="large">
            <Button
              size="large"
              className="action-button secondary-button"
              onClick={onBack}
              icon={<ArrowLeftOutlined />}
            >
              Back to Simulation
            </Button>
            <Button
              size="large"
              className="action-button secondary-button"
              onClick={onReset}
              icon={<ReloadOutlined />}
            >
              Reset Simulation
            </Button>
            <Button
              size="large"
              className="action-button secondary-button"
              onClick={onClose}
              icon={<CloseOutlined />}
            >
              Close Report
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default Scenario1ReportPage;
