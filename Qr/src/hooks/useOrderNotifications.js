import { useCallback, useRef } from 'react';

/**
 * useOrderNotifications
 * Provides helpers to play a beep sound and fire a browser notification
 * whenever a new order arrives. Sound can be toggled on/off.
 */
export function useOrderNotifications(soundEnabled = true) {
    const audioCtxRef = useRef(null);

    // Lazily create the AudioContext on first use (browsers require user gesture first)
    const getAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtxRef.current;
    }, []);

    /**
     * playBeep — plays a short two-tone beep via Web Audio API.
     * No external audio files required.
     */
    const playBeep = useCallback(() => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioCtx();
            const tones = [880, 1100]; // Hz – two-tone alert
            tones.forEach((freq, i) => {
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.connect(gain);
                gain.connect(ctx.destination);
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;
                gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.18);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.15);
                oscillator.start(ctx.currentTime + i * 0.18);
                oscillator.stop(ctx.currentTime + i * 0.18 + 0.15);
            });
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }, [soundEnabled, getAudioCtx]);

    /**
     * fireNotification — sends a browser Notification for a new order.
     * Requests permission automatically on first call.
     */
    const fireNotification = useCallback((order) => {
        if (!('Notification' in window)) return;
        const show = () => {
            const tableInfo = order.table_number ? ` — Table ${order.table_number}` : '';
            new Notification('🔔 New Order!', {
                body: `Order #${String(order.id).slice(0, 6).toUpperCase()}${tableInfo} · ₹${order.total}`,
                icon: '/favicon.ico',
                tag: order.id, // prevents duplicate notifications for same order
            });
        };
        if (Notification.permission === 'granted') {
            show();
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((perm) => {
                if (perm === 'granted') show();
            });
        }
    }, []);

    return { playBeep, fireNotification };
}
