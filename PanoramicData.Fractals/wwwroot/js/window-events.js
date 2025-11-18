let resizeCallback = null;
let resizeTimeout = null;

export function setupResizeHandler(dotNetHelper) {
    resizeCallback = async () => {
        // Debounce resize events
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        
        resizeTimeout = setTimeout(async () => {
            await dotNetHelper.invokeMethodAsync('OnWindowResized');
        }, 150); // 150ms debounce
    };
    
    window.addEventListener('resize', resizeCallback);
}

export function removeResizeHandler() {
    if (resizeCallback) {
        window.removeEventListener('resize', resizeCallback);
        resizeCallback = null;
    }
    
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
        resizeTimeout = null;
    }
}
