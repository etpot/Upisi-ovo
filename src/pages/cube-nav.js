/**
 * 3D cube page rotation.
 *
 * Each section page is one face of a horizontal cube. Press-and-drag
 * horizontally to rotate the cube (rotateY) following the pointer; release
 * past the threshold to spin onto the neighbouring section. The order is
 * circular, so you can keep rotating in a full circle:
 *
 * The order follows the top navigation strip, left to right, and wraps
 * around in a full circle:
 *
 *   todo <-> obligations <-> home <-> calendar <-> notes <-> (wraps to todo)
 *
 * Drag RIGHT -> next section     (the right neighbour in the strip rotates in)
 * Drag LEFT  -> previous section (the left neighbour in the strip rotates in)
 *
 * Separate pages are kept intact: during the spin each face shows the
 * section's theme colour + name + logo, and the real page content loads
 * (masked by a short entrance fade) once navigation completes.
 */
(function () {
  // Order matches the top bar, left -> right.
  const SECTIONS = [
    { cls: "page-todo",  file: "todo.html",        name: "TODO",        color: "#2d6a4f", dark: false },
    { cls: "page-oblig", file: "obligations.html", name: "OBLIGATIONS", color: "#a23b3b", dark: false },
    { cls: "page-home",  file: "index.html",       name: "HOME",        color: "#315f72", dark: false },
    { cls: "page-cal",   file: "calendar.html",    name: "CALENDAR",    color: "#1e3a6e", dark: false },
    { cls: "page-notes", file: "notes.html",       name: "NOTES",       color: "#c9a227", dark: true },
  ];
  const LOGO = "../shared/ui/logo.png";
  const COUNT = SECTIONS.length;
  const body = document.body;

  // Mask the load with a short fade if we arrived here via a cube spin.
  playEntranceIfNeeded();

  const currentIndex = SECTIONS.findIndex((s) => body.classList.contains(s.cls));
  if (currentIndex === -1) return; // not a section page (e.g. home) -> no cube

  const prevSection = SECTIONS[(currentIndex - 1 + COUNT) % COUNT];
  const nextSection = SECTIONS[(currentIndex + 1) % COUNT];

  const W = () => window.innerWidth;
  const threshold = () => Math.min(140, W() * 0.22);

  let overlay = null;
  let scene = null;
  let dragging = false;
  let active = false;
  let decided = false;
  let navigated = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let theta = 0;

  function makeFace(kind, section) {
    const face = document.createElement("div");
    face.className = "cube-face cube-face-" + kind;
    face.style.background = section.color;

    const img = document.createElement("img");
    img.src = LOGO;
    img.alt = "";

    const label = document.createElement("div");
    label.className = "cube-face-name";
    label.textContent = section.name;
    if (section.dark) label.style.color = "#1f2937";

    face.appendChild(img);
    face.appendChild(label);
    return face;
  }

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "cube-overlay";
    scene = document.createElement("div");
    scene.className = "cube-scene";
    scene.appendChild(makeFace("front", SECTIONS[currentIndex]));
    // Rotation direction is flipped, so the destination faces sit on the
    // opposite side: next neighbour on the left face, previous on the right.
    scene.appendChild(makeFace("left", nextSection));
    scene.appendChild(makeFace("right", prevSection));
    overlay.appendChild(scene);
    body.appendChild(overlay);
  }

  function setTheta(t) {
    theta = t;
    scene.style.transform = "translateZ(-50vw) rotateY(" + t + "deg)";
  }

  function activate() {
    if (!overlay) buildOverlay();
    overlay.classList.add("active");
    body.classList.add("cube-dragging");
    active = true;
    setTheta(0);
  }

  function reset() {
    active = false;
    dragging = false;
    decided = false;
    theta = 0;
    body.classList.remove("cube-dragging");
    if (overlay) {
      overlay.remove();
      overlay = null;
      scene = null;
    }
  }

  function goTo(section) {
    if (navigated) return;
    navigated = true;
    try { sessionStorage.setItem("cubeEnter", "1"); } catch (e) {}
    window.setTimeout(function () { window.location.href = section.file; }, 330);
  }

  function endDrag() {
    if (!active) { reset(); return; }
    suppressNextClick();
    const dx = lastX - startX;
    const cross = Math.abs(dx) > threshold() || Math.abs(theta) > 42;
    scene.classList.add("animate");
    if (cross) {
      const right = dx > 0;
      setTheta(right ? -90 : 90);
      // Drag right -> next section, drag left -> previous (destination
      // unchanged); the snapped face matches the live rotation.
      goTo(right ? nextSection : prevSection);
    } else {
      setTheta(0);
      window.setTimeout(reset, 360);
    }
  }

  // After an intentional drag, swallow the click that would otherwise fire
  // on whatever element we started on (e.g. a nav link).
  function suppressNextClick() {
    const handler = function (ev) {
      ev.stopPropagation();
      ev.preventDefault();
      window.removeEventListener("click", handler, true);
    };
    window.addEventListener("click", handler, true);
    window.setTimeout(function () {
      window.removeEventListener("click", handler, true);
    }, 400);
  }

  function onDown(e) {
    if (!e.isPrimary) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("input, textarea, button, select, label, [contenteditable]")) return;
    dragging = true;
    decided = false;
    active = false;
    navigated = false;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
  }

  function onMove(e) {
    if (!dragging) return;
    lastX = e.clientX;
    lastY = e.clientY;
    const dx = lastX - startX;
    const dy = lastY - startY;

    if (!decided) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.3) {
        dragging = false; // vertical intent -> let the page scroll
        return;
      }
      decided = true;
      activate();
    }

    if (active) {
      e.preventDefault();
      let t = -(dx / W()) * 90;
      if (t > 100) t = 100;
      if (t < -100) t = -100;
      setTheta(t);
    }
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    endDrag();
  }

  function onCancel() {
    if (active) {
      scene.classList.add("animate");
      setTheta(0);
      window.setTimeout(reset, 360);
    } else {
      dragging = false;
    }
  }

  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onCancel, { passive: true });

  function playEntranceIfNeeded() {
    let flag = null;
    try { flag = sessionStorage.getItem("cubeEnter"); } catch (e) {}
    if (!flag) return;
    try { sessionStorage.removeItem("cubeEnter"); } catch (e) {}

    const cur = SECTIONS.find((s) => body.classList.contains(s.cls));
    if (!cur) return;

    const enter = document.createElement("div");
    enter.className = "cube-enter";
    enter.style.background = cur.color;

    const img = document.createElement("img");
    img.src = LOGO;
    img.alt = "";

    const label = document.createElement("div");
    label.className = "cube-face-name";
    label.textContent = cur.name;
    if (cur.dark) label.style.color = "#1f2937";

    enter.appendChild(img);
    enter.appendChild(label);
    enter.addEventListener("animationend", function () { enter.remove(); });
    body.appendChild(enter);
  }
})();
