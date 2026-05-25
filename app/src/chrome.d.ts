declare namespace chrome {
  namespace runtime {
    const lastError: { message: string } | undefined;
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
