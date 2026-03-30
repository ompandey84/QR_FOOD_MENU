/**
 * Compress an image file to a maximum width/height while maintaining aspect ratio.
 * Returns a new File object with the compressed image.
 */
export async function compressImage(file, options = {}) {
    const { maxWidthOrHeight = 1200, quality = 0.85 } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;

            // Resize if needed
            if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
                if (width > height) {
                    height = Math.round((height * maxWidthOrHeight) / width);
                    width = maxWidthOrHeight;
                } else {
                    width = Math.round((width * maxWidthOrHeight) / height);
                    height = maxWidthOrHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                        reject(new Error('Canvas compression failed'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
