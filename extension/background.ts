chrome.runtime.onInstalled.addListener(function () {
  console.log('B站视频剩余时长计算器已安装');
});

chrome.runtime.onMessage.addListener(function (request: any, _sender: any, sendResponse: (response?: any) => void) {
  if (request.action === 'checkBilibiliTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const isBilibiliVideo = activeTab.url!.includes('bilibili.com/video');
      sendResponse({ isBilibiliVideo: isBilibiliVideo });
    });
    return true;
  }
});
