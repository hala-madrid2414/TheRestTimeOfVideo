// content.js - 在B站视频页面中执行的内容脚本

// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoTimeInfo') {
    try {
      const result = calculateRemainingTime();
      // 支持同步或异步返回
      if (result && typeof result.then === 'function') {
        result.then(timeInfo => {
          sendResponse({ success: true, data: timeInfo });
        }).catch(error => {
          console.error('获取视频时长信息失败:', error);
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: true, data: result });
      }
    } catch (error) {
      console.error('获取视频时长信息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // 保持消息通道开启，以便异步响应
});

// 计算剩余视频时长的主函数
function calculateRemainingTime() {
  // 检查是否在B站视频页面
  if (!window.location.href.includes('bilibili.com/video')) {
    throw new Error('当前页面不是B站视频页面');
  }

  console.log('开始查找视频合集列表...');
  
  // 获取视频合集列表
  const videoList = getVideoList();
  console.log('获取到视频列表元素数量:', videoList ? videoList.length : 0);
  
  // 如果没有找到视频列表，尝试直接从页面提取时间信息
  if (!videoList || videoList.length === 0) {
    // 尝试从页面中提取视频时长信息
    const timeInfo = extractTimeInfoFromPage();
    if (timeInfo) {
      console.log('从页面直接提取到时间信息:', timeInfo);
      return timeInfo;
    }
    throw new Error('未找到视频合集列表');
  }

  // 获取当前正在播放的视频索引
  const currentIndex = getCurrentVideoIndex(videoList);
  if (currentIndex === -1) {
    throw new Error('无法确定当前播放的视频');
  }

  // 获取当前视频标题
  const currentVideoTitle = getCurrentVideoTitle(videoList, currentIndex);

  // 获取当前视频的播放进度
  const currentProgress = getCurrentVideoProgress();

  // 计算剩余视频的总时长（包括当前视频的剩余部分）
  // 确保计算的是从当前视频到最后一个视频的数量
  const remainingVideos = videoList.length - currentIndex;
  
  // 检查是否有视频总数信息
  let displayRemainingVideos = remainingVideos;
  
  // 查找页面上显示的当前视频索引和总视频数
  const pageIndexInfo = document.querySelector('.cur-page, .video-data, .player-auxiliary-playlist-top .last-line');
  if (pageIndexInfo) {
    const text = pageIndexInfo.textContent;
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (match && match[1] && match[2]) {
      const currentPageIndex = parseInt(match[1]);
      const totalVideos = parseInt(match[2]);
      if (!isNaN(currentPageIndex) && !isNaN(totalVideos) && totalVideos > 0) {
        // 使用页面上显示的信息计算剩余视频数
        displayRemainingVideos = totalVideos - currentPageIndex + 1; // +1 包括当前视频
        console.log('从页面信息计算剩余视频数：当前索引', currentPageIndex, '总视频数', totalVideos, '剩余视频数', displayRemainingVideos);
      }
    }
  }
  
  console.log('计算剩余视频数：总视频数', videoList.length, '当前索引', currentIndex, '剩余视频数', remainingVideos, '显示剩余视频数', displayRemainingVideos);
  
  const remainingTimeInSeconds = calculateTotalRemainingTime(videoList, currentIndex, currentProgress, displayRemainingVideos);
  
  // 格式化剩余时间
  const formattedRemainingTime = formatTime(remainingTimeInSeconds);
  
  // 计算预计完成时间
  const estimatedFinishTime = calculateEstimatedFinishTime(remainingTimeInSeconds);

  return {
    currentVideoTitle,
    currentProgress: formatTime(currentProgress.currentTime) + ' / ' + formatTime(currentProgress.duration),
    remainingVideos: displayRemainingVideos || remainingVideos,
    remainingTime: formattedRemainingTime,
    estimatedFinishTime: estimatedFinishTime
  };
}

// 获取视频合集列表
function getVideoList() {
  console.log('开始获取视频列表，URL:', window.location.href);
  
  // 检查视频选集信息
  const videoInfoText = document.querySelector('.video-info-detail .video-data');
  if (videoInfoText) {
    const infoText = videoInfoText.textContent;
    const matchResult = infoText.match(/(\d+)\/(\d+)/);
    if (matchResult && matchResult[2]) {
      const totalVideos = parseInt(matchResult[2]);
      console.log('从视频信息中检测到总视频数:', totalVideos);
    }
  }
  
  // 检查视频选集标题中的总数
  const collectionTitle = document.querySelector('.video-title, .collection-title, .video-info-title');
  if (collectionTitle) {
    const titleText = collectionTitle.textContent;
    const matchResult = titleText.match(/(\d+)\/(\d+)/);
    if (matchResult && matchResult[2]) {
      const totalVideos = parseInt(matchResult[2]);
      console.log('从标题中检测到总视频数:', totalVideos);
    }
  }
  
  // 检查视频选集数量显示
  const episodeCount = document.querySelector('.cur-page');
  if (episodeCount) {
    const countText = episodeCount.textContent;
    const matchResult = countText.match(/(\d+)\/(\d+)/);
    if (matchResult && matchResult[2]) {
      const totalVideos = parseInt(matchResult[2]);
      console.log('从选集计数中检测到总视频数:', totalVideos);
    }
  }
  
  // 检查右侧视频列表中显示的总数
  const rightSideCount = document.querySelector('.player-auxiliary-playlist-top .last-line');
  if (rightSideCount) {
    const countText = rightSideCount.textContent;
    const matchResult = countText.match(/(\d+)[^\d]*(\d+)/);
    if (matchResult && matchResult[2]) {
      const totalVideos = parseInt(matchResult[2]);
      console.log('从右侧列表中检测到总视频数:', totalVideos);
    }
  }
  
  // 直接检查页面上显示的视频总数，仅用于日志，不返回虚拟列表
  const totalCountElements = document.querySelectorAll('.cur-page, .video-data, .player-auxiliary-playlist-top .last-line');
  for (const el of totalCountElements) {
    const text = el.textContent;
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (match && match[2]) {
      const totalCount = parseInt(match[2]);
      console.log('页面显示的视频总数(用于日志):', totalCount);
    }
  }
  
  // 针对B站合集页面的特殊处理
  if (window.location.href.includes('bilibili.com/video')) {
    // 检查视频选集卡片
    const episodeCards = document.querySelectorAll('.video-episode-card, .video-section-list .video-episode-card__info-container');
    if (episodeCards && episodeCards.length > 1) {
      console.log('找到视频合集卡片，数量:', episodeCards.length);
      return Array.from(episodeCards);
    }
    
    // 检查右侧播放列表
    const rightSideList = document.querySelectorAll('.player-auxiliary-playlist-item, .list-item');
    if (rightSideList && rightSideList.length > 1) {
      console.log('找到右侧播放列表项，数量:', rightSideList.length);
      return Array.from(rightSideList);
    }
    
    // 检查视频选集列表
    const videoList = document.querySelector('.video-section-list');
    if (videoList) {
      const items = videoList.querySelectorAll('li, .video-episode-card, div[class*="item"]');
      if (items && items.length > 1) {
        console.log('找到视频选集列表项，数量:', items.length);
        return Array.from(items);
      }
    }
  }
  
  // 尝试不同的选择器来适应B站可能的DOM结构变化
  const selectors = [
    '.video-section-list .video-episode-card',
    '.player-auxiliary-playlist-item',
    '.list-item',
    '.video-list-container .video-item',
    '.video-list .video-item',
    '.list .list-item',
    '.video-episode-card',
    '.list-box li',
    '.ep-list-wrapper .ep-item',
    '.video-section-list .video-episode-card__info-container',
    '.video-section-list .video-episode-card__info',
    '.video-section-list > div',
    '.video-section-list li',
    '.video-list-item',
    '.collection-item',
    '.collection-list .item',
    '.section-ep-wrapper .ep-item',
    '.clickitem',
    '.part-item'
  ];
  
  let videoItems = [];
  
  // 尝试每个选择器，直到找到有效的视频列表
  for (const selector of selectors) {
    try {
      videoItems = document.querySelectorAll(selector);
      if (videoItems && videoItems.length > 1) {
        console.log('找到视频列表，使用选择器:', selector, '数量:', videoItems.length);
        break;
      }
    } catch (e) {
      console.error('选择器查询出错:', selector, e);
    }
  }
  
  // 如果上面的选择器都没找到，尝试更通用的方法
  if (videoItems.length <= 1) {
    console.log('尝试查找更通用的视频列表元素');
    try {
      // 查找包含时间格式的元素
      const timeRegex = /\d+:\d+/;
      // 限制查询范围，避免查询过多元素导致性能问题
      const containers = document.querySelectorAll('.video-section-list, .list-box, .ep-list-wrapper, .player-auxiliary-playlist, .collection-list, .video-list, .list');
      let allElements = [];
      
      if (containers && containers.length > 0) {
        containers.forEach(container => {
          allElements = [...allElements, ...container.querySelectorAll('*')];
        });
      } else {
        // 如果没有找到容器，则在整个页面中查找，但限制数量
        allElements = Array.from(document.querySelectorAll('*')).slice(0, 5000); // 增加查找范围
      }
      
      console.log('查找潜在元素，总数:', allElements.length);
      
      const potentialItems = allElements.filter(el => {
        return timeRegex.test(el.textContent) && 
               (el.classList.length > 0 || el.tagName === 'LI' || el.tagName === 'DIV') &&
               !el.querySelector('video'); // 排除视频元素本身
      });
      
      console.log('找到潜在的视频列表项:', potentialItems.length);
      
      if (potentialItems.length > 0) {
        // 按照父元素分组，找出最可能的视频列表
        const parentGroups = {};
        potentialItems.forEach(item => {
          const parent = item.parentElement;
          if (parent) {
            const parentKey = parent.tagName + (parent.className ? '.' + parent.className : '');
            if (!parentGroups[parentKey]) {
              parentGroups[parentKey] = [];
            }
            parentGroups[parentKey].push(item);
          }
        });
        
        // 找出数量最多的父元素组
        let maxCount = 0;
        let bestItems = [];
        for (const parentKey in parentGroups) {
          if (parentGroups[parentKey].length > maxCount) {
            maxCount = parentGroups[parentKey].length;
            bestItems = parentGroups[parentKey];
          }
        }
        
        if (bestItems.length > 1) {
          videoItems = bestItems;
          console.log('使用通用方法找到视频列表，数量:', videoItems.length);
        }
      }
    } catch (e) {
      console.error('通用查找方法出错:', e);
    }
  }
  
  // 如果仍然没有找到足够的视频项，尝试直接从页面中查找所有包含时间格式的元素
  if (videoItems.length <= 1) {
    console.log('尝试直接从页面查找所有时间格式元素');
    try {
      const allElements = Array.from(document.querySelectorAll('*'));
      const timeRegex = /(\d+:)?\d+:\d+/;
      const timeElements = allElements.filter(el => 
        timeRegex.test(el.textContent) && 
        el.textContent.trim().length < 20 && // 时间文本通常较短
        !el.querySelector('video')
      );
      
      if (timeElements.length > 1) {
        videoItems = timeElements;
        console.log('直接找到时间元素，数量:', videoItems.length);
      }
    } catch (e) {
      console.error('直接查找时间元素出错:', e);
    }
  }
  
  // 打印找到的视频列表的一些信息，帮助调试
  if (videoItems && videoItems.length > 0) {
    console.log('视频列表第一项内容:', videoItems[0].textContent);
    console.log('视频列表最后一项内容:', videoItems[videoItems.length - 1].textContent);
  }
  
  return Array.from(videoItems);
}

// 从页面直接提取时间信息的函数
function extractTimeInfoFromPage() {
  console.log('尝试从页面直接提取时间信息...');
  try {
    // 尝试获取当前视频标题
    const titleSelectors = [
      'h1.video-title',
      '.video-info-title',
      '.media-title',
      '.tit',
      'h1'
    ];
    
    let currentVideoTitle = '未知视频';
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        currentVideoTitle = titleElement.textContent.trim();
        break;
      }
    }
    
    // 尝试获取当前视频进度
    const videoElement = document.querySelector('video');
    let currentProgress = { currentTime: 0, duration: 0 };
    
    if (videoElement) {
      currentProgress = {
        currentTime: videoElement.currentTime,
        duration: videoElement.duration
      };
    }
    
    // 尝试从页面中找到所有时间格式的文本
    const timeRegex = /(\d+):(\d+)/g;
    const pageText = document.body.textContent;
    const timeMatches = pageText.match(timeRegex);
    
    // 如果找到了时间格式的文本，假设它们是视频时长
    if (timeMatches && timeMatches.length > 0) {
      console.log('在页面中找到时间格式文本:', timeMatches);
      
      // 计算所有找到的时间的总和作为估计的总时长
      let totalSeconds = 0;
      let count = 0;
      
      timeMatches.forEach(timeStr => {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
          const minutes = parseInt(parts[0]);
          const seconds = parseInt(parts[1]);
          if (!isNaN(minutes) && !isNaN(seconds)) {
            totalSeconds += minutes * 60 + seconds;
            count++;
          }
        }
      });
      
      // 估计剩余视频数量
      const estimatedRemainingVideos = Math.max(1, count - 1);
      
      // 估计剩余时间
      const remainingTimeInSeconds = Math.max(0, totalSeconds - currentProgress.currentTime);
      const formattedRemainingTime = formatTime(remainingTimeInSeconds);
      
      // 计算预计完成时间
      const estimatedFinishTime = calculateEstimatedFinishTime(remainingTimeInSeconds);
      
      return {
        currentVideoTitle,
        currentProgress: formatTime(currentProgress.currentTime) + ' / ' + formatTime(currentProgress.duration),
        remainingVideos: estimatedRemainingVideos,
        remainingTime: formattedRemainingTime,
        estimatedFinishTime: estimatedFinishTime,
        note: '注意：由于无法精确识别视频列表，这是基于页面内容的估计值'
      };
    }
    
    return null;
  } catch (error) {
    console.error('从页面提取时间信息失败:', error);
    return null;
  }
}

// 获取当前正在播放的视频索引
function getCurrentVideoIndex(videoList) {
  console.log('尝试确定当前播放的视频索引...');
  
  // 尝试查找带有active、on或current类的元素
  const activeClassNames = ['active', 'on', 'current', 'is-active', 'on-play', 'playing', 'selected'];
  
  for (let i = 0; i < videoList.length; i++) {
    const item = videoList[i];
    const classList = item.classList;
    
    // 检查是否包含任何一个可能表示"当前播放"的类名
    if (activeClassNames.some(className => classList.contains(className))) {
      console.log('通过类名找到当前播放视频，索引:', i);
      return i;
    }
    
    // 检查是否有高亮样式
    const computedStyle = window.getComputedStyle(item);
    if (computedStyle.backgroundColor !== 'transparent' && 
        computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        computedStyle.backgroundColor !== 'rgb(255, 255, 255)') {
      console.log('通过背景色找到当前播放视频，索引:', i);
      return i;
    }
    
    // 检查是否有特殊的属性
    if (item.getAttribute('data-state') === 'active' || 
        item.getAttribute('aria-selected') === 'true') {
      console.log('通过属性找到当前播放视频，索引:', i);
      return i;
    }
  }
  
  // 如果没有找到明确的当前项，尝试通过URL匹配
  const currentUrl = window.location.href;
  for (let i = 0; i < videoList.length; i++) {
    const item = videoList[i];
    const links = item.querySelectorAll('a');
    for (const link of links) {
      if (link.href && currentUrl.includes(link.href)) {
        console.log('通过URL匹配找到当前播放视频，索引:', i);
        return i;
      }
    }
  }
  
  // 如果仍然没有找到，默认返回第一个视频
  console.log('无法确定当前播放视频，默认使用第一个视频');
  return 0;
}

// 获取当前视频标题
function getCurrentVideoTitle(videoList, currentIndex) {
  if (currentIndex >= 0 && currentIndex < videoList.length) {
    // 尝试从不同的元素中获取标题
    const item = videoList[currentIndex];
    const titleElement = item.querySelector('.title') || 
                         item.querySelector('.name') || 
                         item.querySelector('a');
    
    return titleElement ? titleElement.textContent.trim() : `第 ${currentIndex + 1} 个视频`;
  }
  
  return '未知视频';
}

// 获取当前视频的播放进度
function getCurrentVideoProgress() {
  // 尝试获取视频元素
  const videoElement = document.querySelector('video');
  
  if (videoElement) {
    return {
      currentTime: videoElement.currentTime,
      duration: videoElement.duration
    };
  }
  
  // 如果无法直接获取视频元素，尝试从进度条获取信息
  const progressElement = document.querySelector('.bilibili-player-video-progress-detail');
  if (progressElement) {
    const progressText = progressElement.textContent;
    const match = progressText.match(/(\d+):(\d+)\s*\/\s*(\d+):(\d+)/);
    
    if (match) {
      const currentMinutes = parseInt(match[1]);
      const currentSeconds = parseInt(match[2]);
      const totalMinutes = parseInt(match[3]);
      const totalSeconds = parseInt(match[4]);
      
      return {
        currentTime: currentMinutes * 60 + currentSeconds,
        duration: totalMinutes * 60 + totalSeconds
      };
    }
  }
  
  // 默认返回0进度
  return { currentTime: 0, duration: 0 };
}

// 计算剩余视频的总时长
function calculateTotalRemainingTime(videoList, currentIndex, currentProgress, displayRemainingVideos) {
  let totalRemainingSeconds = 0;
  
  console.log('计算剩余时间，当前索引:', currentIndex, '视频总数(当前DOM):', videoList.length, '显示剩余视频数:', displayRemainingVideos);
  
  // 添加当前视频的剩余时间
  if (currentProgress && currentProgress.duration > 0) {
    const currentVideoRemaining = Math.max(0, currentProgress.duration - currentProgress.currentTime);
    totalRemainingSeconds += currentVideoRemaining;
    console.log('当前视频剩余时间(秒):', currentVideoRemaining);
  }
  
  // 添加后续视频的总时长（DOM中可见的部分）
  let validTimeCount = 0;
  let totalTimeFound = 0;
  
  for (let i = currentIndex + 1; i < videoList.length; i++) {
    const timeText = extractTimeFromVideoItem(videoList[i]);
    const seconds = parseTimeToSeconds(timeText);
    
    // 只过滤小于零的时长
    if (seconds >= 0) {
      totalRemainingSeconds += seconds;
      validTimeCount++;
      totalTimeFound += seconds;
      console.log(`视频 ${i} 时长(秒): ${seconds}, 时长文本: ${timeText}`);
    }
  }
  
  console.log('已解析的有效时长数量:', validTimeCount, '已解析的总时长(秒):', totalTimeFound);
  
  // 如果页面显示还有更多未加载的视频，使用平均时长进行估算
  if (typeof displayRemainingVideos === 'number' && displayRemainingVideos > 0) {
    const missingCount = Math.max(0, (displayRemainingVideos - 1) - validTimeCount); // -1 去掉当前视频
    if (missingCount > 0 && validTimeCount > 0) {
      const avgSeconds = totalTimeFound / validTimeCount;
      const estimatedSeconds = avgSeconds * missingCount;
      totalRemainingSeconds += estimatedSeconds;
      console.log('估算缺失视频数量:', missingCount, '平均时长(秒):', Math.round(avgSeconds), '估算总时长(秒):', Math.round(estimatedSeconds));
    } else if (missingCount > 0 && validTimeCount === 0) {
      console.warn('未能解析任何后续视频时长，无法估算');
    }
  }
  
  return totalRemainingSeconds;
}

// 从视频列表项中提取时长文本
function extractTimeFromVideoItem(videoItem) {
  // 尝试不同的选择器来获取时长信息
  const timeSelectors = [
    '.duration',
    '.length',
    '.time',
    '.video-duration',
    '[class*="duration"]',
    '[class*="time"]',
    '.last-line',
    '.video-episode-card__subtitle',
    '.video-episode-card__info',
    '.bpx-player-epitem-duration'
  ];
  
  for (const selector of timeSelectors) {
    const timeElement = videoItem.querySelector(selector);
    if (timeElement && timeElement.textContent) {
      return timeElement.textContent.trim();
    }
  }
  
  // 如果没有找到明确的时长元素，尝试查找包含时间格式的文本
  const allText = videoItem.textContent;
  const timeRegex = /(\d{1,2}:)?\d{1,2}:\d{2}/; // 支持 HH:MM:SS 或 MM:SS
  const match = allText.match(timeRegex);
  
  if (match) {
    return match[0];
  }
  
  return '0:00'; // 默认时长
}

// 将时间字符串解析为秒数
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  
  // 处理不同格式的时间字符串
  const formats = [
    /(\d+):(\d+):(\d+)/, // HH:MM:SS
    /(\d+):(\d+)/,       // MM:SS
    /(\d+)分(\d+)秒/,     // MM分SS秒
    /(\d+)分/,           // MM分
    /(\d+)秒/            // SS秒
  ];
  
  for (const format of formats) {
    const match = timeStr.match(format);
    if (match) {
      if (match.length === 4) { // HH:MM:SS
        return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
      } else if (match.length === 3) { // MM:SS 或 MM分SS秒
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      } else if (match.length === 2) { // MM分 或 SS秒
        if (timeStr.includes('分')) {
          return parseInt(match[1]) * 60;
        } else {
          return parseInt(match[1]);
        }
      }
    }
  }
  
  return 0;
}

// 将秒数格式化为可读的时间字符串
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return '00时00分00秒';
  }
  
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600); // 支持超过24小时
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}时${minutes.toString().padStart(2, '0')}分${secs.toString().padStart(2, '0')}秒`;
}

// 计算预计完成时间
function calculateEstimatedFinishTime(remainingSeconds) {
  // 如果剩余时间超过一定阈值，返回特殊提示
  if (remainingSeconds > 12 * 3600) { // 超过12小时
    return '预计需要多天完成';
  }
  
  const now = new Date();
  const finishTime = new Date(now.getTime() + remainingSeconds * 1000);
  
  const hours = finishTime.getHours();
  const minutes = finishTime.getMinutes();
  
  // 如果完成时间是第二天
  if (finishTime.getDate() !== now.getDate()) {
    return `明天 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return `今天 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}