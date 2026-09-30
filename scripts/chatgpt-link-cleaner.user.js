// ==UserScript==
// @name        ChatGPT Link Cleaner
// @namespace   chatgpt-link-cleaner
// @version     5.0
// @description Replace ChatGPT citations with plain target=_blank links while preserving all surrounding content and Markdown structure.
// @match       https://chatgpt.com/*
// @copyright   Copyright © 2026 Peter Mugane - https://raw.githubusercontent.com/Mugane/tampermonkey/main/LICENSE
// @homepage    https://github.com/Mugane/tampermonkey
// @run-at      document-idle
// @grant       none
// ==/UserScript==

(() => {
    'use strict';
    const BUTTON  = 'button[data-assistant-sources-payload]';
    const WRAPPER = '[data-assistant-content-reference]';
    const DONE    = 'data-tm-direct-link';

    function getSource(button) { // Get and validate the first source from the citation payload:
        try {
            const raw = button.getAttribute('data-assistant-sources-payload');
            if (!raw) return null;
            const sources = JSON.parse(raw);
            if (!Array.isArray(sources) || !sources.length || !sources[0]?.url) return null;
            const source = sources[0];
            if (!/^https?:\/\//i.test(source.url)) return null;
            return source;
        }
        catch { return null; }
    }
    function clean(button) { // Replace a ChatGPT citation with an ordinary external link:
        if (!(button instanceof HTMLElement)) return;
        if (button.hasAttribute(DONE)) return;
        const source = getSource(button);
        if (!source) return;
        const titleElement = button.querySelector('[data-assistant-reference-title]');
        const title = titleElement?.textContent?.trim() || source.title || source.attribution || source.url;
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = title;
        link.style.cssText = 'color: var(--link-color, #2563eb); text-decoration: none; cursor: pointer;';
        link.addEventListener('mouseenter', () => { link.style.textDecoration = 'underline'; });
        link.addEventListener('mouseleave', () => { link.style.textDecoration = 'none'; });
        link.addEventListener('click', event => { event.stopImmediatePropagation(); }, true);
        const wrapper = button.closest(WRAPPER) || button; // Replace the outermost citation container
        button.setAttribute(DONE, '');
        wrapper.replaceWith(link);
    }
    function scan(root) { // Find and clean citation buttons in the supplied DOM root:
        if (!(root instanceof Element) && !(root instanceof Document)) return;
        if (root instanceof Element && root.matches(BUTTON)) clean(root);
        root.querySelectorAll(BUTTON).forEach(clean);
    }

    // scan(document); // Initial page scan
    scan(document.querySelector('div[aria-label="Conversation"]')); // Initial page scan
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                scan(node);
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
