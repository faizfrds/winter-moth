'use client';

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [labeledImage, setLabeledImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);


  const loadImageBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setResult(null);
      setLabeledImage(null);
    }
  };

  const getDetectionCount = () => {
    if (!result || !result.predictions) return 0;
    return result.predictions.length;
  };

  const getClassCounts = () => {
    if (!result || !result.predictions) return {};
    const counts: { [key: string]: number } = {};
    result.predictions.forEach((prediction: any) => {
      const className = prediction.class;
      counts[className] = (counts[className] || 0) + 1;
    });
    return counts;
  };

  const drawBoundingBoxes = (file: File, predictions: any[]) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      predictions.forEach((prediction) => {
        const { x, y, width, height, class: className, confidence } = prediction;
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - width/2, y - height/2, width, height);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px Arial';
        ctx.fillText(`${className} ${(confidence * 100).toFixed(1)}%`, x - width/2, y - height/2 - 5);
      });
      
      setLabeledImage(canvas.toDataURL());
    };
    
    img.src = URL.createObjectURL(file);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setSelectedFile(file);
        setResult(null);
        setLabeledImage(null);
        stopCamera();
      }
    }, 'image/jpeg');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const image = await loadImageBase64(selectedFile);
      
      const response = await axios.post('/api/analyze', { image });
      setResult(response.data);
      
      if (response.data.predictions) {
        drawBoundingBoxes(selectedFile, response.data.predictions);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: 'Failed to analyze image' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto text-black">
        <h1 className="text-3xl font-bold text-center mb-8">Winter Moth Egg Detector</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4 space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            <div className="text-center">
              <span className="text-gray-500">or</span>
            </div>
            
            {!showCamera ? (
              <button
                onClick={startCamera}
                className="block w-full text-sm text-gray-500 py-2 px-4 rounded-full border-0 font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Take Photo with Camera
              </button>
            ) : (
              <div className="space-y-4">
                <video
                  id="camera-video"
                  autoPlay
                  playsInline
                  ref={(video) => {
                    if (video && stream) {
                      video.srcObject = stream;
                    }
                  }}
                  className="w-full rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Capture Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedFile && !labeledImage && (
            <div className="mb-4">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Selected"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}

          {labeledImage && (
            <div className="mb-4 text-black">
              <h3 className="text-lg font-semibold mb-2">Analyzed Image:</h3>
              <img
                src={labeledImage}
                alt="Labeled"
                className="max-w-full h-auto rounded-lg border-2 border-green-500"
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </button>

          {result && (
            <div className="mt-6 space-y-4 text-black">
              <div className="p-4 bg-green-100 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Detection Summary:</h3>
                <p className="text-xl font-bold text-green-700">
                  Total Detections: {getDetectionCount()}
                </p>
                {Object.entries(getClassCounts()).map(([className, count]) => (
                  <p key={className} className="text-lg text-green-600">
                    {className}: {count}
                  </p>
                ))}
              </div>
              
              <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Raw Results:</h3>
                <pre className="text-sm overflow-auto max-h-64">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}