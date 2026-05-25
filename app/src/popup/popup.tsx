import { useCallback, useEffect, useMemo, useState } from 'react';

type Status = 'loading' | 'success' | 'error';

type VideoTimeInfo = {
  currentVideoTitle: string;
  currentProgress: string;
  remainingVideos: number;
  totalVideos?: number;
  remainingTime: string;
  estimatedFinishTime: string;
};

function parseProgressToPercentage(progressStr: string | undefined): number {
  if (!progressStr || progressStr === '--') return 0;
  
  const parts = progressStr.split('/');
  if (parts.length !== 2) return 0;

  const parseTime = (timeStr: string) => {
    const cleanStr = timeStr.trim();
    
    // 兼容 HH:MM:SS 或 MM:SS 格式
    if (cleanStr.includes(':')) {
      const timeParts = cleanStr.split(':').map(Number);
      if (timeParts.length === 3) {
        return (timeParts[0] || 0) * 3600 + (timeParts[1] || 0) * 60 + (timeParts[2] || 0);
      } else if (timeParts.length === 2) {
        return (timeParts[0] || 0) * 60 + (timeParts[1] || 0);
      }
      return 0;
    }

    // 兼容旧版的 XX时XX分XX秒 格式
    let hours = 0, minutes = 0, seconds = 0;
    const hMatch = cleanStr.match(/(\d+)时/);
    const mMatch = cleanStr.match(/(\d+)分/);
    const sMatch = cleanStr.match(/(\d+)秒/);
    
    if (hMatch) hours = parseInt(hMatch[1], 10);
    if (mMatch) minutes = parseInt(mMatch[1], 10);
    if (sMatch) seconds = parseInt(sMatch[1], 10);
    
    return hours * 3600 + minutes * 60 + seconds;
  };

  const currentSeconds = parseTime(parts[0]);
  const totalSeconds = parseTime(parts[1]);

  if (totalSeconds === 0) return 0;
  const percentage = (currentSeconds / totalSeconds) * 100;
  return Math.min(Math.max(percentage, 0), 100);
}

export default function Popup() {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<VideoTimeInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const canUseChrome = useMemo(
    () => typeof globalThis !== 'undefined' && typeof globalThis.chrome !== 'undefined',
    []
  );

  const totalProgressPercentage = useMemo(() => {
    if (!data || !data.totalVideos || data.totalVideos <= 0) return 0;
    
    const completedVideos = Math.max(0, data.totalVideos - data.remainingVideos);
    const currentVideoProgressFraction = parseProgressToPercentage(data.currentProgress) / 100;
    
    const totalPercentage = ((completedVideos + currentVideoProgressFraction) / data.totalVideos) * 100;
    return Math.min(Math.max(totalPercentage, 0), 100);
  }, [data]);

  const showLoading = useCallback(() => {
    setStatus('loading');
    setErrorMessage('');
  }, []);

  const showError = useCallback((message: string) => {
    setStatus('error');
    setErrorMessage(message);
  }, []);

  const fetchVideoTimeInfo = useCallback(() => {
    showLoading();

    if (!canUseChrome || !chrome?.tabs) {
      showError('无法连接到页面: chrome API 不可用');
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs?.[0];

      if (!activeTab?.url || !activeTab.url.includes('bilibili.com/video')) {
        showError('请在B站视频页面使用此扩展');
        return;
      }

      if (typeof activeTab.id !== 'number') {
        showError('无法连接到页面: tabId 不可用');
        return;
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'getVideoTimeInfo' },
        (response?: { success?: boolean; data?: VideoTimeInfo; error?: string }) => {
          if (chrome.runtime.lastError) {
            showError(`无法连接到页面: ${chrome.runtime.lastError.message}`);
            return;
          }

          if (response?.success && response.data) {
            setData(response.data);
            setStatus('success');
            return;
          }

          showError(response?.error || '无法获取视频信息');
        }
      );
    });
  }, [canUseChrome, showError, showLoading]);

  useEffect(() => {
    fetchVideoTimeInfo();
  }, [fetchVideoTimeInfo]);

  return (
    <div className="container">
      <h1>B站视频剩余时长</h1>

      <div className="result-container">
        <div id="loading" className={status === 'loading' ? '' : 'hidden'}>
          <div className="spinner"></div>
          计算中...
        </div>

        <div id="result" className={status === 'success' ? '' : 'hidden'}>
          <div className="info-block">
            <span className="label">当前视频</span>
            <span className="value title-value" title={data?.currentVideoTitle}>
              {data?.currentVideoTitle ?? '--'}
            </span>
          </div>
          <div className="info-block">
            <span className="label">当前进度</span>
            <span className="value progress-value" title={data?.currentProgress}>
              {data?.currentProgress ?? '--'}
            </span>
            {data?.currentProgress && data.currentProgress !== '--' && (
              <div className="progress-wrapper">
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${parseProgressToPercentage(data.currentProgress)}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {Math.round(parseProgressToPercentage(data.currentProgress))}%
                </span>
              </div>
            )}
          </div>
          
          <div className="divider"></div>

          {data?.totalVideos && data.totalVideos > 0 && (
            <div className="info-block">
              <span className="label">总进度</span>
              <div className="progress-wrapper">
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill total-progress-fill" 
                    style={{ width: `${totalProgressPercentage}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {Math.round(totalProgressPercentage)}%
                </span>
              </div>
            </div>
          )}

          <div className="info-row">
            <span className="label">剩余视频数</span>
            <span className="value">{data ? `${data.remainingVideos} 个 (共 ${data.totalVideos || '--'} 个)` : '--'}</span>
          </div>
          <div className="info-row">
            <span className="label">剩余总时长</span>
            <span className="value highlight">{data?.remainingTime ?? '--'}</span>
          </div>
          <div className="info-row">
            <span className="label">预计完成时间</span>
            <span className="value">{data?.estimatedFinishTime ?? '--'}</span>
          </div>
        </div>

        <div id="error-message" className={status === 'error' ? '' : 'hidden'}>
          <p className="error-title">无法计算剩余时长</p>
          <p className="error-details">{errorMessage || '请确保您正在浏览B站合集视频页面'}</p>
        </div>
      </div>

      <div className="footer">
        <button type="button" onClick={fetchVideoTimeInfo} disabled={status === 'loading'}>
          <span className="button-content">
            <svg 
              className={`refresh-icon ${status === 'loading' ? 'spinning' : ''}`}
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {status === 'loading' ? '刷新中...' : '刷新数据'}
          </span>
        </button>
      </div>
    </div>
  );
}
