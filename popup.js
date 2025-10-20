// popup.js - 处理弹出窗口的交互逻辑

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const loadingElement = document.getElementById('loading');
  const resultElement = document.getElementById('result');
  const errorElement = document.getElementById('error-message');
  const refreshButton = document.getElementById('refresh-btn');
  
  // 结果显示元素
  const currentVideoTitleElement = document.getElementById('current-video-title');
  const currentProgressElement = document.getElementById('current-progress');
  const remainingVideosElement = document.getElementById('remaining-videos');
  const remainingTimeElement = document.getElementById('remaining-time');
  const estimatedFinishTimeElement = document.getElementById('estimated-finish-time');
  
  // 初始化时获取数据
  fetchVideoTimeInfo();
  
  // 刷新按钮点击事件
  refreshButton.addEventListener('click', fetchVideoTimeInfo);
  
  // 获取视频时长信息
  function fetchVideoTimeInfo() {
    // 显示加载状态
    showLoading();
    
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      
      // 检查是否在B站视频页面
      if (!activeTab.url.includes('bilibili.com/video')) {
        showError('请在B站视频页面使用此扩展');
        return;
      }
      
      // 向内容脚本发送消息
      chrome.tabs.sendMessage(
        activeTab.id,
        {action: 'getVideoTimeInfo'},
        function(response) {
          if (chrome.runtime.lastError) {
            showError('无法连接到页面: ' + chrome.runtime.lastError.message);
            return;
          }
          
          if (response && response.success) {
            displayResults(response.data);
          } else {
            showError(response?.error || '无法获取视频信息');
          }
        }
      );
    });
  }
  
  // 显示加载状态
  function showLoading() {
    loadingElement.classList.remove('hidden');
    resultElement.classList.add('hidden');
    errorElement.classList.add('hidden');
  }
  
  // 显示结果
  function displayResults(data) {
    // 隐藏加载状态，显示结果
    loadingElement.classList.add('hidden');
    resultElement.classList.remove('hidden');
    errorElement.classList.add('hidden');
    
    // 填充数据
    currentVideoTitleElement.textContent = truncateText(data.currentVideoTitle, 20);
    currentProgressElement.textContent = data.currentProgress;
    remainingVideosElement.textContent = data.remainingVideos + ' 个';
    remainingTimeElement.textContent = data.remainingTime;
    estimatedFinishTimeElement.textContent = data.estimatedFinishTime;
  }
  
  // 显示错误信息
  function showError(message) {
    loadingElement.classList.add('hidden');
    resultElement.classList.add('hidden');
    errorElement.classList.remove('hidden');
    
    const errorDetailsElement = errorElement.querySelector('.error-details');
    if (errorDetailsElement) {
      errorDetailsElement.textContent = message;
    }
  }
  
  // 截断过长的文本
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
});