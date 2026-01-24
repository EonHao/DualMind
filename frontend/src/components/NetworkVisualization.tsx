import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import NodeDetailModal from './NodeDetailModal';
import MessageNotification from './MessageNotification';
import MessageHistoryModal from './MessageHistoryModal';
import './NetworkVisualization.css';

interface User {
  agentId?: string;
  username: string;
  influence_score: number;
  primary_platform: string;
  emotional_style: string;
  final_decision: string;
  objective_stance_score?: number;
}

interface Platform {
  name: string;
  type: string;
  userCount: number;
  activeUsers: string[];
  message_propagation?: Array<{
    sender: string;
    receivers: string[];
    content: string;
    sentiment: string;
    timestamp: string;
  }>;
  message_flow?: Array<{
    from: string;
    to: string[];
    timestamp: string;
  }>;
}

interface NetworkVisualizationProps {
  users?: User[];
  platforms?: Platform[];
  isLoading?: boolean;
  hasCompletedSimulation?: boolean;
  onAnimationCompleted?: () => void;
  networkData?: {
    users: User[];
    platforms: Platform[];
  };
  simulationResult?: any;
  animationKey?: number; // 用于强制重置动画
  isReportJustClosed?: boolean; // 是否刚刚关闭报告
  shouldKeepFinalState?: boolean; // 是否应该保持最终状态
  preservedUserColorStates?: { [username: string]: { r: number; g: number; b: number } }; // 外部保存的颜色状态
  onColorStatesChange?: (colorStates: { [username: string]: { r: number; g: number; b: number } }) => void; // 颜色状态变化回调
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  users: _users = [],
  platforms: _platforms = [],
  isLoading: _isLoading = false,
  hasCompletedSimulation = false,
  onAnimationCompleted,
  networkData,
  simulationResult: _simulationResult,
  animationKey = 0,
  isReportJustClosed = false,
  shouldKeepFinalState = false,
  preservedUserColorStates = {},
  onColorStatesChange
}) => {
  // 组件挂载时记录日志
  useEffect(() => {
    console.log('====== [MOUNT DEBUG] NetworkVisualization component MOUNTED ======');
    return () => {
      console.log('====== [MOUNT DEBUG] NetworkVisualization component UNMOUNTED ======');
    };
  }, []);

  // 同步外部保存的颜色状态
  useEffect(() => {
    if (Object.keys(preservedUserColorStates).length > 0) {
      console.log('[COLOR SYNC DEBUG] Syncing external color states:', preservedUserColorStates);
      setUserColorStates(preservedUserColorStates);
      setAnimationInitialColors(preservedUserColorStates);
    }
  }, [preservedUserColorStates]);
  
  // 优先使用networkData，如果没有则使用传入的users和platforms
  const users = networkData?.users || _users;
  const platforms = networkData?.platforms || _platforms;
  const [currentStep, setCurrentStep] = useState(0);
  const [_isAnimating, setIsAnimating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0); // 0: 发送者, 1: 发送者+平台, 2: 发送者+平台+接收者, 3: 流动边
  const [animationStartTime, setAnimationStartTime] = useState<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0); // 用于强制重新渲染
  
  // 颜色状态持久化 - 使用外部保存的颜色状态，如果没有则使用内部状态
  const [userColorStates, setUserColorStates] = useState<{ [username: string]: { r: number; g: number; b: number } }>(preservedUserColorStates);
  // 动画开始时的初始颜色 - 用于颜色渐变计算
  const [animationInitialColors, setAnimationInitialColors] = useState<{ [username: string]: { r: number; g: number; b: number } }>(preservedUserColorStates);
  
  // 节点详情弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<'user' | 'platform' | null>(null);

  // 消息历史弹窗状态
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  
  // 单条消息循环播放状态
  const [singleMessageMode, setSingleMessageMode] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [singleMessageTimer, setSingleMessageTimer] = useState<NodeJS.Timeout | null>(null);
  
  // 边过渡动画状态
  const [edgeTransitionStep, setEdgeTransitionStep] = useState(-1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeEdges, setActiveEdges] = useState<{
    senderToPlatform: boolean;
    platformToReceivers: boolean;
  }>({
    senderToPlatform: false,
    platformToReceivers: false
  });

  const baseAssetPath = useMemo(() => {
    const base = import.meta.env.BASE_URL ?? '/';
    return base.endsWith('/') ? base : `${base}/`;
  }, []);

  const platformIcons = useMemo(() => ({
    Weibo: `${baseAssetPath}icons/weibo.png`,
    WeChat: `${baseAssetPath}icons/wechat.png`,
    TikTok: `${baseAssetPath}icons/tiktok.png`,
    Forum: `${baseAssetPath}icons/forum.png`,
  }), [baseAssetPath]);


  // 从实际数据生成消息传播步骤 - 使用后端提供的实际数据
  const messageSteps = React.useMemo(() => {
    console.log('NetworkVisualization - platforms:', platforms);
    console.log('NetworkVisualization - users:', users);
    
    if (!platforms || platforms.length === 0) {
      console.log('NetworkVisualization - No platforms data available');
      return [];
    }

    const steps: Array<{
      id: string;
      type: string;
      sender: string;
      platform: string;
      receivers: string[];
      content: string;
      delay: number;
      duration: number;
    }> = [];

    // 用户名映射
    const usernameMapping: { [key: string]: string } = {
      'MarketingPro_Serena': 'Serena',
      'Skeptical_Journalist': 'Journalist',
      'TechBro_Elon': 'Elon',
      'TechEnthusiast_Alex': 'Alex',
      'ValueInvestor_Graham': 'Graham',
      'Regulator_Tom': 'Tom',
      'ArtStudent_Vivian': 'Vivian',
      'SocialMedia_Intern': 'Intern',
      'Cynical_Dev': 'Dev',
      'Ethical_Philosopher': 'Philosopher'
    };

    // 平台名映射
    const platformMapping: { [key: string]: string } = {
      'Weibo/Twitter-like': 'Weibo',
      'WeChat Moments-like': 'WeChat',
      'TikTok-like': 'TikTok',
      'Forum-like': 'Forum'
    };

    // 收集所有消息 - 保持后端提供的顺序
    const allMessages: Array<{
      platform: string;
      message: any;
      platformName: string;
    }> = [];

    platforms.forEach(platform => {
      console.log('NetworkVisualization - Processing platform:', platform.name);
      console.log('NetworkVisualization - Platform message_propagation:', platform.message_propagation);
      
      if (platform.message_propagation && Array.isArray(platform.message_propagation)) {
        console.log('NetworkVisualization - Found', platform.message_propagation.length, 'messages for platform', platform.name);
        platform.message_propagation.forEach(message => {
          allMessages.push({
            platform: platform.name,
            message,
            platformName: platformMapping[platform.name] || platform.name
          });
        });
      } else {
        console.log('NetworkVisualization - No message_propagation data for platform', platform.name);
      }
    });

    // 使用后端提供的实际数据，不进行随机排序
    // 分配相对时间戳
    let currentDelay = 0;
    let messageIndex = 1;

    allMessages.forEach(({ message, platformName }) => {
      const shortSender = usernameMapping[message.sender] || message.sender;
      const shortReceivers = message.receivers.map((receiver: string) => 
        usernameMapping[receiver] || receiver
      );

      steps.push({
        id: `message${messageIndex}`,
        type: 'message_flow',
        sender: shortSender,
        platform: platformName,
        receivers: shortReceivers,
        content: message.content,
        delay: currentDelay,  // 使用实际的时间间隔
        duration: 6000
      });

      currentDelay += 6000;  // 每条消息间隔6秒
      messageIndex++;
    });

    console.log('NetworkVisualization - Generated', steps.length, 'message steps');
    console.log('NetworkVisualization - Message steps:', steps);
    return steps;
  }, [platforms]);

  // 获取用户坐标 - 优化为现代美学的不规则圆形分布
  const getUserCoordinates = (username: string) => {
    // 中心点坐标
    const centerX = 500;
    const centerY = 350;
    
    // 定义每个节点的半径和角度（微调角度避免三点一线）
    const nodeConfigs: { [key: string]: { radius: number; angle: number } } = {
      'Serena': { radius: 320, angle: 0.05 },           // 右侧，稍微上移
      'Journalist': { radius: 280, angle: 0.23 },       // 右上，半径稍小
      'Elon': { radius: 350, angle: 0.41 },             // 右上偏上，半径较大
      'Alex': { radius: 300, angle: 0.63 },             // 上侧，标准半径
      'Graham': { radius: 290, angle: 0.87 },           // 左上偏上，半径稍小
      'Tom': { radius: 330, angle: 1.12 },              // 左侧，半径稍大
      'Vivian': { radius: 310, angle: 1.35 },           // 左下偏下，半径较小
      'Intern': { radius: 290, angle: 1.58 },           // 下侧，标准半径
      'Dev': { radius: 340, angle: 1.82 },              // 右下偏下，半径较大
      'Philosopher': { radius: 275, angle: 1.95 }       // 右下，半径较小，修正角度避免重叠
    };
    
    const config = nodeConfigs[username];
    if (!config) {
      // 默认位置作为fallback
      return { x: centerX, y: centerY };
    }
    
    const x = centerX + config.radius * Math.cos(config.angle * Math.PI);
    const y = centerY + config.radius * Math.sin(config.angle * Math.PI);
    
    return { x, y };
  };

  // 获取平台坐标 - 集中在中心区域
  const getPlatformCoordinates = (platformName: string) => {
    const coordinates: { [key: string]: { x: number; y: number } } = {
      'Weibo': { x: 500, y: 250 }, // 右上
      'WeChat': { x: 600, y: 350 }, // 右下
      'TikTok': { x: 500, y: 450 }, // 左下
      'Forum': { x: 400, y: 350 } // 左上
    };
    return coordinates[platformName];
  };

  // 根据objective_stance_score计算最终颜色 (-3到3，红蓝渐变)
  const getStanceColor = (stanceScore: number) => {
    // 将-3到3的范围映射到0到1
    const normalizedScore = (stanceScore + 3) / 6;
    
    // 红色(反对)到蓝色(支持)的渐变
    // 反对(-3): 红色 #EF4444
    // 中性(0): 灰色 #6B7280  
    // 支持(3): 蓝色 #3B82F6
    
    if (normalizedScore <= 0.5) {
      // 从红色到灰色的渐变
      const t = normalizedScore * 2; // 0到1
      const r = Math.round(239 + (107 - 239) * t);
      const g = Math.round(68 + (114 - 68) * t);
      const b = Math.round(68 + (128 - 68) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // 从灰色到蓝色的渐变
      const t = (normalizedScore - 0.5) * 2; // 0到1
      const r = Math.round(107 + (59 - 107) * t);
      const g = Math.round(114 + (130 - 114) * t);
      const b = Math.round(128 + (246 - 128) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };


  // 获取动态颜色 - 根据动画进度从上一轮颜色渐变到最终颜色
  const getDynamicColor = (username: string) => {
    // 优先返回当前保存的颜色状态
    const savedColor = userColorStates[username];
    
    if (savedColor) {
      return `rgb(${savedColor.r}, ${savedColor.g}, ${savedColor.b})`;
    }

    // 如果没有保存的颜色状态，返回默认灰色
    return '#6B7280';
  };

  // 获取用户颜色 - 使用动态颜色变化
  const getUserColor = (username: string) => {
    return getDynamicColor(username);
  };

  // 获取平台颜色
  const getPlatformColor = (platformName: string) => {
    const colors: { [key: string]: string } = {
      'Weibo': '#00D4FF',
      'WeChat': '#00FF88',
      'TikTok': '#FF00FF',
      'Forum': '#FF9F43'
    };
    return colors[platformName] || '#00D4FF';
  };

  // 开始动画序列 - 当有网络数据时自动开始
  useEffect(() => {
    console.log('NetworkVisualization - Animation trigger check:');
    console.log('  - users.length:', users.length);
    console.log('  - messageSteps.length:', messageSteps.length);
    console.log('  - platforms?.length:', platforms?.length);
    console.log('  - singleMessageMode:', singleMessageMode);
    console.log('  - hasCompletedSimulation:', hasCompletedSimulation);
    console.log('  - animationKey:', animationKey);
    
    // 如果处于单条消息模式，不启动正常的动画序列
    if (singleMessageMode) {
      console.log('NetworkVisualization - Skipping normal animation due to single message mode');
      return;
    }
    
    // 如果模拟已经完成且没有animationKey变化，直接显示最终状态
    if (hasCompletedSimulation && animationKey === 0) {
      console.log('NetworkVisualization - Simulation already completed, showing final state');
      setAnimationCompleted(true);
      setCurrentStep(-1); // 设置为-1表示没有当前消息
      setCurrentPhase(0);
      setEdgeTransitionStep(-1);
      setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
      
      // 确保节点显示最终颜色状态
      if (users.length > 0) {
        console.log('====== [COLOR DEBUG] Setting final colors for animation ======');
        const finalColors: { [username: string]: { r: number; g: number; b: number } } = {};
        users.forEach(user => {
          const usernameMapping: { [key: string]: string } = {
            'MarketingPro_Serena': 'Serena',
            'Skeptical_Journalist': 'Journalist',
            'TechBro_Elon': 'Elon',
            'TechEnthusiast_Alex': 'Alex',
            'ValueInvestor_Graham': 'Graham',
            'Regulator_Tom': 'Tom',
            'ArtStudent_Vivian': 'Vivian',
            'SocialMedia_Intern': 'Intern',
            'Cynical_Dev': 'Dev',
            'Philosopher_Philosopher': 'Philosopher'
          };
          const shortUsername = usernameMapping[user.username] || user.username;
          
          // 使用用户的最终立场颜色
          const stance = user.objective_stance_score || 0;
          const finalColorStr = getStanceColor(stance);
          const finalColorMatch = finalColorStr.match(/rgb\((\d+), (\d+), (\d+)\)/);
          
          if (finalColorMatch) {
            finalColors[shortUsername] = {
              r: parseInt(finalColorMatch[1]),
              g: parseInt(finalColorMatch[2]),
              b: parseInt(finalColorMatch[3])
            };
          } else {
            // 如果解析失败，使用默认灰色
            finalColors[shortUsername] = { r: 107, g: 114, b: 128 };
          }
        });
        console.log('[COLOR DEBUG] Final colors to be set:', finalColors);
        setUserColorStates(finalColors);
        console.log('[COLOR DEBUG] Final colors have been set');
      }
      return;
    }
    
    // 如果应该保持最终状态（关闭报告窗口），直接显示最终状态
    if (shouldKeepFinalState && hasCompletedSimulation) {
      console.log('NetworkVisualization - Should keep final state (report closed), showing final state');
      setAnimationCompleted(true);
      setCurrentStep(-1); // 设置为-1表示没有当前消息
      setCurrentPhase(0);
      setEdgeTransitionStep(-1);
      setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
      
      // 确保节点显示最终颜色状态
      if (users.length > 0) {
        console.log('====== [COLOR DEBUG] Setting final colors for completed simulation ======');
        const finalColors: { [username: string]: { r: number; g: number; b: number } } = {};
        users.forEach(user => {
          const usernameMapping: { [key: string]: string } = {
            'MarketingPro_Serena': 'Serena',
            'Skeptical_Journalist': 'Journalist',
            'TechBro_Elon': 'Elon',
            'TechEnthusiast_Alex': 'Alex',
            'ValueInvestor_Graham': 'Graham',
            'Regulator_Tom': 'Tom',
            'ArtStudent_Vivian': 'Vivian',
            'SocialMedia_Intern': 'Intern',
            'Cynical_Dev': 'Dev',
            'Philosopher_Philosopher': 'Philosopher'
          };
          const shortUsername = usernameMapping[user.username] || user.username;
          
          // 使用用户的最终立场颜色
          const stance = user.objective_stance_score || 0;
          const finalColorStr = getStanceColor(stance);
          const finalColorMatch = finalColorStr.match(/rgb\((\d+), (\d+), (\d+)\)/);
          
          if (finalColorMatch) {
            finalColors[shortUsername] = {
              r: parseInt(finalColorMatch[1]),
              g: parseInt(finalColorMatch[2]),
              b: parseInt(finalColorMatch[3])
            };
          } else {
            // 如果解析失败，使用默认灰色
            finalColors[shortUsername] = { r: 107, g: 114, b: 128 };
          }
        });
        console.log('[COLOR DEBUG] Final colors to be set:', finalColors);
        setUserColorStates(finalColors);
        console.log('[COLOR DEBUG] Final colors have been set');
      }
      return;
    }
    
    // 如果模拟已经完成但animationKey > 0，说明是新轮次，需要重新开始动画
    if (hasCompletedSimulation && animationKey > 0) {
      console.log('====== [NEW ROUND DEBUG] New round detected, resetting animation state ======');
      console.log('[NEW ROUND DEBUG] Current userColorStates:', userColorStates);
      console.log('[NEW ROUND DEBUG] Current animationInitialColors:', animationInitialColors);
      console.log('[NEW ROUND DEBUG] Users data:', users.map(u => ({ username: u.username, stance: u.objective_stance_score })));
      
      setAnimationCompleted(false);
      setCurrentStep(0);
      setCurrentPhase(0);
      setEdgeTransitionStep(-1);
      setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
      setIsAnimating(false);
      setAnimationStartTime(null);
      animationStartTimeRef.current = null;
      
      // 新轮次开始时，保持上一轮的最终颜色状态作为起始颜色
      console.log('[NEW ROUND DEBUG] Preserving previous round final colors as starting colors');
      if (users.length > 0) {
        // 优先使用当前已保存的颜色状态（上一轮的最终状态）
        const currentColorStates = userColorStates;
        console.log('[NEW ROUND DEBUG] Current color states keys:', Object.keys(currentColorStates));
        console.log('[NEW ROUND DEBUG] Current color states values:', currentColorStates);
        
        if (Object.keys(currentColorStates).length > 0) {
          console.log('[COLOR DEBUG] Using existing color states as starting colors:', currentColorStates);
          setUserColorStates(currentColorStates);
          setAnimationInitialColors(currentColorStates);
        } else {
          console.log('[NEW ROUND DEBUG] No existing color states, calculating from user data');
          // 如果没有保存的颜色状态，则基于当前用户数据计算
          const preservedColors: { [username: string]: { r: number; g: number; b: number } } = {};
          users.forEach(user => {
            const usernameMapping: { [key: string]: string } = {
              'MarketingPro_Serena': 'Serena',
              'Skeptical_Journalist': 'Journalist',
              'TechBro_Elon': 'Elon',
              'TechEnthusiast_Alex': 'Alex',
              'ValueInvestor_Graham': 'Graham',
              'Regulator_Tom': 'Tom',
              'ArtStudent_Vivian': 'Vivian',
              'SocialMedia_Intern': 'Intern',
              'Cynical_Dev': 'Dev',
              'Philosopher_Philosopher': 'Philosopher'
            };
            const shortUsername = usernameMapping[user.username] || user.username;
            
            // 使用用户的当前立场颜色作为新轮次的起始颜色
            const stance = user.objective_stance_score || 0;
            const colorStr = getStanceColor(stance);
            const colorMatch = colorStr.match(/rgb\((\d+), (\d+), (\d+)\)/);
            
            console.log(`[NEW ROUND DEBUG] User ${user.username} (${shortUsername}): stance=${stance}, colorStr=${colorStr}`);
            
            if (colorMatch) {
              preservedColors[shortUsername] = {
                r: parseInt(colorMatch[1]),
                g: parseInt(colorMatch[2]),
                b: parseInt(colorMatch[3])
              };
            } else {
              // 如果解析失败，使用默认灰色
              preservedColors[shortUsername] = { r: 107, g: 114, b: 128 };
            }
          });
          
          console.log('[COLOR DEBUG] Calculated colors for new round:', preservedColors);
          setUserColorStates(preservedColors);
          setAnimationInitialColors(preservedColors);
        }
      }
      console.log('[NEW ROUND DEBUG] Color state setup completed, continuing with animation logic');
      // 继续执行下面的动画逻辑
    }
    
    // 如果动画已经完成且没有新的animationKey变化，不要重新启动动画
    if (animationCompleted && animationKey === 0) {
      console.log('NetworkVisualization - Animation already completed, not restarting');
      return;
    }
    
    // 如果动画已经完成但hasCompletedSimulation为false，说明需要重新开始动画
    if (animationCompleted && !hasCompletedSimulation) {
      console.log('NetworkVisualization - Resetting animation state for new round');
      setAnimationCompleted(false);
      setCurrentStep(0);
      setCurrentPhase(0);
      setEdgeTransitionStep(-1);
      setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
      // 继续执行下面的动画逻辑
    }
    
    // 如果animationKey变化，强制重置所有动画状态（但不重置颜色状态）
    if (animationKey > 0) {
      console.log('NetworkVisualization - Animation key changed, forcing animation reset (preserving colors)');
      setAnimationCompleted(false);
      setCurrentStep(0);
      setCurrentPhase(0);
      setEdgeTransitionStep(-1);
      setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
      setIsAnimating(false);
      setAnimationStartTime(null);
      animationStartTimeRef.current = null;
      // 不要重置颜色状态，保持上一轮的最终颜色
      console.log('[ANIMATION KEY DEBUG] Preserving color states during animation key change');
      // 继续执行下面的动画逻辑
    }
    
    if (users.length > 0 && messageSteps.length > 0) {
      console.log('====== [ANIMATION START DEBUG] Starting animation ======');
      console.log('[ANIMATION START DEBUG] Message steps:', messageSteps.length);
      console.log('[ANIMATION START DEBUG] Users:', users.map(u => ({ username: u.username, stance: u.objective_stance_score })));
      console.log('[ANIMATION START DEBUG] Platforms:', platforms?.map(p => p.name));
      console.log('[ANIMATION START DEBUG] Current userColorStates:', userColorStates);
      console.log('[ANIMATION START DEBUG] Current animationInitialColors:', animationInitialColors);
      
      setIsAnimating(true);
      setCurrentStep(0);
      setCurrentPhase(0);
      // 重置动画开始时间，确保每次都能重新开始
      const newStartTime = Date.now();
      animationStartTimeRef.current = newStartTime;
      setAnimationStartTime(newStartTime);
      setAnimationCompleted(false); // 重置动画完成状态
      
      // 保存动画开始时的初始颜色
      const initialColors: { [username: string]: { r: number; g: number; b: number } } = {};
      users.forEach(user => {
        const usernameMapping: { [key: string]: string } = {
          'MarketingPro_Serena': 'Serena',
          'Skeptical_Journalist': 'Journalist',
          'TechBro_Elon': 'Elon',
          'TechEnthusiast_Alex': 'Alex',
          'ValueInvestor_Graham': 'Graham',
          'Regulator_Tom': 'Tom',
          'ArtStudent_Vivian': 'Vivian',
          'SocialMedia_Intern': 'Intern',
          'Cynical_Dev': 'Dev',
          'Ethical_Philosopher': 'Philosopher'
        };
        const shortUsername = usernameMapping[user.username] || user.username;
        // 使用当前保存的颜色作为初始颜色，如果没有则使用默认灰色
        const savedColor = userColorStates[shortUsername];
        const initialColor = savedColor || { r: 107, g: 114, b: 128 };
        initialColors[shortUsername] = initialColor;
        console.log(`[COLOR DEBUG] ${shortUsername} initial color:`, savedColor ? 'from previous round' : 'default gray', initialColor);
      });
      console.log('[COLOR DEBUG] All initial colors for animation:', initialColors);
      console.log('[COLOR DEBUG] Current userColorStates:', userColorStates);
      setAnimationInitialColors(initialColors);
      // 立即设置用户颜色状态，确保节点显示正确的起始颜色
      setUserColorStates(initialColors);
      
      // 使用 setTimeout 来精确控制每个消息的显示时机
      const timers: NodeJS.Timeout[] = [];
      
      messageSteps.forEach((step, index) => {
        const messageStartTime = step.delay;
        
        // 阶段1: 闪烁发送者 (1s) - 边不激活
        const phase1Timer = setTimeout(() => {
          setCurrentStep(index);
          setCurrentPhase(0);
          setEdgeTransitionStep(index);
          setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
        }, messageStartTime);
        
        // 阶段2: 闪烁发送者和平台 (1s) - 激活发送者到平台的边
        const phase2Timer = setTimeout(() => {
          setCurrentPhase(1);
          setActiveEdges({ senderToPlatform: true, platformToReceivers: false });
        }, messageStartTime + 1000);
        
        // 阶段3: 闪烁发送者、平台和接收者 (1s) - 激活平台到接收者的边
        const phase3Timer = setTimeout(() => {
          setCurrentPhase(2);
          setActiveEdges({ senderToPlatform: true, platformToReceivers: true });
        }, messageStartTime + 2000);
        
        // 阶段4: 开始流动边 (3s) - 保持所有边激活
        const phase4Timer = setTimeout(() => {
          setCurrentPhase(3);
          setActiveEdges({ senderToPlatform: true, platformToReceivers: true });
        }, messageStartTime + 3000);
        
        timers.push(phase1Timer, phase2Timer, phase3Timer, phase4Timer);
      });
      
      // 添加动画结束逻辑 - 在最后一条消息结束后停止动画
      if (messageSteps.length > 0) {
        const lastMessage = messageSteps[messageSteps.length - 1];
        const animationEndTime = lastMessage.delay + lastMessage.duration;
        
        const endTimer = setTimeout(() => {
          console.log('[COLOR DEBUG] ====== Animation completed, setting final colors ======');
          console.log('[COLOR DEBUG] Users data at animation end:', users.map(u => ({ 
            username: u.username, 
            stance: u.objective_stance_score,
            influence: u.influence_score 
          })));
          
          // 在动画结束时，确保所有节点的颜色都更新到最终值
          const finalColors: { [username: string]: { r: number; g: number; b: number } } = {};
          users.forEach(user => {
            const usernameMapping: { [key: string]: string } = {
              'MarketingPro_Serena': 'Serena',
              'Skeptical_Journalist': 'Journalist',
              'TechBro_Elon': 'Elon',
              'TechEnthusiast_Alex': 'Alex',
              'ValueInvestor_Graham': 'Graham',
              'Regulator_Tom': 'Tom',
              'ArtStudent_Vivian': 'Vivian',
              'SocialMedia_Intern': 'Intern',
              'Cynical_Dev': 'Dev',
              'Ethical_Philosopher': 'Philosopher'
            };
            const shortUsername = usernameMapping[user.username] || user.username;
            
            // 使用用户的最终立场颜色
            const stance = user.objective_stance_score || 0;
            const finalColorStr = getStanceColor(stance);
            const finalColorMatch = finalColorStr.match(/rgb\((\d+), (\d+), (\d+)\)/);
            
            console.log(`[COLOR DEBUG] ${user.username} (${shortUsername}): stance=${stance}, colorStr=${finalColorStr}`);
            
            if (finalColorMatch) {
              finalColors[shortUsername] = {
                r: parseInt(finalColorMatch[1]),
                g: parseInt(finalColorMatch[2]),
                b: parseInt(finalColorMatch[3])
              };
            } else {
              // 如果解析失败，使用默认灰色
              finalColors[shortUsername] = { r: 107, g: 114, b: 128 };
            }
          });
          
          console.log('[COLOR DEBUG] Setting final colors on animation end:', finalColors);
          setUserColorStates(finalColors);
          // 保存颜色状态到外部
          if (onColorStatesChange) {
            console.log('[COLOR DEBUG] Saving color states to parent component');
            onColorStatesChange(finalColors);
          }
          
          setIsAnimating(false);
          setCurrentStep(-1); // 重置为-1表示没有当前消息
          setCurrentPhase(0);
          setEdgeTransitionStep(-1); // 重置边过渡步骤
          setActiveEdges({ senderToPlatform: false, platformToReceivers: false }); // 重置边激活状态
          setAnimationCompleted(true); // 标记动画完成
          onAnimationCompleted?.(); // 通知父组件动画已完成
          // 强制重新渲染以重置所有路径状态
          setForceUpdate(prev => prev + 1);
        }, animationEndTime);
        
        timers.push(endTimer);
      }
      
      // 清理所有定时器
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    } else {
      // 重置状态
      setCurrentStep(0);
      setCurrentPhase(0);
      setIsAnimating(false);
      animationStartTimeRef.current = null;
      setAnimationStartTime(null);
      setAnimationCompleted(false);
      setEdgeTransitionStep(-1);
      setIsTransitioning(false);
      setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
    }
  }, [users.length, platforms?.length, messageSteps.length, singleMessageMode, hasCompletedSimulation, animationKey]);

  // 颜色动画定时器 - 每100ms更新一次颜色和颜色状态
  useEffect(() => {
    if (!animationStartTime) return;

    const interval = setInterval(() => {
      // 使用 ref 中的开始时间，确保是最新的
      const startTime = animationStartTimeRef.current;
      if (!startTime) return;
      
      setUserColorStates(prev => {
        const newStates = { ...prev };
        let hasChanges = false;
        
        // 添加调试信息
        if (Math.random() < 0.01) { // 1%的概率输出调试信息，避免日志过多
          console.log('[COLOR UPDATE DEBUG] Current userColorStates:', prev);
          console.log('[COLOR UPDATE DEBUG] AnimationInitialColors:', animationInitialColors);
        }
        
        // 在useEffect内部计算动画时长，与消息动画保持一致
        const calculateAnimationDuration = () => {
          // 使用实际的后端数据计算时长，与消息动画保持一致
          if (users.length > 0 && platforms.length > 0) {
            let totalMessages = 0;
            
            platforms.forEach((platform) => {
              const messages = platform.message_propagation || platform.message_flow || [];
              
              if (Array.isArray(messages) && messages.length > 0) {
                totalMessages += messages.length;
              }
            });
            
            if (totalMessages > 0) {
              // 与消息动画保持一致：总时长 = 消息数量 * 6000ms
              const duration = totalMessages * 6000;
              return duration;
            } else {
              return 0;
            }
          }
          
          // 如果没有后端数据，返回默认时长
          return 0;
        };
        
        // 更新所有用户的颜色状态
        users.forEach(user => {
          const usernameMapping: { [key: string]: string } = {
            'MarketingPro_Serena': 'Serena',
            'Skeptical_Journalist': 'Journalist',
            'TechBro_Elon': 'Elon',
            'TechEnthusiast_Alex': 'Alex',
            'ValueInvestor_Graham': 'Graham',
            'Regulator_Tom': 'Tom',
            'ArtStudent_Vivian': 'Vivian',
            'SocialMedia_Intern': 'Intern',
            'Cynical_Dev': 'Dev',
            'Ethical_Philosopher': 'Philosopher'
          };
          const shortUsername = usernameMapping[user.username] || user.username;
          
          if (user.objective_stance_score !== undefined) {
            const totalDuration = calculateAnimationDuration();
            
            if (totalDuration > 0) {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / totalDuration, 1);
              
              
              // 使用动画开始时的初始颜色
              const initialColor = animationInitialColors[shortUsername] || { r: 107, g: 114, b: 128 };
              
              // 计算最终颜色
              const finalColorStr = getStanceColor(user.objective_stance_score);
              const finalColorMatch = finalColorStr.match(/rgb\((\d+), (\d+), (\d+)\)/);
              
              if (finalColorMatch) {
                const finalColor = {
                  r: parseInt(finalColorMatch[1]),
                  g: parseInt(finalColorMatch[2]),
                  b: parseInt(finalColorMatch[3])
                };
                
                // 计算当前颜色 - 从初始颜色渐变到最终颜色
                const currentColor = {
                  r: Math.round(initialColor.r + (finalColor.r - initialColor.r) * progress),
                  g: Math.round(initialColor.g + (finalColor.g - initialColor.g) * progress),
                  b: Math.round(initialColor.b + (finalColor.b - initialColor.b) * progress)
                };
                
                
                // 检查是否有变化
                const savedColor = prev[shortUsername];
                if (!savedColor || 
                    savedColor.r !== currentColor.r || 
                    savedColor.g !== currentColor.g || 
                    savedColor.b !== currentColor.b) {
                  newStates[shortUsername] = currentColor;
                  hasChanges = true;
                }
              }
            }
          }
        });
        
        return hasChanges ? newStates : prev;
      });
      
      setForceUpdate(prev => prev + 1);
    }, 100); // 恢复为100ms更新一次

    return () => {
      clearInterval(interval);
    };
  }, [animationStartTime, users.length, platforms?.length]);

  // 获取所有静态路径（一开始就显示）
  const getAllStaticPaths = () => {
    const allPaths: Array<{
      id: string;
      d: string;
      stroke: string;
      delay: number;
      isActive: boolean;
      messageId: string;
    }> = [];

    // 用于跟踪已经显示过的通道
    const shownChannels = new Set<string>();
    const shownPlatformToUserChannels = new Set<string>();

    // 首先生成所有静态路径（不激活）
    messageSteps.forEach((step) => {
      if (step.type === 'message_flow') {
        const senderCoords = getUserCoordinates(step.sender);
        const platformCoords = getPlatformCoordinates(step.platform);
        
        if (senderCoords && platformCoords) {
          // 发送者到平台的路径 - 每个用户到平台只显示一次
          const senderToPlatformChannel = `${step.sender}-${step.platform}`;
          if (!shownChannels.has(senderToPlatformChannel)) {
            allPaths.push({
              id: `sender-to-platform-${step.sender}-${step.platform}`,
              d: `M ${senderCoords.x} ${senderCoords.y} L ${platformCoords.x} ${platformCoords.y}`,
              stroke: getUserColor(step.sender),
              delay: 0,
              isActive: false, // 初始状态不激活
              messageId: step.id
            });
            shownChannels.add(senderToPlatformChannel);
          }
          
          // 平台到接收者的路径 - 每个平台到用户只显示一次
          step.receivers.forEach(receiver => {
            const receiverCoords = getUserCoordinates(receiver);
            if (receiverCoords) {
              const platformToUserChannel = `${step.platform}-${receiver}`;
              if (!shownPlatformToUserChannels.has(platformToUserChannel)) {
                allPaths.push({
                  id: `platform-to-user-${step.platform}-${receiver}`,
                  d: `M ${platformCoords.x} ${platformCoords.y} L ${receiverCoords.x} ${receiverCoords.y}`,
                  stroke: getPlatformColor(step.platform),
                  delay: 0,
                  isActive: false, // 初始状态不激活
                  messageId: step.id
                });
                shownPlatformToUserChannels.add(platformToUserChannel);
              }
            }
          });
        }
      }
    });

    // 然后根据当前步骤和边激活状态激活相应的边
    if (edgeTransitionStep >= 0 && edgeTransitionStep < messageSteps.length) {
      const currentStepData = messageSteps[edgeTransitionStep];
      if (currentStepData.type === 'message_flow') {
        const senderCoords = getUserCoordinates(currentStepData.sender);
        const platformCoords = getPlatformCoordinates(currentStepData.platform);
        
        if (senderCoords && platformCoords) {
          // 根据activeEdges状态激活发送者到平台的路径
          if (activeEdges.senderToPlatform) {
            const senderToPlatformId = `sender-to-platform-${currentStepData.sender}-${currentStepData.platform}`;
            const senderToPlatformPath = allPaths.find(path => path.id === senderToPlatformId);
            if (senderToPlatformPath) {
              senderToPlatformPath.isActive = true;
              senderToPlatformPath.messageId = currentStepData.id;
            }
          }
          
          // 根据activeEdges状态激活平台到接收者的路径
          if (activeEdges.platformToReceivers) {
            currentStepData.receivers.forEach(receiver => {
              const platformToUserId = `platform-to-user-${currentStepData.platform}-${receiver}`;
              const platformToUserPath = allPaths.find(path => path.id === platformToUserId);
              if (platformToUserPath) {
                platformToUserPath.isActive = true;
                platformToUserPath.messageId = currentStepData.id;
              }
            });
          }
        }
      }
    } else {
      // 如果没有活跃的步骤，确保所有路径都是不激活的
      allPaths.forEach(path => {
        path.isActive = false;
      });
    }

    return allPaths;
  };

  // 获取当前应该闪烁的节点
  const getCurrentFlashingNodes = () => {
    if (currentStep < 0 || currentStep >= messageSteps.length) {
      return {
        sender: null,
        platform: null,
        receivers: [] as string[]
      };
    }
    
    const step = messageSteps[currentStep];
    
    if (step.type === 'message_flow') {
      // 根据当前阶段决定闪烁哪些节点
      switch (currentPhase) {
        case 0: // 阶段1: 只闪烁发送者
          return {
            sender: step.sender,
            platform: null,
            receivers: [] as string[]
          };
        case 1: // 阶段2: 闪烁发送者和平台
          return {
            sender: step.sender,
            platform: step.platform,
            receivers: [] as string[]
          };
        case 2: // 阶段3: 闪烁发送者、平台和接收者
          return {
            sender: step.sender,
            platform: step.platform,
            receivers: step.receivers
          };
        case 3: // 阶段4: 继续闪烁发送者、平台和接收者，同时开始流动
        default:
          return {
            sender: step.sender,
            platform: step.platform,
            receivers: step.receivers
          };
      }
    }
    
    return {
      sender: null,
      platform: null,
      receivers: [] as string[]
    };
  };

  // 处理节点点击事件
  const handleNodeClick = (nodeType: 'user' | 'platform', nodeName: string) => {
    if (nodeType === 'user') {
      const user = users.find(u => u.username === nodeName);
      if (user) {
        setSelectedNode(user);
        setSelectedNodeType('user');
        setModalVisible(true);
      }
    } else if (nodeType === 'platform') {
      const platform = platforms.find(p => p.name === nodeName);
      if (platform) {
        setSelectedNode(platform);
        setSelectedNodeType('platform');
        setModalVisible(true);
      }
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedNode(null);
    setSelectedNodeType(null);
  };

  // 处理消息历史弹窗
  const handleOpenHistoryModal = () => {
    setHistoryModalVisible(true);
  };

  const handleCloseHistoryModal = () => {
    setHistoryModalVisible(false);
  };

  // 处理单条消息点击
  const handleMessageClick = (messageIndex: number) => {
    console.log('NetworkVisualization - Starting single message animation for index:', messageIndex);
    
    // 自动关闭消息历史弹窗
    setHistoryModalVisible(false);
    
    // 停止当前的单条消息循环
    if (singleMessageTimer) {
      clearTimeout(singleMessageTimer);
      setSingleMessageTimer(null);
    }
    
    // 设置单条消息模式
    setSingleMessageMode(true);
    setSelectedMessageIndex(messageIndex);
    setCurrentStep(messageIndex);
    setCurrentPhase(0);
    setEdgeTransitionStep(messageIndex);
    setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
    
    // 开始单条消息的循环播放
    startSingleMessageLoop(messageIndex);
  };

  // 单条消息循环播放函数
  const startSingleMessageLoop = (messageIndex: number) => {
    const step = messageSteps[messageIndex];
    if (!step) return;

    const playMessage = () => {
      console.log('NetworkVisualization - Playing single message:', messageIndex);
      
      // 阶段1: 闪烁发送者 (1s)
      setCurrentPhase(0);
      setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
      
      setTimeout(() => {
        // 阶段2: 闪烁发送者和平台 (1s)
        setCurrentPhase(1);
        setActiveEdges({ senderToPlatform: true, platformToReceivers: false });
        
        setTimeout(() => {
          // 阶段3: 闪烁发送者、平台和接收者 (1s)
          setCurrentPhase(2);
          setActiveEdges({ senderToPlatform: true, platformToReceivers: true });
          
          setTimeout(() => {
            // 阶段4: 开始流动边 (3s)
            setCurrentPhase(3);
            setActiveEdges({ senderToPlatform: true, platformToReceivers: true });
            
            // 3秒后重新开始循环
            const timer = setTimeout(() => {
              if (singleMessageMode && selectedMessageIndex === messageIndex) {
                playMessage(); // 递归调用，实现循环
              }
            }, 3000);
            
            setSingleMessageTimer(timer);
          }, 1000);
        }, 1000);
      }, 1000);
    };

    playMessage();
  };

  // 停止单条消息循环
  const stopSingleMessageLoop = () => {
    if (singleMessageTimer) {
      clearTimeout(singleMessageTimer);
      setSingleMessageTimer(null);
    }
    setSingleMessageMode(false);
    setSelectedMessageIndex(null);
    setCurrentStep(-1);
    setCurrentPhase(0);
    setEdgeTransitionStep(-1);
    setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
  };

  // 重置动画状态 - 当数据更新时调用
  const resetAnimationState = () => {
    console.log('NetworkVisualization - Resetting animation state for new data');
    stopSingleMessageLoop();
    setAnimationCompleted(false);
    setIsAnimating(false);
    setCurrentStep(0);
    setCurrentPhase(0);
    setEdgeTransitionStep(-1);
    setActiveEdges({ senderToPlatform: false, platformToReceivers: false });
  };

  // 获取所有路径和当前闪烁节点
  const allPaths = getAllStaticPaths();
  const flashingNodes = getCurrentFlashingNodes();
  
  // 强制重新渲染当activeEdges状态变化时
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [activeEdges, edgeTransitionStep]);

  // 使用forceUpdate来触发重新渲染
  void forceUpdate;

  // 清理函数 - 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (singleMessageTimer) {
        clearTimeout(singleMessageTimer);
      }
    };
  }, [singleMessageTimer]);

  // 监听数据变化，重置动画状态 - 只有在动画未完成时才重置
  useEffect(() => {
    console.log('NetworkVisualization - Data change check:', {
      usersLength: users.length,
      platformsLength: platforms?.length,
      messageStepsLength: messageSteps.length,
      hasCompletedSimulation,
      shouldReset: users.length > 0 && platforms?.length > 0 && messageSteps.length > 0 && !hasCompletedSimulation
    });
    
    if (users.length > 0 && platforms?.length > 0 && messageSteps.length > 0 && !hasCompletedSimulation) {
      console.log('NetworkVisualization - Data changed, resetting animation state');
      resetAnimationState();
    } else if (hasCompletedSimulation) {
      console.log('NetworkVisualization - Simulation already completed, skipping animation reset');
    }
  }, [users.length, platforms?.length, messageSteps.length, hasCompletedSimulation]);

  // 使用ref来跟踪是否已经初始化过颜色状态
  const hasInitializedColors = useRef(false);
  
  // 监听数据变化，当有新数据时更新颜色状态（保留上一轮的颜色）
  useEffect(() => {
    if (users.length > 0 && !hasInitializedColors.current) {
      console.log('====== [COLOR DEBUG] First time initialization ======');
      console.log('[COLOR DEBUG] users.length:', users.length);
      console.log('[COLOR DEBUG] users data:', users.map(u => ({
        username: u.username,
        stance: u.objective_stance_score
      })));
      
      // 用户名映射
      const usernameMapping: { [key: string]: string } = {
        'MarketingPro_Serena': 'Serena',
        'Skeptical_Journalist': 'Journalist',
        'TechBro_Elon': 'Elon',
        'TechEnthusiast_Alex': 'Alex',
        'ValueInvestor_Graham': 'Graham',
        'Regulator_Tom': 'Tom',
        'ArtStudent_Vivian': 'Vivian',
        'SocialMedia_Intern': 'Intern',
        'Cynical_Dev': 'Dev',
        'Ethical_Philosopher': 'Philosopher'
      };
      
      // 初始化为默认灰色（只在第一次时）
      console.log('[COLOR DEBUG] ✗ First initialization, setting to default gray');
      const newStates: { [username: string]: { r: number; g: number; b: number } } = {};
      users.forEach(user => {
        const shortUsername = usernameMapping[user.username] || user.username;
        newStates[shortUsername] = { r: 107, g: 114, b: 128 };
      });
      console.log('[COLOR DEBUG] New states initialized:', newStates);
      setUserColorStates(newStates);
      hasInitializedColors.current = true;
    }
  }, [users.length]);



  return (
    <div className="network-visualization-container">
      <svg width="1000" height="700" viewBox="0 0 1000 700" className="network-svg">
        {/* 平台节点 */}
        <g id="platforms">
          {/* Weibo平台 */}
          <g 
            className={`platform-node ${flashingNodes.platform === 'Weibo' ? 'flashing-platform' : ''}`}
            onClick={() => handleNodeClick('platform', 'Weibo/Twitter-like')}
            style={{ cursor: 'pointer' }}
          >
            <circle 
              cx={getPlatformCoordinates('Weibo').x} 
              cy={getPlatformCoordinates('Weibo').y} 
              r="30" 
              fill="#1DA1F2" 
              opacity="0.8" 
            />
            <image
              x={getPlatformCoordinates('Weibo').x - 20}
              y={getPlatformCoordinates('Weibo').y - 20}
              width="40"
              height="40"
              href={platformIcons.Weibo}
              className="platform-icon"
            />
          </g>
          <text x={getPlatformCoordinates('Weibo').x} y={getPlatformCoordinates('Weibo').y + 50} fill="white" fontSize="14" textAnchor="middle" className="platform-label">Weibo</text>
          
          {/* WeChat平台 */}
          <g 
            className={`platform-node ${flashingNodes.platform === 'WeChat' ? 'flashing-platform' : ''}`}
            onClick={() => handleNodeClick('platform', 'WeChat Moments-like')}
            style={{ cursor: 'pointer' }}
          >
            <circle 
              cx={getPlatformCoordinates('WeChat').x} 
              cy={getPlatformCoordinates('WeChat').y} 
              r="30" 
              fill="#07C160" 
              opacity="0.8" 
            />
            <image
              x={getPlatformCoordinates('WeChat').x - 20}
              y={getPlatformCoordinates('WeChat').y - 20}
              width="40"
              height="40"
              href={platformIcons.WeChat}
              className="platform-icon"
            />
          </g>
          <text x={getPlatformCoordinates('WeChat').x} y={getPlatformCoordinates('WeChat').y + 50} fill="white" fontSize="14" textAnchor="middle" className="platform-label">WeChat</text>
          
          {/* TikTok平台 */}
          <g 
            className={`platform-node ${flashingNodes.platform === 'TikTok' ? 'flashing-platform' : ''}`}
            onClick={() => handleNodeClick('platform', 'TikTok-like')}
            style={{ cursor: 'pointer' }}
          >
            <circle 
              cx={getPlatformCoordinates('TikTok').x} 
              cy={getPlatformCoordinates('TikTok').y} 
              r="30" 
              fill="#FF6B9D" 
              opacity="0.8" 
            />
            <image
              x={getPlatformCoordinates('TikTok').x - 20}
              y={getPlatformCoordinates('TikTok').y - 20}
              width="40"
              height="40"
              href={platformIcons.TikTok}
              className="platform-icon"
            />
          </g>
          <text x={getPlatformCoordinates('TikTok').x} y={getPlatformCoordinates('TikTok').y + 50} fill="white" fontSize="14" textAnchor="middle" className="platform-label">TikTok</text>
          
          {/* Forum平台 */}
          <g 
            className={`platform-node ${flashingNodes.platform === 'Forum' ? 'flashing-platform' : ''}`}
            onClick={() => handleNodeClick('platform', 'Forum-like')}
            style={{ cursor: 'pointer' }}
          >
            <circle 
              cx={getPlatformCoordinates('Forum').x} 
              cy={getPlatformCoordinates('Forum').y} 
              r="30" 
              fill="#8B5CF6" 
              opacity="0.8" 
            />
            <image
              x={getPlatformCoordinates('Forum').x - 20}
              y={getPlatformCoordinates('Forum').y - 20}
              width="40"
              height="40"
              href={platformIcons.Forum}
              className="platform-icon"
            />
          </g>
          <text x={getPlatformCoordinates('Forum').x} y={getPlatformCoordinates('Forum').y + 50} fill="white" fontSize="14" textAnchor="middle" className="platform-label">Forum</text>
        </g>

        {/* 用户节点 */}
        <g id="users">
          {/* Serena */}
          <circle 
            cx={getUserCoordinates('Serena').x} 
            cy={getUserCoordinates('Serena').y} 
            r="25" 
            fill={getUserColor('Serena')} 
            stroke={getUserColor('Serena')} 
            strokeWidth="3" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Serena' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Serena') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'MarketingPro_Serena')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Serena').x} y={getUserCoordinates('Serena').y + 30} fill={getUserColor('Serena')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Serena</text>
          
          {/* Journalist */}
          <circle 
            cx={getUserCoordinates('Journalist').x} 
            cy={getUserCoordinates('Journalist').y} 
            r="20" 
            fill={getUserColor('Journalist')} 
            stroke={getUserColor('Journalist')} 
            strokeWidth="3" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Journalist' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Journalist') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'Skeptical_Journalist')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Journalist').x} y={getUserCoordinates('Journalist').y - 20} fill={getUserColor('Journalist')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Journalist</text>
          
          {/* Elon */}
          <circle 
            cx={getUserCoordinates('Elon').x} 
            cy={getUserCoordinates('Elon').y} 
            r="22" 
            fill={getUserColor('Elon')} 
            stroke={getUserColor('Elon')} 
            strokeWidth="3" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Elon' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Elon') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'TechBro_Elon')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Elon').x} y={getUserCoordinates('Elon').y + 30} fill={getUserColor('Elon')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Elon</text>
          
          {/* Alex */}
          <circle 
            cx={getUserCoordinates('Alex').x} 
            cy={getUserCoordinates('Alex').y} 
            r="12" 
            fill={getUserColor('Alex')} 
            stroke={getUserColor('Alex')} 
            strokeWidth="2" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Alex' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Alex') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'TechEnthusiast_Alex')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Alex').x} y={getUserCoordinates('Alex').y + 20} fill={getUserColor('Alex')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Alex</text>
          
          {/* Graham */}
          <circle 
            cx={getUserCoordinates('Graham').x} 
            cy={getUserCoordinates('Graham').y} 
            r="18" 
            fill={getUserColor('Graham')} 
            stroke={getUserColor('Graham')} 
            strokeWidth="2" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Graham' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Graham') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'ValueInvestor_Graham')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Graham').x} y={getUserCoordinates('Graham').y + 25} fill={getUserColor('Graham')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Graham</text>
          
          {/* Tom */}
          <circle 
            cx={getUserCoordinates('Tom').x} 
            cy={getUserCoordinates('Tom').y} 
            r="15" 
            fill={getUserColor('Tom')} 
            stroke={getUserColor('Tom')} 
            strokeWidth="2" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Tom' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Tom') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'Regulator_Tom')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Tom').x} y={getUserCoordinates('Tom').y + 20} fill={getUserColor('Tom')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Tom</text>
          
          {/* Vivian */}
          <circle 
            cx={getUserCoordinates('Vivian').x} 
            cy={getUserCoordinates('Vivian').y} 
            r="10" 
            fill={getUserColor('Vivian')} 
            stroke={getUserColor('Vivian')} 
            strokeWidth="2" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Vivian' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Vivian') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'ArtStudent_Vivian')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Vivian').x} y={getUserCoordinates('Vivian').y + 15} fill={getUserColor('Vivian')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Vivian</text>
          
          {/* Intern */}
          <circle 
            cx={getUserCoordinates('Intern').x} 
            cy={getUserCoordinates('Intern').y} 
            r="8" 
            fill={getUserColor('Intern')} 
            stroke={getUserColor('Intern')} 
            strokeWidth="2" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Intern' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Intern') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'SocialMedia_Intern')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Intern').x} y={getUserCoordinates('Intern').y + 15} fill={getUserColor('Intern')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Intern</text>
          
          {/* Dev */}
          <circle 
            cx={getUserCoordinates('Dev').x} 
            cy={getUserCoordinates('Dev').y} 
            r="14" 
            fill={getUserColor('Dev')} 
            stroke={getUserColor('Dev')} 
            strokeWidth="2" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Dev' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Dev') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'Cynical_Dev')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Dev').x} y={getUserCoordinates('Dev').y + 20} fill={getUserColor('Dev')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Dev</text>
          
          {/* Philosopher */}
          <circle 
            cx={getUserCoordinates('Philosopher').x} 
            cy={getUserCoordinates('Philosopher').y} 
            r="16" 
            fill={getUserColor('Philosopher')} 
            stroke={getUserColor('Philosopher')} 
            strokeWidth="2" 
            className={`agent-node stance-color-transition ${
              flashingNodes.sender === 'Philosopher' ? 'flashing-sender' : 
              flashingNodes.receivers.includes('Philosopher') ? 'flashing-receiver' : ''
            }`}
            onClick={() => handleNodeClick('user', 'Ethical_Philosopher')}
            style={{ cursor: 'pointer' }}
          />
          <text x={getUserCoordinates('Philosopher').x} y={getUserCoordinates('Philosopher').y + 20} fill={getUserColor('Philosopher')} fontSize="12" textAnchor="middle" className="user-label stance-color-transition">Philosopher</text>
        </g>

        {/* 所有消息流动路径 */}
        <g id="message-flows">
          {allPaths.map((path) => (
            <path
              key={path.id}
              className={`animated-flow ${path.isActive ? 'animate-flow' : 'inactive-flow'} ${isTransitioning ? 'transitioning' : ''}`}
              d={path.d}
              stroke={path.stroke}
              style={{ animationDelay: `${path.delay / 1000}s` }}
              fill="none"
            />
          ))}
        </g>
      </svg>
      
      {/* 节点详情弹窗 */}
      <NodeDetailModal
        visible={modalVisible}
        onClose={handleCloseModal}
        nodeData={selectedNode}
        nodeType={selectedNodeType}
      />
      
       {/* 消息通知 - 只在非单条消息模式下且动画未完成时显示 */}
       {!singleMessageMode && !animationCompleted && (
         <MessageNotification
           currentStep={currentStep}
           messageSteps={messageSteps}
         />
       )}

      {/* 消息历史按钮 - 只在动画完成后显示 */}
      {animationCompleted && (
        <div className="message-history-button-container">
          <Button
            type="primary"
            icon={<HistoryOutlined />}
            onClick={handleOpenHistoryModal}
            className="message-history-button"
            size="large"
          >
            View All Messages
          </Button>
        </div>
      )}

      {/* 消息历史弹窗 */}
      <MessageHistoryModal
        visible={historyModalVisible}
        onClose={handleCloseHistoryModal}
        messageSteps={messageSteps}
        currentStep={currentStep}
        onMessageClick={handleMessageClick}
      />
    </div>
  );
};

export default NetworkVisualization;