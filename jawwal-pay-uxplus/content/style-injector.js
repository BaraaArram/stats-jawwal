// Inject design system CSS files into the page
function injectDesignSystem() {
  const designTokensUrl = chrome.runtime.getURL('styles/design-tokens.css');
  const componentsUrl = chrome.runtime.getURL('styles/components.css');
  const layoutComponentsUrl = chrome.runtime.getURL('styles/layout-components.css');

  // Check if already injected to avoid duplicates
  if (document.querySelector(`link[href="${designTokensUrl}"]`)) {
    console.log('[JawwalPay UX+] Design system already loaded');
    return;
  }

  // Inject design-tokens.css
  const designTokensLink = document.createElement('link');
  designTokensLink.rel = 'stylesheet';
  designTokensLink.href = designTokensUrl;
  document.head.appendChild(designTokensLink);

  // Inject components.css
  const componentsLink = document.createElement('link');
  componentsLink.rel = 'stylesheet';
  componentsLink.href = componentsUrl;
  document.head.appendChild(componentsLink);

  // Inject layout-components.css for shared header/footer/layout styles
  const layoutComponentsLink = document.createElement('link');
  layoutComponentsLink.rel = 'stylesheet';
  layoutComponentsLink.href = layoutComponentsUrl;
  document.head.appendChild(layoutComponentsLink);

  console.log('[JawwalPay UX+] Design system loaded');
}
