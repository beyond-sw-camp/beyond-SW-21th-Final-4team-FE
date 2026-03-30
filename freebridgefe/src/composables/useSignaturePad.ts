import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import SignaturePad from 'signature_pad';

export interface UseSignaturePadOptions {
    penColor?: string;
    backgroundColor?: string;
    minWidth?: number;
    maxWidth?: number;
}

export function useSignaturePad(
    canvasRef: Ref<HTMLCanvasElement | null>,
    options: UseSignaturePadOptions = {}
) {
    const signaturePad = ref<SignaturePad | null>(null);
    const isEmpty = ref(true);

    const {
        penColor = '#ffffff',
        backgroundColor = 'transparent',
        minWidth = 0.5,
        maxWidth = 2.5,
    } = options;

    const resizeCanvas = () => {
        const canvas = canvasRef.value;
        if (!canvas || !signaturePad.value) return;

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(ratio, ratio);
        }

        signaturePad.value.clear();
        isEmpty.value = true;
    };

    const init = () => {
        const canvas = canvasRef.value;
        if (!canvas) return;

        signaturePad.value = new SignaturePad(canvas, {
            penColor,
            backgroundColor,
            minWidth,
            maxWidth,
        });

        signaturePad.value.addEventListener('beginStroke', () => {
            isEmpty.value = false;
        });

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    };

    const clear = () => {
        signaturePad.value?.clear();
        isEmpty.value = true;
    };

    const toDataURL = (type: string = 'image/png'): string => {
        if (!signaturePad.value || isEmpty.value) return '';
        return signaturePad.value.toDataURL(type);
    };

    const destroy = () => {
        window.removeEventListener('resize', resizeCanvas);
        signaturePad.value?.off();
        signaturePad.value = null;
    };

    onMounted(() => {
        init();
    });

    onUnmounted(() => {
        destroy();
    });

    return {
        signaturePad,
        isEmpty,
        clear,
        toDataURL,
        resizeCanvas,
    };
}