import React from "react";

/** App-wide alert flags surfaced as a chrome row by `Shell`. Lives separately
 *  from `SaveContext` because alerts come from app-level mutation results
 *  (e.g. failed save writes) rather than the persisted save file itself. */
export type AppNotice = {
  /** True when the most recent save attempt failed to write to disk. */
  progressUnwritable: boolean;
};

const DEFAULT_NOTICE: AppNotice = { progressUnwritable: false };

const AppNoticeContext = React.createContext<AppNotice>(DEFAULT_NOTICE);

export type AppNoticeProviderProps = {
  value: AppNotice;
  children: React.ReactNode;
};

export function AppNoticeProvider({ value, children }: AppNoticeProviderProps): React.ReactElement {
  return <AppNoticeContext.Provider value={value}>{children}</AppNoticeContext.Provider>;
}

export function useAppNotice(): AppNotice {
  return React.useContext(AppNoticeContext);
}
