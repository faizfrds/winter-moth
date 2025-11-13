'use client';

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [labeledImage, setLabeledImage] = useState<string | null>(null);


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
          <div className="mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
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
      
      <footer className="text-center mt-8 text-gray-500">
        <p>Created by Faiz Firdaus, 2025</p>
        <p className='text-slate-300'>University of Massachusetts Amherst</p>
        
      </footer>
    </div>
  );
}