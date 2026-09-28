// ==UserScript==
// @name        Portainer Template URL History
// @namespace   portainer-template-url-history
// @version     1.0.2
// @description Adds a persistent URL history dropdown to Portainer's Template URL field.
// @match       http://*/*
// @match       https://*/*
// @copyright   Copyright © 2026 Peter Mugane - https://raw.githubusercontent.com/Mugane/tampermonkey/main/LICENSE
// @homepage    https://github.com/Mugane/tampermonkey
// @run-at      document-idle
// ==/UserScript==

(() => {
    'use strict';
    const DEBUG       = false;
    const STORAGE_KEY = 'portainer-template-url-history';
    const MAX_HISTORY = 50;
    let dropdown      = null;
    let currentInput  = null;

    function getHistory() { // Pull template URL history from local storage:
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch { return []; }
    }
    function setHistory(history) { // Save template URL history object to local storage:
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    }
    function rememberURL(url) { // Process new URL entry:
        url = url.trim();
        if (!url) { return; }
        const history = getHistory();
        const filtered = history.filter(item => item !== url); // Remove duplicate
        filtered.unshift(url); // Newest URL goes to the top
        setHistory(filtered);
        DEBUG && console.log('[Portainer URL History] Remembered:', url);
    }
    function findInput() { // Get the Portainer template URL field element:
        return document.querySelector('[data-cy="settings-templateUrl"]');
    }
    function createDropdown() { // Create the dropdown history selector:
        if (dropdown) return;
        dropdown = document.createElement('div');
        dropdown.id = 'portainer-template-url-history-dropdown';
        dropdown.className = 'datatable-unhighlighted';
        Object.assign(dropdown.style, {
            position: 'fixed',
            zIndex: '10',
            display: 'none',
            borderWidth: '1px',
            borderRadius: '4px',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,.25)',
            maxHeight: '300px',
            overflowY: 'auto',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            fontSize: '13px'
        });
        const themeContainer = currentInput?.closest('[theme]');
        (themeContainer || document.body).appendChild(dropdown);
    }
    function positionDropdown() { // Set the dropdown position:
        if (!currentInput || !dropdown) return;
        const rect = currentInput.getBoundingClientRect();
        dropdown.style.left = `${Math.round(rect.left)}px`;
        dropdown.style.top = `${Math.round(rect.bottom + 2)}px`;
        dropdown.style.width = `${Math.round(rect.width)}px`;
    }
    function hideDropdown() { // Hide dropdown:
        if (dropdown) dropdown.style.display = 'none';
    }
    function showDropdown() {
        createDropdown();
        const history = getHistory();
        dropdown.innerHTML = '';
        if (history.length === 0) { hideDropdown(); return; }
        for (const url of history) {
            const item = document.createElement('div');
            item.textContent = url;
            item.title = url;
            Object.assign(item.style, {
                padding: '9px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            });
            item.className = 'hover:bg-blue-9';
            item.addEventListener( // Use mousedown rather than click so that the input doesn't lose focus before selection
                'mousedown',
                event => {
                    event.preventDefault();
                    setReactInputValue(currentInput, url);
                    hideDropdown();
                    currentInput.focus();
                }
            );
            dropdown.appendChild(item);
        }
        positionDropdown();
        dropdown.style.display = 'block';
    }
    function setReactInputValue(input, value) { // React-compatible input value capture:
        const prototype = Object.getPrototypeOf(input);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        if (descriptor?.set) descriptor.set.call(input, value);
        else input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function attachInput(input) { // Attach dropdown to template URL field:
        if (currentInput === input) return;
        currentInput = input;
        input.addEventListener('focus', showDropdown);
        input.addEventListener('click', showDropdown);
    }
    document.addEventListener( // Attach the URL history mechanism to Portainer's save operation:
        'submit',
        event => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) return;
            const saveButton = form.querySelector('[data-cy="settings-saveSettingsButton"]');
            const input = form.querySelector('[data-cy="settings-templateUrl"]');
            if (!saveButton || !input) return;
            rememberURL(input.value);
        },
        true
    );
    function scan() { // Find/re-find the field because Portainer is a React SPA:
        const input = findInput();
        if (input) attachInput(input);
    }

    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('mousedown', event => { if (event.target !== currentInput && !dropdown?.contains(event.target)) hideDropdown(); }); // Close dropdown on outside click
    window.addEventListener('resize', positionDropdown); // Keep dropdown attached to the URL field if the page moves
    window.addEventListener('scroll', positionDropdown, true);
    scan(); // Initial scan
})();
