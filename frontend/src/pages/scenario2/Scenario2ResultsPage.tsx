import React from 'react';
import { Card, Typography, Button, Table, Tag, Row, Col, Statistic } from 'antd';
import { ArrowLeftOutlined, CloseOutlined } from '@ant-design/icons';
import { HistoricalCase } from '../../types';
import './Scenario2ResultsPage.css';

const { Title, Text } = Typography;

interface Scenario2ResultsPageProps {
  selectedCase: HistoricalCase | null;
  simulationResults: any;
  realWorldResults: any;
  reportData?: any;
  onBack: () => void;
  onClose: () => void;
}

const Scenario2ResultsPage: React.FC<Scenario2ResultsPageProps> = ({
  selectedCase: _selectedCase,
  simulationResults,
  realWorldResults,
  reportData,
  onBack,
  onClose,
}) => {
  // Mock data - in a real project, this would be obtained from props
  const mockSimulationData = {
    overallSentiment: 65,
    engagementRate: 12,
    reach: 500,
    sentimentTrend: '+5%',
    keyInsights: "The simulation indicates a generally positive sentiment towards the company's response, with a notable increase in positive feedback over the past week. However, engagement rates have slightly decreased, suggesting a need to further amplify the message to maintain public interest. The reach of the campaign has been substantial, indicating effective dissemination of information.",
    influentialNodes: [
      { node: 'Node A', influenceScore: 92, sentiment: 'Positive' },
      { node: 'Node B', influenceScore: 88, sentiment: 'Neutral' },
      { node: 'Node C', influenceScore: 75, sentiment: 'Positive' },
    ]
  };

  const mockRealWorldData = {
    overallSentiment: 70,
    engagementRate: 15,
    reach: 600,
    sentimentTrend: '+10%',
    keyInsights: "Real-world data shows an even more positive sentiment than the simulation predicted, with a significant increase in engagement and reach. This suggests that the actual public response was more favorable and widespread than initially anticipated. The campaign's effectiveness in shaping public opinion is evident.",
    influentialNodes: [
      { node: 'Node X', influenceScore: 95, sentiment: 'Positive' },
      { node: 'Node Y', influenceScore: 90, sentiment: 'Positive' },
      { node: 'Node Z', influenceScore: 80, sentiment: 'Positive' },
    ]
  };

  const simulationData = simulationResults || mockSimulationData;
  const realData = realWorldResults || mockRealWorldData;

  const renderMetricsCard = (data: any, title: string) => (
    <div className="metrics-section">
      <Title level={4} className="section-title">{title}</Title>
      
      <Row gutter={[16, 16]} className="metrics-grid">
        <Col span={8}>
          <Card className="metric-card">
            <Statistic
              title="Overall Sentiment"
              value={data.overallSentiment}
              suffix="%"
              valueStyle={{ color: '#2563eb' }}
            />
            <Text className="trend-text positive">+{data.sentimentTrend}</Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="metric-card">
            <Statistic
              title="Engagement Rate"
              value={data.engagementRate}
              suffix="%"
              valueStyle={{ color: '#2563eb' }}
            />
            <Text className="trend-text negative">-2%</Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="metric-card">
            <Statistic
              title="Reach"
              value={data.reach}
              suffix="K"
              valueStyle={{ color: '#2563eb' }}
            />
            <Text className="trend-text positive">+10%</Text>
          </Card>
        </Col>
      </Row>

      <div className="sentiment-trend">
        <Text className="trend-label">Sentiment Trend</Text>
        <div className="trend-value">
          <Text className="trend-number">{data.overallSentiment}%</Text>
          <Text className="trend-change positive">{data.sentimentTrend}</Text>
        </div>
        <Text className="trend-period">Last 7 Days</Text>
      </div>

      <div className="chart-placeholder">
        <div className="chart-svg">
          <svg fill="none" height="100%" preserveAspectRatio="none" viewBox="0 0 472 150" width="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient gradientUnits="userSpaceOnUse" id="gradient" x1="236" x2="236" y1="1" y2="149">
                <stop stopColor="#2563eb" stopOpacity="0.4"></stop>
                <stop offset="1" stopColor="#2563eb" stopOpacity="0"></stop>
              </linearGradient>
            </defs>
            <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V150H0V109Z" fill="url(#gradient)"></path>
            <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25" stroke="#2563eb" strokeLinecap="round" strokeWidth="3"></path>
          </svg>
        </div>
      </div>

      <div className="insights-section">
        <Title level={5} className="insights-title">Key Insights</Title>
        <Text className="insights-text">{data.keyInsights}</Text>
      </div>

      <div className="nodes-section">
        <Title level={5} className="nodes-title">Influential Nodes</Title>
        <Table
          dataSource={data.influentialNodes}
          columns={[
            {
              title: 'Node',
              dataIndex: 'node',
              key: 'node',
            },
            {
              title: 'Influence Score',
              dataIndex: 'influenceScore',
              key: 'influenceScore',
            },
            {
              title: 'Sentiment',
              dataIndex: 'sentiment',
              key: 'sentiment',
              render: (sentiment: string) => (
                <Tag color="blue" className="sentiment-tag">
                  {sentiment}
                </Tag>
              ),
            },
          ]}
          pagination={false}
          size="small"
          className="nodes-table"
        />
      </div>
    </div>
  );

  return (
    <div className="scenario2-results-overlay">
      <div className="results-modal">
        <div className="modal-header">
          <Title level={2} className="modal-title">Public Opinion Report Comparison</Title>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="close-button"
          />
        </div>

        <div className="modal-content">
          <div className="comparison-grid">
            <div className="simulation-column">
              {renderMetricsCard(simulationData, 'Simulation Results')}
            </div>
            <div className="real-world-column">
              {renderMetricsCard(realData, 'Real-World Results')}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="back-button"
          >
            Back to Simulation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Scenario2ResultsPage;
