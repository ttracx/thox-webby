const ALLOWED_ELEMENTS = new Set([
  "A", "BLOCKQUOTE", "BR", "CODE", "EM", "H1", "H2", "H3", "H4", "H5", "H6",
  "HR", "LI", "OL", "P", "PRE", "STRONG", "UL",
]);

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function isSafeLink(value, baseUrl) {
  if (value.startsWith("#")) return true;
  try {
    return SAFE_LINK_PROTOCOLS.has(new URL(value, baseUrl).protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitizes model-generated markdown HTML for display in the chat.
 *
 * The allowlist intentionally excludes every media/embed element. In
 * particular, generated <img> and <video> tags must not initiate remote
 * requests from a prompt-derived response.
 */
export function sanitizeModelHtml(html, documentRef = document) {
  const template = documentRef.createElement("template");
  template.innerHTML = String(html ?? "");

  for (const element of [...template.content.querySelectorAll("*")]) {
    if (!ALLOWED_ELEMENTS.has(element.tagName)) {
      element.remove();
      continue;
    }

    for (const attribute of [...element.attributes]) {
      const keep =
        element.tagName === "A" &&
        (attribute.name.toLowerCase() === "href" || attribute.name.toLowerCase() === "title");
      if (!keep) element.removeAttribute(attribute.name);
    }

    if (element.tagName === "A") {
      const href = element.getAttribute("href");
      if (!href || !isSafeLink(href.trim(), documentRef.baseURI)) {
        element.removeAttribute("href");
        element.removeAttribute("target");
        element.removeAttribute("rel");
      } else if (!href.startsWith("#")) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }
  }

  return template.innerHTML;
}
