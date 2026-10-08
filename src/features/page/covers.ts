export const COVERS = [
  'linear-gradient(120deg, #fde68a 0%, #fca5a5 50%, #c4b5fd 100%)',
  'linear-gradient(120deg, #a7f3d0 0%, #93c5fd 100%)',
  'linear-gradient(135deg, #fbcfe8 0%, #fed7aa 100%)',
  'linear-gradient(120deg, #1e3a8a 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
  'linear-gradient(120deg, #d9f99d 0%, #67e8f9 100%)',
  'radial-gradient(circle at 20% 30%, #fef3c7 0%, #f59e0b 60%, #b45309 100%)',
  'linear-gradient(160deg, #e0e7ff 0%, #f5f5f4 100%)',
]

export const randomCover = () => COVERS[Math.floor(Math.random() * COVERS.length)]
