import { useCallback } from 'react';

const RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag'; // Test key — replace with live key for production

function loadScript(src) {
    return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export function useRazorpay() {
    const initiatePayment = useCallback(async ({ amount, orderId, customerName, description, onSuccess, onFailure }) => {
        const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');

        if (!loaded) {
            alert('Payment gateway failed to load. Please check your connection.');
            onFailure?.('Script load failed');
            return;
        }

        const options = {
            key: RAZORPAY_KEY,
            amount: Math.round(amount * 100), // Razorpay uses paise
            currency: 'INR',
            name: 'SmartMenu',
            description: description || `Order ${orderId}`,
            image: '/logo192.png',
            order_id: undefined, // For server-side order creation — optional in test mode
            handler: function (response) {
                // response.razorpay_payment_id
                onSuccess?.(response.razorpay_payment_id);
            },
            prefill: {
                name: customerName || '',
            },
            theme: {
                color: '#F9D81A',
            },
            modal: {
                ondismiss: function () {
                    onFailure?.('Payment cancelled by user');
                }
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
            console.error('Razorpay payment failed:', response.error);
            onFailure?.(response.error.description);
        });
        rzp.open();
    }, []);

    return { initiatePayment };
}
