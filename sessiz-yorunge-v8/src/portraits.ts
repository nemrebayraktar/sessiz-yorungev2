import type { OriginId } from './origins'

function face(ctx: CanvasRenderingContext2D, skin: string, suit: string, eyes: string, pupil: string, big = false) {
  ctx.clearRect(0, 0, 220, 280)
  ctx.fillStyle = 'rgba(0,0,0,0)'
  const headY = big ? 118 : 108
  const headR = big ? 62 : 36
  ctx.fillStyle = suit
  ctx.beginPath()
  ctx.ellipse(110, 214, big ? 28 : 40, big ? 36 : 48, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.ellipse(110, headY, headR, big ? 58 : 42, 0, 0, Math.PI * 2)
  ctx.fill()
  const ex = big ? 26 : 14
  const er = big ? 16 : 7
  ctx.fillStyle = eyes
  ctx.beginPath()
  ctx.ellipse(110 - ex, headY + 4, er, er * 1.15, 0, 0, Math.PI * 2)
  ctx.ellipse(110 + ex, headY + 4, er, er * 1.15, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = pupil
  ctx.beginPath()
  ctx.arc(110 - ex + 2, headY + 5, big ? 7 : 3.2, 0, Math.PI * 2)
  ctx.arc(110 + ex + 2, headY + 5, big ? 7 : 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(110, headY + (big ? 28 : 18), big ? 10 : 7, 0.15, Math.PI - 0.15)
  ctx.stroke()
}

export function drawPortrait(canvas: HTMLCanvasElement, id: OriginId) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (id === 'earth') face(ctx, '#e2b394', '#3d5168', '#f4f7ff', '#243044')
  else if (id === 'mars') face(ctx, '#c98462', '#8a3d32', '#f6efe6', '#2a140e')
  else if (id === 'proxima') face(ctx, '#6a2430', '#241018', '#ffd0c8', '#1a0608')
  else if (id === 'alpha') face(ctx, '#8d5ae0', '#4a2c86', '#f7f4ff', '#1b1030', true)
  else if (id === 'trappist') {
    ctx.clearRect(0, 0, 220, 280)
    ctx.fillStyle = '#d7f4ff'
    ctx.beginPath()
    ctx.moveTo(110, 48)
    ctx.lineTo(168, 150)
    ctx.lineTo(110, 236)
    ctx.lineTo(52, 150)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#123044'
    ctx.beginPath()
    ctx.arc(92, 140, 6, 0, Math.PI * 2)
    ctx.arc(128, 140, 6, 0, Math.PI * 2)
    ctx.fill()
  } else if (id === 'k218') face(ctx, '#3f8f86', '#14424a', '#e7fff8', '#062428')
  else if (id === 'kepler186') face(ctx, '#6ea85a', '#2d4a28', '#f3ffe8', '#142010')
  else if (id === 'gliese') {
    face(ctx, '#b08968', '#5c4636', '#fff4e8', '#24180e')
    ctx.fillStyle = '#5c4636'
    ctx.fillRect(70, 188, 80, 28)
  } else {
    face(ctx, '#f0e2c4', '#f4f0e4', '#fff', '#3a3428')
    ctx.strokeStyle = '#e4a15c'
    ctx.lineWidth = 3
    ctx.strokeRect(78, 70, 64, 78)
  }
}
