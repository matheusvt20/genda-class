export const fbq = (...args: unknown[]) => {
  if (typeof window !== "undefined" && (window as typeof window & { fbq?: (...params: unknown[]) => void }).fbq) {
    (window as typeof window & { fbq?: (...params: unknown[]) => void }).fbq?.(...args);
  }
};

export const trackPageView = () => fbq("track", "PageView");
export const trackLead = () => fbq("track", "Lead");
export const trackCompleteRegistration = () => fbq("track", "CompleteRegistration");
