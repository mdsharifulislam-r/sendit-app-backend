import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData, loadImage } from 'canvas';
import * as path from 'path';

import sharp from 'sharp';
import { ApiError } from 'utils/errors/api-error';


// Patch face-api with node-canvas
faceapi.env.monkeyPatch({ Canvas: Canvas as any, Image: Image as any, ImageData: ImageData as any });

const MODEL_PATH = path.join(process.cwd(), 'models');

// Load models
export const loadModels = async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    console.log('✅ Models loaded');
};

loadModels();
// Ensure image is supported by canvas
const ensureSupportedImage = async (imagePath: string) => {
    const ext = path.extname(imagePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.bmp', '.gif'].includes(ext)) {
        // Convert to JPEG using sharp
        const newPath = imagePath.replace(ext, '.jpg');
        await sharp(imagePath).jpeg().toFile(newPath);
        return newPath;
    }
    return imagePath;
};

// Detect face and return descriptor
export const detectFace = async (imagePath: string) => {
    try {
        const supportedPath = await ensureSupportedImage(imagePath);
        const img = (await loadImage(supportedPath)) as unknown as HTMLImageElement;

        const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) throw new ApiError(400, 'No face detected in the image');

        return detection.descriptor;
    } catch (err: any) {
        throw new ApiError(400, err.message);
    }
};

// Verify array of images
export const verifyFace = async (imagePath: string, existingDescriptor: any): Promise<boolean> => {


    const descriptor = await detectFace(imagePath);

    // Compare all descriptors
    const threshold = 0.6;
    const result = await faceapi
        .euclideanDistance(descriptor, objectToFloat32Array(existingDescriptor))

    if (result > threshold) {
        throw new ApiError(400, 'Face not matched');
    }

    return true; // no match
};

function objectToFloat32Array(obj: Record<string, number>): Float32Array {
    const values = Object.keys(obj)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => obj[key]);

    return new Float32Array(values);
}