// background.js - 扩展的后台脚本

// 监听扩展安装或更新事件
chrome.runtime.onInstalled.addListener(function() {
  console.log('B站视频剩余时长计算器已安装');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'checkBilibiliTab') {
    // 检查当前是否在B站视频页面
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      const isBilibiliVideo = activeTab.url.includes('bilibili.com/video');
      sendResponse({isBilibiliVideo: isBilibiliVideo});
    });
    return true; // 保持消息通道开启，以便异步响应
  }
});