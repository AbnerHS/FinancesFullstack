export const resolveLink = (linkOrHref) => {
  const href = typeof linkOrHref === "string" ? linkOrHref : linkOrHref?.href;
  if (!href) return null;

  if (href.startsWith("/")) {
    return href.replace(/^\/api(\/|$)/, "/");
  }

  if (!href.startsWith("http") && !href.includes("/")) {
    return null;
  }

  try {
    const url = new URL(href);
    return url.pathname.replace(/^\/api(\/|$)/, "/");
  } catch {
    const path = href.replace(/^\/api(\/|$)/, "/");
    return path.startsWith("/") ? path : `/${path}`;
  }
};

export const resolveTemplatedLink = (linkOrHref, params = {}) => {
  const resolved = resolveLink(linkOrHref);
  if (!resolved) return null;

  return resolved.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value == null ? `{${key}}` : encodeURIComponent(String(value));
  });
};
