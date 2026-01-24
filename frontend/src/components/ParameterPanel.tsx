import React from 'react';
import { Card, InputNumber, Typography } from 'antd';
import { SimulationParameters } from '../types';
import './ParameterPanel.css';

const { Title } = Typography;

interface ParameterPanelProps {
  parameters: SimulationParameters;
  onParameterChange: (key: keyof SimulationParameters, value: number) => void;
}

const ParameterPanel: React.FC<ParameterPanelProps> = ({
  parameters,
  onParameterChange,
}) => {
  const parameterConfigs = [
    {
      key: 'agents' as keyof SimulationParameters,
      label: 'Number of Agents',
      value: parameters.agents,
      min: 1,
      max: 1000,
    },
    {
      key: 'interactionProbability' as keyof SimulationParameters,
      label: 'Probability of Interaction',
      value: parameters.interactionProbability,
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      key: 'positiveResponseProbability' as keyof SimulationParameters,
      label: 'Probability of Positive Response',
      value: parameters.positiveResponseProbability,
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      key: 'negativeResponseProbability' as keyof SimulationParameters,
      label: 'Probability of Negative Response',
      value: parameters.negativeResponseProbability,
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      key: 'neutralResponseProbability' as keyof SimulationParameters,
      label: 'Probability of Neutral Response',
      value: parameters.neutralResponseProbability,
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      key: 'initialPositiveSentiment' as keyof SimulationParameters,
      label: 'Initial Positive Sentiment',
      value: parameters.initialPositiveSentiment,
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      key: 'initialNegativeSentiment' as keyof SimulationParameters,
      label: 'Initial Negative Sentiment',
      value: parameters.initialNegativeSentiment,
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      key: 'initialNeutralSentiment' as keyof SimulationParameters,
      label: 'Initial Neutral Sentiment',
      value: parameters.initialNeutralSentiment,
      min: 0,
      max: 1,
      step: 0.1,
    },
  ];

  return (
    <Card className="parameter-panel glassmorphism">
      <Title level={2} className="panel-title">Configuration</Title>
      
      <div className="parameters-container">
        {parameterConfigs.map((config) => (
          <div key={config.key} className="parameter-item">
            <label className="parameter-label">{config.label}</label>
            <InputNumber
              className="parameter-input"
              value={config.value}
              onChange={(value) => onParameterChange(config.key, value || 0)}
              min={config.min}
              max={config.max}
              step={config.step}
              precision={config.step ? 1 : 0}
            />
          </div>
        ))}
        
        <div className="strategy-notice">
          <p>PR strategy will be generated via the LLM chat.</p>
        </div>
      </div>
    </Card>
  );
};

export default ParameterPanel;
