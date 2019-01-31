import { DraggableOptions, InteractEvent } from 'interactjs';

function createDragConfig(
  onstart: (e: InteractEvent) => void = () => null,
  onmove: (e: InteractEvent) => void = () => null,
  onend: (e: InteractEvent) => void = () => null,
) {
  const pos = { x: 0, y: 0 };
  const clientPos = { x: 0, y: 0 };
  const size = { width: 0, height: 0 };

  function startHandler(e: InteractEvent) {
    const { target }: { target: HTMLElement } = e;

    // transformBeforeDragging = target.style.transform || '';

    clientPos.x = e.clientX;
    clientPos.y = e.clientY;

    const rect = target.getBoundingClientRect();
    pos.x = rect.left;
    pos.y = rect.top;
    size.width = rect.width;
    size.height = rect.height;

    target.classList.add('moving');
    target.style.left = '0';
    target.style.top = '0';
    target.style.width = `${size.width}px`;
    target.style.height = `${size.height}px`;
    target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;

    onstart(e);
  }

  function moveHandler(e: InteractEvent) {
    const { target }: { target: HTMLElement } = e;
    const { clientX, clientY } = e;

    const [dx, dy] = [clientX - clientPos.x, clientY - clientPos.y];

    pos.x += dx;
    pos.y += dy;

    clientPos.x = clientX;
    clientPos.y = clientY;

    target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;

    onmove(e);
  }

  function endHandler(e: InteractEvent) {
    const { target }: { target: HTMLElement } = e;

    target.classList.remove('moving');
    target.style.left = '';
    target.style.top = '';
    target.style.width = '';
    target.style.height = '';
    target.style.transform = '';

    onend(e);
  }

  const dragConfig: DraggableOptions = {
    autoScroll: {
      speed: 800,
    } as any,
    onend: endHandler,

    onmove: moveHandler,
    onstart: startHandler,
  };
  return dragConfig;
}

export default createDragConfig;
