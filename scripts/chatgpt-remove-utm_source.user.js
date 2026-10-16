// ==UserScript==
// @name        ChatGPT Remove utm_source
// @namespace   chatgpt-remove-utm_source
// @version     1.0
// @description Remove ChatGPT's utm_source parameter from citation links.
// @match       https://chatgpt.com/*
// @run-at      document-idle
// @grant       none
// ==/UserScript==

(() => {
    'use strict';
    const CITATION = 'a[data-inline-mention-interactive], a[data-testid="chatgpt-citation"]';

    function clean(link) {
        if (!(link instanceof HTMLAnchorElement)) return;
        const url = new URL(link.href);
        if (!url.searchParams.has('utm_source')) return;
        url.searchParams.delete('utm_source');
        link.href = url.href;
    }
    function scan(root) {
        if (!(root instanceof Element) && !(root instanceof Document)) return;
        if (root instanceof Element && root.matches(CITATION)) clean(root);
        root.querySelectorAll(CITATION).forEach(clean);
    }

//    scan(document); // Initial page scan
    scan(document.querySelector('div.\\[container-name\\:thread-content\\]')); // Initial page scan
    document.addEventListener('click', event => {
        const link = event.target.closest?.(CITATION);
        if (!(link instanceof HTMLAnchorElement)) return;
        clean(link);
        event.stopImmediatePropagation();
    }, true);
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    scan(node);
                }
            }
            if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
                clean(mutation.target);
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['href'], childList: true, subtree: true });
})();
