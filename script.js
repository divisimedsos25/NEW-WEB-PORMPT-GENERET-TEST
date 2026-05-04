(function() {
    // ============ STATE ============
    let currentMode = 'image';
    let selectedAspectRatio = '1:1';
    let imageFile = null;
    let videoFile = null;
    let imageDataUrl = null;
    let videoDataUrl = null;

    // ============ DOM REFS ============
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const modeImagePanel = $('#modeImagePanel');
    const modeVideoPanel = $('#modeVideoPanel');
    const btnModeImage = $('#btnModeImage');
    const btnModeVideo = $('#btnModeVideo');
    const imageUploadZone = $('#imageUploadZone');
    const imageInput = $('#imageInput');
    const imagePreviewArea = $('#imagePreviewArea');
    const btnAnalyzeImage = $('#btnAnalyzeImage');
    const btnClearImage = $('#btnClearImage');
    const imageResults = $('#imageResults');
    const englishPromptText = $('#englishPromptText');
    const jsonOutputText = $('#jsonOutputText');
    const videoUploadZone = $('#videoUploadZone');
    const videoInput = $('#videoInput');
    const videoPreviewArea = $('#videoPreviewArea');
    const btnAnalyzeVideo = $('#btnAnalyzeVideo');
    const btnClearVideo = $('#btnClearVideo');
    const videoResults = $('#videoResults');
    const videoLoadingCard = $('#videoLoadingCard');
    const videoProgressText = $('#videoProgressText');
    const segmentsGrid = $('#segmentsGrid');
    const videoJsonText = $('#videoJsonText');
    const segmentCountSelect = $('#segmentCount');
    const videoAspectRatioSelect = $('#videoAspectRatio');
    const toast = $('#toast');
    const btnCopyAllScenes = $('#btnCopyAllScenes');

    // ============ MODE SWITCHING ============
    function switchMode(mode) {
        currentMode = mode;
        if (mode === 'image') {
            btnModeImage.classList.add('active');
            btnModeVideo.classList.remove('active');
            modeImagePanel.style.display = 'block';
            modeVideoPanel.style.display = 'none';
        } else {
            btnModeVideo.classList.add('active');
            btnModeImage.classList.remove('active');
            modeImagePanel.style.display = 'none';
            modeVideoPanel.style.display = 'block';
        }
    }

    btnModeImage.addEventListener('click', () => switchMode('image'));
    btnModeVideo.addEventListener('click', () => switchMode('video'));

    // ============ TOAST ============
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.remove('show');
        void toast.offsetWidth;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ============ COPY & DOWNLOAD HELPERS ============
    document.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('[data-target]');
        if (!copyBtn) return;
        const targetId = copyBtn.getAttribute('data-target');
        const downloadFilename = copyBtn.getAttribute('data-download');
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        if (downloadFilename) {
            // Download
            const content = targetEl.textContent.trim();
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadFilename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('✅ Downloaded: ' + downloadFilename);
        } else {
            // Copy
            const text = targetEl.textContent.trim();
            navigator.clipboard.writeText(text).then(() => {
                const feedbackEl = targetEl.parentElement?.querySelector('.copied-feedback');
                if (feedbackEl) {
                    feedbackEl.classList.add('show');
                    setTimeout(() => feedbackEl.classList.remove('show'), 2000);
                }
                showToast('📋 Copied to clipboard!');
            }).catch(() => {
                showToast('⚠️ Failed to copy');
            });
        }
    });

    // Copy all scenes button
    btnCopyAllScenes.addEventListener('click', () => {
        const allPrompts = [];
        const cards = segmentsGrid.querySelectorAll('.segment-card');
        cards.forEach((card, i) => {
            const time = card.querySelector('.segment-time')?.textContent || '';
            const prompt = card.querySelector('.segment-prompt')?.textContent || '';
            allPrompts.push(`SCENE ${i + 1} ${time}\n${prompt}\n`);
        });
        const fullText = allPrompts.join('\n---\n\n');
        navigator.clipboard.writeText(fullText).then(() => {
            showToast('📋 All scene prompts copied!');
        });
    });

    // ============ ASPECT RATIO SELECTOR ============
    const aspectRatioSelector = $('#aspectRatioSelector');
    aspectRatioSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.aspect-btn');
        if (!btn) return;
        aspectRatioSelector.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedAspectRatio = btn.getAttribute('data-ratio');
    });

    // ============ IMAGE UPLOAD ============
    imageUploadZone.addEventListener('click', (e) => {
        if (e.target !== imageInput) imageInput.click();
    });
    imageUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadZone.classList.add('dragover');
    });
    imageUploadZone.addEventListener('dragleave', () => {
        imageUploadZone.classList.remove('dragover');
    });
    imageUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleImageFile(file);
    });
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) handleImageFile(file);
    });

    function handleImageFile(file) {
        if (file.size > 20 * 1024 * 1024) {
            showToast('⚠️ Image too large. Max 20MB.');
            return;
        }
        imageFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            imageDataUrl = e.target.result;
            displayImagePreview(imageDataUrl);
            btnAnalyzeImage.disabled = false;
            btnClearImage.style.display = 'inline-flex';
            imageResults.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    function displayImagePreview(dataUrl) {
        imagePreviewArea.innerHTML = `
            <div class="preview-container">
                <img src="${dataUrl}" alt="Preview">
                <button class="remove-preview" id="removeImagePreview">✕</button>
            </div>`;
        $('#removeImagePreview').addEventListener('click', clearImage);
    }

    function clearImage() {
        imageFile = null;
        imageDataUrl = null;
        imagePreviewArea.innerHTML = '';
        imageInput.value = '';
        btnAnalyzeImage.disabled = true;
        btnClearImage.style.display = 'none';
        imageResults.style.display = 'none';
    }
    btnClearImage.addEventListener('click', clearImage);

    // ============ VIDEO UPLOAD ============
    videoUploadZone.addEventListener('click', (e) => {
        if (e.target !== videoInput) videoInput.click();
    });
    videoUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        videoUploadZone.classList.add('dragover');
    });
    videoUploadZone.addEventListener('dragleave', () => {
        videoUploadZone.classList.remove('dragover');
    });
    videoUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        videoUploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) handleVideoFile(file);
    });
    videoInput.addEventListener('change', () => {
        const file = videoInput.files[0];
        if (file) handleVideoFile(file);
    });

    function handleVideoFile(file) {
        if (file.size > 100 * 1024 * 1024) {
            showToast('⚠️ Video too large. Max 100MB.');
            return;
        }
        videoFile = file;
        const url = URL.createObjectURL(file);
        videoDataUrl = url;
        displayVideoPreview(url);
        btnAnalyzeVideo.disabled = false;
        btnClearVideo.style.display = 'inline-flex';
        videoResults.style.display = 'none';
    }

    function displayVideoPreview(url) {
        videoPreviewArea.innerHTML = `
            <div class="preview-container">
                <video src="${url}" controls style="max-height:320px;"></video>
                <button class="remove-preview" id="removeVideoPreview">✕</button>
            </div>`;
        $('#removeVideoPreview').addEventListener('click', clearVideo);
    }

    function clearVideo() {
        if (videoDataUrl && videoDataUrl.startsWith('blob:')) {
            URL.revokeObjectURL(videoDataUrl);
        }
        videoFile = null;
        videoDataUrl = null;
        videoPreviewArea.innerHTML = '';
        videoInput.value = '';
        btnAnalyzeVideo.disabled = true;
        btnClearVideo.style.display = 'none';
        videoResults.style.display = 'none';
        videoLoadingCard.style.display = 'none';
    }
    btnClearVideo.addEventListener('click', clearVideo);

    // ============ IMAGE ANALYSIS ENGINE ============
    function analyzeImageFromCanvas(img) {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
        const totalPixels = w * h;
        const sampleStep = Math.max(1, Math.floor(totalPixels / 8000));

        let totalR = 0, totalG = 0, totalB = 0;
        let sampledCount = 0;
        const colorBuckets = {};
        const regions = { top: { r:0, g:0, b:0, n:0 }, middle: { r:0, g:0, b:0, n:0 }, bottom: { r:0, g:0, b:0, n:0 } };

        for (let i = 0; i < totalPixels; i += sampleStep) {
            const idx = i * 4;
            const r = pixels[idx];
            const g = pixels[idx+1];
            const b = pixels[idx+2];
            totalR += r; totalG += g; totalB += b;
            sampledCount++;

            const bucketKey = `${Math.round(r/32)*32},${Math.round(g/32)*32},${Math.round(b/32)*32}`;
            colorBuckets[bucketKey] = (colorBuckets[bucketKey] || 0) + 1;

            const y = Math.floor(i / w);
            const region = y < h * 0.33 ? regions.top : y < h * 0.66 ? regions.middle : regions.bottom;
            region.r += r; region.g += g; region.b += b; region.n++;
        }

        const avgR = Math.round(totalR / sampledCount);
        const avgG = Math.round(totalG / sampledCount);
        const avgB = Math.round(totalB / sampledCount);
        const brightness = (avgR + avgG + avgB) / 3;
        const avgBrightness = Math.round(brightness);

        const sortedBuckets = Object.entries(colorBuckets).sort((a,b) => b[1] - a[1]);
        const dominantColors = sortedBuckets.slice(0, 5).map(([key]) => {
            const [r,g,b] = key.split(',').map(Number);
            return { r, g, b, name: colorToName(r,g,b) };
        });

        const regionColors = {};
        for (const [name, data] of Object.entries(regions)) {
            if (data.n > 0) {
                regionColors[name] = {
                    r: Math.round(data.r / data.n),
                    g: Math.round(data.g / data.n),
                    b: Math.round(data.b / data.n),
                };
            }
        }

        const warmthScore = (avgR - avgB) / 255;
        const saturation = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);

        let minBright = 255, maxBright = 0;
        for (let i = 0; i < totalPixels; i += sampleStep * 3) {
            const idx = i * 4;
            const bright = (pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3;
            if (bright < minBright) minBright = bright;
            if (bright > maxBright) maxBright = bright;
        }
        const contrastRange = maxBright - minBright;

        let edgeCount = 0;
        const edgeSampleStep = Math.max(1, Math.floor(totalPixels / 3000));
        for (let i = 0; i < totalPixels - w; i += edgeSampleStep) {
            const idx = i * 4;
            const idxNext = (i + 1) * 4;
            const b1 = (pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3;
            const b2 = (pixels[idxNext] + pixels[idxNext+1] + pixels[idxNext+2]) / 3;
            if (Math.abs(b1 - b2) > 30) edgeCount++;
        }
        const complexityRatio = edgeCount / (totalPixels / edgeSampleStep);

        const topBright = regionColors.top ? (regionColors.top.r + regionColors.top.g + regionColors.top.b) / 3 : 128;
        const bottomBright = regionColors.bottom ? (regionColors.bottom.r + regionColors.bottom.g + regionColors.bottom.b) / 3 : 128;
        const topBlue = regionColors.top ? regionColors.top.b - (regionColors.top.r + regionColors.top.g) / 2 : 0;
        const bottomGreen = regionColors.bottom ? regionColors.bottom.g - (regionColors.bottom.r + regionColors.bottom.b) / 2 : 0;

        let sceneGuess = 'a carefully composed scene';
        if (topBlue > 20 && topBright > 140) sceneGuess = 'an outdoor scene with sky';
        if (bottomGreen > 15) sceneGuess = 'a natural landscape scene';
        if (topBlue > 25 && bottomGreen > 10) sceneGuess = 'a scenic landscape vista';
        if (avgBrightness < 60) sceneGuess = 'a moody low-light scene';
        if (avgBrightness < 30) sceneGuess = 'a dramatic nighttime scene';
        if (warmthScore > 0.3 && saturation > 40) sceneGuess = 'a warm golden-hour scene';
        if (complexityRatio > 0.25) sceneGuess = 'a highly detailed intricate scene';
        if (complexityRatio < 0.08) sceneGuess = 'a clean minimalist scene';

        const dominantColor = dominantColors[0]?.name || 'neutral tones';

        return {
            avgR, avgG, avgB, avgBrightness, warmthScore, saturation, contrastRange, complexityRatio,
            dominantColors, dominantColor, regionColors, sceneGuess, w, h
        };
    }

    function colorToName(r, g, b) {
        const hsv = rgbToHsv(r, g, b);
        const h = hsv.h, s = hsv.s, v = hsv.v;
        if (v < 25) return 'deep black';
        if (v < 45 && s < 30) return 'dark charcoal';
        if (v > 230 && s < 20) return 'bright white';
        if (s < 25 && v > 180) return 'soft white';
        if (s < 25 && v < 100) return 'warm gray';
        if (s < 25) return 'neutral gray';
        if (h < 15 || h >= 340) return 'rich red';
        if (h < 30) return 'warm orange';
        if (h < 50) return 'golden amber';
        if (h < 70) return 'vibrant yellow';
        if (h < 150) return 'lush green';
        if (h < 200) return 'cool cyan';
        if (h < 260) return 'deep blue';
        if (h < 290) return 'royal purple';
        if (h < 330) return 'soft pink';
        return 'earthy brown';
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max * 255;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
            else if (max === g) h = ((b - r) / d + 2) * 60;
            else h = ((r - g) / d + 4) * 60;
        }
        return { h: Math.round(h), s: Math.round(s * 255), v: Math.round(v) };
    }

    function buildImagePrompt(analysis, aspectRatio) {
        const { avgBrightness, warmthScore, saturation, contrastRange, complexityRatio, dominantColor, dominantColors, sceneGuess, regionColors } = analysis;

        let lightingDesc = '';
        if (avgBrightness < 40) lightingDesc = 'dim ambient lighting with subtle rim light';
        else if (avgBrightness < 80) lightingDesc = 'soft low-key lighting with dramatic shadows';
        else if (avgBrightness < 140) lightingDesc = 'balanced natural lighting with gentle diffusion';
        else if (avgBrightness < 190) lightingDesc = 'bright well-exposed lighting with crisp highlights';
        else lightingDesc = 'brilliant high-key lighting with luminous clarity';

        if (warmthScore > 0.35) lightingDesc += ', warm golden light';
        else if (warmthScore < -0.2) lightingDesc += ', cool blue-toned light';
        if (contrastRange > 160) lightingDesc += ', strong chiaroscuro contrast';
        else if (contrastRange < 50) lightingDesc += ', soft flat illumination';

        const cameraAngles = [
            'eye-level straight-on shot', 'slight low-angle perspective', 'subtle high-angle view',
            'dutch tilt composition', 'wide establishing shot angle', 'intimate close-up perspective',
            'medium shot at eye level'
        ];
        const cameraAngle = cameraAngles[Math.floor(Math.abs(warmthScore * 10 + complexityRatio * 20)) % cameraAngles.length];

        let dof = '';
        if (complexityRatio > 0.2) dof = 'deep depth of field with everything in sharp focus';
        else if (complexityRatio > 0.1) dof = 'moderate depth of field with subtle background blur';
        else dof = 'shallow depth of field with creamy bokeh';

        const moods = ['serene and contemplative', 'dramatic and intense', 'mysterious and atmospheric', 'joyful and vibrant', 'melancholic and poetic', 'bold and powerful', 'ethereal and dreamlike', 'intimate and warm'];
        const mood = moods[Math.floor((avgBrightness / 32 + Math.abs(warmthScore) * 5)) % moods.length];

        let colorGrading = '';
        if (warmthScore > 0.3) colorGrading = 'warm amber and gold tones with teal shadow accents';
        else if (warmthScore < -0.15) colorGrading = 'cool blue and cyan grading with crisp whites';
        else colorGrading = 'neutral balanced color palette with subtle warmth';

        const styles = ['hyperrealistic photography with cinematic composition', 'fine art photography with masterful lighting', 'cinematic film still with anamorphic lens character', 'editorial photography with polished aesthetic', 'atmospheric cinematic render with volumetric lighting'];
        const style = styles[Math.floor((saturation / 50 + complexityRatio * 8)) % styles.length];

        let textureDesc = '';
        if (complexityRatio > 0.2) textureDesc = 'highly detailed textures with visible micro-details and surface variations';
        else if (complexityRatio > 0.1) textureDesc = 'moderately detailed surfaces with discernible texture patterns';
        else textureDesc = 'smooth refined surfaces with subtle textural nuances';

        const domColorNames = [...new Set(dominantColors.map(c => c.name))].slice(0,4).join(', ');

        const fullPrompt = `A masterfully rendered ${sceneGuess} featuring ${dominantColor} as the dominant color palette with accents of ${domColorNames}. The composition utilizes ${lightingDesc}, creating a ${mood} atmosphere. Captured with ${cameraAngle}, employing ${dof} that beautifully separates the subject from the environment. ${textureDesc} are rendered with exceptional clarity. The color grading applies ${colorGrading}, enhancing the visual narrative. Rendered in a ${style}, with meticulous attention to composition and detail. The aspect ratio is ${aspectRatio}, perfectly framing the scene. Professional post-processing with refined color toning and subtle film grain for added depth. 8K resolution, ultra-detailed, hyperrealistic, professional lighting, sharp focus, photorealistic rendering, masterpiece quality.`;
        const finalPrompt = fullPrompt.split(/\s+/).length >= 80 ? fullPrompt : fullPrompt + ' Additional exquisite details include finely rendered ambient occlusion, specular highlights on reflective surfaces, and delicate subsurface scattering where light penetrates translucent materials. Every element is composed with artistic intention and technical precision.';

        return {
            main_subject: sceneGuess.charAt(0).toUpperCase() + sceneGuess.slice(1),
            secondary_elements: `Complementary visual elements including ${domColorNames} accents and atmospheric details`,
            environment: `Immersive environment with ${dominantColor} tones, ${avgBrightness < 80 ? 'dim' : avgBrightness < 150 ? 'moderate' : 'bright'} ambient conditions`,
            lighting: lightingDesc.trim(),
            camera_angle: cameraAngle,
            depth_of_field: dof,
            texture_details: textureDesc,
            mood: mood,
            color_grading: colorGrading,
            style_reference: style,
            full_prompt: finalPrompt.trim(),
            quality_tags: '8K, ultra-detailed, hyperrealistic, professional lighting, sharp focus, photorealistic, masterpiece',
            aspect_ratio: aspectRatio,
        };
    }

    // ============ ANALYZE IMAGE BUTTON ============
    btnAnalyzeImage.addEventListener('click', () => {
        if (!imageDataUrl) return;
        btnAnalyzeImage.disabled = true;
        btnAnalyzeImage.innerHTML = '<span class="spinner"></span> Analyzing...';

        const img = new Image();
        img.onload = function() {
            const analysis = analyzeImageFromCanvas(img);
            const promptData = buildImagePrompt(analysis, selectedAspectRatio);

            englishPromptText.textContent = promptData.full_prompt;
            const jsonObj = {
                main_subject: promptData.main_subject,
                secondary_elements: promptData.secondary_elements,
                environment: promptData.environment,
                lighting: promptData.lighting,
                camera_angle: promptData.camera_angle,
                depth_of_field: promptData.depth_of_field,
                texture_details: promptData.texture_details,
                mood: promptData.mood,
                color_grading: promptData.color_grading,
                style_reference: promptData.style_reference,
                full_prompt: promptData.full_prompt,
                quality_tags: promptData.quality_tags,
                aspect_ratio: promptData.aspect_ratio,
            };
            jsonOutputText.textContent = JSON.stringify(jsonObj, null, 2);

            imageResults.style.display = 'block';
            imageResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

            btnAnalyzeImage.disabled = false;
            btnAnalyzeImage.innerHTML = '🔍 Analyze & Generate Prompt';
            showToast('✅ Analysis complete!');
        };
        img.onerror = function() {
            showToast('⚠️ Error loading image');
            btnAnalyzeImage.disabled = false;
            btnAnalyzeImage.innerHTML = '🔍 Analyze & Generate Prompt';
        };
        img.src = imageDataUrl;
    });

    // ============ VIDEO ANALYSIS ============
    async function extractFrameAtTime(video, timeSeconds) {
        return new Promise((resolve, reject) => {
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                const canvas = document.createElement('canvas');
                canvas.width = Math.min(video.videoWidth, 640);
                canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve({ dataUrl, canvas, width: canvas.width, height: canvas.height });
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = Math.min(timeSeconds, video.duration - 0.1);
        });
    }

    btnAnalyzeVideo.addEventListener('click', async () => {
        if (!videoDataUrl) return;
        const segmentCount = parseInt(segmentCountSelect.value);
        const videoAspectRatio = videoAspectRatioSelect.value;

        btnAnalyzeVideo.disabled = true;
        btnAnalyzeVideo.innerHTML = '<span class="spinner"></span> Processing...';
        videoLoadingCard.style.display = 'block';
        videoResults.style.display = 'none';
        videoLoadingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const video = document.createElement('video');
        video.src = videoDataUrl;
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';

        await new Promise((resolve, reject) => {
            video.addEventListener('loadedmetadata', resolve, { once: true });
            video.addEventListener('error', reject, { once: true });
            video.load();
        });

        const duration = video.duration;
        const interval = duration / (segmentCount + 1);
        const timePoints = [];
        for (let i = 1; i <= segmentCount; i++) {
            timePoints.push(interval * i);
        }

        const sceneData = [];
        for (let i = 0; i < timePoints.length; i++) {
            videoProgressText.textContent = `Processing scene ${i+1} of ${segmentCount} (${timePoints[i].toFixed(1)}s / ${duration.toFixed(1)}s)...`;
            try {
                const frame = await extractFrameAtTime(video, timePoints[i]);
                const tempImg = new Image();
                await new Promise((res, rej) => { tempImg.onload = res; tempImg.onerror = rej; tempImg.src = frame.dataUrl; });
                const analysis = analyzeImageFromCanvas(tempImg);
                const promptData = buildImagePrompt(analysis, videoAspectRatio);
                sceneData.push({
                    scene_number: i+1,
                    timestamp_seconds: parseFloat(timePoints[i].toFixed(2)),
                    timestamp_display: formatTime(timePoints[i]),
                    thumbnail_dataurl: frame.dataUrl,
                    ...promptData,
                });
            } catch (err) {
                console.error('Frame extraction error:', err);
                sceneData.push({
                    scene_number: i+1,
                    timestamp_seconds: parseFloat(timePoints[i].toFixed(2)),
                    timestamp_display: formatTime(timePoints[i]),
                    thumbnail_dataurl: null,
                    main_subject: 'Scene segment',
                    secondary_elements: 'Atmospheric elements',
                    environment: 'Cinematic environment',
                    lighting: 'Natural cinematic lighting',
                    camera_angle: 'Cinematic composition',
                    depth_of_field: 'Cinematic depth of field',
                    texture_details: 'Film-quality textures',
                    mood: 'Cinematic atmosphere',
                    color_grading: 'Professional color grading',
                    style_reference: 'Cinematic film style',
                    full_prompt: 'A cinematic scene with professional lighting and composition. Rendered with film-quality detail and atmospheric depth. 8K ultra-detailed hyperrealistic sharp focus.',
                    quality_tags: '8K, ultra-detailed, cinematic, professional lighting',
                    aspect_ratio: videoAspectRatio,
                });
            }
        }

        segmentsGrid.innerHTML = '';
        sceneData.forEach((scene) => {
            const card = document.createElement('div');
            card.className = 'segment-card';
            card.innerHTML = `
                ${scene.thumbnail_dataurl ? `<img src="${scene.thumbnail_dataurl}" class="segment-thumb" alt="Scene ${scene.scene_number}">` : '<div class="segment-thumb" style="background:#1a1a2e;display:flex;align-items:center;justify-content:center;color:#555;">No Frame</div>'}
                <div class="segment-info">
                    <div class="segment-time">🎬 SCENE ${scene.scene_number} — ${scene.timestamp_display}</div>
                    <div class="segment-prompt">${scene.full_prompt.substring(0, 250)}...</div>
                    <button class="btn btn-copy btn-sm" style="margin-top:8px;" data-scene-prompt="${encodeURIComponent(scene.full_prompt)}">📋 Copy Prompt</button>
                </div>`;
            segmentsGrid.appendChild(card);
        });

        segmentsGrid.querySelectorAll('[data-scene-prompt]').forEach(btn => {
            btn.addEventListener('click', function() {
                const prompt = decodeURIComponent(this.getAttribute('data-scene-prompt'));
                navigator.clipboard.writeText(prompt).then(() => showToast('📋 Scene prompt copied!'));
            });
        });

        const jsonExport = sceneData.map(s => ({
            scene_number: s.scene_number,
            timestamp_seconds: s.timestamp_seconds,
            timestamp_display: s.timestamp_display,
            main_subject: s.main_subject,
            secondary_elements: s.secondary_elements,
            environment: s.environment,
            lighting: s.lighting,
            camera_angle: s.camera_angle,
            depth_of_field: s.depth_of_field,
            texture_details: s.texture_details,
            mood: s.mood,
            color_grading: s.color_grading,
            style_reference: s.style_reference,
            full_prompt: s.full_prompt,
            quality_tags: s.quality_tags,
            aspect_ratio: s.aspect_ratio,
        }));
        videoJsonText.textContent = JSON.stringify(jsonExport, null, 2);

        videoLoadingCard.style.display = 'none';
        videoResults.style.display = 'block';
        videoResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

        btnAnalyzeVideo.disabled = false;
        btnAnalyzeVideo.innerHTML = '🎞️ Analyze & Generate Scene Prompts';
        showToast(`✅ ${segmentCount} cinematic scenes generated!`);
    });

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}`;
    }

    // ============ INIT ============
    switchMode('image');
    console.log('🚀 AI Prompt Generator Pro initialized');
})();