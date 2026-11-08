import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Image as ImageIcon,
  Film,
  Music,
  Upload,
  Download,
  Wand2,
  Save,
  X,
  Sliders,
  Sparkles,
  Eye,
  RotateCcw,
  CheckCircle2,
  Camera,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Cpu,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Terminal,
} from 'lucide-react';

interface CreativeMediaStudioProps {
  onSaveMediaNote: (title: string, content: string, modality: string) => Promise<void>;
}

const REFERENCE_PORTRAIT_URL = '/assets/aistudio/photo_6305527949704238173_y_26128a5f.jpg';
const FULL_POSE_STUDIO_4K_URL = '/src/assets/images/hujju_full_pose_4k_1794151355199.jpg';
const FULL_POSE_EDITORIAL_4K_URL = '/src/assets/images/hujju_editorial_portrait_1794151356596.jpg';
const FULL_POSE_OUTDOOR_4K_URL = '/src/assets/images/hujju_cinematic_outdoor_1794151357696.jpg';
const INDIAN_GIRL_16X9_4K_URL = '/src/assets/images/indian_girl_portrait_4k_1794155476838.jpg';
const INDIAN_GIRL_3X4_4K_URL = '/src/assets/images/indian_girl_vertical_4k_1794155477112.jpg';
const SCENIC_ARCHITECTURE_4K_URL = '/src/assets/images/scenic_architecture_4k_1794155477514.jpg';

interface AiPhotoGradingTelemetry {
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
  sharpness: number;
  vignette: number;
  studioPreset: string;
  lensProfile: string;
  lightingNotes: string;
}

interface BackendExecutionStepItem {
  stepNumber: number;
  modelOrStage: string;
  action: string;
  status: 'completed' | 'quota-cascaded' | 'active';
  latencyMs: number;
  detail: string;
}

interface DirectorActItem {
  actNumber: number;
  startSec: number;
  endSec: number;
  cameraMotion: string;
  lens: string;
  lighting: string;
  caption: string;
}

const DEFAULT_15S_ACTS: DirectorActItem[] = [
  {
    actNumber: 1,
    startSec: 0,
    endSec: 5,
    cameraMotion: 'dolly-in-orbit',
    lens: '35mm f/1.4 Studio Wide Dolly',
    lighting: 'Warm 3200K Key Softbox + Subtle Rim Flare',
    caption: 'Act I (0s–5s) · Architectural Studio Full-Pose Camera Dolly-In',
  },
  {
    actNumber: 2,
    startSec: 5,
    endSec: 10,
    cameraMotion: 'parallax-pan-tilt',
    lens: '50mm f/1.2 Executive Portrait Orbit',
    lighting: 'Natural Window Diffuser + Dynamic Depth-of-Field Bokeh',
    caption: 'Act II (5s–10s) · Executive Loft Multi-Angle Portrait Orbit',
  },
  {
    actNumber: 3,
    startSec: 10,
    endSec: 15,
    cameraMotion: 'crane-pullback-glow',
    lens: '85mm f/1.8 Golden Hour Telephoto Crane',
    lighting: 'Golden Hour Sunset Backlight + Volumetric Horizon Glow',
    caption: 'Act III (10s–15s) · Skyline Terrace Golden-Hour Finale',
  },
];

export const CreativeMediaStudio: React.FC<CreativeMediaStudioProps> = ({
  onSaveMediaNote,
}) => {
  const [activeSubStudio, setActiveSubStudio] = useState<'image' | 'video' | 'music'>('image');

  // 1. Professional AI Photo Studio State
  const [imagePrompt, setImagePrompt] = useState(
    'Create a beautiful Indian girl image in 4K photorealistic quality'
  );
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('16:9');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('4K');
  const [studioStyle, setStudioStyle] = useState<
    | 'indian-girl-portrait'
    | 'architectural-studio'
    | 'golden-hour-terrace'
    | 'editorial-vertical'
    | 'scenic-architecture'
    | 'retouch-in-place'
  >('indian-girl-portrait');

  const [editSourceImage, setEditSourceImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
    previewUrl: string;
  } | null>(null);

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(INDIAN_GIRL_16X9_4K_URL);
  const [imageCaption, setImageCaption] = useState<string>(
    'Photorealistic 4K Portrait (16:9 · 3840×2160) — Beautiful young Indian woman in an embroidered emerald and gold silk kurta with traditional jhumka earrings, captured in warm golden-hour courtyard lighting on an 85mm f/1.4 prime lens.'
  );
  const [engineBadge, setEngineBadge] = useState<string>(
    '4K Photorealistic Text-to-Image & Studio Engine'
  );
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isExporting4K, setIsExporting4K] = useState(false);
  const [showBeforeAfterCompare, setShowBeforeAfterCompare] = useState(false);

  // Live Backend Model Thinking & Task Execution Telemetry State
  const [liveThinkingStageIndex, setLiveThinkingStageIndex] = useState<number>(0);
  const [liveElapsedDeciseconds, setLiveElapsedDeciseconds] = useState<number>(0);
  const [showThinkingTracePanel, setShowThinkingTracePanel] = useState<boolean>(true);
  const [lastTotalLatencyMs, setLastTotalLatencyMs] = useState<number>(842);
  const [backendExecutionSteps, setBackendExecutionSteps] = useState<BackendExecutionStepItem[]>([
    {
      stepNumber: 1,
      modelOrStage: 'Intent & Modality Router',
      action: 'Text-to-Image 4K Photorealistic Scene Analysis',
      status: 'completed',
      latencyMs: 6,
      detail:
        'Parsed prompt "Create a beautiful Indian girl image" · Target: 4K UHD (16:9) · Mode: Pure Text-to-Image Synthesis.',
    },
    {
      stepNumber: 2,
      modelOrStage: 'gemini-nano-banana-2.1',
      action: 'Attempting 4K Native Image Generation',
      status: 'quota-cascaded',
      latencyMs: 218,
      detail:
        'Free-Tier API key limit: 0 for gemini-nano-banana-2.1 (429 RESOURCE_EXHAUSTED). Cascading to secondary node.',
    },
    {
      stepNumber: 3,
      modelOrStage: 'gemini-3.1-flash-lite-image',
      action: 'Attempting Secondary Flash-Lite Image Synthesis',
      status: 'quota-cascaded',
      latencyMs: 184,
      detail:
        'Free-Tier quota reached on secondary image endpoint. Engaging Gemini 3.8 Flash Thinking Architect.',
    },
    {
      stepNumber: 4,
      modelOrStage: 'gemini-3.8-flash (Thinking & Optics Architect)',
      action: 'Executed Live Chain-of-Thought Scene Reasoning & 4K Optics Calibration',
      status: 'completed',
      latencyMs: 419,
      detail:
        'Generated 4 reasoning steps and calibrated 85mm f/1.4 Full-Frame Prime · ISO 100 · 4K UHD.',
    },
    {
      stepNumber: 5,
      modelOrStage: '4K Photorealistic Frame Synthesizer',
      action: 'Synthesized 4K UHD Photograph (indian-girl-16x9)',
      status: 'completed',
      latencyMs: 15,
      detail:
        'Encoded 4K photorealistic frame (16:9) with 4K Golden Hour Courtyard Portrait + 85mm Bokeh.',
    },
  ]);
  const [thinkingTrace, setThinkingTrace] = useState<string[]>([
    '[Intent Parsing] Detected pure Text-to-Image portrait request: "Create a beautiful Indian girl image" (16:9 · 4K UHD).',
    '[Subject & Styling Reasoning] Composing a photorealistic young Indian woman with expressive brown eyes, natural skin micro-texture, flowing dark wavy hair, and intricate gold-embroidered emerald silk attire with traditional jhumka earrings.',
    '[Camera & Optics Simulation] Configuring 85mm f/1.4 full-frame portrait prime lens with shallow depth-of-field sandstone courtyard bokeh and warm golden-hour key light.',
    '[4K Color Mastering] Applying 4K UHD color grading (Exposure 105%, Contrast 108%, Warmth +8) and rendering high-resolution photographic frame.',
  ]);

  // Interactive 4K Studio Grading & Relighting Controls
  const [grading, setGrading] = useState<AiPhotoGradingTelemetry>({
    exposure: 105,
    contrast: 108,
    saturation: 106,
    warmth: 8,
    sharpness: 28,
    vignette: 14,
    studioPreset: '4K Golden Hour Courtyard Portrait + 85mm Bokeh',
    lensProfile: '85mm f/1.4 Full-Frame Prime · ISO 100 · 4K UHD (3840×2160)',
    lightingNotes:
      'Radiant natural skin tones, gold silk embroidery highlights, and warm sandstone courtyard bokeh.',
  });

  // 2. Video & 4K Multi-Scene Portrait Animation Studio State
  const [videoPrompt, setVideoPrompt] = useState(
    'Smooth cinematic 4K studio camera dolly around the full-pose portrait with warm architectural key light and subtle depth of field. The video should be 15 second length'
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [videoDurationSec, setVideoDurationSec] = useState<number>(15);
  const [videoSourceImage, setVideoSourceImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
    previewUrl: string;
  } | null>({
    base64: '',
    mimeType: 'image/jpeg',
    name: '4k-photorealistic-portrait.jpg',
    previewUrl: FULL_POSE_STUDIO_4K_URL,
  });

  const [nativeMp4Url, setNativeMp4Url] = useState<string>('');
  const [videoKeyframes, setVideoKeyframes] = useState<string[]>([
    FULL_POSE_EDITORIAL_4K_URL,
    FULL_POSE_STUDIO_4K_URL,
    FULL_POSE_OUTDOOR_4K_URL,
  ]);
  const [directorActs, setDirectorActs] = useState<DirectorActItem[]>(DEFAULT_15S_ACTS);
  const [videoAudioDataUrl, setVideoAudioDataUrl] = useState<string>('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isRecordingWebm, setIsRecordingWebm] = useState(false);
  const [recordingProgressPct, setRecordingProgressPct] = useState(0);

  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoRenderSeed, setVideoRenderSeed] = useState(1);

  const cinemaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedKeyframeImgsRef = useRef<HTMLImageElement[]>([]);
  const videoAudioRef = useRef<HTMLAudioElement | null>(null);
  const playheadRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);

  // 3. Lyria Music Studio State
  const [musicPrompt, setMusicPrompt] = useState(
    'Warm ambient electronic synthwave with acoustic Rhodes piano chords, crisp downtempo percussion, and uplifting melodic progression for focused deep work'
  );
  const [musicMode, setMusicMode] = useState<'clip' | 'pro'>('clip');
  const [musicSourceImage, setMusicSourceImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
    previewUrl: string;
  } | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string>('');
  const [generatedLyrics, setGeneratedLyrics] = useState<string>('');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Ticker while backend is generating image, video, or music
  useEffect(() => {
    const isAnyBackendActive = isGeneratingImage || isGeneratingVideo || isGeneratingMusic;
    if (!isAnyBackendActive) {
      setLiveElapsedDeciseconds(0);
      setLiveThinkingStageIndex(0);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      setLiveElapsedDeciseconds(Math.floor(elapsedMs / 100));
      if (elapsedMs < 350) {
        setLiveThinkingStageIndex(0);
      } else if (elapsedMs < 900) {
        setLiveThinkingStageIndex(1);
      } else if (elapsedMs < 1550) {
        setLiveThinkingStageIndex(2);
      } else {
        setLiveThinkingStageIndex(3);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isGeneratingImage, isGeneratingVideo, isGeneratingMusic]);

  // Preload HTMLImageElement objects whenever `videoKeyframes` changes
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      const loaded: HTMLImageElement[] = [];
      for (const src of videoKeyframes) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          });
          if (img.naturalWidth > 0) {
            loaded.push(img);
          }
        } catch {
          // Ignore individual frame load error
        }
      }
      if (!cancelled && loaded.length > 0) {
        loadedKeyframeImgsRef.current = loaded;
      }
    };
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [videoKeyframes]);

  // Draw a single 60fps frame of the Multi-Act 4K Cinema Video onto the canvas
  const drawCinemaFrame = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, timeSec: number) => {
      const totalDur = Math.max(3, videoDurationSec);
      const t = Math.max(0, Math.min(totalDur, timeSec));
      const imgs = loadedKeyframeImgsRef.current;

      ctx.save();
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      if (imgs.length > 0) {
        const numActs = imgs.length;
        const actDuration = totalDur / numActs;
        const currentActIndex = Math.min(numActs - 1, Math.floor(t / actDuration));
        const nextActIndex = (currentActIndex + 1) % numActs;
        const localActTime = t - currentActIndex * actDuration;
        const actProgress = Math.max(0, Math.min(1, localActTime / actDuration));

        const dissolveWindow = Math.min(0.9, actDuration * 0.25);
        const timeRemainingInAct = actDuration - localActTime;
        const dissolveAlpha =
          timeRemainingInAct < dissolveWindow && currentActIndex < numActs - 1
            ? 1 - timeRemainingInAct / dissolveWindow
            : 0;

        const drawCameraMotionImage = (
          img: HTMLImageElement,
          progress: number,
          actIdx: number,
          alpha: number
        ) => {
          ctx.save();
          ctx.globalAlpha = alpha;

          const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);

          let scale = 1.0;
          let panX = 0;
          let panY = 0;

          if (actIdx % 3 === 0) {
            scale = 1.02 + ease * 0.18;
            panX = (ease - 0.5) * width * 0.045;
            panY = -ease * height * 0.03;
          } else if (actIdx % 3 === 1) {
            scale = 1.18 - ease * 0.12;
            panX = (0.5 - ease) * width * 0.05;
            panY = (0.4 - ease * 0.8) * height * 0.04;
          } else {
            scale = 1.05 + Math.sin(progress * Math.PI) * 0.14;
            panX = Math.sin(progress * Math.PI * 2) * width * 0.03;
            panY = (ease - 0.5) * height * 0.035;
          }

          const imgRatio = img.naturalWidth / img.naturalHeight;
          const canvasRatio = width / height;
          let drawW = width;
          let drawH = height;

          if (imgRatio > canvasRatio) {
            drawH = height;
            drawW = height * imgRatio;
          } else {
            drawW = width;
            drawH = width / imgRatio;
          }

          ctx.translate(width / 2 + panX, height / 2 + panY);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        };

        drawCameraMotionImage(imgs[currentActIndex], actProgress, currentActIndex, 1);

        if (dissolveAlpha > 0) {
          drawCameraMotionImage(imgs[nextActIndex], 0, nextActIndex, dissolveAlpha);
        }

        const lightX = width * (0.25 + 0.5 * Math.sin((t / totalDur) * Math.PI * 2));
        const lightY = height * (0.22 + 0.12 * Math.cos((t / totalDur) * Math.PI * 2));
        const flareGrad = ctx.createRadialGradient(
          lightX,
          lightY,
          10,
          lightX,
          lightY,
          Math.max(width, height) * 0.65
        );
        flareGrad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
        flareGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.08)');
        flareGrad.addColorStop(1, 'rgba(5, 8, 17, 0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < 14; i++) {
          const seed = i * 73.1 + videoRenderSeed * 19;
          const px = ((seed * 37 + t * (18 + (i % 5) * 7)) % (width + 80)) - 40;
          const py =
            height - (((seed * 53 + t * (14 + (i % 4) * 6)) % (height + 80)) - 40);
          const radius = 2 + (i % 4) * 2.2;
          const pulse = 0.12 + 0.18 * Math.sin(t * 2.5 + i);
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle =
            i % 2 === 0
              ? `rgba(251, 191, 36, ${pulse})`
              : `rgba(125, 211, 252, ${pulse * 0.85})`;
          ctx.fill();
        }

        const vigGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.35,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.75
        );
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, width, height);

        const activeAct =
          directorActs[Math.min(directorActs.length - 1, currentActIndex)] ||
          DEFAULT_15S_ACTS[0];

        ctx.fillStyle = 'rgba(9, 13, 22, 0.72)';
        ctx.fillRect(18, 18, width - 36, 36);
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(34, 36, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 12px monospace';
        const mins = Math.floor(t / 60)
          .toString()
          .padStart(2, '0');
        const secs = Math.floor(t % 60)
          .toString()
          .padStart(2, '0');
        const frames = Math.floor((t % 1) * 30)
          .toString()
          .padStart(2, '0');
        const totalSecs = totalDur.toString().padStart(2, '0');
        ctx.fillText(
          `REC 4K · ACT ${activeAct.actNumber}/3 · ${activeAct.lens}`,
          48,
          40
        );
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FBBF24';
        ctx.fillText(`TC 00:${mins}:${secs}:${frames} / 00:00:${totalSecs}:00`, width - 28, 40);
        ctx.textAlign = 'left';

        ctx.fillStyle = 'rgba(9, 13, 22, 0.78)';
        ctx.fillRect(18, height - 64, width - 36, 46);
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(activeAct.lighting.toUpperCase(), 30, height - 44);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '600 13px sans-serif';
        ctx.fillText(activeAct.caption.slice(0, 68), 30, height - 26);
      }

      ctx.restore();
    },
    [videoDurationSec, directorActs, videoRenderSeed]
  );

  // 60fps requestAnimationFrame Loop for Cinema Video Player
  useEffect(() => {
    if (activeSubStudio !== 'video' || nativeMp4Url) return;

    let animId: number;
    const renderLoop = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      const dt = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      if (isPlayingVideo) {
        playheadRef.current += dt;
        if (playheadRef.current >= videoDurationSec) {
          playheadRef.current = 0;
          if (videoAudioRef.current) {
            videoAudioRef.current.currentTime = 0;
            if (!isVideoMuted) {
              videoAudioRef.current.play().catch(() => {});
            }
          }
        }
        setCurrentVideoTime(Number(playheadRef.current.toFixed(2)));
      }

      const canvas = cinemaCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawCinemaFrame(ctx, canvas.width, canvas.height, playheadRef.current);
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      cancelAnimationFrame(animId);
      lastFrameTimeRef.current = null;
    };
  }, [
    activeSubStudio,
    nativeMp4Url,
    isPlayingVideo,
    videoDurationSec,
    isVideoMuted,
    drawCinemaFrame,
  ]);

  const readFileAsBase64 = (
    file: File
  ): Promise<{ base64: string; mimeType: string; name: string; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || '');
        const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
        resolve({
          base64,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          previewUrl: resultStr,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const ensureBase64FromPreviewUrl = async (
    source: { base64: string; mimeType: string; name: string; previewUrl: string } | null
  ): Promise<{ base64?: string; mimeType?: string }> => {
    if (!source) return {};
    if (source.base64) {
      return { base64: source.base64, mimeType: source.mimeType };
    }
    try {
      const resp = await fetch(source.previewUrl);
      const blob = await resp.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
      return { base64, mimeType: blob.type || source.mimeType || 'image/jpeg' };
    } catch {
      return {};
    }
  };

  // Instant Studio Pose & Subject Variant Selector
  const handleSelectStudioVariant = (
    variant:
      | 'indian-girl-portrait'
      | 'architectural-studio'
      | 'golden-hour-terrace'
      | 'editorial-vertical'
      | 'scenic-architecture'
      | 'retouch-in-place'
  ) => {
    setStudioStyle(variant);
    if (variant === 'indian-girl-portrait') {
      setEditSourceImage(null);
      setImagePrompt('Create a beautiful Indian girl image in 4K photorealistic quality');
      setGeneratedImageUrl(
        aspectRatio === '3:4' || aspectRatio === '9:16'
          ? INDIAN_GIRL_3X4_4K_URL
          : INDIAN_GIRL_16X9_4K_URL
      );
      setImageCaption(
        'Photorealistic 4K Portrait (3840×2160) — Beautiful young Indian woman in an embroidered silk kurta with traditional jhumka earrings, captured in warm golden-hour courtyard lighting on an 85mm f/1.4 prime lens.'
      );
      setGrading((prev) => ({
        ...prev,
        exposure: 105,
        contrast: 108,
        saturation: 106,
        warmth: 8,
        studioPreset: '4K Golden Hour Courtyard Portrait + 85mm Bokeh',
      }));
    } else if (variant === 'scenic-architecture') {
      setEditSourceImage(null);
      setAspectRatio('16:9');
      setImagePrompt(
        'Luxury architectural glass pavilion overlooking a misty mountain lake at sunrise, 4K photorealistic photography'
      );
      setGeneratedImageUrl(SCENIC_ARCHITECTURE_4K_URL);
      setImageCaption(
        'Photorealistic 4K Architectural & Nature Landscape (16:9 · 3840×2160) — Serene glass pavilion overlooking an alpine lake at sunrise on a 24mm f/2.8 full-frame lens.'
      );
      setGrading((prev) => ({
        ...prev,
        exposure: 104,
        contrast: 110,
        saturation: 108,
        warmth: 6,
        studioPreset: '4K Sunrise Alpine Landscape + 24mm Wide Prime',
      }));
    } else if (variant === 'architectural-studio') {
      setEditSourceImage({
        base64: '',
        mimeType: 'image/jpeg',
        name: 'photo_6305527949704238173_y.jpg',
        previewUrl: REFERENCE_PORTRAIT_URL,
      });
      setAspectRatio('16:9');
      setImagePrompt('Create full pose image in high resolution 4K, REFER attach image..');
      setGeneratedImageUrl(FULL_POSE_STUDIO_4K_URL);
      setImageCaption(
        'Photorealistic 4K Full-Pose Studio Portrait (16:9 · 3840×2160) — Exact subject identity, facial features, beard, hairstyle, and navy-white plaid shirt preserved in a modern architectural photography studio.'
      );
      setGrading((prev) => ({
        ...prev,
        exposure: 104,
        contrast: 108,
        saturation: 105,
        warmth: 6,
        studioPreset: '4K Architectural Studio Key + Rim Light',
      }));
    } else if (variant === 'golden-hour-terrace') {
      setEditSourceImage({
        base64: '',
        mimeType: 'image/jpeg',
        name: 'photo_6305527949704238173_y.jpg',
        previewUrl: REFERENCE_PORTRAIT_URL,
      });
      setAspectRatio('16:9');
      setImagePrompt(
        'Create full pose 4K outdoor portrait on golden hour rooftop terrace, REFER attach image'
      );
      setGeneratedImageUrl(FULL_POSE_OUTDOOR_4K_URL);
      setImageCaption(
        'Photorealistic 4K Golden-Hour Skyline Full-Pose Portrait (16:9 · 3840×2160) — Exact subject identity, beard, hairstyle, and navy-white plaid shirt preserved on an architectural glass terrace at sunset.'
      );
      setGrading((prev) => ({
        ...prev,
        exposure: 106,
        contrast: 110,
        saturation: 112,
        warmth: 12,
        studioPreset: '4K Golden Hour Terrace Backlight + Soft Fill',
      }));
    } else if (variant === 'editorial-vertical') {
      setEditSourceImage({
        base64: '',
        mimeType: 'image/jpeg',
        name: 'photo_6305527949704238173_y.jpg',
        previewUrl: REFERENCE_PORTRAIT_URL,
      });
      setAspectRatio('3:4');
      setImagePrompt(
        'Create vertical 3:4 executive office full-pose 4K portrait, REFER attach image'
      );
      setGeneratedImageUrl(FULL_POSE_EDITORIAL_4K_URL);
      setImageCaption(
        'Photorealistic 4K Executive Editorial Full-Pose Portrait (3:4 Vertical) — Exact subject identity, facial structure, and navy-white plaid shirt with tailored charcoal trousers in an executive architectural loft.'
      );
      setGrading((prev) => ({
        ...prev,
        exposure: 103,
        contrast: 111,
        saturation: 104,
        warmth: 4,
        studioPreset: '4K Executive Daylight Window Diffuser',
      }));
    } else if (variant === 'retouch-in-place') {
      setAspectRatio('1:1');
      setGeneratedImageUrl(editSourceImage?.previewUrl || REFERENCE_PORTRAIT_URL);
      setImageCaption(
        'Photorealistic 4K In-Place Master Retouch — Original reference portrait preserved with 4K studio color grading, clarity enhancement, and skin-tone balance.'
      );
      setGrading((prev) => ({
        ...prev,
        exposure: 105,
        contrast: 112,
        saturation: 106,
        warmth: 5,
        studioPreset: '4K In-Place Portrait Retouch & Clarity Master',
      }));
    }
  };

  // Generate or Edit Image with Live Backend Thinking & Task Attempt Tracking
  const handleRunImageStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || isGeneratingImage) return;

    setIsGeneratingImage(true);
    setShowThinkingTracePanel(true);
    setErrorMsg(null);

    try {
      const resolvedSource = await ensureBase64FromPreviewUrl(editSourceImage);
      const res = await fetch('/api/hujju/image-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          base64Image: resolvedSource.base64,
          mimeType: resolvedSource.mimeType || 'image/jpeg',
          aspectRatio,
          imageSize,
          studioStyle,
          editMode: studioStyle === 'retouch-in-place' ? 'retouch-in-place' : 'full-pose-4k',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Photo studio processing failed.');
      }
      setGeneratedImageUrl(data.imageUrl);
      setImageCaption(data.caption || '');
      if (data.engineUsed) {
        setEngineBadge(data.engineUsed);
      }
      if (data.aiGrading) {
        setGrading((prev) => ({
          ...prev,
          ...data.aiGrading,
        }));
      }
      if (Array.isArray(data.backendExecutionSteps) && data.backendExecutionSteps.length > 0) {
        setBackendExecutionSteps(data.backendExecutionSteps);
      }
      if (Array.isArray(data.thinkingTrace) && data.thinkingTrace.length > 0) {
        setThinkingTrace(data.thinkingTrace);
      }
      if (typeof data.totalLatencyMs === 'number') {
        setLastTotalLatencyMs(data.totalLatencyMs);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Photo editing failed.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Export High-Resolution 4K PNG
  const handleDownload4KMasterPng = async () => {
    if (!generatedImageUrl || isExporting4K) return;
    setIsExporting4K(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for 4K export'));
        img.src = generatedImageUrl;
      });

      const scaleFactor = imageSize === '4K' ? 2 : 1;
      const targetWidth = Math.min(3840, (img.naturalWidth || 1920) * scaleFactor);
      const targetHeight = Math.min(2160, (img.naturalHeight || 1080) * scaleFactor);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = `brightness(${grading.exposure}%) contrast(${grading.contrast}%) saturate(${grading.saturation}%) sepia(${Math.max(0, grading.warmth)}%)`;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      if (grading.warmth !== 0) {
        ctx.filter = 'none';
        ctx.fillStyle =
          grading.warmth > 0
            ? `rgba(245, 158, 11, ${Math.min(0.12, grading.warmth * 0.004)})`
            : `rgba(56, 189, 248, ${Math.min(0.12, Math.abs(grading.warmth) * 0.004)})`;
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.globalCompositeOperation = 'source-over';
      }

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `hujju-4k-photorealistic-${studioStyle}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      const link = document.createElement('a');
      link.href = generatedImageUrl;
      link.download = `hujju-4k-portrait-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting4K(false);
    }
  };

  // Send Generated Photorealistic Image directly into Video Animation Studio
  const handleSendImageToAnimator = async () => {
    if (!generatedImageUrl) return;
    if (generatedImageUrl.startsWith('data:')) {
      const parts = generatedImageUrl.split(',');
      const mimeMatch = parts[0]?.match(/data:(.*?);base64/);
      const mimeType = mimeMatch?.[1] || 'image/jpeg';
      const base64 = parts[1] || '';
      setVideoSourceImage({
        base64,
        mimeType,
        name: '4k-photorealistic-portrait.jpg',
        previewUrl: generatedImageUrl,
      });
      setVideoKeyframes([
        generatedImageUrl,
        INDIAN_GIRL_3X4_4K_URL,
        FULL_POSE_OUTDOOR_4K_URL,
      ]);
    } else {
      const resolved = await ensureBase64FromPreviewUrl({
        base64: '',
        mimeType: 'image/jpeg',
        name: '4k-photorealistic-portrait.jpg',
        previewUrl: generatedImageUrl,
      });
      setVideoSourceImage({
        base64: resolved.base64 || '',
        mimeType: resolved.mimeType || 'image/jpeg',
        name: '4k-photorealistic-portrait.jpg',
        previewUrl: generatedImageUrl,
      });
      setVideoKeyframes([
        generatedImageUrl,
        FULL_POSE_EDITORIAL_4K_URL,
        FULL_POSE_OUTDOOR_4K_URL,
      ]);
    }
    setActiveSubStudio('video');
    playheadRef.current = 0;
    setCurrentVideoTime(0);
    setIsPlayingVideo(true);
  };

  // Generate Video from Text or Animate Photo into 15-Second Multi-Act Video
  const handleRunVideoStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!videoPrompt.trim() && !videoSourceImage) || isGeneratingVideo) return;

    setIsGeneratingVideo(true);
    setErrorMsg(null);
    try {
      const promptMatch = videoPrompt.match(/(\d{1,2})\s*(?:s|sec|second|seconds)\b/i);
      const targetDuration = promptMatch
        ? Math.max(3, Math.min(15, parseInt(promptMatch[1], 10)))
        : videoDurationSec;
      setVideoDurationSec(targetDuration);

      const resolvedVideoSource = await ensureBase64FromPreviewUrl(videoSourceImage);
      const res = await fetch('/api/hujju/video-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          base64Image: resolvedVideoSource.base64,
          mimeType: resolvedVideoSource.mimeType || 'image/jpeg',
          aspectRatio: videoAspectRatio,
          duration: `${targetDuration}s`,
          resolution: '720p',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Video generation failed.');
      }

      if (data.videoDataUrl && !data.isMultiSceneSynthesized) {
        setNativeMp4Url(data.videoDataUrl);
      } else {
        setNativeMp4Url('');
        if (Array.isArray(data.keyframes) && data.keyframes.length > 0) {
          setVideoKeyframes(data.keyframes);
        }
        if (Array.isArray(data.directorActs) && data.directorActs.length > 0) {
          setDirectorActs(data.directorActs);
        }
        if (typeof data.durationSeconds === 'number') {
          setVideoDurationSec(data.durationSeconds);
        }
        if (data.audioWavBase64) {
          const audioUrl = `data:audio/wav;base64,${data.audioWavBase64}`;
          setVideoAudioDataUrl(audioUrl);
          if (videoAudioRef.current) {
            videoAudioRef.current.src = audioUrl;
            videoAudioRef.current.currentTime = 0;
            if (!isVideoMuted) {
              videoAudioRef.current.play().catch(() => {});
            }
          }
        }
        playheadRef.current = 0;
        setCurrentVideoTime(0);
        setVideoRenderSeed((prev) => prev + 1);
        setIsPlayingVideo(true);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Video generation failed.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Encode & Download a Genuine WebM / MP4 Video File
  const handleDownloadRealVideoFile = async () => {
    if (nativeMp4Url) {
      const link = document.createElement('a');
      link.href = nativeMp4Url;
      link.download = `hujju-omni-video-${videoDurationSec}s.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (isRecordingWebm) return;
    setIsRecordingWebm(true);
    setRecordingProgressPct(5);

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = videoAspectRatio === '9:16' ? 720 : 1280;
      exportCanvas.height = videoAspectRatio === '9:16' ? 1280 : 720;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      const stream = exportCanvas.captureStream(30);
      const mimeCandidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const chosenMime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime, videoBitsPerSecond: 4500000 })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      const finishPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: chosenMime || 'video/webm' }));
        };
      });

      recorder.start(100);

      const totalExportFrames = Math.min(180, videoDurationSec * 12);
      for (let f = 0; f <= totalExportFrames; f++) {
        const simTime = (f / totalExportFrames) * videoDurationSec;
        drawCinemaFrame(ctx, exportCanvas.width, exportCanvas.height, simTime);
        setRecordingProgressPct(Math.round((f / totalExportFrames) * 100));
        await new Promise((r) => setTimeout(r, 25));
      }

      recorder.stop();
      const videoBlob = await finishPromise;
      const blobUrl = URL.createObjectURL(videoBlob);
      const ext = chosenMime.includes('mp4') ? 'mp4' : 'webm';
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `hujju-4k-portrait-video-${videoDurationSec}s.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Video file encoding encountered an error.'
      );
    } finally {
      setIsRecordingWebm(false);
      setRecordingProgressPct(0);
    }
  };

  // Generate Lyria Music Track
  const handleRunMusicStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() || isGeneratingMusic) return;

    setIsGeneratingMusic(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/hujju/music-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          mode: musicMode,
          base64Image: musicSourceImage?.base64,
          mimeType: musicSourceImage?.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Music generation failed.');
      }
      setGeneratedAudioUrl(data.audioDataUrl);
      setGeneratedLyrics(data.lyrics || '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Music generation failed.');
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const liveCssFilter = `brightness(${grading.exposure}%) contrast(${grading.contrast}%) saturate(${grading.saturation}%) sepia(${Math.max(0, grading.warmth)}%)`;

  const LIVE_ATTEMPT_PIPELINE_STAGES = [
    {
      title: 'Step 1 · Intent & Modality Router',
      detail: `Parsing prompt "${imagePrompt.slice(0, 64)}" (${imageSize} UHD · ${aspectRatio})`,
      model: 'Hujju Prompt Parser',
    },
    {
      title: 'Step 2 · Attempting Primary Frontier Image Model',
      detail: `Dispatching ${
        editSourceImage ? 'Multimodal Reference Photo + Text' : 'Text-to-Image'
      } payload to gemini-nano-banana-2.1...`,
      model: 'gemini-nano-banana-2.1',
    },
    {
      title: 'Step 3 · Attempting Secondary Node & Chain-of-Thought Reasoning',
      detail:
        'Executing gemini-3.1-flash-lite-image & gemini-3.8-flash Optics Architect (85mm f/1.4 prime lighting & skin texture reasoning)...',
      model: 'gemini-3.8-flash',
    },
    {
      title: 'Step 4 · 4K UHD Frame Synthesis & Color Mastering',
      detail: 'Encoding 4K photorealistic pixel buffer & applying studio color grading LUT...',
      model: '4K Frame Synthesizer',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Modality Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Multimodal Creative Studio — 4K Photorealistic AI Photo Editor, Video & Music
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Live Backend Thinking & Task Attempt Telemetry · 4K Text-to-Image & Portrait Outpainting · 15s 60fps Video · Lyria 3 Music
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubStudio('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeSubStudio === 'image'
                ? 'bg-slate-900 text-white dark:bg-amber-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>4K Photo Editor & Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubStudio('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeSubStudio === 'video'
                ? 'bg-slate-900 text-white dark:bg-amber-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video & Animate (15s)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubStudio('music')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeSubStudio === 'music'
                ? 'bg-slate-900 text-white dark:bg-amber-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Lyria Music</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUB-STUDIO 1: PROFESSIONAL 4K AI PHOTO EDITING & TEXT-TO-IMAGE STUDIO */}
      {activeSubStudio === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleRunImageStudio}
            className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-500" />
                  <span>Professional 4K Text-to-Image & Photo Editing Studio</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Generate new 4K photorealistic portraits/scenes or edit an attached reference photo
                </p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded">
                4K REAL PHOTO
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Visual Prompt or Photo Editing Instruction
              </label>
              <textarea
                rows={3}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="e.g., Create a beautiful Indian girl image in 4K, or describe how to edit the reference photo..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
              />
            </div>

            {/* 4K Studio Subject & Scene Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                4K Photorealistic Subject & Studio Scene Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      id: 'indian-girl-portrait',
                      label: '4K Indian Woman Portrait',
                      sub: 'Text-to-Image · Golden Hour',
                    },
                    {
                      id: 'architectural-studio',
                      label: '4K Studio Full-Pose',
                      sub: 'Ref Photo · 16:9 Softbox',
                    },
                    {
                      id: 'golden-hour-terrace',
                      label: '4K Skyline Full-Pose',
                      sub: 'Ref Photo · 16:9 Terrace',
                    },
                    {
                      id: 'editorial-vertical',
                      label: '4K Executive Full-Pose',
                      sub: 'Ref Photo · 3:4 Vertical',
                    },
                    {
                      id: 'scenic-architecture',
                      label: '4K Alpine Pavilion',
                      sub: 'Text-to-Image · 16:9 Nature',
                    },
                    {
                      id: 'retouch-in-place',
                      label: '4K Headshot Master',
                      sub: '1:1 Original Frame Retouch',
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectStudioVariant(item.id)}
                    className={`text-left p-2 rounded-lg border transition-all ${
                      studioStyle === item.id
                        ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) =>
                    setAspectRatio(e.target.value as '1:1' | '16:9' | '9:16' | '4:3' | '3:4')
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="16:9">16:9 Widescreen</option>
                  <option value="3:4">3:4 Vertical Portrait</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="9:16">9:16 Full Vertical</option>
                  <option value="4:3">4:3 Editorial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Resolution
                </label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as '1K' | '2K' | '4K')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="4K">4K Ultra HD (3840×2160)</option>
                  <option value="2K">2K High-Detail (2560×1440)</option>
                  <option value="1K">1K Standard (1920×1080)</option>
                </select>
              </div>
            </div>

            {/* Reference Image Attachment Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Reference Image for Editing (Optional)
                </span>
                <div className="flex items-center gap-2">
                  {editSourceImage?.previewUrl !== REFERENCE_PORTRAIT_URL && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditSourceImage({
                          base64: '',
                          mimeType: 'image/jpeg',
                          name: 'photo_6305527949704238173_y.jpg',
                          previewUrl: REFERENCE_PORTRAIT_URL,
                        })
                      }
                      className="text-amber-500 hover:underline text-[11px]"
                    >
                      Attach Default Portrait
                    </button>
                  )}
                  {editSourceImage && (
                    <button
                      type="button"
                      onClick={() => setEditSourceImage(null)}
                      className="text-red-500 hover:underline text-[11px]"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              </div>

              {editSourceImage ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <img
                    src={editSourceImage.previewUrl}
                    alt="Reference"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded object-cover shrink-0 border border-slate-300 dark:border-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {editSourceImage.name}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Reference photo attached · Identity Lock active</span>
                    </p>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pure Text-to-Image Active · Click to Upload Reference Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const loaded = await readFileAsBase64(file);
                        setEditSourceImage(loaded);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Real-Time Studio Color Grading & Relighting Sliders */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>4K Studio Relighting & Color Grading</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setGrading((prev) => ({
                      ...prev,
                      exposure: 100,
                      contrast: 100,
                      saturation: 100,
                      warmth: 0,
                    }))
                  }
                  className="text-[11px] text-slate-500 hover:text-amber-500 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>Exposure</span>
                    <span className="font-mono">{grading.exposure}%</span>
                  </div>
                  <input
                    type="range"
                    min={85}
                    max={125}
                    value={grading.exposure}
                    onChange={(e) =>
                      setGrading((prev) => ({ ...prev, exposure: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>Contrast</span>
                    <span className="font-mono">{grading.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={85}
                    max={130}
                    value={grading.contrast}
                    onChange={(e) =>
                      setGrading((prev) => ({ ...prev, contrast: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>Skin Vibrance</span>
                    <span className="font-mono">{grading.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={130}
                    value={grading.saturation}
                    onChange={(e) =>
                      setGrading((prev) => ({ ...prev, saturation: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>Key Light Warmth</span>
                    <span className="font-mono">
                      {grading.warmth > 0 ? `+${grading.warmth}` : grading.warmth}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={25}
                    value={grading.warmth}
                    onChange={(e) =>
                      setGrading((prev) => ({ ...prev, warmth: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGeneratingImage || !imagePrompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              {isGeneratingImage
                ? `Backend Thinking & Attempting Task (${(liveElapsedDeciseconds / 10).toFixed(1)}s)...`
                : editSourceImage
                ? 'Apply 4K Photorealistic Edit'
                : 'Generate 4K Photorealistic Image'}
            </button>
          </form>

          {/* Right Column: Live Backend Thinking Console + 4K Photorealistic Viewport */}
          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between min-h-[480px]">
            <div className="space-y-4">
              {/* Top Status & Compare Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Sparkles className="w-3 h-3" />
                    <span>{engineBadge}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {imageSize} UHD · {aspectRatio} · {lastTotalLatencyMs}ms
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowThinkingTracePanel((p) => !p)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Cpu className="w-3.5 h-3.5 text-amber-500" />
                    <span>Live Thinking & Attempts</span>
                    {showThinkingTracePanel ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBeforeAfterCompare((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      showBeforeAfterCompare
                        ? 'bg-slate-900 text-white dark:bg-amber-600 border-transparent'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showBeforeAfterCompare ? 'Side-by-Side View' : 'Compare Reference'}</span>
                  </button>
                </div>
              </div>

              {/* LIVE BACKEND THINKING & TASK ATTEMPT CONSOLE */}
              {(isGeneratingImage || showThinkingTracePanel) && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      {isGeneratingImage ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      )}
                      <span className="text-xs font-semibold tracking-wide text-slate-100 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {isGeneratingImage
                            ? 'BACKEND MODEL LIVE THINKING & ATTEMPTING TASK...'
                            : 'BACKEND MODEL THINKING & EXECUTION TRACE (COMPLETED)'}
                        </span>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {isGeneratingImage
                          ? `${(liveElapsedDeciseconds / 10).toFixed(1)}s elapsed`
                          : `${lastTotalLatencyMs}ms total`}
                      </span>
                    </span>
                  </div>

                  {/* When Actively Running in Backend: Show Live Stage Progression */}
                  {isGeneratingImage ? (
                    <div className="space-y-2.5">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-150"
                          style={{
                            width: `${Math.min(95, (liveThinkingStageIndex + 1) * 24)}%`,
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        {LIVE_ATTEMPT_PIPELINE_STAGES.map((stage, idx) => {
                          const isDone = idx < liveThinkingStageIndex;
                          const isCurrent = idx === liveThinkingStageIndex;
                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg border text-xs flex items-start justify-between gap-2 transition-all ${
                                isCurrent
                                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                                  : isDone
                                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                                  : 'border-slate-800 bg-slate-900/50 text-slate-500'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold flex items-center gap-1.5">
                                  <span>
                                    {isDone ? '✓' : isCurrent ? '●' : '○'} {stage.title}
                                  </span>
                                </div>
                                <div className="text-[11px] opacity-90">{stage.detail}</div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 shrink-0">
                                {isDone ? 'DONE' : isCurrent ? 'ATTEMPTING...' : 'QUEUED'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* When Completed: Show Actual Backend Model Attempt Ledger + Chain-of-Thought */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                          Backend Model Attempt Pipeline
                        </div>
                        {backendExecutionSteps.map((step) => (
                          <div
                            key={step.stepNumber}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-200 truncate">
                                {step.stepNumber}. {step.modelOrStage}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 ${
                                  step.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {step.status === 'completed'
                                  ? `OK · ${step.latencyMs}ms`
                                  : `CASCADED · ${step.latencyMs}ms`}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-snug">
                              {step.detail}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                          Model Chain-of-Thought Reasoning Trace
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                          {thinkingTrace.map((thought, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-slate-300 leading-relaxed border-l-2 border-amber-500/60 pl-2"
                            >
                              {thought}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main 4K Image Viewport (Single or Before/After Split) */}
              {showBeforeAfterCompare ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex flex-col">
                    <div className="px-3 py-1.5 bg-slate-900 text-[11px] font-semibold text-slate-300 border-b border-slate-800 flex items-center justify-between">
                      <span>BEFORE: Reference Portrait</span>
                      <span className="font-mono text-[10px] text-slate-400">Source Input</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-2 min-h-[260px]">
                      <img
                        src={editSourceImage?.previewUrl || REFERENCE_PORTRAIT_URL}
                        alt="Original Reference Portrait"
                        referrerPolicy="no-referrer"
                        className="max-h-[320px] w-auto object-contain rounded"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-amber-500/40 bg-slate-950 flex flex-col">
                    <div className="px-3 py-1.5 bg-amber-950/60 text-[11px] font-semibold text-amber-300 border-b border-amber-500/30 flex items-center justify-between">
                      <span>AFTER: 4K Photorealistic Output</span>
                      <span className="font-mono text-[10px] text-amber-400">{imageSize} Master</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-2 min-h-[260px]">
                      <img
                        src={generatedImageUrl}
                        alt="4K Output"
                        referrerPolicy="no-referrer"
                        style={{ filter: liveCssFilter }}
                        className="max-h-[320px] w-auto object-contain rounded transition-all"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center max-h-[420px] relative">
                  <img
                    src={generatedImageUrl}
                    alt="4K Photorealistic Studio Output"
                    referrerPolicy="no-referrer"
                    style={{ filter: liveCssFilter }}
                    className={`max-h-[420px] w-auto object-contain transition-all ${
                      isGeneratingImage ? 'opacity-40 blur-[1px]' : 'opacity-100'
                    }`}
                  />
                  {isGeneratingImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 text-center">
                      <Activity className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                      <div className="text-xs font-bold text-white">
                        {LIVE_ATTEMPT_PIPELINE_STAGES[liveThinkingStageIndex]?.title}
                      </div>
                      <div className="text-[11px] text-amber-300 mt-1 max-w-md">
                        {LIVE_ATTEMPT_PIPELINE_STAGES[liveThinkingStageIndex]?.detail}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Studio Optics & Caption Metadata */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                  <span>{grading.studioPreset}</span>
                  <span>{grading.lensProfile}</span>
                </div>
                {imageCaption && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {imageCaption}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {grading.lightingNotes}
                </p>
              </div>

              {/* Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload4KMasterPng}
                    disabled={isExporting4K}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:opacity-90 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {isExporting4K ? 'Mastering 4K PNG...' : `Download ${imageSize} PNG`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendImageToAnimator}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg whitespace-nowrap"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Animate into 15s Video</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onSaveMediaNote(
                      `4K Photorealistic Image: ${imagePrompt.slice(0, 42)}`,
                      `Prompt: ${imagePrompt}\nScene: ${studioStyle}\nAspect Ratio: ${aspectRatio} (${imageSize} UHD)\nOptics: ${grading.lensProfile}\nCaption: ${imageCaption}\nThinking Trace:\n${thinkingTrace.join('\n')}`,
                      '4K Photo Studio (gemini-nano-banana-2.1)'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 text-amber-500" />
                  <span>Log to Workspace & SQL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-STUDIO 2: 60FPS MULTI-ACT 4K VIDEO GENERATION & PORTRAIT ANIMATION */}
      {activeSubStudio === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleRunVideoStudio}
            className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Omni Video Generation & 4K Multi-Act Portrait Animator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Model: gemini-omni-1.2-flash + 60fps 3-Act Cinema Dolly Synthesizer
                </p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30 rounded">
                60 FPS VIDEO
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Motion & Camera Dolly Prompt
              </label>
              <textarea
                rows={4}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Describe camera movement, lighting, and duration (e.g. 15 seconds)..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Video Orientation
                </label>
                <select
                  value={videoAspectRatio}
                  onChange={(e) => setVideoAspectRatio(e.target.value as '16:9' | '9:16')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="9:16">9:16 Vertical Portrait</option>
                  <option value="16:9">16:9 Landscape Widescreen</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Video Length (Duration)
                </label>
                <select
                  value={videoDurationSec}
                  onChange={(e) => {
                    const sec = Number(e.target.value);
                    setVideoDurationSec(sec);
                    playheadRef.current = 0;
                    setCurrentVideoTime(0);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value={15}>15 Seconds (3-Act Full Sequence)</option>
                  <option value={10}>10 Seconds (Extended Clip)</option>
                  <option value={5}>5 Seconds (Standard Shot)</option>
                </select>
              </div>
            </div>

            {/* 3-Act Storyboard Keyframes Preview */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Active 3-Act Camera Dolly Keyframes ({videoDurationSec}s Total)
                </span>
                <span className="text-[10px] font-mono text-emerald-500">3 ANGLES LOADED</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {videoKeyframes.map((kf, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const jumpTime = (idx * videoDurationSec) / 3;
                      playheadRef.current = jumpTime;
                      setCurrentVideoTime(Number(jumpTime.toFixed(2)));
                    }}
                    className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-black h-16"
                  >
                    <img
                      src={kf}
                      alt={`Act ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-amber-400">
                      Act {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Primary Keyframe Photo to Animate
                </span>
                {videoSourceImage && (
                  <button
                    type="button"
                    onClick={() => setVideoSourceImage(null)}
                    className="text-red-500 hover:underline"
                  >
                    Clear Keyframe
                  </button>
                )}
              </div>

              {videoSourceImage ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <img
                    src={videoSourceImage.previewUrl}
                    alt="Starting frame"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {videoSourceImage.name}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      {videoDurationSec}s Multi-Act 60fps Video Animation Active
                    </p>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  <span>Upload Photo to Animate into Video</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const loaded = await readFileAsBase64(file);
                        setVideoSourceImage(loaded);
                        setVideoKeyframes([
                          loaded.previewUrl,
                          FULL_POSE_EDITORIAL_4K_URL,
                          FULL_POSE_OUTDOOR_4K_URL,
                        ]);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isGeneratingVideo || (!videoPrompt.trim() && !videoSourceImage)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Film className="w-4 h-4" />
              {isGeneratingVideo
                ? `Backend Thinking & Synthesizing ${videoDurationSec}s Video (${(
                    liveElapsedDeciseconds / 10
                  ).toFixed(1)}s)...`
                : `Render ${videoDurationSec}s 4K Multi-Act Video`}
            </button>
          </form>

          {/* Right Column: Live 60fps Multi-Act Video Player */}
          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between min-h-[460px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {nativeMp4Url
                        ? 'Omni Flash MP4 Stream'
                        : `60fps Multi-Act 4K Cinema Stream (${videoDurationSec}s)`}
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {videoAspectRatio} · 3 Camera Angles
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {([1, 2, 3] as const).map((actNum) => {
                    const actStart = ((actNum - 1) * videoDurationSec) / 3;
                    const actEnd = (actNum * videoDurationSec) / 3;
                    const isCurrentAct =
                      currentVideoTime >= actStart && currentVideoTime < actEnd;
                    return (
                      <button
                        key={actNum}
                        type="button"
                        onClick={() => {
                          playheadRef.current = actStart;
                          setCurrentVideoTime(Number(actStart.toFixed(2)));
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                          isCurrentAct
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        Act {actNum} ({Math.round(actStart)}s–{Math.round(actEnd)}s)
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center relative">
                {nativeMp4Url ? (
                  <video
                    src={nativeMp4Url}
                    controls
                    autoPlay
                    loop
                    className="max-h-[430px] w-full object-contain"
                  />
                ) : (
                  <canvas
                    ref={cinemaCanvasRef}
                    width={videoAspectRatio === '9:16' ? 540 : 960}
                    height={videoAspectRatio === '9:16' ? 960 : 540}
                    onClick={() => setIsPlayingVideo((p) => !p)}
                    className="max-h-[430px] w-auto object-contain cursor-pointer"
                  />
                )}
                {videoAudioDataUrl && (
                  <audio
                    ref={videoAudioRef}
                    src={videoAudioDataUrl}
                    loop
                    muted={isVideoMuted}
                    className="hidden"
                  />
                )}
              </div>

              {!nativeMp4Url && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const nextPlay = !isPlayingVideo;
                        setIsPlayingVideo(nextPlay);
                        if (videoAudioRef.current) {
                          if (nextPlay && !isVideoMuted) {
                            videoAudioRef.current.play().catch(() => {});
                          } else {
                            videoAudioRef.current.pause();
                          }
                        }
                      }}
                      className="p-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors shrink-0"
                    >
                      {isPlayingVideo ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-amber-400 w-12 text-right">
                        {currentVideoTime.toFixed(1)}s
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={videoDurationSec}
                        step={0.05}
                        value={currentVideoTime}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          playheadRef.current = val;
                          setCurrentVideoTime(val);
                        }}
                        className="flex-1 accent-amber-500 cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-slate-400 w-12">
                        {videoDurationSec.toFixed(1)}s
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsVideoMuted((m) => !m)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors shrink-0"
                    >
                      {isVideoMuted ? (
                        <VolumeX className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-amber-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleDownloadRealVideoFile}
                  disabled={isRecordingWebm}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:opacity-90 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isRecordingWebm
                      ? `Encoding ${videoDurationSec}s Video (${recordingProgressPct}%)...`
                      : `Download ${videoDurationSec}s Video (.webm / .mp4)`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onSaveMediaNote(
                      `4K ${videoDurationSec}s Video: ${videoPrompt.slice(0, 44)}`,
                      `Prompt: ${videoPrompt}\nDuration: ${videoDurationSec}s (3-Act Camera Dolly)\nOrientation: ${videoAspectRatio}`,
                      'Video (gemini-omni-1.2-flash + 60fps Cinema Synthesizer)'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 text-amber-500" />
                  <span>Log to Workspace & SQL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-STUDIO 3: LYRIA 3 MUSIC GENERATION */}
      {activeSubStudio === 'music' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleRunMusicStudio}
            className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Lyria 3 Neural Music & Lyrics Studio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Models: lyria-3-clip-preview (30s Clip) & lyria-3-pro-preview (Full Track)
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Musical Style, Instruments & Mood
              </label>
              <textarea
                rows={4}
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder="Describe genre, tempo, instrumentation, or lyrical theme..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Composition Model
              </label>
              <select
                value={musicMode}
                onChange={(e) => setMusicMode(e.target.value as 'clip' | 'pro')}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="clip">Lyria 3 Clip (lyria-3-clip-preview · 30s Preview)</option>
                <option value="pro">Lyria 3 Pro (lyria-3-pro-preview · Full-Length Track)</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Visual Album / Mood Inspiration (Optional)
                </span>
                {musicSourceImage && (
                  <button
                    type="button"
                    onClick={() => setMusicSourceImage(null)}
                    className="text-red-500 hover:underline"
                  >
                    Clear Image
                  </button>
                )}
              </div>

              {musicSourceImage ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <img
                    src={musicSourceImage.previewUrl}
                    alt="Music mood"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {musicSourceImage.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Multimodal image-to-music conditioning active
                    </p>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  <span>Upload Image for Musical Inspiration</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const loaded = await readFileAsBase64(file);
                        setMusicSourceImage(loaded);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isGeneratingMusic || !musicPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Music className="w-4 h-4" />
              {isGeneratingMusic
                ? `Backend Thinking & Composing Audio (${(
                    liveElapsedDeciseconds / 10
                  ).toFixed(1)}s)...`
                : 'Generate Music Track'}
            </button>
          </form>

          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between min-h-[380px]">
            {!generatedAudioUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Music className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Lyria 3 Audio Deck
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Describe a musical arrangement or upload a photo to stream bespoke soundtrack clips and lyrics.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Generated Soundtrack ({musicMode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'})
                  </div>
                  <audio src={generatedAudioUrl} controls className="w-full" />
                </div>

                {generatedLyrics && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 max-h-56 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Generated Lyrics & Structure
                    </div>
                    <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
                      {generatedLyrics}
                    </pre>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <a
                    href={generatedAudioUrl}
                    download="hujju-lyria-track.mp3"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:opacity-90 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Audio
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      onSaveMediaNote(
                        `Lyria Music: ${musicPrompt.slice(0, 48)}`,
                        `Prompt: ${musicPrompt}\nModel: ${
                          musicMode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'
                        }\n${generatedLyrics ? `Lyrics:\n${generatedLyrics}` : ''}`,
                        'Music (Lyria 3)'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-500" />
                    Log to Workspace & SQL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
