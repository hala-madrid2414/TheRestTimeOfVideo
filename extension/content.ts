type VideoTimeInfo = {
  currentVideoTitle: string;
  currentProgress: string;
  remainingVideos: number;
  totalVideos: number;
  remainingTime: string;
  estimatedFinishTime: string;
  note?: string;
};

type VideoProgress = {
  currentTime: number;
  duration: number;
};

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: (response?: any) => void) => {
  if (request.action === 'getVideoTimeInfo') {
    try {
      const result = calculateRemainingTime();
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<VideoTimeInfo>)
          .then((timeInfo) => {
            sendResponse({ success: true, data: timeInfo });
          })
          .catch((error: any) => {
            console.error('获取视频时长信息失败:', error);
            sendResponse({ success: false, error: error.message });
          });
      } else {
        sendResponse({ success: true, data: result as VideoTimeInfo });
      }
    } catch (error: any) {
      console.error('获取视频时长信息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

function calculateRemainingTime(): VideoTimeInfo | Promise<VideoTimeInfo> {
  if (!window.location.href.includes('bilibili.com/video')) {
    throw new Error('当前页面不是B站视频页面');
  }

  console.log('开始查找视频合集列表...');

  const videoList = getVideoList();
  console.log('获取到视频列表元素数量:', videoList ? videoList.length : 0);

  if (!videoList || videoList.length === 0) {
    const timeInfo = extractTimeInfoFromPage();
    if (timeInfo) {
      console.log('从页面直接提取到时间信息:', timeInfo);
      return timeInfo;
    }
    throw new Error('未找到视频合集列表');
  }

  const currentIndex = getCurrentVideoIndex(videoList);
  if (currentIndex === -1) {
    throw new Error('无法确定当前播放的视频');
  }

  const currentVideoTitle = getCurrentVideoTitle(videoList, currentIndex);
  const currentProgress = getCurrentVideoProgress();

  const remainingVideos = videoList.length - currentIndex;

  let displayRemainingVideos = remainingVideos;
  let totalVideosCount = videoList.length;

  const pageIndexInfo = document.querySelector(
    '.cur-page, .video-data, .player-auxiliary-playlist-top .last-line'
  );
  if (pageIndexInfo) {
    const text = pageIndexInfo.textContent;
    const match = text!.match(/(\d+)\s*\/\s*(\d+)/);
    if (match && match[1] && match[2]) {
      const currentPageIndex = parseInt(match[1]);
      const totalVideos = parseInt(match[2]);
      if (!isNaN(currentPageIndex) && !isNaN(totalVideos) && totalVideos > 0) {
        displayRemainingVideos = totalVideos - currentPageIndex + 1;
        totalVideosCount = totalVideos;
        console.log(
          '从页面信息计算剩余视频数：当前索引',
          currentPageIndex,
          '总视频数',
          totalVideos,
          '剩余视频数',
          displayRemainingVideos
        );
      }
    }
  }

  console.log(
    '计算剩余视频数：总视频数',
    videoList.length,
    '当前索引',
    currentIndex,
    '剩余视频数',
    remainingVideos,
    '显示剩余视频数',
    displayRemainingVideos
  );

  const remainingTimeInSeconds = calculateTotalRemainingTime(
    videoList,
    currentIndex,
    currentProgress,
    displayRemainingVideos
  );

  const formattedRemainingTime = formatTime(remainingTimeInSeconds);
  const estimatedFinishTime = calculateEstimatedFinishTime(remainingTimeInSeconds);

  return {
    currentVideoTitle,
    currentProgress:
      formatTime(currentProgress.currentTime) + ' / ' + formatTime(currentProgress.duration),
    remainingVideos: displayRemainingVideos || remainingVideos,
    totalVideos: totalVideosCount,
    remainingTime: formattedRemainingTime,
    estimatedFinishTime: estimatedFinishTime
  };
}

function getVideoList(): Element[] {
  console.log('开始获取视频列表，URL:', window.location.href);

  const videoInfoText = document.querySelector('.video-info-detail .video-data');
  if (videoInfoText) {
    const infoText = videoInfoText.textContent;
    const matchResult = infoText!.match(/(\d+)\/(\d+)/);
    if (matchResult && matchResult[2]) {
      const totalVideos = parseInt(matchResult[2]);
      console.log('从视频信息中检测到总视频数:', totalVideos);
    }
  }

  const collectionTitle = document.querySelector('.video-title, .collection-title, .video-info-title');
  if (collectionTitle) {
    const titleText = collectionTitle.textContent;
    const matchResult = titleText!.match(/(\d+)\/(\d+)/);
    if (matchResult && matchResult[2]) {
      const totalVideos = parseInt(matchResult[2]);
      console.log('从标题中检测到总视频数:', totalVideos);
    }
  }

  const episodeCount = document.querySelector('.cur-page');
  if (episodeCount) {
    const countText = episodeCount.textContent;
    const matchResult = countText!.match(/(\d+)\/(\d+)/);
    if (matchResult && matchResult[2]) {
      const totalVideos = parseInt(matchResult[2]);
      console.log('从选集计数中检测到总视频数:', totalVideos);
    }
  }

  const rightSideCount = document.querySelector('.player-auxiliary-playlist-top .last-line');
  if (rightSideCount) {
    const countText = rightSideCount.textContent;
    const matchResult = countText!.match(/(\d+)[^\d]*(\d+)/);
    if (matchResult && matchResult[2]) {
      const totalVideos = parseInt(matchResult[2]);
      console.log('从右侧列表中检测到总视频数:', totalVideos);
    }
  }

  const totalCountElements = document.querySelectorAll(
    '.cur-page, .video-data, .player-auxiliary-playlist-top .last-line'
  );
  for (const el of totalCountElements) {
    const text = el.textContent;
    const match = text!.match(/(\d+)\s*\/\s*(\d+)/);
    if (match && match[2]) {
      const totalCount = parseInt(match[2]);
      console.log('页面显示的视频总数(用于日志):', totalCount);
    }
  }

  if (window.location.href.includes('bilibili.com/video')) {
    const episodeCards = document.querySelectorAll(
      '.video-episode-card, .video-section-list .video-episode-card__info-container'
    );
    if (episodeCards && episodeCards.length > 1) {
      console.log('找到视频合集卡片，数量:', episodeCards.length);
      return Array.from(episodeCards);
    }

    const rightSideList = document.querySelectorAll('.player-auxiliary-playlist-item, .list-item');
    if (rightSideList && rightSideList.length > 1) {
      console.log('找到右侧播放列表项，数量:', rightSideList.length);
      return Array.from(rightSideList);
    }

    const videoList = document.querySelector('.video-section-list');
    if (videoList) {
      const items = videoList.querySelectorAll('li, .video-episode-card, div[class*="item"]');
      if (items && items.length > 1) {
        console.log('找到视频选集列表项，数量:', items.length);
        return Array.from(items);
      }
    }
  }

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

  let videoItems: ArrayLike<Element> = [];

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

  if (videoItems.length <= 1) {
    console.log('尝试查找更通用的视频列表元素');
    try {
      const timeRegex = /\d+:\d+/;
      const containers = document.querySelectorAll(
        '.video-section-list, .list-box, .ep-list-wrapper, .player-auxiliary-playlist, .collection-list, .video-list, .list'
      );
      let allElements: Element[] = [];

      if (containers && containers.length > 0) {
        containers.forEach((container) => {
          allElements = [...allElements, ...container.querySelectorAll('*')];
        });
      } else {
        allElements = Array.from(document.querySelectorAll('*')).slice(0, 5000);
      }

      console.log('查找潜在元素，总数:', allElements.length);

      const potentialItems = allElements.filter((el) => {
        return (
          timeRegex.test(el.textContent!) &&
          ((el as any).classList.length > 0 || el.tagName === 'LI' || el.tagName === 'DIV') &&
          !el.querySelector('video')
        );
      });

      console.log('找到潜在的视频列表项:', potentialItems.length);

      if (potentialItems.length > 0) {
        const parentGroups: Record<string, Element[]> = {};
        potentialItems.forEach((item) => {
          const parent = item.parentElement;
          if (parent) {
            const parentKey = parent.tagName + (parent.className ? '.' + parent.className : '');
            if (!parentGroups[parentKey]) {
              parentGroups[parentKey] = [];
            }
            parentGroups[parentKey].push(item);
          }
        });

        let maxCount = 0;
        let bestItems: Element[] = [];
        for (const parentKey in parentGroups) {
          if (parentGroups[parentKey].length > maxCount) {
            maxCount = parentGroups[parentKey].length;
            bestItems = parentGroups[parentKey];
          }
        }

        if (bestItems.length > 1) {
          videoItems = bestItems;
          console.log('使用通用方法找到视频列表，数量:', (videoItems as any).length);
        }
      }
    } catch (e) {
      console.error('通用查找方法出错:', e);
    }
  }

  if (videoItems.length <= 1) {
    console.log('尝试直接从页面查找所有时间格式元素');
    try {
      const allElements = Array.from(document.querySelectorAll('*'));
      const timeRegex = /(\d+:)?\d+:\d+/;
      const timeElements = allElements.filter(
        (el) =>
          timeRegex.test(el.textContent!) &&
          el.textContent!.trim().length < 20 &&
          !el.querySelector('video')
      );

      if (timeElements.length > 1) {
        videoItems = timeElements;
        console.log('直接找到时间元素，数量:', (videoItems as any).length);
      }
    } catch (e) {
      console.error('直接查找时间元素出错:', e);
    }
  }

  if (videoItems && videoItems.length > 0) {
    console.log('视频列表第一项内容:', (videoItems as any)[0].textContent);
    console.log('视频列表最后一项内容:', (videoItems as any)[(videoItems as any).length - 1].textContent);
  }

  return Array.from(videoItems);
}

function extractTimeInfoFromPage(): VideoTimeInfo | null {
  console.log('尝试从页面直接提取时间信息...');
  try {
    const titleSelectors = ['h1.video-title', '.video-info-title', '.media-title', '.tit', 'h1'];

    let currentVideoTitle = '未知视频';
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent!.trim()) {
        currentVideoTitle = titleElement.textContent!.trim();
        break;
      }
    }

    const videoElement = document.querySelector('video');
    let currentProgress: VideoProgress = { currentTime: 0, duration: 0 };

    if (videoElement) {
      const htmlVideoElement = videoElement as HTMLVideoElement;
      currentProgress = {
        currentTime: htmlVideoElement.currentTime,
        duration: htmlVideoElement.duration
      };
    }

    const timeRegex = /(\d+):(\d+)/g;
    const pageText = document.body.textContent;
    const timeMatches = pageText!.match(timeRegex);

    if (timeMatches && timeMatches.length > 0) {
      console.log('在页面中找到时间格式文本:', timeMatches);

      let totalSeconds = 0;
      let count = 0;

      timeMatches.forEach((timeStr) => {
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

      const estimatedRemainingVideos = Math.max(1, count - 1);
      const totalVideosCount = count;
      const remainingTimeInSeconds = Math.max(0, totalSeconds - currentProgress.currentTime);
      const formattedRemainingTime = formatTime(remainingTimeInSeconds);
      const estimatedFinishTime = calculateEstimatedFinishTime(remainingTimeInSeconds);

      return {
        currentVideoTitle,
        currentProgress:
          formatTime(currentProgress.currentTime) + ' / ' + formatTime(currentProgress.duration),
        remainingVideos: estimatedRemainingVideos,
        totalVideos: totalVideosCount,
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

function getCurrentVideoIndex(videoList: Element[]): number {
  console.log('尝试确定当前播放的视频索引...');

  const activeClassNames = ['active', 'on', 'current', 'is-active', 'on-play', 'playing', 'selected'];

  for (let i = 0; i < videoList.length; i++) {
    const item = videoList[i];
    const classList = item.classList;

    if (activeClassNames.some((className) => classList.contains(className))) {
      console.log('通过类名找到当前播放视频，索引:', i);
      return i;
    }

    const computedStyle = window.getComputedStyle(item);
    if (
      computedStyle.backgroundColor !== 'transparent' &&
      computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
      computedStyle.backgroundColor !== 'rgb(255, 255, 255)'
    ) {
      console.log('通过背景色找到当前播放视频，索引:', i);
      return i;
    }

    if (item.getAttribute('data-state') === 'active' || item.getAttribute('aria-selected') === 'true') {
      console.log('通过属性找到当前播放视频，索引:', i);
      return i;
    }
  }

  const currentUrl = window.location.href;
  for (let i = 0; i < videoList.length; i++) {
    const item = videoList[i];
    const links = item.querySelectorAll('a');
    for (const link of links) {
      const anchor = link as HTMLAnchorElement;
      if (anchor.href && currentUrl.includes(anchor.href)) {
        console.log('通过URL匹配找到当前播放视频，索引:', i);
        return i;
      }
    }
  }

  console.log('无法确定当前播放视频，默认使用第一个视频');
  return 0;
}

function getCurrentVideoTitle(videoList: Element[], currentIndex: number): string {
  if (currentIndex >= 0 && currentIndex < videoList.length) {
    const item = videoList[currentIndex];
    const titleElement = item.querySelector('.title') || item.querySelector('.name') || item.querySelector('a');

    return titleElement ? titleElement.textContent!.trim() : `第 ${currentIndex + 1} 个视频`;
  }

  return '未知视频';
}

function getCurrentVideoProgress(): VideoProgress {
  const videoElement = document.querySelector('video');

  if (videoElement) {
    const htmlVideoElement = videoElement as HTMLVideoElement;
    return {
      currentTime: htmlVideoElement.currentTime,
      duration: htmlVideoElement.duration
    };
  }

  const progressElement = document.querySelector('.bilibili-player-video-progress-detail');
  if (progressElement) {
    const progressText = progressElement.textContent;
    const match = progressText!.match(/(\d+):(\d+)\s*\/\s*(\d+):(\d+)/);

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

  return { currentTime: 0, duration: 0 };
}

function calculateTotalRemainingTime(
  videoList: Element[],
  currentIndex: number,
  currentProgress: VideoProgress,
  displayRemainingVideos?: number
): number {
  let totalRemainingSeconds = 0;

  console.log(
    '计算剩余时间，当前索引:',
    currentIndex,
    '视频总数(当前DOM):',
    videoList.length,
    '显示剩余视频数:',
    displayRemainingVideos
  );

  if (currentProgress && currentProgress.duration > 0) {
    const currentVideoRemaining = Math.max(0, currentProgress.duration - currentProgress.currentTime);
    totalRemainingSeconds += currentVideoRemaining;
    console.log('当前视频剩余时间(秒):', currentVideoRemaining);
  }

  let validTimeCount = 0;
  let totalTimeFound = 0;

  for (let i = currentIndex + 1; i < videoList.length; i++) {
    const timeText = extractTimeFromVideoItem(videoList[i]);
    const seconds = parseTimeToSeconds(timeText);

    if (seconds >= 0) {
      totalRemainingSeconds += seconds;
      validTimeCount++;
      totalTimeFound += seconds;
      console.log(`视频 ${i} 时长(秒): ${seconds}, 时长文本: ${timeText}`);
    }
  }

  console.log('已解析的有效时长数量:', validTimeCount, '已解析的总时长(秒):', totalTimeFound);

  if (typeof displayRemainingVideos === 'number' && displayRemainingVideos > 0) {
    const missingCount = Math.max(0, displayRemainingVideos - 1 - validTimeCount);
    if (missingCount > 0 && validTimeCount > 0) {
      const avgSeconds = totalTimeFound / validTimeCount;
      const estimatedSeconds = avgSeconds * missingCount;
      totalRemainingSeconds += estimatedSeconds;
      console.log(
        '估算缺失视频数量:',
        missingCount,
        '平均时长(秒):',
        Math.round(avgSeconds),
        '估算总时长(秒):',
        Math.round(estimatedSeconds)
      );
    } else if (missingCount > 0 && validTimeCount === 0) {
      console.warn('未能解析任何后续视频时长，无法估算');
    }
  }

  return totalRemainingSeconds;
}

function extractTimeFromVideoItem(videoItem: Element): string {
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

  const allText = videoItem.textContent;
  const timeRegex = /(\d{1,2}:)?\d{1,2}:\d{2}/;
  const match = allText!.match(timeRegex);

  if (match) {
    return match[0];
  }

  return '0:00';
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;

  const formats = [
    /(\d+):(\d+):(\d+)/,
    /(\d+):(\d+)/,
    /(\d+)分(\d+)秒/,
    /(\d+)分/,
    /(\d+)秒/
  ];

  for (const format of formats) {
    const match = timeStr.match(format);
    if (match) {
      if (match.length === 4) {
        return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
      }
      if (match.length === 3) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      }
      if (match.length === 2) {
        if (timeStr.includes('分')) {
          return parseInt(match[1]) * 60;
        }
        return parseInt(match[1]);
      }
    }
  }

  return 0;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function calculateEstimatedFinishTime(remainingSeconds: number): string {
  const now = new Date();
  const finishTime = new Date(now.getTime() + remainingSeconds * 1000);

  const month = finishTime.getMonth() + 1;
  const date = finishTime.getDate();
  const hours = finishTime.getHours().toString().padStart(2, '0');
  const minutes = finishTime.getMinutes().toString().padStart(2, '0');

  return `${month}月${date}日 ${hours}:${minutes}`;
}
