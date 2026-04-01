import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useFetch } from '../../../hooks/useFetch.js';
import { fetchAgentStatus, focusTerminal } from '../../../api/client.js';
import styles from './PlaygroundTab.module.css';

// ── Status → visual config ────────────────────────────────────────────────────
const STATUS_VIS = {
  'Editing code':           { color: 0x98c379, hex: '#98c379', anim: 'type'  },
  'Writing file':           { color: 0x98c379, hex: '#98c379', anim: 'type'  },
  'Reading file':           { color: 0x61afef, hex: '#61afef', anim: 'read'  },
  'Searching code':         { color: 0x61afef, hex: '#61afef', anim: 'read'  },
  'Searching files':        { color: 0x61afef, hex: '#61afef', anim: 'read'  },
  'Running command':        { color: 0xe5c07b, hex: '#e5c07b', anim: 'run'   },
  'Waiting for permission': { color: 0xff3008, hex: '#ff3008', anim: 'jump'  },
  'Waiting for input':      { color: 0xffd580, hex: '#ffd580', anim: 'idle'  },
  'Thinking':               { color: 0xc678dd, hex: '#c678dd', anim: 'think' },
  'Spawning agent':         { color: 0xff3008, hex: '#ff3008', anim: 'spin'  },
  'Idle':                   { color: 0x5c6370, hex: '#5c6370', anim: 'idle'  },
};
const getVis = (s) => STATUS_VIS[s] || { color: 0xabb2bf, hex: '#abb2bf', anim: 'idle' };

const SLOTS = [
  { x: -4.0, z: -2.5 }, { x: -1.2, z: -2.5 }, { x: 1.6, z: -2.5 },
  { x: -4.0, z:  0.2 }, { x: -1.2, z:  0.2 }, { x: 1.6, z:  0.2 },
];
const BODY_COLORS = [0xe06c75, 0x61afef, 0x98c379, 0xe5c07b, 0xc678dd, 0x56b6c2];

const DEFAULT_CAM_POS  = new THREE.Vector3(2, 9, 13);
const DEFAULT_CAM_LOOK = new THREE.Vector3(0, 1, 0);

// ── Geometry helpers ──────────────────────────────────────────────────────────
const M  = (c) => new THREE.MeshStandardMaterial({ color: c });
const Mb = (c) => new THREE.MeshBasicMaterial({ color: c });

function box(scene, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color));
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}

function buildOffice(scene) {
  // Ground + grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x1a2035 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);
  scene.add(new THREE.GridHelper(200, 80, 0x334466, 0x2a3555));

  // Carpet
  for (let x = -7; x <= 4; x++) {
    for (let z = -4; z <= 3; z++) {
      let c;
      if (x <= -4 && z <= 1)   c = (x + z) % 2 === 0 ? 0x4466aa : 0x3a5898;
      else if (z <= 1)         c = (x + z) % 2 === 0 ? 0x4a5e88 : 0x3d5070;
      else                     c = (x + z) % 2 === 0 ? 0xcc2008 : 0xdddddd;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.06, 0.97), new THREE.MeshStandardMaterial({ color: c }));
      tile.position.set(x, 0.03, z);
      scene.add(tile);
    }
  }

  // Glass divider
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.25, roughness: 0, metalness: 0.1, side: THREE.DoubleSide });
  for (let z = -4; z < 2; z += 1.5) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.07, 3.2, 1.4), glassMat);
    g.position.set(-3.5, 1.7, z + 0.6);
    scene.add(g);
  }
  box(scene, 0.1, 0.1, 6.2, 0xaabbdd, -3.5, 3.35, -1.0);
  box(scene, 0.1, 0.1, 6.2, 0xaabbdd, -3.5, 0.12, -1.0);

  // Meeting table
  box(scene, 3.2, 0.1, 1.4, 0x8c5a25, -5.2, 0.85, -2.0);
  box(scene, 3.0, 0.06, 1.2, 0xb07230, -5.2, 0.91, -2.0);
  [[-6.6,-2.6],[-6.6,-1.4],[-3.8,-2.6],[-3.8,-1.4]].forEach(([tx,tz]) => box(scene, 0.09, 0.85, 0.09, 0x6a4015, tx, 0.43, tz));
  [[-6.2,-2.0],[-6.2,-2.7],[-6.2,-1.3],[-4.2,-2.0],[-4.2,-2.7],[-4.2,-1.3]].forEach(([cx,cz]) => {
    box(scene, 0.5, 0.07, 0.5, 0x2255cc, cx, 0.52, cz);
    box(scene, 0.5, 0.46, 0.07, 0x2255cc, cx, 0.78, cz + (cx < -5 ? 0.24 : -0.24));
  });

  // Whiteboard
  box(scene, 2.6, 1.3, 0.08, 0xf5f5ef, -5.2, 2.7, -4.0);
  box(scene, 2.7, 1.42, 0.05, 0x888899, -5.2, 2.7, -4.04);

  // Agent desks
  SLOTS.forEach(({ x, z }) => {
    box(scene, 1.8, 0.07, 0.8, 0x9a6830, x, 0.84, z - 0.4);
    box(scene, 1.7, 0.05, 0.7, 0xc08840, x, 0.87, z - 0.4);
    box(scene, 0.06, 0.28, 0.06, 0x666677, x, 1.01, z - 0.65);
    box(scene, 0.68, 0.42, 0.04, 0x2a3a55, x, 1.37, z - 0.65);
    box(scene, 0.45, 0.03, 0.18, 0x556677, x, 0.89, z - 0.12);
    const divMat = new THREE.MeshStandardMaterial({ color: 0x557799 });
    const bw = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 0.1), divMat); bw.position.set(x, 0.65, z - 0.82); scene.add(bw);
    const lw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 1.7), divMat); lw.position.set(x - 0.92, 0.65, z); scene.add(lw);
    const rw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 1.7), divMat); rw.position.set(x + 0.92, 0.65, z); scene.add(rw);
    box(scene, 0.52, 0.07, 0.52, 0x2a5aaa, x, 0.52, z + 0.38);
    box(scene, 0.52, 0.46, 0.07, 0x2a5aaa, x, 0.78, z + 0.66);
    box(scene, 0.1, 0.14, 0.1, 0xffffff, x + 0.6, 0.92, z - 0.55);
    [[0xff9944, 0.08],[0x44ddaa, 0.0],[0xffdd44, -0.08]].forEach(([nc, dx]) => box(scene, 0.13, 0.02, 0.13, nc, x - 0.62 + dx, 0.89, z - 0.55));
  });

  // Ping-pong
  box(scene, 2.6, 0.09, 1.2, 0x22aa55, -1.5, 0.68, 2.2);
  box(scene, 2.6, 0.14, 0.05, 0xffffff, -1.5, 0.75, 2.2);
  [[-2.7,1.7],[-.3,1.7],[-2.7,2.7],[-.3,2.7]].forEach(([px,pz]) => box(scene, 0.06, 0.68, 0.06, 0x999999, px, 0.34, pz));

  // Couch
  box(scene, 2.2, 0.28, 0.7, 0xcc5522, 3.0, 0.54, 2.5);
  box(scene, 2.2, 0.56, 0.18, 0xcc5522, 3.0, 0.70, 2.88);
  box(scene, 0.18, 0.56, 0.7, 0xcc5522, 4.08, 0.70, 2.5);
  [2.15, 2.8, 3.45].forEach(cx => box(scene, 0.58, 0.12, 0.52, 0xdd7733, cx, 0.7, 2.5));

  // Coffee counter + plants
  box(scene, 1.1, 0.07, 0.6, 0xaa9966, -6.8, 0.6, 2.6);
  box(scene, 0.36, 0.58, 0.32, 0x445577, -6.8, 0.91, 2.6);
  [[-7.2,-4.2],[-7.2,3.0],[4.2,3.0]].forEach(([px,pz]) => {
    box(scene, 0.32, 0.36, 0.32, 0xcc9944, px, 0.18, pz);
    box(scene, 0.28, 0.55, 0.28, 0x44cc44, px, 0.64, pz);
    box(scene, 0.2, 0.3, 0.2, 0x228822, px, 0.94, pz);
  });
}

function makeAvatar(bodyColor) {
  const g = new THREE.Group();
  const head  = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), M(0xf5c8a0)); head.position.y = 1.52;
  const eL    = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.04), Mb(0x111111)); eL.position.set(-0.12, 1.56, 0.23);
  const eR    = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.04), Mb(0x111111)); eR.position.set( 0.12, 1.56, 0.23);
  const hair  = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), M(0x4a3020)); hair.position.set(0, 1.72, 0);
  const body  = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.28), M(bodyColor)); body.position.y = 0.97;
  const lArm  = new THREE.Group(); lArm.position.set(-0.30, 1.12, 0);
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.42, 0.17), M(bodyColor));
  lArmMesh.position.set(0, -0.21, 0);
  lArm.add(lArmMesh);
  const rArm  = new THREE.Group(); rArm.position.set(0.30, 1.12, 0);
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.42, 0.17), M(bodyColor));
  rArmMesh.position.set(0, -0.21, 0);
  rArm.add(rArmMesh);
  const lLeg  = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.44, 0.17), M(0x334466)); lLeg.position.set(-0.11, 0.52, 0);
  const rLeg  = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.44, 0.17), M(0x334466)); rLeg.position.set( 0.11, 0.52, 0);
  const lFt   = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.26), M(0x222222));  lFt.position.set(-0.11, 0.29, 0.04);
  const rFt   = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.26), M(0x222222));  rFt.position.set( 0.11, 0.29, 0.04);
  g.add(head, eL, eR, hair, body, lArm, rArm, lLeg, rLeg, lFt, rFt);
  g.userData = { head, lArm, rArm, lLeg, rLeg };
  return g;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PlaygroundTab() {
  const mountRef    = useRef(null);
  const sceneRef    = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef   = useRef(null);
  const controlsRef = useRef(null);
  const clockRef    = useRef(0);
  const avatarsRef  = useRef([]);
  const sizeRef     = useRef({ w: 430, h: 400 });
  // { toPos: Vector3, toLook: Vector3 } or null
  const cameraAnimRef    = useRef(null);
  const userControlling  = useRef(false);
  const userHasMoved     = useRef(false);
  const [popups, setPopups]   = useState([]);
  const [initErr, setInitErr] = useState(null);

  const { data: agentData } = useFetch(fetchAgentStatus, { interval: 3000 });

  // ── Init Three.js ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let renderer, controls, rafId;

    try {
      const w = el.clientWidth  || 430;
      const h = el.clientHeight || 400;
      sizeRef.current = { w, h };

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.domElement.style.display = 'block';
      el.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0d14);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 500);
      camera.position.copy(DEFAULT_CAM_POS);
      camera.lookAt(DEFAULT_CAM_LOOK);
      cameraRef.current = camera;

      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(DEFAULT_CAM_LOOK);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.minDistance = 3;
      controls.maxDistance = 30;
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.update();
      controlsRef.current = controls;

      // Pause auto-camera while user is dragging/zooming
      controls.addEventListener('start', () => { userControlling.current = true; userHasMoved.current = true; cameraAnimRef.current = null; });
      controls.addEventListener('end',   () => { userControlling.current = false; });

      scene.add(new THREE.AmbientLight(0xffffff, 1.8));
      const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(10, 20, 15); scene.add(sun);
      const fill = new THREE.DirectionalLight(0xaaccff, 0.8); fill.position.set(-10, 8, -10); scene.add(fill);

      buildOffice(scene);

      const tick = () => {
        rafId = requestAnimationFrame(tick);
        clockRef.current += 0.016;
        const t = clockRef.current;

        // Smooth camera animation toward target — skip if user is manually controlling
        if (cameraAnimRef.current && !userControlling.current) {
          camera.position.lerp(cameraAnimRef.current.toPos, 0.035);
          controls.target.lerp(cameraAnimRef.current.toLook, 0.035);
        }

        avatarsRef.current.forEach(({ group, status }) => {
          if (!group) return;
          const { head, lArm, rArm } = group.userData;
          const { anim } = getVis(status);
          lArm.rotation.x = 0; lArm.rotation.z = 0;
          rArm.rotation.x = 0; rArm.rotation.z = 0;
          head.rotation.set(0, 0, 0);
          group.position.y = group.userData.baseY ?? 0;
          if (anim === 'type')  { lArm.rotation.x =  Math.sin(t*9)*0.55; rArm.rotation.x = -Math.sin(t*9)*0.55; head.rotation.x = -0.22; }
          else if (anim === 'read')  { head.rotation.x = Math.sin(t*1.1)*0.08-0.22; lArm.rotation.x = rArm.rotation.x = -0.22; }
          else if (anim === 'run')   { lArm.rotation.x = Math.sin(t*7)*0.75; rArm.rotation.x = -Math.sin(t*7)*0.75; group.position.y = (group.userData.baseY??0)+Math.abs(Math.sin(t*7))*0.07; }
          else if (anim === 'jump')  { group.position.y = (group.userData.baseY??0)+Math.abs(Math.sin(t*4.5))*0.32; lArm.rotation.z = Math.sin(t*4.5)*0.95; rArm.rotation.z = -Math.sin(t*4.5)*0.95; head.rotation.y = Math.sin(t*2.5)*0.28; }
          else if (anim === 'think') { head.rotation.y = Math.sin(t)*0.32; lArm.rotation.x = -0.35; lArm.rotation.z = 0.22; rArm.rotation.x = -0.35; rArm.rotation.z = -0.22; }
          else if (anim === 'spin')  { group.rotation.y = t*2.5; }
          else { group.position.y = (group.userData.baseY??0)+Math.sin(t*1.4)*0.025; head.rotation.y = Math.sin(t*0.55)*0.14; }
        });
        controls.update();
        renderer.render(scene, camera);
      };
      tick();

      const onResize = () => {
        const w2 = el.clientWidth || 430, h2 = el.clientHeight || 400;
        sizeRef.current = { w: w2, h: h2 };
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
      };
      window.addEventListener('resize', onResize);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        controls.dispose();
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      };
    } catch (err) {
      console.error('Playground error:', err);
      setInitErr(err.message);
    }
  }, []);

  // ── Sync avatars with live data ───────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !agentData) return;
    avatarsRef.current.forEach(({ group, extras }) => { scene.remove(group); (extras||[]).forEach(m => scene.remove(m)); });
    avatarsRef.current = [];

    const active = agentData.filter((a) => a.status !== 'Idle').slice(0, 6);
    active.forEach((agent, i) => {
      const slot = SLOTS[i]; if (!slot) return;
      const vis = getVis(agent.status);
      const group = makeAvatar(BODY_COLORS[i % BODY_COLORS.length]);
      group.position.set(slot.x, 0, slot.z + 0.4);
      group.rotation.y = Math.PI;
      group.userData.baseY = 0;
      scene.add(group);
      const extras = [];

      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.64,0.40,0.05), new THREE.MeshBasicMaterial({ color: vis.color }));
      scr.position.set(slot.x, 1.37, slot.z-0.65); scene.add(scr); extras.push(scr);

      const glow = new THREE.PointLight(vis.color, 1.5, 3.0);
      glow.position.set(slot.x, 1.4, slot.z-0.4); scene.add(glow); extras.push(glow);

      const ring = new THREE.Mesh(new THREE.RingGeometry(0.3,0.45,24), new THREE.MeshBasicMaterial({ color: vis.color, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
      ring.rotation.x = -Math.PI/2; ring.position.set(slot.x,0.05,slot.z+0.4); scene.add(ring); extras.push(ring);

      if (agent.status === 'Waiting for permission') {
        const beacon = new THREE.Mesh(new THREE.TorusGeometry(0.55,0.07,8,28), new THREE.MeshBasicMaterial({ color: 0xff3008 }));
        beacon.rotation.x = -Math.PI/2; beacon.position.set(slot.x,0.05,slot.z+0.4); scene.add(beacon); extras.push(beacon);
        const aLight = new THREE.PointLight(0xff3008,2.5,5); aLight.position.set(slot.x,2.0,slot.z); scene.add(aLight); extras.push(aLight);
      }
      avatarsRef.current.push({ group, extras, sessionId: agent.sessionId, status: agent.status, slot });
    });

    const alertAgents = active.filter((a) => a.status === 'Waiting for permission');
    setPopups(alertAgents);
  }, [agentData]);

  // ── Camera zoom when permission alert appears / clears ────────────────────
  const zoomedFor      = useRef(new Set()); // session IDs we've already zoomed for
  const prevPopupCount = useRef(0);
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    if (popups.length > 0) {
      const agent = popups[0];
      if (!zoomedFor.current.has(agent.sessionId)) {
        // First time seeing this alert — zoom in once
        zoomedFor.current.add(agent.sessionId);
        const activeAgents = agentData ? agentData.filter((a) => a.status !== 'Idle') : [];
        const idx = activeAgents.findIndex((a) => a.sessionId === agent.sessionId);
        const slot = SLOTS[idx >= 0 ? idx : 0];
        if (slot) {
          userHasMoved.current = false;
          cameraAnimRef.current = {
            toPos: new THREE.Vector3(slot.x, 3.5, slot.z + 5.5),
            toLook: new THREE.Vector3(slot.x, 1.0, slot.z),
          };
        }
      }
    } else {
      // All alerts cleared — reset zoom tracking and return to default if user hasn't moved
      zoomedFor.current.clear();
      if (prevPopupCount.current > 0 && !userHasMoved.current) {
        cameraAnimRef.current = {
          toPos: DEFAULT_CAM_POS.clone(),
          toLook: DEFAULT_CAM_LOOK.clone(),
        };
      }
    }
    prevPopupCount.current = popups.length;
  }, [popups, agentData]);

  const active = agentData ? agentData.filter((a) => a.status !== 'Idle') : [];

  if (initErr) return (
    <div className={styles.initErr}>
      <span style={{ fontSize: 28 }}>⚠️</span>
      <span style={{ fontSize: 12 }}>{initErr}</span>
    </div>
  );

  return (
    <div className={styles.root}>
      <div ref={mountRef} className={styles.canvasHost} />

      <div className={styles.hud}>
        <div className={styles.hudTitle}>🏢 Agent HQ</div>
        {active.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>No active agents</div>
        ) : (
          active.map((a, i) => {
            const vis = getVis(a.status);
            return (
              <div key={a.sessionId + i} className={styles.hudRow}>
                <span
                  className={styles.hudDot}
                  style={{
                    background: vis.hex,
                    boxShadow: `0 0 8px ${vis.hex}88`,
                  }}
                />
                <div style={{ fontSize: 10, overflow: 'hidden' }}>
                  <div className={styles.hudProject}>{a.project}</div>
                  <div className={styles.hudStatus} style={{ color: vis.hex }}>{a.status}</div>
                </div>
              </div>
            );
          })
        )}
        <div className={styles.hudHint}>drag · scroll zoom · right pan</div>
      </div>

      {popups.map((agent) => (
        <div key={agent.sessionId} className={styles.popup}>
          <div className={styles.popupTitle}>🔐 Needs permission</div>
          <div className={styles.popupBody}>
            <span className={styles.popupProject}>{agent.project}</span>
            {agent.lastTool && (
              <>
                {' '}
                wants to run{' '}
                <code className={styles.popupCode}>{agent.lastTool}</code>
              </>
            )}
          </div>
          <button
            type="button"
            className={styles.popupBtn}
            onClick={() => focusTerminal(agent.cwd).catch(() => {})}
          >
            ↗ Open Terminal
          </button>
        </div>
      ))}

      {active.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyEmoji}>😴</div>
          <div className={styles.emptyTitle}>Office is empty</div>
          <div className={styles.emptySub}>Start a Claude session to see agents appear</div>
        </div>
      )}
    </div>
  );
}
