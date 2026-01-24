import React from 'react';
import { Card, Typography, Button, Row, Col, Progress, Tag, Space, Divider, Popover } from 'antd';
import { ArrowLeftOutlined, CloseOutlined, ReloadOutlined, BarChartOutlined, SwapOutlined } from '@ant-design/icons';
import { ReportResponse } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Scenario2ReportPage.css';

const { Title, Text, Paragraph } = Typography;

interface Scenario2ReportPageProps {
  reportData: ReportResponse;
  onBack: () => void;
  onClose: () => void;
  onReset: () => void;
  onSwitchReport?: (reportType: 'comparative' | 'metrics') => void;
  currentReportType?: 'comparative' | 'metrics';
}

const Scenario2ReportPage: React.FC<Scenario2ReportPageProps> = ({
  reportData,
  onBack,
  onClose,
  onReset,
  onSwitchReport,
  currentReportType,
}) => {
  const { evaluation, caseId, caseTitle, overallSimilarityPercentage } = reportData;
  const overallSimilarity = overallSimilarityPercentage || evaluation.overall_similarity_percentage || 0;
  const similarityColor = getSimilarityColor(overallSimilarity);

  // Get color based on similarity
  function getSimilarityColor(score: number): string {
    if (score >= 85) return '#22c55e'; // Highly Similar
    if (score >= 70) return '#2563eb'; // Similar
    if (score >= 55) return '#f59e0b'; // Moderately Similar
    return '#f97316'; // Low Similarity
  }

  // Get rating based on similarity
  function getSimilarityRating(score: number): string {
    if (score >= 85) return 'Highly Similar';
    if (score >= 70) return 'Similar';
    if (score >= 55) return 'Moderately Similar';
    return 'Low Similarity';
  }

  return (
    <div className="scenario2-report-page">
      <div className="page-header">
        <Title level={2} className="page-title">
          <SwapOutlined className="title-icon" />
          Comparative Analysis Report
        </Title>
        <Text className="page-description">
          Simulation vs Real-world Case Comparison Analysis
        </Text>
      </div>

      <div className="report-content">
        {/* Case Information */}
        <Card className="case-info-card glassmorphism">
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} sm={8} md={6}>
              <div className="case-details">
                <Title level={3} className="case-title">Case Study</Title>
                <Text className="case-name">{caseTitle}</Text>
                <Text className="case-id">Case ID: {caseId}</Text>
              </div>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <div className="similarity-overview">
                <div className="similarity-circle">
                  <Progress
                    type="circle"
                    percent={overallSimilarity}
                    strokeColor={similarityColor}
                    format={() => (
                      <div className="similarity-text">
                        <div className="similarity-value">{overallSimilarity.toFixed(1)}%</div>
                        <div className="similarity-label">Similarity</div>
                      </div>
                    )}
                    size={120}
                  />
                </div>
                <Tag 
                  className="similarity-tag"
                  style={{
                    backgroundColor: `${similarityColor}1a`,
                    borderColor: `${similarityColor}33`,
                    color: similarityColor,
                  }}
                >
                  {getSimilarityRating(overallSimilarity)}
                </Tag>
              </div>
            </Col>
            <Col xs={24} sm={8} md={12}>
              <div className="similarity-breakdown-compact">
                <Title level={4} className="breakdown-title">Similarity Breakdown</Title>
                <div className="breakdown-mini-grid">
                  {Object.entries(evaluation.dimension_scores || {}).map(([dimensionName, dimensionData]) => {
                    const details = dimensionData.details;
                    const weight = dimensionData.weight || 0;
                    const similarityScore = details?.similarity?.similarity_score || 
                                          details?.similarity?.similarity_percentage || 0;
                    const contribution = (similarityScore * weight).toFixed(1);
                    
                    return (
                      <div key={dimensionName} className="breakdown-mini-item">
                        <div className="mini-item-header">
                          <span className="mini-dimension-name">{dimensionName}</span>
                          <span className="mini-contribution">{contribution}</span>
                        </div>
                        <Progress
                          percent={similarityScore}
                          strokeColor={getSimilarityColor(similarityScore)}
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
        </Card>

        {/* Dimension Comparison Analysis */}
        <Card className="dimensions-card glassmorphism">
          <Title level={3} className="section-title">
            <SwapOutlined className="section-icon" />
            Dimension Comparison Analysis
          </Title>
          <div className="dimensions-grid">
            {Object.entries(evaluation.dimension_scores || {}).map(([dimensionName, dimensionData]) => {
              const details = dimensionData.details;
              const weight = dimensionData.weight || 0;
              
              // Get similarity score (compatible with two field names)
              const similarityScore = details?.similarity?.similarity_score || 
                                    details?.similarity?.similarity_percentage || 0;
              
              const isStanceDimension = dimensionName === "Overall Stance Tendency";

              return (
                <Card key={dimensionName} className="dimension-card">
                  <div className="dimension-header">
                    <Title level={4} className="dimension-title">{dimensionName}</Title>
                    <div className="dimension-meta">
                      <Tag color="#2563eb" style={{ borderRadius: 12, padding: '0 10px', fontWeight: 500, background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.18)', color: '#1d4ed8' }}>
                        Weight: {(weight * 100).toFixed(0)}%
                      </Tag>
                      <div className="similarity-badge">
                        <Progress
                          type="circle"
                          percent={similarityScore}
                          strokeColor={getSimilarityColor(similarityScore)}
                          format={() => `${similarityScore.toFixed(1)}%`}
                          size={50}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Divider />
                  
                  <div className="comparison-content">
                    {/* Simulation Data */}
                    <div className="simulation-side">
                      <Title level={5} className="comparison-title">Simulation</Title>
                      {isStanceDimension ? (
                        <div className="detailed-summary">
                          <Text className="summary-text">
                            {details?.simulation?.summary || 'No data available'}
                          </Text>
                        </div>
                      ) : (
                        <div className="percentage-summary">
                          <div className="percentage-value">
                            {details?.simulation?.percentage?.toFixed(1) || 0}%
                          </div>
                          <Text className="summary-text">
                            {details?.simulation?.summary || 'No data available'}
                          </Text>
                        </div>
                      )}
                    </div>
                    
                    {/* Real Case Data */}
                    <div className="real-case-side">
                      <Title level={5} className="comparison-title">Real Case</Title>
                      {isStanceDimension ? (
                        <div className="detailed-summary">
                          <Text className="summary-text">
                            {details?.real_case?.summary || 'No data available'}
                          </Text>
                        </div>
                      ) : (
                        <div className="percentage-summary">
                          <div className="percentage-value">
                            {details?.real_case?.percentage?.toFixed(1) || 0}%
                          </div>
                          <Text className="summary-text">
                            {details?.real_case?.summary || 'No data available'}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Similarity Analysis */}
                  {details?.similarity?.reasoning && (
                    <div className="similarity-reasoning">
                      <Popover
                        content={
                          <div className="reasoning-popover-content">
                            <Text className="reasoning-text">{details.similarity.reasoning}</Text>
                          </div>
                        }
                        title="Similarity Analysis"
                        trigger="click"
                        placement="topLeft"
                        overlayClassName="reasoning-popover"
                      >
                        <Button 
                          type="link" 
                          className="reasoning-summary"
                          size="small"
                        >
                          Similarity Analysis
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
            {onSwitchReport && (
              <Button
                size="large"
                type="primary"
                className="action-button"
                onClick={() => onSwitchReport('metrics')}
                icon={<BarChartOutlined />}
              >
                View Evaluation Metrics
              </Button>
            )}
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

export default Scenario2ReportPage;
