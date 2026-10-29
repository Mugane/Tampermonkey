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

    function deleteURL(url) { // Remove URL entry from local storage:
        const history = getHistory().filter(item => item !== url);
        setHistory(history);
        showDropdown();
        DEBUG && console.log('[Portainer URL History] Deleted:', url);
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
            item.className = 'hover:bg-blue-9';
            Object.assign(item.style, {
                display: 'flex',
                alignItems: 'center',
                padding: '0 6px 0 12px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            });
            const label = document.createElement('span');
            label.textContent = url;
            label.title = url;
            Object.assign(label.style, {
                flex: '1',
                minWidth: '0',
                padding: '9px 6px 9px 0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            });
            label.addEventListener('mousedown', event => {
                event.preventDefault();
                setReactInputValue(currentInput, url);
                hideDropdown();
                currentInput.focus();
            });
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.textContent = '×';
            deleteButton.title = 'Delete this URL';
            deleteButton.setAttribute('aria-label', `Delete ${url}`);
            Object.assign(deleteButton.style, {
                flex: '0 0 auto',
                width: '24px',
                height: '24px',
                padding: '0',
                margin: '0',
                border: '0',
                borderRadius: '25%',
                background: 'transparent',
                color: 'inherit',
                fontSize: '18px',
                lineHeight: '1',
                cursor: 'pointer',
                opacity: '0.7'
            });
            deleteButton.addEventListener('mouseenter', () => { deleteButton.style.opacity = '1'; deleteButton.style.backgroundColor = 'rgba(255,255,255,0.3)'; });
            deleteButton.addEventListener('mouseleave', () => { deleteButton.style.opacity = '0.7'; deleteButton.style.backgroundColor = 'transparent'; });
            deleteButton.addEventListener('mousedown', event => {
                event.preventDefault();
                event.stopPropagation();
                deleteURL(url);
            });
            item.appendChild(label);
            item.appendChild(deleteButton);
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

    function scan() { // Find/re-find the field because Portainer is a React SPA:
        const input = findInput();
        if (input) attachInput(input);
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
    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('mousedown', event => { if (event.target !== currentInput && !dropdown?.contains(event.target)) hideDropdown();});
    window.addEventListener('resize', positionDropdown);
    window.addEventListener('scroll', positionDropdown, true);
    scan(); // Initial scan
})();
