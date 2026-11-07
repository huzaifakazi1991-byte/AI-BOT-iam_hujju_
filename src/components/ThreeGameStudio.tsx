import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Save,
} from 'lucide-react';

interface ThreeGameStudioProps {
  onExitStudio: () => void;
  onLogGameSession: (score: number, coresCollected: number, mode: string) => Promise<void>;
}

type GameLifecycleState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';
type CameraPreset = 'chase' | 'aerial' | 'orbit';

// Pre-allocated scratch objects outside animation loop
const _camIdealPos = new THREE.Vector3();
const _camIdealLook = new THREE.Vector3();
const _tempVec = new THREE.Vector3();
const _dummy = new THREE.Object3D();

export const ThreeGameStudio: React.FC<ThreeGameStudioProps> = ({
  onExitStudio,
  onLogGameSession,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<GameLifecycleState>('title');
  const [score, setScore] = useState(0);
  const [coresCollected, setCoresCollected] = useState(0);
  const [hullIntegrity, setHullIntegrity] = useState(100);
  const [timeLeft, setTimeLeft] = useState(60);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('chase');
  const [isMuted, setIsMuted] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [savedSession, setSavedSession] = useState(false);

  const TARGET_CORES = 10;

  // Mutable refs for animation loop access without re-binding Three.js scene
  const stateRef = useRef<GameLifecycleState>('title');
  const presetRef = useRef<CameraPreset>('chase');
  const mutedRef = useRef<boolean>(false);
  const keysRef = useRef<Record<string, boolean>>({});
  const playerStateRef = useRef({
    pos: new THREE.Vector3(0, 1.2, 0),
    vel: new THREE.Vector3(0, 0, 0),
    heading: 0,
    boostCooldown: 0,
    score: 0,
    cores: 0,
    hull: 100,
    timeRemaining: 60,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    presetRef.current = cameraPreset;
  }, [cameraPreset]);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  // Procedural Web Audio API sound effects
  const playSynthSound = useCallback((type: 'collect' | 'boost' | 'hit' | 'victory') => {
    if (mutedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'boost') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'victory') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.12);
        osc.frequency.setValueAtTime(659.25, now + 0.24);
        osc.frequency.setValueAtTime(880, now + 0.36);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.start(now);
        osc.stop(now + 0.65);
      }
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }, []);

  const startOrResetGame = useCallback(() => {
    playerStateRef.current = {
      pos: new THREE.Vector3(0, 1.2, 0),
      vel: new THREE.Vector3(0, 0, 0),
      heading: 0,
      boostCooldown: 0,
      score: 0,
      cores: 0,
      hull: 100,
      timeRemaining: 60,
    };
    setScore(0);
    setCoresCollected(0);
    setHullIntegrity(100);
    setTimeLeft(60);
    setSavedSession(false);
    setGameState('playing');
    playSynthSound('boost');
  }, [playSynthSound]);

  // Keyboard shortcuts for Title, Pause, Restart, and Movement
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      keysRef.current[code] = true;

      if (stateRef.current === 'title' && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        startOrResetGame();
      } else if (code === 'Escape') {
        if (stateRef.current === 'playing') {
          setGameState('paused');
        } else if (stateRef.current === 'paused') {
          setGameState('playing');
        }
      } else if (
        code === 'KeyR' &&
        (stateRef.current === 'paused' ||
          stateRef.current === 'victory' ||
          stateRef.current === 'gameover')
      ) {
        startOrResetGame();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startOrResetGame]);

  // Three.js Scene Initialization & Lifecycle
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const gl = renderer.getContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(
      String(gl.getParameter(gl.RENDERER))
    );

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgHex = 0x070b14;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.014);

    // Environment IBL via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      250
    );
    camera.position.set(0, 12, 22);

    // Atmospheric Depth Triad Lighting
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    dirLight.position.set(24, 38, 18);
    if (!isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 110;
      const d = 40;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);

    // Ground Arena Floor & Grid
    const floorGeo = new THREE.CylinderGeometry(48, 50, 1.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.55,
      metalness: 0.35,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.6;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(84, 42, 0xd97706, 0x1e293b);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // Outer Boundary Ring
    const ringGeo = new THREE.TorusGeometry(45, 0.35, 12, 72);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const boundaryRing = new THREE.Mesh(ringGeo, ringMat);
    boundaryRing.rotation.x = Math.PI / 2;
    boundaryRing.position.y = 0.5;
    scene.add(boundaryRing);

    // Hero Composite Model: 7-Part Hujju Orbital Relay Craft
    const craftGroup = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.75,
      roughness: 0.22,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      metalness: 0.6,
      roughness: 0.25,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1,
    });

    // Part 1: Central Fuselage
    const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.2, 8), hullMat);
    fuselage.rotation.x = -Math.PI / 2;
    fuselage.castShadow = !isSoftwareGl;
    craftGroup.add(fuselage);

    // Part 2: Cockpit Canopy
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), canopyMat);
    canopy.scale.set(0.9, 0.55, 1.5);
    canopy.position.set(0, 0.32, -0.2);
    craftGroup.add(canopy);

    // Part 3 & 4: Starboard & Port Delta Wings
    const wingGeo = new THREE.BoxGeometry(2.8, 0.14, 1.2);
    const wings = new THREE.Mesh(wingGeo, hullMat);
    wings.position.set(0, 0, 0.35);
    wings.castShadow = !isSoftwareGl;
    craftGroup.add(wings);

    // Part 5 & 6: Twin Thruster Nacelles
    const nacelleGeo = new THREE.CylinderGeometry(0.24, 0.3, 1.6, 12);
    const leftNacelle = new THREE.Mesh(nacelleGeo, accentMat);
    leftNacelle.rotation.x = Math.PI / 2;
    leftNacelle.position.set(-1.1, 0.05, 0.55);
    craftGroup.add(leftNacelle);

    const rightNacelle = new THREE.Mesh(nacelleGeo, accentMat);
    rightNacelle.rotation.x = Math.PI / 2;
    rightNacelle.position.set(1.1, 0.05, 0.55);
    craftGroup.add(rightNacelle);

    // Part 7: Orbital Sensor Halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.06, 8, 24), accentMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.45, 0.5);
    craftGroup.add(halo);

    craftGroup.position.copy(playerStateRef.current.pos);
    scene.add(craftGroup);

    // InstancedMesh Architectural Crystal Spires (Environment Props)
    const spireCount = isSoftwareGl ? 18 : 32;
    const spireGeo = new THREE.CylinderGeometry(0.3, 1.1, 5.5, 6);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.25,
    });
    const spireInstanced = new THREE.InstancedMesh(spireGeo, spireMat, spireCount);
    spireInstanced.castShadow = !isSoftwareGl;
    spireInstanced.receiveShadow = !isSoftwareGl;

    const spirePositions: THREE.Vector3[] = [];
    for (let i = 0; i < spireCount; i++) {
      const angle = (i / spireCount) * Math.PI * 2;
      const radius = i % 2 === 0 ? 39 : 24 + (i % 5) * 2.5;
      const sx = Math.cos(angle) * radius;
      const sz = Math.sin(angle) * radius;
      const scaleY = 0.7 + (i % 4) * 0.35;
      _dummy.position.set(sx, (5.5 * scaleY) / 2, sz);
      _dummy.rotation.set(0, angle, 0);
      _dummy.scale.set(1, scaleY, 1);
      _dummy.updateMatrix();
      spireInstanced.setMatrixAt(i, _dummy.matrix);
      spirePositions.push(new THREE.Vector3(sx, 1.2, sz));
    }
    scene.add(spireInstanced);

    // Collectible Synchronized Data Cores (Composite Octahedron + Outer Ring)
    interface DataCoreNode {
      group: THREE.Group;
      active: boolean;
    }
    const coreNodes: DataCoreNode[] = [];
    const coreGeo = new THREE.OctahedronGeometry(0.75, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.1,
      metalness: 0.85,
      roughness: 0.1,
    });
    const coreRingGeo = new THREE.TorusGeometry(1.05, 0.06, 8, 24);
    const coreRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
    });

    const spawnCorePosition = (idx: number, targetVec: THREE.Vector3) => {
      const angle = (idx / TARGET_CORES) * Math.PI * 2 + 0.4;
      const r = 10 + (idx % 4) * 7.5;
      targetVec.set(Math.cos(angle) * r, 1.4, Math.sin(angle) * r);
    };

    for (let i = 0; i < TARGET_CORES; i++) {
      const g = new THREE.Group();
      const inner = new THREE.Mesh(coreGeo, coreMat);
      const outer = new THREE.Mesh(coreRingGeo, coreRingMat);
      g.add(inner);
      g.add(outer);
      spawnCorePosition(i, g.position);
      scene.add(g);
      coreNodes.push({ group: g, active: true });
    }

    // Patrol Sentinel Hazard Drones (Composite Sphere + Equatorial Ring)
    const hazardCount = 5;
    interface HazardDrone {
      group: THREE.Group;
      angle: number;
      radius: number;
      speed: number;
    }
    const hazards: HazardDrone[] = [];
    const hazCoreGeo = new THREE.SphereGeometry(0.85, 16, 12);
    const hazMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.9,
      metalness: 0.7,
      roughness: 0.25,
    });
    const hazRingGeo = new THREE.TorusGeometry(1.25, 0.08, 8, 24);

    for (let i = 0; i < hazardCount; i++) {
      const hg = new THREE.Group();
      const body = new THREE.Mesh(hazCoreGeo, hazMat);
      const eqRing = new THREE.Mesh(hazRingGeo, hazMat);
      eqRing.rotation.x = Math.PI / 2;
      hg.add(body);
      hg.add(eqRing);

      const radius = 14 + i * 5.2;
      const angle = (i / hazardCount) * Math.PI * 2;
      hg.position.set(Math.cos(angle) * radius, 1.3, Math.sin(angle) * radius);
      scene.add(hg);
      hazards.push({
        group: hg,
        angle,
        radius,
        speed: (i % 2 === 0 ? 1 : -1) * (0.45 + i * 0.08),
      });
    }

    // ResizeObserver for Responsive Canvas
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // Main Render & Physics Loop with Software WebGL Pacing Guard
    const clock = new THREE.Clock();
    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let hudSyncAccumulator = 0;

    const afterDraw = isSoftwareGl
      ? (cb: () => void) => {
          gl.finish();
          timerId = window.setTimeout(cb, 16);
        }
      : (cb: () => void) => {
          rafId = requestAnimationFrame(cb);
        };

    const animate = () => {
      if (disposed) return;

      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const p = playerStateRef.current;

      // Reset core visibility if newly restarted
      if (p.cores === 0 && coreNodes.some((c) => !c.active)) {
        coreNodes.forEach((c, idx) => {
          c.active = true;
          c.group.visible = true;
          spawnCorePosition(idx, c.group.position);
        });
      }

      // Rotate collectibles & halo
      halo.rotation.z = elapsed * 2.5;
      coreNodes.forEach((c, idx) => {
        if (!c.active) return;
        c.group.rotation.y = elapsed * 1.8 + idx;
        c.group.rotation.x = Math.sin(elapsed * 2 + idx) * 0.35;
        c.group.position.y = 1.4 + Math.sin(elapsed * 2.5 + idx) * 0.25;
      });

      if (stateRef.current === 'title') {
        // Live 3D Title Camera Orbit
        const camAngle = elapsed * 0.22;
        camera.position.set(Math.cos(camAngle) * 26, 13, Math.sin(camAngle) * 26);
        camera.lookAt(0, 1.5, 0);
        craftGroup.position.set(0, 1.5 + Math.sin(elapsed * 2) * 0.2, 0);
        craftGroup.rotation.y = elapsed * 0.5;
      } else if (stateRef.current === 'playing') {
        // Player Controls: WASD / Arrow Keys + Space Boost
        const keys = keysRef.current;
        const turnSpeed = 2.6;
        if (keys['KeyA'] || keys['ArrowLeft']) p.heading += turnSpeed * dt;
        if (keys['KeyD'] || keys['ArrowRight']) p.heading -= turnSpeed * dt;

        let thrust = 0;
        if (keys['KeyW'] || keys['ArrowUp']) thrust = 24;
        if (keys['KeyS'] || keys['ArrowDown']) thrust = -14;

        if (p.boostCooldown > 0) p.boostCooldown = Math.max(0, p.boostCooldown - dt);
        if (keys['Space'] && p.boostCooldown <= 0) {
          thrust = 55;
          p.boostCooldown = 1.2;
          playSynthSound('boost');
        }

        const forwardX = -Math.sin(p.heading);
        const forwardZ = -Math.cos(p.heading);

        p.vel.x += forwardX * thrust * dt;
        p.vel.z += forwardZ * thrust * dt;
        p.vel.multiplyScalar(Math.pow(0.18, dt)); // Smooth air drag

        p.pos.addScaledVector(p.vel, dt);

        // Keep inside circular arena boundary (radius 42)
        const distFromCenter = Math.hypot(p.pos.x, p.pos.z);
        if (distFromCenter > 42) {
          const scale = 42 / distFromCenter;
          p.pos.x *= scale;
          p.pos.z *= scale;
          p.vel.multiplyScalar(-0.4);
        }

        craftGroup.position.copy(p.pos);
        craftGroup.position.y = 1.2 + Math.sin(elapsed * 4) * 0.12;
        craftGroup.rotation.y = p.heading;

        // Bank roll on turn
        const rollTarget =
          (keys['KeyA'] || keys['ArrowLeft'] ? 0.28 : 0) +
          (keys['KeyD'] || keys['ArrowRight'] ? -0.28 : 0);
        craftGroup.rotation.z = THREE.MathUtils.lerp(craftGroup.rotation.z, rollTarget, 8 * dt);

        // Update Patrol Hazards & Check Collision
        for (const h of hazards) {
          h.angle += h.speed * dt;
          h.group.position.set(
            Math.cos(h.angle) * h.radius,
            1.3,
            Math.sin(h.angle) * h.radius
          );
          h.group.rotation.y = -h.angle;

          if (h.group.position.distanceTo(p.pos) < 1.85) {
            p.hull = Math.max(0, p.hull - 20);
            _tempVec.subVectors(p.pos, h.group.position).normalize().multiplyScalar(14);
            p.vel.copy(_tempVec);
            playSynthSound('hit');
            if (p.hull <= 0) {
              setHullIntegrity(0);
              setGameState('gameover');
            }
          }
        }

        // Check Collectible Data Cores
        for (const c of coreNodes) {
          if (!c.active) continue;
          if (c.group.position.distanceTo(p.pos) < 2.1) {
            c.active = false;
            c.group.visible = false;
            p.cores += 1;
            p.score += 150 + Math.round(p.timeRemaining * 2);
            playSynthSound('collect');

            if (p.cores >= TARGET_CORES) {
              setScore(p.score);
              setCoresCollected(p.cores);
              playSynthSound('victory');
              setGameState('victory');
            }
          }
        }

        // Countdown Timer
        p.timeRemaining = Math.max(0, p.timeRemaining - dt);
        if (p.timeRemaining <= 0 && stateRef.current === 'playing') {
          setGameState('gameover');
        }

        // Camera Tracking according to selected preset
        if (presetRef.current === 'chase') {
          _camIdealPos.set(
            p.pos.x + Math.sin(p.heading) * 11,
            p.pos.y + 5.2,
            p.pos.z + Math.cos(p.heading) * 11
          );
          _camIdealLook.set(
            p.pos.x - Math.sin(p.heading) * 6,
            p.pos.y + 0.8,
            p.pos.z - Math.cos(p.heading) * 6
          );
          camera.position.lerp(_camIdealPos, 1 - Math.exp(-7 * dt));
          camera.lookAt(_camIdealLook);
        } else if (presetRef.current === 'aerial') {
          _camIdealPos.set(p.pos.x, 34, p.pos.z + 14);
          camera.position.lerp(_camIdealPos, 1 - Math.exp(-5 * dt));
          camera.lookAt(p.pos.x, 0, p.pos.z);
        } else {
          const orbitAngle = elapsed * 0.35;
          camera.position.set(
            p.pos.x + Math.cos(orbitAngle) * 18,
            11,
            p.pos.z + Math.sin(orbitAngle) * 18
          );
          camera.lookAt(p.pos);
        }

        // Throttled React HUD state sync (every ~120ms)
        hudSyncAccumulator += dt;
        if (hudSyncAccumulator > 0.12) {
          hudSyncAccumulator = 0;
          setScore(p.score);
          setCoresCollected(p.cores);
          setHullIntegrity(p.hull);
          setTimeLeft(Math.ceil(p.timeRemaining));
        }
      }

      renderer.render(scene, camera);
      afterDraw(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      ro.disconnect();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [playSynthSound]);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#070B14] text-slate-100 select-none">
      {/* Full-Viewport 3D WebGL Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Left Minimal Telemetry & Exit Button */}
      <div className="fixed top-4 left-4 z-10 flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={onExitStudio}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-950/90 hover:bg-slate-900 text-slate-100 border border-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>Exit 3D Studio</span>
        </button>

        {gameState === 'playing' && (
          <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-950/90 border border-white/10 text-xs">
            <div>
              <span className="text-slate-400 mr-1.5">SCORE</span>
              <span className="font-mono font-bold text-amber-400 tabular-nums">{score}</span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5">SYNC CORES</span>
              <span className="font-mono font-bold text-sky-400 tabular-nums">
                {coresCollected}/{TARGET_CORES}
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5">HULL</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  hullIntegrity > 40 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {hullIntegrity}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5">TIME</span>
              <span className="font-mono font-bold text-white tabular-nums">{timeLeft}s</span>
            </div>
          </div>
        )}
      </div>

      {/* STATE 1: TITLE SCREEN OVERLAY */}
      {gameState === 'title' && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center p-6 pointer-events-none">
          <div className="max-w-lg w-full p-8 rounded-2xl bg-slate-950/90 border border-white/15 text-center space-y-6 pointer-events-auto">
            {/* Bespoke SVG Title Lockup */}
            <div className="flex flex-col items-center space-y-2">
              <svg
                viewBox="0 0 360 56"
                className="w-72 h-14 mx-auto"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="hujjuNexusGrad" x1="0" y1="0" x2="360" y2="56">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                <polygon
                  points="28,8 46,28 28,48 10,28"
                  stroke="url(#hujjuNexusGrad)"
                  strokeWidth="2.5"
                  fill="rgba(245,158,11,0.15)"
                />
                <circle cx="28" cy="28" r="5" fill="#38BDF8" />
                <text
                  x="62"
                  y="33"
                  fill="url(#hujjuNexusGrad)"
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight="700"
                  fontSize="24"
                  letterSpacing="2"
                >
                  HUJJU NEXUS 3D
                </text>
                <text
                  x="64"
                  y="48"
                  fill="#94A3B8"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="500"
                  fontSize="9"
                  letterSpacing="3"
                >
                  SPATIAL ORBITAL RELAY SIMULATION
                </text>
              </svg>

              <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                Pilot the 7-part Hujju Orbital Relay Craft across the neural grid to synchronize all 10 encrypted data cores while evading crimson sentinel drones.
              </p>
            </div>

            <button
              type="button"
              onClick={startOrResetGame}
              className="w-full py-3 px-6 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Launch 3D Simulation [Enter / Space]
            </button>

            <div className="text-[11px] font-mono text-slate-400 tracking-wide">
              WASD / Arrows Move · Space Pulse Boost · Esc Pause
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: PAUSE / VICTORY / GAME OVER MODAL */}
      {(gameState === 'paused' || gameState === 'victory' || gameState === 'gameover') && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-6 bg-black/50">
          <div className="max-w-md w-full p-7 rounded-2xl bg-slate-950/95 border border-white/15 text-center space-y-5">
            <div className="space-y-1">
              <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
                {gameState === 'victory'
                  ? 'Neural Grid Synchronized'
                  : gameState === 'paused'
                  ? 'Simulation Paused'
                  : 'Simulation Terminated'}
              </div>
              <h3 className="text-2xl font-bold text-white font-display">
                {gameState === 'victory'
                  ? 'All 10 Data Cores Captured!'
                  : gameState === 'paused'
                  ? 'Orbital Relay Standby'
                  : 'Relay Hull or Timer Depleted'}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900 border border-white/10 text-xs">
              <div>
                <div className="text-slate-400">Final Score</div>
                <div className="text-base font-bold font-mono text-amber-400 mt-0.5">{score}</div>
              </div>
              <div>
                <div className="text-slate-400">Cores Synced</div>
                <div className="text-base font-bold font-mono text-sky-400 mt-0.5">
                  {coresCollected}/{TARGET_CORES}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Hull Status</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  {hullIntegrity}%
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {gameState === 'paused' && (
                <button
                  type="button"
                  onClick={() => setGameState('playing')}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Resume Simulation [Esc]
                </button>
              )}

              <button
                type="button"
                onClick={startOrResetGame}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again [R]</span>
              </button>

              {!savedSession && (
                <button
                  type="button"
                  onClick={async () => {
                    await onLogGameSession(score, coresCollected, cameraPreset);
                    setSavedSession(true);
                  }}
                  className="w-full py-2.5 px-4 border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Log Telemetry to Workspace & Cloud SQL</span>
                </button>
              )}

              <button
                type="button"
                onClick={onExitStudio}
                className="w-full py-2 px-4 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Return to Hujju Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (<= 15% Viewport Footprint, No Backdrop Blur over WebGL) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
        {isDockCollapsed ? (
          <button
            type="button"
            onClick={() => setIsDockCollapsed(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/90 border border-white/10 text-xs font-medium text-slate-300 hover:text-white"
          >
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Show 3D Camera & Audio Controls</span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950/90 border border-white/10 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Camera:</span>
            {(['chase', 'aerial', 'orbit'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCameraPreset(preset)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                  cameraPreset === preset
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}

            <div className="h-4 w-px bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() =>
                setGameState((prev) => (prev === 'playing' ? 'paused' : 'playing'))
              }
              className="p-1.5 rounded-lg bg-slate-900 text-slate-200 hover:text-white"
              title="Pause / Resume"
            >
              {gameState === 'playing' ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-200 hover:text-white"
              title={isMuted ? 'Unmute Synth Audio' : 'Mute Synth Audio'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsDockCollapsed(true)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              title="Collapse Dock"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
