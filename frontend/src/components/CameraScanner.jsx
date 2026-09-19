import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Mic, MicOff, Upload, CheckCircle2, SwitchCamera, AlertCircle, Image as ImageIcon } from 'lucide-react';

export default function CameraScanner({ isOpen, onClose, onCaptureAndSend, isProcessing, language = 'te' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraStarting, setIsCameraStarting] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [capturedImage, setCapturedImage] = useState(null);
  const [speechText, setSpeechText] = useState(language === 'hi' ? 'यह सामान जोड़ो' : (language === 'en' ? 'add this item' : 'ఈ వస్తువు వేయి'));
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCameraError(null);
      setIsCameraStarting(true);
      setCameraActive(false);
      startCamera(facingMode);
      initSpeech();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, language]);

  const initSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      const localeMap = { 'te': 'te-IN', 'hi': 'hi-IN', 'en': 'en-IN' };
      rec.lang = localeMap[language] || 'te-IN';
      rec.onresult = (e) => {
        let t = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          t += e.results[i][0].transcript;
        }
        if (t) setSpeechText(t);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSpeechText('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const attachStreamToVideo = (stream) => {
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      setCameraActive(true);
      setIsCameraStarting(false);
      return;
    }

    video.srcObject = stream;
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');

    // Attach onloadedmetadata handler to start playback smoothly
    video.onloadedmetadata = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Video play caught:', err);
      }
      setCameraActive(true);
      setIsCameraStarting(false);
    };

    // Fallback timer if onloadedmetadata takes too long
    setTimeout(() => {
      if (streamRef.current && video) {
        video.play().catch(e => console.warn('Delayed play:', e));
        setCameraActive(true);
        setIsCameraStarting(false);
      }
    }, 1000);
  };

  const startCamera = async (mode = 'environment') => {
    stopCamera();
    setIsCameraStarting(true);
    setCameraError(null);
    setCameraActive(false);

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsCameraStarting(false);
      setCameraError('Camera API is not supported or page is not in a secure context (HTTPS/localhost). You can upload a grocery photo directly.');
      return;
    }

    // Constraints to try in order of preference
    const constraintsList = [
      // 1. Ideal facing mode with ideal resolution (will not fail if facingMode is missing)
      {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      // 2. Generic video fallback (guarantees desktop webcams, virtual cameras, USB webcams work)
      {
        video: true,
        audio: false
      }
    ];

    let lastErr = null;
    for (const constraints of constraintsList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        attachStreamToVideo(stream);
        return;
      } catch (err) {
        console.warn('Camera attempt failed with constraints:', constraints, err);
        lastErr = err;
      }
    }

    // Both attempts failed
    setIsCameraStarting(false);
    setCameraActive(false);
    if (lastErr?.name === 'NotAllowedError' || lastErr?.name === 'PermissionDeniedError') {
      setCameraError('Camera permission was denied. Please allow camera access in your browser address bar, or upload a photo.');
    } else if (lastErr?.name === 'NotFoundError' || lastErr?.name === 'DevicesNotFoundError') {
      setCameraError('No camera found on this device. You can upload a photo of your grocery item below.');
    } else {
      setCameraError(lastErr?.message || 'Unable to access camera. Please check your camera permissions or upload a photo.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsCameraStarting(false);
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);
      const b64 = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(b64);
    } catch (e) {
      console.error('Capture frame error:', e);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setCameraError(null);
    };
    reader.readAsDataURL(file);
  };

  // Helper to load sample image for rapid Kirana testing
  const loadSampleItem = async (imagePath, defaultSpeech) => {
    try {
      const resp = await fetch(imagePath);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result);
        setSpeechText(defaultSpeech);
        setCameraError(null);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    }
  };

  const handleConfirmAndSend = () => {
    if (!capturedImage) return;
    onCaptureAndSend(capturedImage, speechText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-white flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-stone-100">
              Scan Grocery Item (కెమెరా స్కాన్)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {cameraActive && (
              <button
                onClick={toggleFacingMode}
                title="Switch Camera (Front / Back)"
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black aspect-square sm:aspect-video flex items-center justify-center overflow-hidden min-h-[260px]">
          
          {/* ALWAYS render video element so videoRef.current is never null */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${capturedImage || isCameraStarting || cameraError ? 'hidden' : 'block'}`}
          />

          {/* Captured Image Preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured grocery frame"
              className="w-full h-full object-contain bg-stone-950"
            />
          )}

          {/* Live Camera Viewfinder Frame & Scan Line */}
          {cameraActive && !capturedImage && (
            <div className="absolute inset-8 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none">
              <div className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider text-amber-300 bg-black/60 px-2 py-0.5 rounded">
                Hold item inside frame
              </div>
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-scan-line pointer-events-none" />
            </div>
          )}

          {/* Loading State: Camera starting */}
          {isCameraStarting && !capturedImage && (
            <div className="text-center p-6 space-y-3 z-10">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <div>
                <p className="text-sm font-bold text-stone-200">Connecting to camera...</p>
                <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1">
                  Starting your webcam / device camera feed
                </p>
              </div>
            </div>
          )}

          {/* Error / Fallback UI if camera cannot be accessed */}
          {!isCameraStarting && !cameraActive && !capturedImage && (
            <div className="text-center p-6 space-y-3 z-10">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <div>
                <p className="text-sm font-bold text-stone-200">Camera Unavailable</p>
                <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1">
                  {cameraError || 'Please allow camera permission or upload a photo directly below.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200"
                >
                  Retry Camera
                </button>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* Processing Loading Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
              <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-sm font-bold text-amber-200">
                Analyzing grocery packaging...
              </p>
              <p className="text-xs text-stone-400">
                Recognizing grocery item & updating inventory
              </p>
            </div>
          )}
        </div>

        {/* Quick Sample Items (For Instant Testing Without Webcam) */}
        {!capturedImage && (
          <div className="px-4 py-2 bg-stone-950/70 border-t border-stone-800 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-stone-400 shrink-0 font-medium">Quick Test:</span>
            <button
              type="button"
              onClick={() => loadSampleItem('/assets/products/rice.png', 'Rice 5 bags add cheyyi')}
              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-medium shrink-0 flex items-center gap-1"
            >
              <span>🌾 Sona Masoori Rice</span>
            </button>
            <button
              type="button"
              onClick={() => loadSampleItem('/assets/products/cooking_oil.png', 'Cooking oil 10 bottles add cheyyi')}
              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-medium shrink-0 flex items-center gap-1"
            >
              <span>🌻 Cooking Oil</span>
            </button>
            <button
              type="button"
              onClick={() => loadSampleItem('/assets/products/tea_powder.png', 'Tea powder 8 packets add cheyyi')}
              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-medium shrink-0 flex items-center gap-1"
            >
              <span>☕ Tea Powder</span>
            </button>
          </div>
        )}

        {/* Speech Context & Controls */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMic}
              type="button"
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-stone-800 hover:bg-stone-700 text-amber-400'
              }`}
              title="Speak with photo"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              placeholder="Spoken words (e.g. 'బియ్యం 10 బస్తాలు' or 'add this item')..."
              className="flex-1 px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 placeholder-stone-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 justify-end pt-1">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={() => setCapturedImage(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl border border-stone-700 hover:bg-stone-800 text-xs font-semibold text-stone-300"
                >
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSend}
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Identify & Add Stock</span>
                </button>
              </>
            ) : (
              <>
                <label className="px-3 py-2 rounded-xl border border-stone-700 hover:bg-stone-800 text-xs font-semibold text-stone-300 cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!cameraActive || isProcessing}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Frame</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
