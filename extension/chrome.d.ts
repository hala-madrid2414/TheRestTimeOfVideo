declare namespace chrome {
  namespace runtime {
    const lastError: { message: string } | undefined;

    const onInstalled: {
      addListener(callback: () => void): void;
    };

    const onMessage: {
      addListener(
        callback: (request: any, sender: any, sendResponse: (response?: any) => void) => void
      ): void;
    };
  }

  namespace tabs {
    type Tab = {
      id?: number;
      url?: string;
    };

    function query(
      queryInfo: { active: boolean; currentWindow: boolean },
      callback: (tabs: Tab[]) => void
    ): void;

    function sendMessage(
      tabId: number,
      message: unknown,
      responseCallback?: (response: any) => void
    ): void;
  }
}

declare const chrome: typeof chrome;
