import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Film,
  Music,
  Upload,
  Download,
  Wand2,
  Save,
  X,
} from 'lucide-react';

interface CreativeMediaStudioProps {
  onSaveMediaNote: (title: string, content: string, modality: string) => Promise<void>;
}

export const CreativeMediaStudio: React.FC<CreativeMediaStudioProps> = ({
  onSaveMediaNote,
}) => {
  const [activeSubStudio, setActiveSubStudio] = useState<'image' | 'video' | 'music'>('image');

  // 1. Image Studio State (gemini-nano-banana-2.1)
  const [imagePrompt, setImagePrompt] = useState(
    'Architectural workspace pavilion overlooking a misty alpine fjord at golden hour, warm timber and brushed titanium, photorealistic editorial photography'
  );
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('16:9');
  const [imageSize, setImageSize] = useState<'1K' | '2K'>('1K');
  const [editSourceImage, setEditSourceImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
    previewUrl: string;
  } | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [imageCaption, setImageCaption] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // 2. Video & Photo Animation Studio State (gemini-omni-1.2-flash via Interactions API)
  const [videoPrompt, setVideoPrompt] = useState(
    'Smooth cinematic aerial drone flight gliding past an illuminated glass observatory at twilight, subtle atmospheric mist and warm interior glow'
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoSourceImage, setVideoSourceImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
    previewUrl: string;
  } | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // 3. Lyria Music Studio State (lyria-3-clip-preview / lyria-3-pro-preview)
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

  // Generate or Edit Image
  const handleRunImageStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || isGeneratingImage) return;

    setIsGeneratingImage(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/hujju/image-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          base64Image: editSourceImage?.base64,
          mimeType: editSourceImage?.mimeType,
          aspectRatio,
          imageSize,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Image generation failed.');
      }
      setGeneratedImageUrl(data.imageUrl);
      setImageCaption(data.caption || '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Image generation failed.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Send Generated Image directly into Video Animation Studio
  const handleSendImageToAnimator = () => {
    if (!generatedImageUrl) return;
    const parts = generatedImageUrl.split(',');
    const mimeMatch = parts[0]?.match(/data:(.*?);base64/);
    const mimeType = mimeMatch?.[1] || 'image/png';
    const base64 = parts[1] || '';
    setVideoSourceImage({
      base64,
      mimeType,
      name: 'generated-frame.png',
      previewUrl: generatedImageUrl,
    });
    setActiveSubStudio('video');
  };

  // Generate Video from Text or Animate Photo into Video
  const handleRunVideoStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!videoPrompt.trim() && !videoSourceImage) || isGeneratingVideo) return;

    setIsGeneratingVideo(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/hujju/video-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          base64Image: videoSourceImage?.base64,
          mimeType: videoSourceImage?.mimeType,
          aspectRatio: videoAspectRatio,
          duration: '5s',
          resolution: '720p',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Video generation failed.');
      }
      setGeneratedVideoUrl(data.videoDataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Video generation failed.');
    } finally {
      setIsGeneratingVideo(false);
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

  return (
    <div className="space-y-6">
      {/* Header & Modality Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Multimodal Creative Studio — Image, Video & Music Synthesis
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Create & edit images (gemini-nano-banana-2.1), generate & animate videos (gemini-omni-1.2-flash), and compose music (Lyria 3)
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
            <span>Image & Edit</span>
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
            <span>Video & Animate</span>
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

      {/* SUB-STUDIO 1: IMAGE CREATION & EDITING (gemini-nano-banana-2.1) */}
      {activeSubStudio === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleRunImageStudio}
            className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Image Generation & In-Place Editing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Model: gemini-nano-banana-2.1 · Upload an optional photo to edit or transform it
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Visual Prompt or Editing Instruction
              </label>
              <textarea
                rows={4}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image to create or how to edit the uploaded reference photo..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
              />
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
                  <option value="1:1">1:1 Square</option>
                  <option value="9:16">9:16 Vertical</option>
                  <option value="4:3">4:3 Editorial</option>
                  <option value="3:4">3:4 Portrait</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Resolution
                </label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as '1K' | '2K')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="1K">1K Standard</option>
                  <option value="2K">2K High-Detail</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Reference Image for Editing (Optional)
                </span>
                {editSourceImage && (
                  <button
                    type="button"
                    onClick={() => setEditSourceImage(null)}
                    className="text-red-500 hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {editSourceImage ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <img
                    src={editSourceImage.previewUrl}
                    alt="Reference"
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {editSourceImage.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Image editing mode enabled
                    </p>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  <span>Upload Image to Edit</span>
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

            <button
              type="submit"
              disabled={isGeneratingImage || !imagePrompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              {isGeneratingImage
                ? 'Rendering Image...'
                : editSourceImage
                ? 'Apply Image Edit'
                : 'Generate Image'}
            </button>
          </form>

          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between min-h-[380px]">
            {!generatedImageUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <ImageIcon className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Canvas Ready for Image Synthesis
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Enter a prompt to generate new artwork or upload an existing photo to perform natural-language edits with gemini-nano-banana-2.1.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center max-h-[420px]">
                  <img
                    src={generatedImageUrl}
                    alt="Generated output"
                    className="max-h-[420px] w-auto object-contain"
                  />
                </div>

                {imageCaption && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">{imageCaption}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <a
                      href={generatedImageUrl}
                      download="hujju-generated-image.png"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:opacity-90 whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PNG
                    </a>
                    <button
                      type="button"
                      onClick={handleSendImageToAnimator}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg whitespace-nowrap"
                    >
                      <Film className="w-3.5 h-3.5" />
                      Animate into Video
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onSaveMediaNote(
                        `Generated Image: ${imagePrompt.slice(0, 48)}`,
                        `Prompt: ${imagePrompt}\nAspect Ratio: ${aspectRatio} (${imageSize})\nMode: ${
                          editSourceImage ? 'Image Editing' : 'Text-to-Image'
                        }`,
                        'Image (gemini-nano-banana-2.1)'
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

      {/* SUB-STUDIO 2: VIDEO GENERATION & PHOTO ANIMATION (gemini-omni-1.2-flash) */}
      {activeSubStudio === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleRunVideoStudio}
            className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Omni Video Generation & Photo Animation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Model: gemini-omni-1.2-flash (Interactions API) · Text-to-Video & Image-to-Video
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Motion & Scene Prompt
              </label>
              <textarea
                rows={4}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Describe camera movement, lighting, and motion..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Video Orientation
              </label>
              <select
                value={videoAspectRatio}
                onChange={(e) => setVideoAspectRatio(e.target.value as '16:9' | '9:16')}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="16:9">16:9 Landscape (720p · 5s)</option>
                <option value="9:16">9:16 Vertical Portrait (720p · 5s)</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Starting Keyframe Photo to Animate (Optional)
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
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {videoSourceImage.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Image-to-Video animation active
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
                ? 'Rendering 720p MP4 Video...'
                : videoSourceImage
                ? 'Animate Image into Video'
                : 'Generate Video from Text'}
            </button>
          </form>

          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between min-h-[380px]">
            {!generatedVideoUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Film className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Omni Video & Animation Viewport
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Generate 720p videos directly from text prompts or upload a static photo to animate it using gemini-omni-1.2-flash.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="max-h-[420px] w-full object-contain"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <a
                    href={generatedVideoUrl}
                    download="hujju-omni-video.mp4"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:opacity-90 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download MP4
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      onSaveMediaNote(
                        `Omni Video: ${videoPrompt.slice(0, 48)}`,
                        `Prompt: ${videoPrompt}\nOrientation: ${videoAspectRatio}\nMode: ${
                          videoSourceImage ? 'Image-to-Video Animation' : 'Text-to-Video'
                        }`,
                        'Video (gemini-omni-1.2-flash)'
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
              {isGeneratingMusic ? 'Composing Audio Stream...' : 'Generate Music Track'}
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
