import { useCallback, useEffect, useMemo, useState } from 'react';

type Status = 'loading' | 'success' | 'error';

type VideoTimeInfo = {
  currentVideoTitle: string;
  currentProgress: string;
  remainingVideos: number;
  remainingTime: string;
  estimatedFinishTime: string;
};

export default function Popup() {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<VideoTimeInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const canUseChrome = useMemo(
    () => typeof globalThis !== 'undefined' && typeof globalThis.chrome !== 'undefined',
    []
  );

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
          </div>
          
          <div className="divider"></div>

          <div className="info-row">
            <span className="label">剩余视频数</span>
            <span className="value">{data ? `${data.remainingVideos} 个` : '--'}</span>
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
          {status === 'loading' ? '刷新中...' : '刷新数据'}
        </button>
      </div>
    </div>
  );
}
